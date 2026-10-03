import { describe, expect, it } from 'vitest';
import { SORTEIOS_HISTORIA, careerExperienceBonus, sortearCarreira } from '../src/engine/career';
import { prestigioHistorico } from '../src/engine/prestige';
import { Rng } from '../src/engine/rng';
import { createWorld } from '../src/engine/world';

describe('sorteio da história do técnico como jogador', () => {
  const w = createWorld(6);
  it('um clube só ou vários; números coerentes; títulos dos clubes certos', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 40; i++) {
      const um = sortearCarreira(w.clubs, 'BRA', 'umClube', 45, rng, prestigioHistorico);
      expect(um.clubs).toHaveLength(1);
      const varios = sortearCarreira(w.clubs, 'BRA', 'variosClubes', 45, rng, prestigioHistorico);
      expect(varios.clubs.length).toBeGreaterThanOrEqual(2);
      expect(varios.clubs.length).toBeLessThanOrEqual(6);
      expect(varios.games).toBe(varios.clubs.reduce((s, c) => s + (c.jogos ?? 0), 0));
      for (const c of varios.clubs) expect(c.anos![1]).toBeLessThan(2026);
    }
  });

  it('cerca de 30% dos clubes sorteados são de nível mundial, do Brasil ou do exterior', () => {
    const rng = new Rng(2);
    let total = 0, mundiais = 0, exterior = 0;
    for (let i = 0; i < 300; i++) {
      const pc = sortearCarreira(w.clubs, 'BRA', 'variosClubes', 40, rng, prestigioHistorico);
      for (const c of pc.clubs) {
        total++;
        const club = w.clubs[c.clubId!];
        if (prestigioHistorico(club) >= 4) mundiais++;
        if (club.country !== 'BRA') exterior++;
      }
    }
    expect(mundiais / total).toBeGreaterThan(0.25);
    expect(mundiais / total).toBeLessThan(0.5);
    expect(exterior / total).toBeGreaterThan(0.25);
  });

  it('lendas têm carreira mais rica que jogadores comuns', () => {
    const rng = new Rng(3);
    const bonus: Record<string, number[]> = { comum: [], lenda: [] };
    for (let i = 0; i < 400; i++) {
      const pc = sortearCarreira(w.clubs, 'ARG', 'variosClubes', 50, rng, prestigioHistorico);
      if (pc.nivel === 'comum' || pc.nivel === 'lenda') bonus[pc.nivel].push(careerExperienceBonus(pc));
    }
    const media = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
    expect(media(bonus.lenda)).toBeGreaterThan(media(bonus.comum) + 5);
    expect(SORTEIOS_HISTORIA).toBe(5);
  });
});
