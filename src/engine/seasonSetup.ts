// Monta as competições de uma temporada: ligas, copas nacionais, estaduais,
// torneios continentais e o Mundial de Clubes.

import { PREMIO_CONTINENTAL, cupPrize, estadualPrize, leaguePrize } from './economy';
import { NOMES_ESTADUAIS } from './data/brasil';
import { COPAS, LIGAS, VAGAS_CONMEBOL, VAGAS_UEFA } from './data/ligas';
import { createCompetition } from './competitions';
import type { Club, Competition, CompetitionDef, Confed, CountryCode, GameState, StageDef } from './types';

const byStrength = (a: Club, b: Club) => b.baseForce - a.baseForce;

export const PRIMEIRO_MUNDIAL = 2029;

export function isMundialYear(state: GameState): boolean {
  return state.settings.mundialAnual || (state.year >= PRIMEIRO_MUNDIAL && (state.year - PRIMEIRO_MUNDIAL) % 4 === 0);
}

export function buildSeasonCompetitions(state: GameState): Competition[] {
  const comps: Competition[] = [];
  const clubs = state.clubs;

  // ---- Ligas ----
  for (const l of LIGAS) {
    const teams = clubs.filter((c) => c.leagueId === l.id).sort(byStrength).map((c) => c.id);
    for (const t of l.tournaments) {
      const def: CompetitionDef = {
        id: t.suffix ? `${l.id}-${t.suffix}` : l.id,
        name: t.name, short: t.short, kind: 'liga', country: l.country, tier: l.tier,
        stages: t.stages, window: t.window, prefer: 'fds',
        track: `${l.country}-liga${t.suffix}`,
        prize: leaguePrize(l.id), leagueId: l.id,
      };
      comps.push(createCompetition(def, teams, state.year));
    }
  }

  // ---- Copas nacionais ----
  for (const cup of COPAS) {
    const teams = clubs
      .filter((c) => c.country === cup.country && c.leagueId)
      .sort((a, b) => a.tier - b.tier || b.baseForce - a.baseForce)
      .slice(0, cup.size)
      .map((c) => c.id);
    comps.push(createCompetition({
      id: `COPA-${cup.country}`, name: cup.name, short: cup.short, kind: 'copa', country: cup.country,
      stages: cup.stages, window: [6, 49], prefer: 'meio', track: `${cup.country}-copa`, prize: cupPrize(cup.country),
    }, teams, state.year));
  }

  // ---- Estaduais ----
  const porUF = new Map<string, Club[]>();
  for (const c of clubs) if (c.country === 'BRA' && c.state) porUF.set(c.state, [...(porUF.get(c.state) ?? []), c]);
  for (const [uf, list] of porUF) {
    const size = uf === 'SP' ? 16 : Math.min(12, list.length);
    const teams = list.sort((a, b) => a.tier - b.tier || b.baseForce - a.baseForce).slice(0, size).map((c) => c.id);
    const stages: StageDef[] = [
      { type: 'rr', name: 'Primeira fase', groups: 1, legs: 1, advanceTotal: size >= 16 ? 8 : 4 },
      { type: 'ko', name: 'Mata-mata', legs: 2, singleLegAbove: 2 },
    ];
    comps.push(createCompetition({
      id: `EST-${uf}`, name: `Campeonato ${NOMES_ESTADUAIS[uf] ?? uf}`, short: `Estadual ${uf}`, kind: 'estadual', country: 'BRA',
      stages, window: [0, 13], prefer: 'any', track: 'BRA-est', prize: estadualPrize(uf),
    }, teams, state.year));
  }

  // ---- Continentais ----
  const q = state.qualifications ?? initialQualifications(state);
  const groupsKO = (name: string): StageDef[] => [
    { type: 'rr', name: 'Fase de grupos', groups: 8, legs: 2, grouping: 'draw', advance: 2 },
    { type: 'ko', name, legs: 2, finalSingle: true, finalNeutral: true },
  ];
  const swiss = (): StageDef[] => [
    { type: 'swiss', name: 'Fase de liga', matches: 8, advanceTotal: 24 },
    { type: 'ko', name: 'Mata-mata', legs: 2, finalSingle: true, finalNeutral: true },
  ];
  const cont = (id: string, name: string, short: string, confed: Confed, stages: StageDef[], window: [number, number], prize: number) => {
    const teams = (q[id] ?? []).filter((t) => clubs[t]).sort((a, b) => clubs[b].baseForce - clubs[a].baseForce);
    if (teams.length >= 8) {
      comps.push(createCompetition({ id, name, short, kind: 'continental', confed, stages, window, prefer: 'meio', track: confed, prize }, teams, state.year));
    }
  };
  cont('LIB', 'Copa Libertadores', 'Libertadores', 'CONMEBOL', groupsKO('Mata-mata'), [8, 47], PREMIO_CONTINENTAL.LIB);
  cont('SUD', 'Copa Sul-Americana', 'Sul-Americana', 'CONMEBOL', groupsKO('Mata-mata'), [8, 47], PREMIO_CONTINENTAL.SUD);
  cont('UCL', 'Liga dos Campeões', 'Champions', 'UEFA', swiss(), [6, 46], PREMIO_CONTINENTAL.UCL);
  cont('UEL', 'Liga Europa', 'Liga Europa', 'UEFA', swiss(), [6, 46], PREMIO_CONTINENTAL.UEL);
  cont('UECL', 'Liga Conferência', 'Conference', 'UEFA', swiss(), [6, 46], PREMIO_CONTINENTAL.UECL);

  // ---- Mundial de Clubes ----
  if (isMundialYear(state)) {
    const { teams, host } = mundialParticipants(state);
    comps.push(createCompetition({
      id: 'MUN', name: 'Copa do Mundo de Clubes', short: 'Mundial', kind: 'mundial',
      stages: [
        { type: 'rr', name: 'Fase de grupos', groups: 8, legs: 1, grouping: 'draw', advance: 2 },
        { type: 'ko', name: 'Mata-mata', legs: 1 },
      ],
      window: [26, 30], prefer: 'any', track: 'FIFA', prize: PREMIO_CONTINENTAL.MUN, neutral: true, venueClubId: host,
    }, teams, state.year));
  }
  return comps;
}

/** Na primeira temporada, as vagas continentais seguem a força dos clubes. */
export function initialQualifications(state: GameState): Record<string, number[]> {
  const res: Record<string, number[]> = { LIB: [], SUD: [], UCL: [], UEL: [], UECL: [] };
  const topOf = (country: CountryCode) =>
    state.clubs.filter((c) => c.country === country && (c.tier === 1 || c.tier === 0)).sort(byStrength).map((c) => c.id);
  for (const [country, v] of Object.entries(VAGAS_CONMEBOL) as [CountryCode, { lib: number; sud: number }][]) {
    const list = topOf(country);
    res.LIB.push(...list.slice(0, v.lib));
    res.SUD.push(...list.slice(v.lib, v.lib + v.sud));
  }
  for (const [country, v] of Object.entries(VAGAS_UEFA) as [CountryCode, { ucl: number; uel: number; uecl: number }][]) {
    const list = topOf(country);
    res.UCL.push(...list.slice(0, v.ucl));
    res.UEL.push(...list.slice(v.ucl, v.ucl + v.uel));
    res.UECL.push(...list.slice(v.ucl + v.uel, v.ucl + v.uel + v.uecl));
  }
  return res;
}

const HOST_ROTATION: Confed[] = ['CONCACAF', 'AFC', 'CAF'];

/**
 * Critério atual da FIFA (32 clubes): UEFA 12, CONMEBOL 6, AFC 4, CAF 4,
 * CONCACAF 4, OFC 1 e 1 do país-sede. Campeões continentais dos últimos 4
 * anos entram primeiro; o restante pelo ranking (máx. 2 por país).
 */
function mundialParticipants(state: GameState): { teams: number[]; host: number } {
  const clubs = state.clubs;
  const recent = state.history.slice(-4);
  const chosen: number[] = [];
  const pickConfed = (confed: Confed, slots: number, champKey?: string) => {
    const list: number[] = [];
    if (champKey) {
      for (const h of recent) {
        const c = h.champions[champKey];
        if (c !== undefined && !list.includes(c)) list.push(c);
      }
    }
    const perCountry = new Map<string, number>();
    for (const id of list) perCountry.set(clubs[id].country, (perCountry.get(clubs[id].country) ?? 0) + 1);
    const pool = clubs.filter((c) => c.confed === confed && (c.tier === 1 || c.tier === 0)).sort(byStrength);
    for (const c of pool) {
      if (list.length >= slots) break;
      if (list.includes(c.id)) continue;
      if ((perCountry.get(c.country) ?? 0) >= 2) continue;
      list.push(c.id);
      perCountry.set(c.country, (perCountry.get(c.country) ?? 0) + 1);
    }
    chosen.push(...list.slice(0, slots));
  };
  pickConfed('UEFA', 12, 'UCL');
  pickConfed('CONMEBOL', 6, 'LIB');
  pickConfed('AFC', 4);
  pickConfed('CAF', 4);
  pickConfed('CONCACAF', 4);
  pickConfed('OFC', 1);
  const hostConfed = HOST_ROTATION[state.mundialEdition % HOST_ROTATION.length];
  const hostPool = clubs.filter((c) => c.confed === hostConfed && !chosen.includes(c.id)).sort(byStrength);
  const host = hostPool[0]?.id ?? chosen[chosen.length - 1];
  if (hostPool[0]) chosen.push(host);
  return { teams: chosen, host };
}
