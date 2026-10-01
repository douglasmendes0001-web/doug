// Virada de temporada: campeões, acesso/rebaixamento, vagas continentais,
// evolução/aposentadoria dos jogadores e avaliação do técnico.

import { initialRespeito } from './coach';
import { aggregateRanking, finalRanking } from './competitions';
import { LIGAS, VAGAS_CONMEBOL, VAGAS_UEFA, lowerLeague, type LeagueSeed } from './data/ligas';
import { pushMessage } from './inbox';
import { autoLineup } from './lineup';
import { SQUAD_TEMPLATE, createPlayer, marketValue, monthlySalary } from './players';
import { Rng, clamp } from './rng';
import type { Competition, CountryCode, GameState } from './types';

function leagueComps(state: GameState, l: LeagueSeed): Competition[] {
  return state.competitions.filter((c) => c.def.leagueId === l.id);
}

/** Ordem final de uma liga nacional (considera tabela anual quando aplicável). */
export function leagueRanking(state: GameState, l: LeagueSeed): number[] {
  const comps = leagueComps(state, l);
  if (!comps.length) return [];
  if (l.relegationBasis === 'aggregate' || comps.length > 1) return aggregateRanking(comps, comps[0].teams);
  return finalRanking(comps[0]);
}

export function endSeason(state: GameState) {
  const rng = new Rng(state.rng);
  const champions: Record<string, number> = {};
  for (const c of state.competitions) if (c.champion !== undefined) champions[c.def.id] = c.champion;
  state.history.push({ year: state.year, champions });
  if (state.competitions.some((c) => c.def.id === 'MUN')) state.mundialEdition++;

  evaluateCoach(state);
  const qualifications = computeQualifications(state);
  promotionRelegation(state);
  state.qualifications = qualifications;
  developPlayers(state, rng);
  for (const club of state.clubs) {
    const top = club.playerIds.map((id) => state.players[id].force).sort((a, b) => b - a).slice(0, 16);
    if (top.length) club.baseForce = top.reduce((s, f) => s + f, 0) / top.length;
  }
  state.coach.age++;
  state.coach.experience = clamp(state.coach.experience + 2, 0, 100);
  state.year++;
  state.rng = rng.state;
  state.lineup = autoLineup(state.clubs[state.userClubId].playerIds.map((id) => state.players[id]), state.lineup.formation);
}

function evaluateCoach(state: GameState) {
  const club = state.clubs[state.userClubId];
  const l = LIGAS.find((x) => x.id === club.leagueId);
  if (!l || state.objectiveRank === undefined) return;
  const ranking = leagueRanking(state, l);
  const pos = ranking.indexOf(club.id) + 1;
  if (pos <= 0) return;
  const ok = pos <= state.objectiveRank;
  state.coach.confDiretoria = clamp(state.coach.confDiretoria + (ok ? 15 : -20), 0, 100);
  pushMessage(state, 'diretoria', `Balanço da temporada ${state.year}`,
    ok
      ? `Objetivo cumprido: terminamos em ${pos}º. A diretoria renova a confiança no seu trabalho.`
      : `Terminamos em ${pos}º e o objetivo era ${state.seasonObjective?.toLowerCase()}. A cobrança vai aumentar.`);
  if (!ok && state.coach.confDiretoria <= 10) {
    state.coach.fired = true;
    pushMessage(state, 'diretoria', 'Você foi demitido', `Sem cumprir o objetivo, a diretoria decidiu trocar o comando técnico.`);
  }
}

function promotionRelegation(state: GameState) {
  const moves: { clubId: number; leagueId: string; tier: number }[] = [];
  for (const l of LIGAS) {
    const lower = lowerLeague(l);
    if (!l.swap || !lower) continue;
    const up = leagueRanking(state, l);
    const down = leagueRanking(state, lower);
    const relegated = up.slice(-l.swap);
    const promoted = down.slice(0, l.swap);
    for (const id of relegated) moves.push({ clubId: id, leagueId: lower.id, tier: lower.tier });
    for (const id of promoted) moves.push({ clubId: id, leagueId: l.id, tier: l.tier });
  }
  const u = state.userClubId;
  for (const m of moves) {
    const club = state.clubs[m.clubId];
    const promotedUp = m.tier < club.tier;
    club.leagueId = m.leagueId;
    club.tier = m.tier;
    club.reputation = clamp(club.reputation + (promotedUp ? 8 : -8), 5, 100);
    if (m.clubId === u) {
      pushMessage(state, promotedUp ? 'torcida' : 'diretoria', promotedUp ? 'ACESSO!' : 'Rebaixamento',
        promotedUp
          ? `Subimos! O ${club.name} está de volta a uma divisão maior. Obrigado, ${state.coach.name}!`
          : `O ${club.name} foi rebaixado. Um dia triste para a nossa história.`);
      if (!promotedUp) state.coach.confDiretoria = clamp(state.coach.confDiretoria - 25, 0, 100);
      else state.coach.confDiretoria = clamp(state.coach.confDiretoria + 20, 0, 100);
    }
  }
}

function computeQualifications(state: GameState): Record<string, number[]> {
  const res: Record<string, number[]> = { LIB: [], SUD: [], UCL: [], UEL: [], UECL: [] };
  const rankingOf = (country: CountryCode): number[] => {
    const l = LIGAS.find((x) => x.country === country && x.tier === 1);
    if (l) {
      const ranking = leagueRanking(state, l);
      // Campeão da copa nacional garante vaga na Libertadores (se for da elite).
      const cup = state.competitions.find((c) => c.def.id === `COPA-${country}`);
      if (cup?.champion !== undefined && ranking.includes(cup.champion)) {
        return [cup.champion, ...ranking.filter((t) => t !== cup.champion)];
      }
      return ranking;
    }
    // Países sem liga simulada: ranking por força com alguma variação.
    return state.clubs
      .filter((c) => c.country === country && c.tier === 0)
      .map((c) => ({ id: c.id, k: c.baseForce + ((c.id * 37 + state.year * 11) % 9) }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.id);
  };
  for (const [country, v] of Object.entries(VAGAS_CONMEBOL) as [CountryCode, { lib: number; sud: number }][]) {
    const r = rankingOf(country);
    res.LIB.push(...r.slice(0, v.lib));
    res.SUD.push(...r.slice(v.lib, v.lib + v.sud));
  }
  for (const [country, v] of Object.entries(VAGAS_UEFA) as [CountryCode, { ucl: number; uel: number; uecl: number }][]) {
    const r = rankingOf(country).filter((t) => state.clubs[t].tier === 1);
    res.UCL.push(...r.slice(0, v.ucl));
    res.UEL.push(...r.slice(v.ucl, v.ucl + v.uel));
    res.UECL.push(...r.slice(v.ucl + v.uel, v.ucl + v.uel + v.uecl));
  }
  return res;
}

function developPlayers(state: GameState, rng: Rng) {
  for (const club of state.clubs) {
    const ctMult = 0.8 + 0.1 * club.ct;
    for (const id of [...club.playerIds]) {
      const p = state.players[id];
      const play = clamp(p.seasonGames / 25, 0.5, 1.2);
      if (p.age <= 23) p.force += (p.potential - p.force) * rng.range(0.15, 0.4) * ctMult * play;
      else if (p.age <= 29) p.force += rng.range(-1, 1.5);
      else if (p.age <= 32) p.force -= rng.range(0, 2);
      else p.force -= rng.range(1, 4);
      p.force = Math.round(clamp(p.force, 1, 135));
      p.age++;
      p.value = marketValue(p.force, p.age);
      p.salary = Math.max(p.salary, monthlySalary(p.value) * 0.8);
      p.seasonGoals = 0;
      p.seasonGames = 0;
      p.yellowCards = 0;
      p.suspendedGames = 0;
      p.energy = 100;
      const retireP = p.age >= 39 ? 1 : p.age >= 34 ? (p.age - 33) * 0.2 : 0;
      if (rng.chance(retireP)) {
        p.retired = true;
        club.playerIds = club.playerIds.filter((x) => x !== id);
        if (club.id === state.userClubId) {
          pushMessage(state, 'midia', 'Aposentadoria', `${p.name}, ${p.age} anos, anuncia o fim da carreira.`);
        }
      }
    }
    // Base: repõe o elenco com jovens.
    let i = 0;
    while (club.playerIds.length < 22) {
      const pos = SQUAD_TEMPLATE[(club.playerIds.length + i++) % SQUAD_TEMPLATE.length];
      const young = createPlayer(rng, state.players.length, club.id, club.country, pos, club.baseForce * 0.85, { age: rng.int(17, 19), reserve: true });
      if (club.id === state.userClubId) young.respeito = initialRespeito(state.coach, young);
      state.players.push(young);
      club.playerIds.push(young.id);
      if (club.id === state.userClubId) {
        pushMessage(state, 'diretoria', 'Promessa da base', `${young.name} (${young.pos}, ${young.age} anos) foi promovido das categorias de base.`);
      }
    }
  }
  state.nextIds.player = state.players.length;
}

// ---------------- Carreira (demissão e novas propostas) ----------------

export function jobOffers(state: GameState): number[] {
  const current = state.clubs[state.userClubId];
  const prestigeLimit = clamp(current.reputation - 10 + state.coach.titles.length * 5, 20, 95);
  const candidates = state.clubs.filter((c) => c.id !== current.id && c.leagueId && c.reputation <= prestigeLimit);
  const rng = new Rng(state.rng ^ 0x5f3759df);
  return rng.shuffle(candidates.slice()).slice(0, 4).map((c) => c.id);
}

export function takeJob(state: GameState, clubId: number) {
  const coach = state.coach;
  coach.clubId = clubId;
  coach.fired = false;
  coach.confDiretoria = 60;
  coach.confTorcida = 50;
  state.userClubId = clubId;
  for (const id of state.clubs[clubId].playerIds) state.players[id].respeito = initialRespeito(coach, state.players[id]);
  state.lineup = autoLineup(state.clubs[clubId].playerIds.map((id) => state.players[id]), '4-4-2');
  pushMessage(state, 'diretoria', 'Bem-vindo', `Seja bem-vindo ao ${state.clubs[clubId].name}, ${coach.name}. Contamos com você.`);
}
