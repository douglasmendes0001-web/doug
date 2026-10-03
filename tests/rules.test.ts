import { describe, expect, it } from 'vitest';
import { ageWarning, createCoach, initialExperience, initialRespeito } from '../src/engine/coach';
import { createCompetition, roundsNeeded, startStage, advanceCompetition } from '../src/engine/competitions';
import { LIGAS } from '../src/engine/data/ligas';
import { createPlayer } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { newGame, playSlot } from '../src/engine/season';
import type { CompetitionDef, GameState } from '../src/engine/types';

describe('técnico', () => {
  it('idade e carreira como jogador definem a experiência inicial', () => {
    const jovem = initialExperience({ name: 'A', age: 20, exPlayer: false, career: null, titulosCarreira: false });
    const exJogador = initialExperience({ name: 'B', age: 40, exPlayer: true, career: 'variosClubes', titulosCarreira: true });
    const semCarreira = initialExperience({ name: 'C', age: 40, exPlayer: false, career: null, titulosCarreira: false });
    // Quem não foi jogador começa com 10/100 dos 20 aos 35 anos.
    expect(jovem).toBe(10);
    expect(initialExperience({ name: 'D', age: 35, exPlayer: false, career: null, titulosCarreira: false })).toBe(10);
    expect(semCarreira).toBeGreaterThan(10);
    expect(exJogador).toBeGreaterThan(semCarreira);
  });

  it('abaixo de 30 anos não pode ter sido jogador', () => {
    const c = createCoach({ name: 'A', age: 25, exPlayer: true, career: 'umClube', titulosCarreira: true }, 0);
    expect(c.exPlayer).toBe(false);
    expect(c.titulosCarreira).toBe(false);
  });

  it('veteranos respeitam menos um técnico jovem do que um experiente', () => {
    const rng = new Rng(1);
    const veterano = createPlayer(rng, 0, 0, 'BRA', 'ZG', 50, { age: 34 });
    veterano.personality = 'tranquilo';
    const jovem = createCoach({ name: 'J', age: 20, exPlayer: false, career: null, titulosCarreira: false }, 0);
    const velho = createCoach({ name: 'V', age: 55, exPlayer: true, career: 'variosClubes', titulosCarreira: true }, 0);
    expect(initialRespeito(jovem, veterano)).toBeLessThan(initialRespeito(velho, veterano) - 20);
    expect(ageWarning(20)).toMatch(/influencia/);
  });
});

describe('competições', () => {
  const fakeState = (): GameState => ({ fixtures: [], nextIds: { tie: 0 }, competitions: [] } as unknown as GameState);

  it('mata-mata com byes para número de times que não é potência de 2', () => {
    const def: CompetitionDef = {
      id: 'X', name: 'Copa', short: 'Copa', kind: 'copa', stages: [{ type: 'ko', name: 'KO', legs: 1 }],
      window: [0, 51], prefer: 'any', track: 'BRA-copa', prize: 0,
    };
    const teams = Array.from({ length: 26 }, (_, i) => i);
    const state = fakeState();
    const comp = createCompetition(def, teams, 2026);
    comp.slots = Array.from({ length: roundsNeeded(def, teams.length) }, (_, i) => i);
    state.competitions.push(comp);
    const rng = new Rng(3);
    startStage(state, comp, 0, teams, rng);
    // 26 times -> chave de 32 -> 6 byes, 10 jogos na 1ª fase.
    expect(comp.stages[0].koByes?.length).toBe(6);
    expect(state.fixtures.length).toBe(10);
    let guard = 0;
    while (!comp.finished && guard++ < 20) {
      for (const f of state.fixtures) if (!f.played) { f.played = true; f.hg = 1; f.ag = 0; }
      advanceCompetition(state, comp, rng);
    }
    expect(comp.champion).toBeDefined();
  });

  it('fase de liga suíça: 36 times, 8 jogos cada, sem repetir adversário', () => {
    const def: CompetitionDef = {
      id: 'UCL', name: 'Liga dos Campeões', short: 'UCL', kind: 'continental',
      stages: [{ type: 'swiss', name: 'Fase de liga', matches: 8, advanceTotal: 24 }, { type: 'ko', name: 'KO', legs: 2, finalSingle: true }],
      window: [0, 51], prefer: 'any', track: 'UEFA', prize: 0,
    };
    const teams = Array.from({ length: 36 }, (_, i) => i);
    const state = fakeState();
    const comp = createCompetition(def, teams, 2026);
    comp.slots = Array.from({ length: roundsNeeded(def, 36) }, (_, i) => i);
    state.competitions.push(comp);
    startStage(state, comp, 0, teams, new Rng(9));
    const games = new Map<number, Set<number>>();
    for (const f of state.fixtures) {
      for (const [a, b] of [[f.home, f.away], [f.away, f.home]]) {
        const s = games.get(a) ?? new Set();
        expect(s.has(b)).toBe(false);
        s.add(b);
        games.set(a, s);
      }
    }
    for (const t of teams) expect(games.get(t)!.size).toBe(8);
  });

  it('formatos das ligas têm o número de clubes pesquisado', () => {
    const state = newGame({ seed: 5, coach: { name: 'T', age: 40, exPlayer: false, career: null, titulosCarreira: false }, clubId: 0, settings: { halfSeconds: 15, mundialAnual: false } });
    const count = (id: string) => state.clubs.filter((c) => c.leagueId === id).length;
    expect(count('BRA1')).toBe(20);
    expect(count('BRA4')).toBe(96);
    expect(count('ARG1')).toBe(30);
    expect(count('ECU1')).toBe(16);
    expect(count('SCO1')).toBe(12);
    expect(count('TUR1')).toBe(18);
    expect(count('GRE1')).toBe(14);
    expect(count('USA1')).toBe(30);
    expect(count('MEX1')).toBe(18);
    expect(count('CAN1')).toBe(8);
    expect(LIGAS.length).toBe(37);
  });
});

describe('várias temporadas', () => {
  it('acesso/rebaixamento mantêm o tamanho das ligas e o Mundial usa os campeões', () => {
    const state = newGame({ seed: 77, coach: { name: 'T', age: 45, exPlayer: true, career: 'umClube', titulosCarreira: false }, clubId: 3, settings: { halfSeconds: 15, mundialAnual: true } });
    const sizes = Object.fromEntries(LIGAS.map((l) => [l.id, state.clubs.filter((c) => c.leagueId === l.id).length]));
    const before = new Set(state.clubs.filter((c) => c.leagueId === 'BRA1').map((c) => c.id));
    for (let i = 0; i < 104; i++) playSlot(state);
    expect(state.year).toBe(2027);
    for (const l of LIGAS) expect(state.clubs.filter((c) => c.leagueId === l.id).length).toBe(sizes[l.id]);
    const after = state.clubs.filter((c) => c.leagueId === 'BRA1').map((c) => c.id);
    expect(after.filter((id) => !before.has(id)).length).toBe(4);
    const mun = state.competitions.find((c) => c.def.id === 'MUN')!;
    expect(mun.teams.length).toBe(32);
    expect(mun.teams).toContain(state.history[0].champions.UCL);
    expect(mun.teams).toContain(state.history[0].champions.LIB);
    expect(state.competitions.find((c) => c.def.id === 'LIB')!.teams.length).toBe(32);
    expect(state.competitions.find((c) => c.def.id === 'UCL')!.teams.length).toBe(36);
  }, 120_000);
});
