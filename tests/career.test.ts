import { describe, expect, it } from 'vitest';
import { IDADE_TETO, careerTotals, stintSeasonEnd } from '../src/engine/career';
import { createCoach, initialExperience } from '../src/engine/coach';
import { endSeason, heirOf, retirementChance, takeJob } from '../src/engine/endSeason';
import { createPlayer } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { newGame } from '../src/engine/season';

const base = { name: 'Velho', exPlayer: false, career: null, titulosCarreira: false } as const;
const fresh = (age = 40, clubId = 2) => newGame({ seed: 9, coach: { ...base, age }, clubId, settings: { halfSeconds: 15, mundialAnual: false } });

describe('carreira do técnico', () => {
  it('técnico pode começar com 80 anos e não envelhece depois disso', () => {
    const s = fresh(80);
    expect(s.coach.age).toBe(80);
    endSeason(s);
    expect(s.coach.age).toBe(IDADE_TETO);
    const t = fresh(79);
    endSeason(t);
    expect(t.coach.age).toBe(80);
  });

  it('história como jogador soma experiência e títulos', () => {
    const playerCareer = {
      games: 520, goals: 210, assists: 90,
      clubs: [{ name: 'Clube A', titles: { 'Brasileirão Série A': 3, 'Copa Libertadores': 1 } }],
      national: { 'Copa do Mundo': 1 }, individual: { 'Bola de Ouro': 1 },
    };
    const semHistoria = initialExperience({ ...base, age: 40, exPlayer: true, career: 'umClube' });
    const comHistoria = initialExperience({ ...base, age: 40, exPlayer: true, career: 'umClube', playerCareer });
    expect(comHistoria).toBeGreaterThan(semHistoria + 10);
    expect(careerTotals(playerCareer).total).toBe(5);
    const c = createCoach({ ...base, age: 40, exPlayer: true, career: 'umClube', playerCareer }, 0);
    expect(c.titulosCarreira).toBe(true);
    expect(c.playerCareer?.national['Copa do Mundo']).toBe(1);
  });

  it('chegada ao clube gera arte de boas-vindas; muitas temporadas viram lenda permanente', () => {
    const s = fresh(45);
    expect(s.pendingArt?.[0]).toMatchObject({ type: 'welcome', clubId: 2 });
    const stint = s.coach.history![0];
    stint.seasons = 7;
    expect(stintSeasonEnd(s)).toBe('lenda');
    expect(s.clubs[2].legends?.[0]).toMatchObject({ coach: 'Velho', honor: 'lenda' });
    expect(s.pendingArt?.some((a) => a.type === 'legend')).toBe(true);
    // Sai do clube e a honraria continua; ao voltar, é recebido como lenda.
    takeJob(s, 5);
    expect(s.clubs[2].legends?.[0].honor).toBe('lenda');
    takeJob(s, 2);
    const welcome = s.pendingArt!.filter((a) => a.type === 'welcome').pop()!;
    expect(welcome).toMatchObject({ clubId: 2, honor: 'lenda' });
    expect(s.coach.history!.length).toBe(3);
  });
});

describe('aposentadoria e herdeiros', () => {
  it('normais jogam até 43; lendários até 55', () => {
    const p = createPlayer(new Rng(1), 0, 0, 'BRA', 'ATA', 50);
    p.stars = 3; p.legend = undefined;
    p.age = 43;
    expect(retirementChance(p)).toBe(1);
    p.age = 42;
    expect(retirementChance(p)).toBeLessThan(1);
    p.stars = 7; p.legend = true;
    p.age = 50;
    expect(retirementChance(p)).toBeLessThan(1);
    p.age = 55;
    expect(retirementChance(p)).toBe(1);
  });

  it('herdeiro surge na base com nome, força, posição e habilidades do aposentado', () => {
    const s = fresh(45);
    const club = s.clubs[s.userClubId];
    const velho = s.players[club.playerIds[5]];
    const h = heirOf(new Rng(3), s, velho, club.id);
    expect(h.name).toBe(velho.name);
    expect(h.pos).toBe(velho.pos);
    expect(h.force).toBe(velho.force);
    expect(h.abilities).toEqual(velho.abilities);
    expect(h.age).toBeLessThanOrEqual(16);
    expect(club.youthIds).toContain(h.id);
    expect(s.players[h.id]).toBe(h);
  });
});
