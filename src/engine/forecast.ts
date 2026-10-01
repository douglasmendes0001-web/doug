// Previsão (Monte Carlo): simula o restante de uma competição centenas de
// vezes com um modelo rápido de gols (Poisson) baseado na força dos elencos.
// Usada para a "Previsão da Libertadores" e para projeções de tabela.

import { applyResult, emptyRow, makeGroups, qualifiers, sortedTable, tieWinner } from './competitions';
import { softRatio } from './match';
import { Rng } from './rng';
import type { Competition, GameState, KOStageDef, RRStageDef, TableRow } from './types';

const STAR_MULT = [1, 0.99, 1, 1.015, 1.05, 1.08, 1.12, 1.17];

export interface ForecastRow {
  clubId: number;
  /** Probabilidade de título (0-1). */
  title: number;
  /** Probabilidade de passar da fase atual. */
  advance: number;
  /** Probabilidade de terminar entre os `topN` (ligas). */
  top: number;
  /** Probabilidade de terminar nas `bottomN` últimas posições (ligas). */
  bottom: number;
}

function strengths(state: GameState, teams: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const t of teams) {
    const top = state.clubs[t].playerIds
      .map((id) => state.players[id])
      .filter((p) => !p.retired && p.injuredSlots <= 0)
      .map((p) => p.force * (STAR_MULT[p.stars] ?? 1))
      .sort((a, b) => b - a)
      .slice(0, 11);
    m.set(t, top.reduce((s, f) => s + f, 0) / Math.max(1, top.length));
  }
  return m;
}

function poisson(rng: Rng, l: number): number {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 12);
  return k - 1;
}

export function forecastCompetition(
  state: GameState, comp: Competition, runs = 400, opts: { topN?: number; bottomN?: number } = {},
): ForecastRow[] {
  const rng = new Rng((state.seed ^ (state.slot * 7919)) | 0);
  const str = strengths(state, comp.teams);
  const game = (a: number, b: number, neutral: boolean): [number, number] => {
    const r = Math.pow(softRatio((str.get(a) ?? 1) / Math.max(1, str.get(b) ?? 1)), 0.75);
    return [poisson(rng, 1.3 * r * (neutral ? 1 : 1.1)), poisson(rng, (1.3 / r) * (neutral ? 1 : 0.9))];
  };
  const coin = (a: number, b: number) => (rng.next() < (str.get(a) ?? 1) / ((str.get(a) ?? 1) + (str.get(b) ?? 1)) ? a : b);

  const titles = new Map<number, number>();
  const adv = new Map<number, number>();
  const tops = new Map<number, number>();
  const bots = new Map<number, number>();
  const inc = (m: Map<number, number>, k: number) => m.set(k, (m.get(k) ?? 0) + 1);

  if (comp.finished && comp.champion !== undefined) {
    return comp.teams.map((t) => ({ clubId: t, title: t === comp.champion ? 1 : 0, advance: 0, top: 0, bottom: 0 }));
  }

  const si0 = comp.stageIdx;
  for (let run = 0; run < runs; run++) {
    let entrants: number[] = [];
    let prevTables: Record<number, TableRow>[] | undefined;
    let champion: number | undefined;
    for (let si = si0; si < comp.def.stages.length && champion === undefined; si++) {
      const def = comp.def.stages[si];
      const st = comp.stages[si];
      if (def.type === 'rr' || def.type === 'swiss') {
        let tables: Record<number, TableRow>[];
        if (si === si0) {
          tables = st.tables.map((t) => Object.fromEntries(Object.entries(t).map(([k, r]) => [k, { ...r }])));
          for (const f of state.fixtures) {
            if (f.compId !== comp.def.id || f.stageIdx !== si || f.played) continue;
            const [hg, ag] = game(f.home, f.away, f.neutral);
            const t = tables[f.group ?? 0];
            if (t[f.home] && t[f.away]) {
              applyResult(t[f.home], hg, ag);
              applyResult(t[f.away], ag, hg);
            }
          }
        } else {
          const rr = def as RRStageDef;
          const groups = makeGroups(rr, entrants, rng, false);
          tables = groups.map((g) => {
            const t: Record<number, TableRow> = {};
            for (const c of g) {
              let row = emptyRow(c);
              if (rr.carry && prevTables) for (const pt of prevTables) if (pt[c]) row = { ...pt[c] };
              t[c] = row;
            }
            for (let leg = 0; leg < rr.legs; leg++) {
              for (let i = 0; i < g.length; i++) {
                for (let j = i + 1; j < g.length; j++) {
                  const [h, a] = leg % 2 === 0 ? [g[i], g[j]] : [g[j], g[i]];
                  const [hg, ag] = game(h, a, !!comp.def.neutral);
                  applyResult(t[h], hg, ag);
                  applyResult(t[a], ag, hg);
                }
              }
            }
            return t;
          });
        }
        prevTables = tables;
        const next = comp.def.stages[si + 1];
        if (si === si0 && opts.topN !== undefined && !next) {
          const order = sortedTable(tables[0]).map((r) => r.clubId);
          order.slice(0, opts.topN).forEach((t) => inc(tops, t));
          if (opts.bottomN) order.slice(-opts.bottomN).forEach((t) => inc(bots, t));
        }
        if (!next) {
          champion = sortedTable(tables[0])[0]?.clubId;
          break;
        }
        entrants = qualifiers(def, { tables });
        if (si === si0) entrants.forEach((t) => inc(adv, t));
        continue;
      }

      // Mata-mata.
      const ko = def as KOStageDef;
      const legsFor = (p: number) => (p === 2 && ko.finalSingle ? 1 : ko.singleLegAbove !== undefined && p > ko.singleLegAbove ? 1 : ko.legs);
      const playTie = (a: number, b: number, p: number, playedA = 0, playedB = 0, legsPlayed = 0): number => {
        const legs = legsFor(p);
        let ga = playedA;
        let gb = playedB;
        for (let l = legsPlayed; l < legs; l++) {
          const neutral = !!comp.def.neutral || (p === 2 && !!ko.finalNeutral && legs === 1);
          const [x, y] = legs === 2 && l === 0 ? game(b, a, neutral) : game(a, b, neutral);
          if (legs === 2 && l === 0) {
            ga += y;
            gb += x;
          } else {
            ga += x;
            gb += y;
          }
        }
        return ga === gb ? coin(a, b) : ga > gb ? a : b;
      };
      let seeds: number[];
      let current: number[];
      let participants: number;
      if (si === si0 && st.koRounds.length) {
        seeds = st.koSeeds ?? comp.teams;
        const round = st.koRounds[st.koRounds.length - 1];
        participants = round.length * 2 + (st.koRounds.length === 1 ? st.koByes?.length ?? 0 : 0);
        current = round.map((t) => {
          const w = t.winner ?? tieWinner(state, t);
          if (w !== undefined) return w;
          let ga = 0, gb = 0, lp = 0;
          for (const id of t.fixtureIds) {
            const f = state.fixtures[id];
            if (!f.played) continue;
            lp++;
            if (f.home === t.a) { ga += f.hg; gb += f.ag; } else { ga += f.ag; gb += f.hg; }
          }
          return playTie(t.a, t.b, participants, ga, gb, lp);
        });
        if (st.koRounds.length === 1 && st.koByes?.length) current = st.koByes.concat(current);
        participants /= 2;
        if (si === si0) current.forEach((t) => inc(adv, t));
      } else {
        seeds = entrants;
        const R = Math.ceil(Math.log2(Math.max(2, entrants.length)));
        const size = Math.pow(2, R);
        const byes = size - entrants.length;
        const first = entrants.slice(byes);
        const w: number[] = [];
        for (let i = 0; i < first.length / 2; i++) w.push(playTie(first[i], first[first.length - 1 - i], size));
        current = entrants.slice(0, byes).concat(w);
        participants = size / 2;
      }
      const seedIdx = new Map(seeds.map((t, i) => [t, i]));
      while (current.length > 1) {
        const ordered = current.slice().sort((a, b) => (seedIdx.get(a) ?? 999) - (seedIdx.get(b) ?? 999));
        const next: number[] = [];
        for (let i = 0; i < ordered.length / 2; i++) next.push(playTie(ordered[i], ordered[ordered.length - 1 - i], participants));
        current = next;
        participants /= 2;
      }
      champion = current[0];
    }
    if (champion !== undefined) inc(titles, champion);
  }
  return comp.teams
    .map((t) => ({
      clubId: t,
      title: (titles.get(t) ?? 0) / runs,
      advance: (adv.get(t) ?? 0) / runs,
      top: (tops.get(t) ?? 0) / runs,
      bottom: (bots.get(t) ?? 0) / runs,
    }))
    .sort((a, b) => b.title - a.title || b.advance - a.advance || b.top - a.top);
}
