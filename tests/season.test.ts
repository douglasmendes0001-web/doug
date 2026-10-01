import { describe, expect, it } from 'vitest';
import { newGame, playSlot } from '../src/engine/season';
import { SLOTS_PER_YEAR } from '../src/engine/types';

const coach = { name: 'Dougz', age: 20, exPlayer: false, career: null, titulosCarreira: false };

describe('temporada completa', () => {
  it('cria o mundo, agenda sem conflitos e joga uma temporada inteira', () => {
    const t0 = Date.now();
    const state = newGame({ seed: 42, coach, clubId: 1, settings: { halfSeconds: 15, mundialAnual: true } });
    const tCreate = Date.now() - t0;

    // Nenhum clube joga duas vezes no mesmo dia.
    const seen = new Set<string>();
    for (const f of state.fixtures) {
      for (const c of [f.home, f.away]) {
        const k = `${f.slot}:${c}`;
        expect(seen.has(k), `conflito ${state.clubs[c].name} no slot ${f.slot} (${f.compId})`).toBe(false);
        seen.add(k);
      }
    }

    const t1 = Date.now();
    let goals = 0, games = 0, homeWins = 0, draws = 0;
    for (let i = 0; i < SLOTS_PER_YEAR; i++) {
      const before = state.fixtures.filter((f) => f.slot === state.slot);
      playSlot(state);
      if (state.slot === 0) break; // temporada virou
      for (const f of before) {
        if (!f.played) continue;
        games++;
        goals += f.hg + f.ag;
        if (f.hg > f.ag) homeWins++;
        else if (f.hg === f.ag) draws++;
      }
    }
    const tSeason = Date.now() - t1;
    console.log({ clubs: state.clubs.length, players: state.players.length, tCreate, tSeason, games,
      goalsPerGame: (goals / games).toFixed(2), homeWinPct: (homeWins / games * 100).toFixed(1), drawPct: (draws / games * 100).toFixed(1) });
    expect(state.year).toBe(2027);
    const h = state.history[0];
    const name = (id?: number) => (id === undefined ? '—' : state.clubs[id].name);
    console.log('Campeões 2026:', Object.fromEntries(['BRA1', 'BRA2', 'BRA3', 'BRA4', 'COPA-BRA', 'EST-SP', 'LIB', 'SUD', 'UCL', 'UEL', 'MUN', 'ARG1-AP', 'ARG1-CL', 'ENG1', 'SCO1', 'GRE1', 'COL1-FI', 'ECU1'].map((k) => [k, name(h.champions[k])])));
    const missing = state.history[0] && Object.keys(h.champions).length;
    console.log('competições com campeão:', missing);
    expect(goals / games).toBeGreaterThan(1.8);
    expect(goals / games).toBeLessThan(3.6);
  }, 120_000);
});
