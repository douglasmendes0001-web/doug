// Consultas de classificação usadas pela interface.

import { compareRows, emptyRow, sortedTable, stageLabel } from './competitions';
import type { Competition, Fixture, GameState } from './types';

export function userLeagueComp(state: GameState): Competition | undefined {
  const club = state.clubs[state.userClubId];
  const comps = state.competitions.filter((c) => c.def.leagueId && c.def.leagueId === club.leagueId);
  return comps.find((c) => !c.finished && c.slots[0] <= state.slot) ?? comps.find((c) => !c.finished) ?? comps[comps.length - 1];
}

/** Posição do clube na fase atual (no grupo dele) ou na soma de pontos. */
export function positionIn(comp: Competition, clubId: number): number | undefined {
  const st = comp.stages[comp.stageIdx];
  const def = comp.def.stages[comp.stageIdx];
  if (def.type !== 'ko') {
    for (const table of st.tables) {
      if (table[clubId]) return sortedTable(table).findIndex((r) => r.clubId === clubId) + 1;
    }
  }
  if (!comp.aggregate[clubId]) return undefined;
  const rows = comp.teams.map((t) => comp.aggregate[t] ?? emptyRow(t)).sort(compareRows);
  return rows.findIndex((r) => r.clubId === clubId) + 1;
}

export function fixtureRoundLabel(state: GameState, fx: Fixture): string {
  const comp = state.competitions.find((c) => c.def.id === fx.compId);
  if (!comp) return '';
  const def = comp.def.stages[fx.stageIdx];
  if (def.type === 'ko') {
    const leg = fx.legs === 2 ? (fx.leg === 1 ? ' (ida)' : ' (volta)') : '';
    return `${stageLabelForFixture(comp, fx)}${leg}`;
  }
  const played = state.fixtures.filter((f) => f.compId === fx.compId && f.stageIdx === fx.stageIdx && f.slot < fx.slot && (f.home === fx.home || f.away === fx.home)).length;
  return `${def.name} - ${played + 1}ª rodada`;
}

function stageLabelForFixture(comp: Competition, fx: Fixture): string {
  const st = comp.stages[fx.stageIdx];
  for (const round of st.koRounds) {
    if (round.some((t) => t.fixtureIds.includes(fx.id))) {
      const n = round.length * 2;
      return n === 2 ? 'Final' : n === 4 ? 'Semifinal' : n === 8 ? 'Quartas de final' : n === 16 ? 'Oitavas de final' : `Fase de ${n}`;
    }
  }
  return stageLabel(comp);
}

export function topScorers(state: GameState, comp: Competition, limit = 10) {
  const goals = new Map<number, number>();
  for (const f of state.fixtures) {
    if (f.compId !== comp.def.id || !f.scorers) continue;
    for (const s of f.scorers) goals.set(s.playerId, (goals.get(s.playerId) ?? 0) + 1);
  }
  return [...goals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, g]) => ({ player: state.players[id], goals: g }));
}
