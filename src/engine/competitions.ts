// Motor genérico de competições: pontos corridos (com grupos, split e
// carregamento de pontos), mata-mata (com byes, ida e volta e final única)
// e fase de liga no formato suíço (UEFA).

import type { Rng } from './rng';
import type {
  Competition, CompetitionDef, Fixture, GameState, KOStageDef, KOTie, RRStageDef, StageDef, StageState, SwissStageDef, TableRow,
} from './types';

// ---------------- Utilidades de tabela ----------------

export function emptyRow(clubId: number): TableRow {
  return { clubId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

export function applyResult(row: TableRow, gf: number, ga: number) {
  row.p++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.w++;
    row.pts += 3;
  } else if (gf === ga) {
    row.d++;
    row.pts += 1;
  } else row.l++;
}

export function compareRows(a: TableRow, b: TableRow): number {
  return b.pts - a.pts || b.w - a.w || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.clubId - b.clubId;
}

export function sortedTable(table: Record<number, TableRow>): TableRow[] {
  return Object.values(table).sort(compareRows);
}

// ---------------- Quantidade de rodadas ----------------

function rrRoundsFor(size: number): number {
  return size % 2 === 0 ? size - 1 : size;
}

function koLegsFor(def: KOStageDef, participants: number): number {
  if (participants === 2 && def.finalSingle) return 1;
  if (def.singleLegAbove !== undefined && participants > def.singleLegAbove) return 1;
  return def.legs;
}

function nextCount(stage: StageDef, n: number): number {
  if (stage.type === 'ko') return 1;
  if (stage.type === 'swiss') return stage.advanceTotal;
  if (stage.advanceTotal) return stage.advanceTotal;
  if (stage.advance) return stage.advance * stage.groups;
  return n;
}

/** Quantos "dias de jogo" a competição precisa no calendário. */
export function roundsNeeded(def: CompetitionDef, teams: number): number {
  let n = teams;
  let total = 0;
  for (const st of def.stages) {
    if (st.type === 'rr') {
      const sizes = groupSizes(st, n);
      total += Math.max(...sizes.map(rrRoundsFor)) * st.legs;
    } else if (st.type === 'swiss') {
      total += st.matches;
    } else {
      const R = Math.ceil(Math.log2(Math.max(2, n)));
      for (let r = 0; r < R; r++) total += koLegsFor(st, Math.pow(2, R - r));
    }
    n = nextCount(st, n);
  }
  return total;
}

function groupSizes(st: RRStageDef, n: number): number[] {
  if (st.grouping === 'ranges' && st.rangeSizes) return st.rangeSizes;
  const base = Math.floor(n / st.groups);
  const extra = n % st.groups;
  return Array.from({ length: st.groups }, (_, i) => base + (i < extra ? 1 : 0));
}

// ---------------- Criação ----------------

export function createCompetition(def: CompetitionDef, teams: number[], season: number): Competition {
  return {
    def,
    season,
    teams,
    slots: [],
    slotCursor: 0,
    stageIdx: 0,
    stages: def.stages.map(() => ({ groups: [], tables: [], koRounds: [], started: false, finished: false })),
    finished: false,
    aggregate: Object.fromEntries(teams.map((t) => [t, emptyRow(t)])),
  };
}

function addFixture(state: GameState, f: Omit<Fixture, 'id' | 'played' | 'hg' | 'ag'>): Fixture {
  const fx: Fixture = { ...f, id: state.fixtures.length, played: false, hg: 0, ag: 0 };
  state.fixtures.push(fx);
  return fx;
}

function nextSlot(comp: Competition): number {
  const s = comp.slots[comp.slotCursor] ?? (comp.slots[comp.slots.length - 1] ?? 0);
  comp.slotCursor++;
  return s;
}

function makeGroups(st: RRStageDef, entrants: number[], rng: Rng, isFirstStage: boolean): number[][] {
  const g = st.groups;
  if (g === 1) return [entrants.slice()];
  const mode = st.grouping ?? (isFirstStage ? 'draw' : 'snake');
  const groups: number[][] = Array.from({ length: g }, () => []);
  if (mode === 'ranges') {
    let i = 0;
    for (let k = 0; k < g; k++) {
      const size = st.rangeSizes?.[k] ?? Math.ceil(entrants.length / g);
      groups[k] = entrants.slice(i, i + size);
      i += size;
    }
    return groups;
  }
  if (mode === 'snake') {
    entrants.forEach((t, i) => {
      const row = Math.floor(i / g);
      const col = i % g;
      groups[row % 2 === 0 ? col : g - 1 - col].push(t);
    });
    return groups;
  }
  if (mode === 'random') {
    rng.shuffle(entrants.slice()).forEach((t, i) => groups[i % g].push(t));
    return groups;
  }
  // 'draw': potes por ordem de força, um de cada pote por grupo.
  for (let i = 0; i < entrants.length; i += g) {
    const pot = rng.shuffle(entrants.slice(i, i + g));
    pot.forEach((t, k) => groups[k].push(t));
  }
  return groups;
}

/** Tabela de confrontos pelo método do círculo (turno único). */
export function circleRounds(teams: number[]): [number, number][][] {
  const arr = teams.slice();
  if (arr.length % 2 === 1) arr.push(-1);
  const n = arr.length;
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === -1 || b === -1) continue;
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  return rounds;
}

// ---------------- Início de fase ----------------

export function startStage(state: GameState, comp: Competition, stageIdx: number, entrants: number[], rng: Rng) {
  comp.stageIdx = stageIdx;
  const def = comp.def.stages[stageIdx];
  const st = comp.stages[stageIdx];
  st.started = true;
  if (def.type === 'rr') startRR(state, comp, def, st, entrants, rng, stageIdx);
  else if (def.type === 'swiss') startSwiss(state, comp, def, st, entrants, rng, stageIdx);
  else startKO(state, comp, def, st, entrants, stageIdx);
}

function startRR(state: GameState, comp: Competition, def: RRStageDef, st: StageState, entrants: number[], rng: Rng, stageIdx: number) {
  st.groups = makeGroups(def, entrants, rng, stageIdx === 0);
  const prev = stageIdx > 0 ? comp.stages[stageIdx - 1] : undefined;
  st.tables = st.groups.map((g) => {
    const t: Record<number, TableRow> = {};
    for (const c of g) {
      let row = emptyRow(c);
      if (def.carry && prev) {
        for (const pt of prev.tables) if (pt[c]) row = { ...pt[c] };
      }
      t[c] = row;
    }
    return t;
  });
  const perGroup = st.groups.map((g) => circleRounds(g));
  const maxRounds = Math.max(...perGroup.map((r) => r.length));
  const total = maxRounds * def.legs;
  const slots = Array.from({ length: total }, () => nextSlot(comp));
  perGroup.forEach((rounds, gi) => {
    for (let leg = 0; leg < def.legs; leg++) {
      rounds.forEach((pairs, r) => {
        for (const [a, b] of pairs) {
          const [home, away] = leg % 2 === 0 ? [a, b] : [b, a];
          addFixture(state, {
            compId: comp.def.id, stageIdx, slot: slots[leg * maxRounds + r], home, away, neutral: !!comp.def.neutral, group: gi,
          });
        }
      });
    }
  });
}

function startSwiss(state: GameState, comp: Competition, def: SwissStageDef, st: StageState, entrants: number[], rng: Rng, stageIdx: number) {
  st.groups = [entrants.slice()];
  st.tables = [Object.fromEntries(entrants.map((t) => [t, emptyRow(t)]))];
  const played = new Map<number, Set<number>>(entrants.map((t) => [t, new Set()]));
  const homes = new Map<number, number>(entrants.map((t) => [t, 0]));
  for (let r = 0; r < def.matches; r++) {
    const slot = nextSlot(comp);
    let pairs: [number, number][] | null = null;
    for (let attempt = 0; attempt < 400 && !pairs; attempt++) {
      const order = rng.shuffle(entrants.slice());
      const used = new Set<number>();
      const result: [number, number][] = [];
      let ok = true;
      for (const t of order) {
        if (used.has(t)) continue;
        const opp = order.find((u) => u !== t && !used.has(u) && !played.get(t)!.has(u));
        if (opp === undefined) {
          ok = false;
          break;
        }
        used.add(t).add(opp);
        result.push([t, opp]);
      }
      if (ok) pairs = result;
    }
    for (const [a, b] of pairs ?? []) {
      played.get(a)!.add(b);
      played.get(b)!.add(a);
      const [home, away] = homes.get(a)! <= homes.get(b)! ? [a, b] : [b, a];
      homes.set(home, homes.get(home)! + 1);
      addFixture(state, { compId: comp.def.id, stageIdx, slot, home, away, neutral: !!comp.def.neutral, group: 0 });
    }
  }
}

function startKO(state: GameState, comp: Competition, def: KOStageDef, st: StageState, entrants: number[], stageIdx: number) {
  const R = Math.ceil(Math.log2(Math.max(2, entrants.length)));
  const size = Math.pow(2, R);
  const byes = size - entrants.length;
  st.koSeeds = entrants.slice();
  st.koByes = entrants.slice(0, byes);
  st.koRounds = [];
  createKORound(state, comp, def, st, entrants.slice(byes), size, stageIdx);
}

function createKORound(state: GameState, comp: Competition, def: KOStageDef, st: StageState, teams: number[], participants: number, stageIdx: number) {
  const seedIdx = new Map((st.koSeeds ?? []).map((t, i) => [t, i]));
  const ordered = teams.slice().sort((a, b) => (seedIdx.get(a) ?? 999) - (seedIdx.get(b) ?? 999));
  const legs = koLegsFor(def, participants);
  const isFinal = participants === 2;
  const slots = Array.from({ length: legs }, () => nextSlot(comp));
  const ties: KOTie[] = [];
  for (let i = 0; i < ordered.length / 2; i++) {
    const a = ordered[i];
    const b = ordered[ordered.length - 1 - i];
    const tie: KOTie = { id: state.nextIds.tie++, a, b, fixtureIds: [] };
    if (legs === 1) {
      const fx = addFixture(state, {
        compId: comp.def.id, stageIdx, slot: slots[0], home: a, away: b,
        neutral: !!comp.def.neutral || (isFinal && !!def.finalNeutral), tieId: tie.id, leg: 1, legs: 1,
      });
      tie.fixtureIds.push(fx.id);
    } else {
      const f1 = addFixture(state, { compId: comp.def.id, stageIdx, slot: slots[0], home: b, away: a, neutral: !!comp.def.neutral, tieId: tie.id, leg: 1, legs: 2 });
      const f2 = addFixture(state, {
        compId: comp.def.id, stageIdx, slot: slots[1], home: a, away: b, neutral: !!comp.def.neutral, tieId: tie.id, leg: 2, legs: 2, prevLeg: f1.id,
      });
      tie.fixtureIds.push(f1.id, f2.id);
    }
    ties.push(tie);
  }
  st.koRounds.push(ties);
}

// ---------------- Resultados ----------------

/** Registra o resultado de uma partida na tabela correspondente. */
export function recordResult(state: GameState, fx: Fixture) {
  const comp = state.competitions.find((c) => c.def.id === fx.compId);
  if (!comp) return;
  const stDef = comp.def.stages[fx.stageIdx];
  if (stDef.type === 'ko') return;
  const table = comp.stages[fx.stageIdx].tables[fx.group ?? 0];
  if (table?.[fx.home] && table[fx.away]) {
    applyResult(table[fx.home], fx.hg, fx.ag);
    applyResult(table[fx.away], fx.ag, fx.hg);
  }
  if (comp.aggregate[fx.home]) applyResult(comp.aggregate[fx.home], fx.hg, fx.ag);
  if (comp.aggregate[fx.away]) applyResult(comp.aggregate[fx.away], fx.ag, fx.hg);
}

export function tieWinner(state: GameState, tie: KOTie): number | undefined {
  const fxs = tie.fixtureIds.map((id) => state.fixtures[id]);
  if (fxs.some((f) => !f.played)) return undefined;
  let ga = 0;
  let gb = 0;
  for (const f of fxs) {
    if (f.home === tie.a) {
      ga += f.hg;
      gb += f.ag;
    } else {
      ga += f.ag;
      gb += f.hg;
    }
  }
  if (ga !== gb) return ga > gb ? tie.a : tie.b;
  const last = fxs[fxs.length - 1];
  if (last.pens) {
    const homeWins = last.pens[0] > last.pens[1];
    return homeWins ? last.home : last.away;
  }
  return tie.a;
}

/** Contexto de mata-mata para o motor da partida (gols da ida). */
export function knockoutContext(state: GameState, fx: Fixture): { aggHome: number; aggAway: number } | undefined {
  if (fx.tieId === undefined) return undefined;
  if ((fx.legs ?? 1) === 1) return { aggHome: 0, aggAway: 0 };
  if (fx.leg !== fx.legs) return undefined;
  const prev = fx.prevLeg !== undefined ? state.fixtures[fx.prevLeg] : undefined;
  if (!prev) return { aggHome: 0, aggAway: 0 };
  return { aggHome: prev.home === fx.home ? prev.hg : prev.ag, aggAway: prev.home === fx.home ? prev.ag : prev.hg };
}

// ---------------- Avanço de fase ----------------

function stageFixtures(state: GameState, comp: Competition, stageIdx: number): Fixture[] {
  return state.fixtures.filter((f) => f.compId === comp.def.id && f.stageIdx === stageIdx);
}

function qualifiers(def: RRStageDef | SwissStageDef, st: StageState): number[] {
  const tables = st.tables.map(sortedTable);
  if (def.type === 'swiss') return tables[0].slice(0, def.advanceTotal).map((r) => r.clubId);
  if (def.advance) {
    const result: number[] = [];
    for (let pos = 0; pos < def.advance; pos++) {
      const rows = tables.map((t) => t[pos]).filter(Boolean).sort(compareRows);
      result.push(...rows.map((r) => r.clubId));
    }
    return result;
  }
  // Todos os grupos em sequência por posição (para advanceTotal ou "todos").
  const ranked: TableRow[] = [];
  const maxLen = Math.max(...tables.map((t) => t.length));
  for (let pos = 0; pos < maxLen; pos++) {
    ranked.push(...tables.map((t) => t[pos]).filter(Boolean).sort(compareRows));
  }
  const ids = ranked.map((r) => r.clubId);
  return def.advanceTotal ? ids.slice(0, def.advanceTotal) : ids;
}

/**
 * Depois de cada dia de jogos: encerra fases concluídas, cria a próxima fase
 * ou a próxima rodada do mata-mata. Retorna true se a competição terminou agora.
 */
export function advanceCompetition(state: GameState, comp: Competition, rng: Rng): boolean {
  if (comp.finished) return false;
  const idx = comp.stageIdx;
  const def = comp.def.stages[idx];
  const st = comp.stages[idx];
  if (!st.started) return false;

  if (def.type === 'rr' || def.type === 'swiss') {
    const fxs = stageFixtures(state, comp, idx);
    if (fxs.some((f) => !f.played)) return false;
    st.finished = true;
    const nextDef = comp.def.stages[idx + 1];
    if (!nextDef) {
      const table = sortedTable(st.tables[0]);
      comp.champion = table[0]?.clubId;
      comp.runnerUp = table[1]?.clubId;
      comp.finished = true;
      return true;
    }
    startStage(state, comp, idx + 1, qualifiers(def, st), rng);
    return false;
  }

  // Mata-mata.
  const round = st.koRounds[st.koRounds.length - 1];
  if (!round) return false;
  for (const tie of round) {
    if (tie.winner === undefined) tie.winner = tieWinner(state, tie);
  }
  if (round.some((t) => t.winner === undefined)) return false;
  if (round.length === 1) {
    st.finished = true;
    comp.champion = round[0].winner;
    comp.runnerUp = round[0].winner === round[0].a ? round[0].b : round[0].a;
    comp.finished = true;
    return true;
  }
  const winners = round.map((t) => t.winner!);
  const teams = st.koRounds.length === 1 ? (st.koByes ?? []).concat(winners) : winners;
  createKORound(state, comp, def, st, teams, teams.length, idx);
  return false;
}

// ---------------- Classificação final ----------------

/**
 * Ordem final da competição: quem foi mais longe fica na frente; dentro da
 * mesma fase vale a posição no grupo e depois a pontuação somada.
 */
export function finalRanking(comp: Competition): number[] {
  const info = new Map<number, { stage: number; ko: number; range: number; pos: number }>();
  for (const t of comp.teams) info.set(t, { stage: 0, ko: -1, range: 0, pos: 99 });
  comp.def.stages.forEach((def, si) => {
    const st = comp.stages[si];
    if (!st.started) return;
    if (def.type === 'ko') {
      st.koRounds.forEach((round, ri) => {
        for (const tie of round) {
          for (const t of [tie.a, tie.b]) {
            const i = info.get(t);
            if (i) Object.assign(i, { stage: si, ko: ri + (tie.winner === t && ri === st.koRounds.length - 1 && comp.finished ? 1 : 0) });
          }
        }
      });
      for (const t of st.koByes ?? []) {
        const i = info.get(t);
        if (i && i.stage < si) Object.assign(i, { stage: si, ko: 0 });
      }
    } else {
      st.tables.forEach((table, gi) => {
        sortedTable(table).forEach((row, pos) => {
          const i = info.get(row.clubId);
          if (i) Object.assign(i, { stage: si, ko: -1, range: def.type === 'rr' && def.grouping === 'ranges' ? gi : 0, pos });
        });
      });
    }
  });
  const agg = comp.aggregate;
  return comp.teams.slice().sort((a, b) => {
    const A = info.get(a)!;
    const B = info.get(b)!;
    return B.stage - A.stage || B.ko - A.ko || A.range - B.range || A.pos - B.pos || compareRows(agg[a] ?? emptyRow(a), agg[b] ?? emptyRow(b));
  });
}

export function aggregateRanking(comps: Competition[], teams: number[]): number[] {
  const rows = new Map<number, TableRow>(teams.map((t) => [t, emptyRow(t)]));
  for (const c of comps) {
    for (const t of teams) {
      const r = c.aggregate[t];
      const acc = rows.get(t)!;
      if (r) {
        acc.p += r.p; acc.w += r.w; acc.d += r.d; acc.l += r.l; acc.gf += r.gf; acc.ga += r.ga; acc.pts += r.pts;
      }
    }
  }
  return [...rows.values()].sort(compareRows).map((r) => r.clubId);
}

export function stageLabel(comp: Competition): string {
  if (comp.finished) return 'Encerrado';
  const def = comp.def.stages[comp.stageIdx];
  const st = comp.stages[comp.stageIdx];
  if (def.type === 'ko') {
    const round = st.koRounds[st.koRounds.length - 1];
    const n = round ? round.length * 2 : 0;
    return koRoundName(n);
  }
  return def.name;
}

export function koRoundName(participants: number): string {
  switch (participants) {
    case 2: return 'Final';
    case 4: return 'Semifinal';
    case 8: return 'Quartas de final';
    case 16: return 'Oitavas de final';
    default: return `Fase de ${participants}`;
  }
}
