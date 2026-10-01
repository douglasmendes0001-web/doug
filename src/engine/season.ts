// Ciclo do jogo: novo jogo, preparação e simulação das partidas, avanço do
// calendário dia a dia e virada de temporada.

import { createCoach, initialRespeito, type CoachInput } from './coach';
import { scheduleSeason, slotIsWeekend, slotMonth } from './calendar';
import { clubEco, homeGate, logFinance, weeklyFinance, weeklyOffers } from './clubOps';
import {
  advanceCompetition, knockoutContext, recordResult, startStage,
} from './competitions';
import { endSeason } from './endSeason';
import { afterUserMatchMessages, confidenceMessages, pushMessage, seasonStartMessages, weeklyPlayerRequests } from './inbox';
import { autoLineup, repairLineup } from './lineup';
import { MatchSim, type MatchContext, type TeamContext } from './match';
import { Rng, clamp } from './rng';
import { buildSeasonCompetitions } from './seasonSetup';
import type { Club, Fixture, Formacao, GameState, Player, Settings } from './types';
import { SLOTS_PER_YEAR } from './types';
import { generateWeather } from './weather';
import { createWorld } from './world';

export const SAVE_VERSION = 1;
export const START_YEAR = 2026;

export interface NewGameOptions {
  seed: number;
  coach: CoachInput;
  clubId: number;
  settings: Settings;
}

export function newGame(opts: NewGameOptions, world = createWorld(opts.seed)): GameState {
  const coach = createCoach(opts.coach, opts.clubId);
  const state: GameState = {
    version: SAVE_VERSION,
    seed: opts.seed,
    rng: (opts.seed * 7919) | 0,
    year: START_YEAR,
    slot: 0,
    clubs: world.clubs,
    players: world.players,
    coach,
    userClubId: opts.clubId,
    competitions: [],
    fixtures: [],
    messages: [],
    lineup: { formation: '4-4-2', starters: [], bench: [] },
    treino: 'normal',
    settings: opts.settings,
    history: [],
    nextIds: { player: world.players.length, fixture: 0, message: 0, tie: 0 },
    financeLog: [],
    mundialEdition: 0,
  };
  for (const id of state.clubs[opts.clubId].playerIds) {
    state.players[id].respeito = initialRespeito(coach, state.players[id]);
  }
  state.lineup = autoLineup(squadOf(state, opts.clubId), '4-4-2');
  startSeason(state);
  return state;
}

export function squadOf(state: GameState, clubId: number): Player[] {
  return state.clubs[clubId].playerIds.map((id) => state.players[id]).filter((p) => !p.retired);
}

export function startSeason(state: GameState) {
  const rng = new Rng(state.rng);
  state.fixtures = [];
  state.nextIds.fixture = 0;
  state.slot = 0;
  const comps = buildSeasonCompetitions(state);
  scheduleSeason(comps);
  state.competitions = comps;
  for (const c of comps) startStage(state, c, 0, c.teams, rng);
  setObjective(state);
  seasonStartMessages(state);
  state.rng = rng.state;
}

function setObjective(state: GameState) {
  const club = state.clubs[state.userClubId];
  const league = state.clubs.filter((c) => c.leagueId === club.leagueId && c.leagueId).sort((a, b) => b.baseForce - a.baseForce);
  const n = league.length || 1;
  const rank = league.findIndex((c) => c.id === club.id) + 1 || n;
  if (club.tier === 1) {
    if (rank <= 2) [state.seasonObjective, state.objectiveRank] = ['Brigar pelo título (terminar entre os 3)', 3];
    else if (rank <= 6) [state.seasonObjective, state.objectiveRank] = ['Classificar para torneio continental (top 6)', 6];
    else if (rank <= Math.ceil(n * 0.6)) [state.seasonObjective, state.objectiveRank] = ['Fazer campanha no meio da tabela', Math.ceil(n * 0.6)];
    else [state.seasonObjective, state.objectiveRank] = ['Evitar o rebaixamento', n - 4];
  } else {
    if (rank <= 4) [state.seasonObjective, state.objectiveRank] = ['Conquistar o acesso', 4];
    else if (rank <= Math.ceil(n / 2)) [state.seasonObjective, state.objectiveRank] = ['Brigar pelo acesso (primeira metade)', Math.ceil(n / 2)];
    else [state.seasonObjective, state.objectiveRank] = ['Evitar o rebaixamento', Math.max(1, n - 4)];
  }
}

// ---------------- Consultas ----------------

export function fixturesAtSlot(state: GameState, slot: number): Fixture[] {
  return state.fixtures.filter((f) => f.slot === slot);
}

export function userFixtureAtSlot(state: GameState, slot = state.slot): Fixture | undefined {
  const u = state.userClubId;
  return state.fixtures.find((f) => f.slot === slot && (f.home === u || f.away === u));
}

export function nextUserFixture(state: GameState): Fixture | undefined {
  const u = state.userClubId;
  let best: Fixture | undefined;
  for (const f of state.fixtures) {
    if (f.played || (f.home !== u && f.away !== u) || f.slot < state.slot) continue;
    if (!best || f.slot < best.slot) best = f;
  }
  return best;
}

export function compOf(state: GameState, fx: Fixture) {
  return state.competitions.find((c) => c.def.id === fx.compId)!;
}

// ---------------- Preparação da partida ----------------

const FORMACOES_IA: Formacao[] = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '4-5-1'];

function aiTeam(state: GameState, club: Club): TeamContext {
  const squad = squadOf(state, club.id);
  const formation = FORMACOES_IA[club.id % FORMACOES_IA.length];
  return {
    club, squad, lineup: autoLineup(squad, formation), coachExperience: clamp(35 + club.reputation * 0.45, 20, 90), isUser: false,
  };
}

function userTeam(state: GameState): TeamContext {
  const club = state.clubs[state.userClubId];
  const squad = squadOf(state, club.id);
  const repaired = repairLineup(state.lineup, squad);
  state.lineup = repaired.lineup;
  const eager = new Set<number>();
  for (const p of squad) if (p.promiseUntilSlot !== undefined) eager.add(p.id);
  for (const m of state.messages) if (m.kind === 'pedido-jogar' && m.playerId !== undefined && m.resolved !== 'vender') eager.add(m.playerId);
  return {
    club, squad, lineup: repaired.lineup, coachExperience: state.coach.experience, coachAge: state.coach.age, isUser: true, eager,
  };
}

export interface PreparedMatch {
  ctx: MatchContext;
  attendance?: number;
  revenue?: number;
}

export function prepareMatch(state: GameState, fx: Fixture, rng: Rng): PreparedMatch {
  const home = state.clubs[fx.home];
  const away = state.clubs[fx.away];
  const comp = compOf(state, fx);
  const venue = comp.def.venueClubId !== undefined ? state.clubs[comp.def.venueClubId] : home;
  const weather = generateWeather(rng, venue, slotMonth(state.year, fx.slot));
  const isUserHome = fx.home === state.userClubId;
  const isUserAway = fx.away === state.userClubId;
  let crowd = fx.neutral ? 0 : home.reputation / 100;
  let attendance: number | undefined;
  let revenue: number | undefined;
  if (isUserHome && !fx.neutral) {
    const gate = homeGate(state, comp.def.kind === 'continental' || comp.def.kind === 'mundial' || fx.legs === 2);
    crowd = gate.crowd;
    attendance = gate.attendance;
    revenue = gate.revenue;
  }
  return {
    ctx: {
      home: isUserHome ? userTeam(state) : aiTeam(state, home),
      away: isUserAway ? userTeam(state) : aiTeam(state, away),
      venue, neutral: fx.neutral, weather, crowd, rng, knockout: knockoutContext(state, fx),
    },
    attendance,
    revenue,
  };
}

// ---------------- Resultado ----------------

function teamStrength(state: GameState, clubId: number): number {
  const top = squadOf(state, clubId).map((p) => p.force).sort((a, b) => b - a).slice(0, 11);
  return top.reduce((s, f) => s + f, 0) / Math.max(1, top.length);
}

/** Aplica o resultado de uma partida concluída ao estado do jogo. */
export function applyMatchOutcome(state: GameState, fx: Fixture, sim: MatchSim, rng: Rng, prepared?: PreparedMatch) {
  const [hg, ag] = sim.score;
  fx.hg = hg;
  fx.ag = ag;
  fx.pens = sim.pens;
  fx.played = true;
  fx.weather = sim.ctx.weather.clima;
  fx.temperature = sim.ctx.weather.temperature;
  fx.scorers = sim.scorers.map((s) => ({ clubId: s.side === 0 ? fx.home : fx.away, playerId: s.playerId, minute: s.minute }));
  recordResult(state, fx);

  sim.sides.forEach((side) => {
    const club = side.ctx.club;
    for (const pid of side.played) {
      const p = state.players[pid];
      p.seasonGames++;
      p.oportunidade = Math.min(100, p.oportunidade + 12);
      p.benchStreak = 0;
      if ((side.yellows.get(pid) ?? 0) === 1) {
        p.yellowCards++;
        if (p.yellowCards >= 3) {
          p.yellowCards = 0;
          p.suspendedGames += 1;
        }
      }
    }
    for (const pid of side.injuredIds) {
      state.players[pid].injuredSlots = Math.round(rng.int(2, 10) * (1.2 - club.ct * 0.08));
    }
    for (const id of club.playerIds) {
      const p = state.players[id];
      if (side.played.has(id)) continue;
      if (p.suspendedGames > 0) p.suspendedGames--;
      else if (side.ctx.isUser && p.injuredSlots <= 0) {
        p.oportunidade = Math.max(0, p.oportunidade - 6);
        p.benchStreak++;
      }
    }
  });
  for (const s of sim.scorers) state.players[s.playerId].seasonGoals++;

  const userSide = fx.home === state.userClubId ? 0 : fx.away === state.userClubId ? 1 : -1;
  if (userSide >= 0) afterUserMatch(state, fx, sim, userSide as 0 | 1, rng, prepared);
}

function afterUserMatch(state: GameState, fx: Fixture, sim: MatchSim, side: 0 | 1, rng: Rng, prepared?: PreparedMatch) {
  const coach = state.coach;
  const club = state.clubs[state.userClubId];
  const comp = compOf(state, fx);
  const gf = side === 0 ? fx.hg : fx.ag;
  const ga = side === 0 ? fx.ag : fx.hg;
  const oppId = side === 0 ? fx.away : fx.home;
  const opp = state.clubs[oppId];
  const pts = gf > ga ? 3 : gf === ga ? 1 : 0;
  state.lastUserFixtureId = fx.id;

  coach.games++;
  if (pts === 3) coach.wins++;
  else if (pts === 1) coach.draws++;
  else coach.losses++;
  coach.experience = clamp(coach.experience + 0.12 + (pts === 3 ? 0.06 : 0), 0, 100);

  // Renda do jogo em casa.
  if (prepared?.revenue) logFinance(state, `Bilheteria x ${opp.short} (${prepared.attendance?.toLocaleString('pt-BR')} pagantes)`, prepared.revenue);

  // Expectativa x resultado.
  let r = teamStrength(state, club.id) / Math.max(1, teamStrength(state, oppId));
  if (!fx.neutral) r *= side === 0 ? 1.06 : 0.94;
  const expected = clamp(1.35 + 2.2 * Math.log(r), 0.25, 2.75);
  const delta = pts - expected;
  const beforeDir = coach.confDiretoria;
  coach.confDiretoria = clamp(coach.confDiretoria + delta * 3.2, 0, 100);
  coach.confTorcida = clamp(coach.confTorcida + delta * 4 + (gf - ga >= 3 ? 3 : 0) - (ga - gf >= 3 ? 4 : 0), 0, 100);

  // Relação com o elenco.
  const userSim = sim.sides[side];
  const squad = squadOf(state, club.id);
  const avgForce = squad.reduce((s, p) => s + p.force, 0) / Math.max(1, squad.length);
  for (const p of squad) {
    const veteran = p.age >= 30;
    let d = pts === 3 ? (veteran ? 1.5 : 2) : pts === 0 ? (veteran ? -1.5 : -0.5) : 0;
    // Ser usado pelo técnico gera confiança.
    if (userSim.played.has(p.id)) d += 0.5;
    if (!userSim.played.has(p.id) && veteran && p.force >= avgForce + 3 && p.benchStreak >= 2 && p.injuredSlots <= 0) d -= 3;
    if (userSim.played.has(p.id) && p.promiseUntilSlot !== undefined) {
      d += 8;
      p.promiseUntilSlot = undefined;
    } else if (p.promiseUntilSlot !== undefined && state.slot > p.promiseUntilSlot) {
      d -= 15;
      p.promiseUntilSlot = undefined;
      pushMessage(state, 'jogador', `${p.name}: promessa quebrada`,
        `Você me prometeu uma chance e não cumpriu, professor. Fica difícil confiar assim.`, { playerId: p.id });
    }
    d += userSim.respeitoDelta.get(p.id) ?? 0;
    // Quem entrou e foi bem ganha confiança.
    const impact = userSim.subImpact.get(p.id);
    if (impact !== undefined && impact > 0.3 && pts > 0) d += 2;
    p.respeito = clamp(p.respeito + d, 0, 100);
  }
  // Pedidos de jogar atendidos são encerrados.
  for (const m of state.messages) {
    if (m.kind === 'pedido-jogar' && !m.resolved && m.playerId !== undefined && userSim.played.has(m.playerId)) m.resolved = 'atendido';
  }

  // Sequência de resultados (positiva = vitórias, negativa = jogos sem vencer).
  const recent = state.fixtures
    .filter((f) => f.played && (f.home === club.id || f.away === club.id))
    .sort((a, b) => b.slot - a.slot);
  let streak = 0;
  for (const f of recent) {
    const mine = f.home === club.id ? f.hg - f.ag : f.ag - f.hg;
    if (streak >= 0 && mine > 0) streak++;
    else if (streak <= 0 && mine <= 0) streak--;
    else break;
  }
  const scorers = sim.scorers.filter((s) => s.side === side).map((s) => state.players[s.playerId]);
  const top = scorers.sort((a, b) => b.seasonGoals - a.seasonGoals)[0];
  afterUserMatchMessages(state, rng, {
    goalsFor: gf, goalsAgainst: ga, opponent: opp.name, home: side === 0, compName: comp.def.short, expectedPts: expected,
    streak, topScorer: top, decisive: fx.tieId !== undefined,
  });
  confidenceMessages(state, beforeDir, coach.confDiretoria);
  if (coach.confDiretoria <= 5 && coach.games >= 6 && !coach.fired) {
    coach.fired = true;
    pushMessage(state, 'diretoria', 'Você foi demitido',
      `A diretoria do ${club.name} decidiu encerrar seu trabalho. Agradecemos pelos serviços prestados.`);
  }
}

// ---------------- Avanço do calendário ----------------

export interface SlotReport {
  slot: number;
  seasonEnded: boolean;
  finishedComps: string[];
}

/** Simula uma partida que não é do usuário (ou a do usuário, no modo rápido). */
export function simulateFixture(state: GameState, fx: Fixture, rng: Rng) {
  const prepared = prepareMatch(state, fx, rng);
  const sim = new MatchSim(prepared.ctx);
  if (prepared.ctx.home.isUser || prepared.ctx.away.isUser) {
    // Modo rápido do usuário: substituições automáticas nos cansados.
    autoUserSubs(sim, prepared.ctx.home.isUser ? 0 : 1);
  } else sim.runToEnd();
  applyMatchOutcome(state, fx, sim, rng, prepared);
}

function autoUserSubs(sim: MatchSim, side: 0 | 1) {
  while (!sim.finished) {
    sim.step();
    if (sim.half === 2 && [60, 70, 80].includes(sim.minute)) {
      const s = sim.sides[side];
      const tired = s.onField.filter((f) => f.pos !== 'G' && (f.injured || f.p.energy < 60)).sort((a, b) => a.p.energy - b.p.energy).slice(0, 2);
      for (const f of tired) {
        const repl = s.bench.find((p) => p.pos === f.p.pos) ?? s.bench.find((p) => p.pos !== 'G');
        if (repl) sim.substitute(side, f.p.id, repl.id);
      }
    }
  }
}

/**
 * Joga todas as partidas do dia atual (a do usuário já deve ter sido jogada
 * ao vivo; se não foi, é simulada) e processa o pós-jogo.
 */
export function playSlot(state: GameState): SlotReport {
  const rng = new Rng(state.rng);
  const slot = state.slot;
  for (const fx of fixturesAtSlot(state, slot)) {
    if (!fx.played) simulateFixture(state, fx, rng);
  }
  const finishedComps: string[] = [];
  for (const comp of state.competitions) {
    if (advanceCompetition(state, comp, rng)) {
      finishedComps.push(comp.def.id);
      onCompetitionFinished(state, comp.def.id);
    }
  }
  dailyRecovery(state);
  if (slotIsWeekend(slot)) {
    weeklyFinance(state);
    weeklyPlayerRequests(state, rng);
    weeklyOffers(state, rng);
    weeklyTraining(state);
  }
  state.slot++;
  let seasonEnded = false;
  state.rng = rng.state;
  if (state.slot >= SLOTS_PER_YEAR) {
    endSeason(state);
    startSeason(state);
    seasonEnded = true;
  }
  return { slot, seasonEnded, finishedComps };
}

function onCompetitionFinished(state: GameState, compId: string) {
  const comp = state.competitions.find((c) => c.def.id === compId)!;
  const u = state.userClubId;
  if (!comp.teams.includes(u)) return;
  if (comp.champion === u) {
    state.coach.titles.push(`${comp.def.name} ${state.year}`);
    state.coach.confDiretoria = clamp(state.coach.confDiretoria + 20, 0, 100);
    state.coach.confTorcida = clamp(state.coach.confTorcida + 25, 0, 100);
    state.coach.experience = clamp(state.coach.experience + 3, 0, 100);
    logFinance(state, `Premiação: campeão da ${comp.def.name}`, Math.round(comp.def.prize * Math.max(0.2, clubEco(state.clubs[u]))));
    for (const id of state.clubs[u].playerIds) state.players[id].respeito = clamp(state.players[id].respeito + 10, 0, 100);
    pushMessage(state, 'torcida', 'É CAMPEÃO!', `${comp.def.name} ${state.year} é nossa! Obrigado, ${state.coach.name}! A festa vai varar a madrugada!`);
    pushMessage(state, 'midia', 'Título', `${state.clubs[u].name} conquista a ${comp.def.name}. ${state.coach.name} entra para a história do clube.`);
    pushMessage(state, 'diretoria', 'Parabéns pelo título', `A diretoria parabeniza toda a comissão técnica pela conquista da ${comp.def.name}.`);
  } else if (comp.runnerUp === u) {
    pushMessage(state, 'midia', 'Vice', `${state.clubs[u].name} fica com o vice na ${comp.def.name}.`);
  }
}

function dailyRecovery(state: GameState) {
  const userClub = state.clubs[state.userClubId];
  const treinoBonus = state.treino === 'leve' ? 6 : state.treino === 'forte' ? -5 : 0;
  for (const club of state.clubs) {
    const base = 14 + club.ct * 2;
    const isUser = club === userClub;
    for (const id of club.playerIds) {
      const p = state.players[id];
      p.energy = Math.min(100, p.energy + base + (isUser ? treinoBonus : 0));
      if (p.injuredSlots > 0) p.injuredSlots--;
    }
  }
}

function weeklyTraining(state: GameState) {
  const club = state.clubs[state.userClubId];
  const ctMult = 0.6 + 0.1 * club.ct;
  const delta = state.treino === 'forte' ? 3 : state.treino === 'normal' ? 1.2 : -1;
  for (const id of club.playerIds) {
    const p = state.players[id];
    p.treino = clamp(p.treino + delta * ctMult, 20, 100);
    // Jovens evoluem durante a temporada com treino e CT.
    if (p.age <= 23 && p.force < p.potential) {
      p.force = Math.min(p.potential, p.force + 0.08 * ctMult * (state.treino === 'forte' ? 1.4 : state.treino === 'leve' ? 0.6 : 1));
    }
  }
}

/** Avança até o próximo jogo do usuário (sem jogá-lo). */
export function advanceToNextUserMatch(state: GameState, maxSlots = SLOTS_PER_YEAR): SlotReport[] {
  const reports: SlotReport[] = [];
  for (let i = 0; i < maxSlots; i++) {
    const fx = userFixtureAtSlot(state);
    if (fx && !fx.played) break;
    const r = playSlot(state);
    reports.push(r);
    if (r.seasonEnded || state.coach.fired) break;
  }
  return reports;
}
