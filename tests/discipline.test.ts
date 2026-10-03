import { describe, expect, it } from 'vitest';
import {
  LESOES, aplicarCartoes, cumprirSuspensao, ganchoVermelhoDireto, podeSerRelacionado, sortearLesao, suspensoEm,
} from '../src/engine/discipline';
import { available, repairLineup } from '../src/engine/lineup';
import { createPlayer } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { newGame, nextUserFixture, playSlot, squadOf } from '../src/engine/season';

const novo = (seed = 1) => createPlayer(new Rng(seed), seed, 0, 'BRA', 'VOL', 40, { age: 25 });

describe('cartões (regras atuais)', () => {
  it('3 amarelos na mesma competição = 1 jogo de suspensão só nela, e a contagem zera', () => {
    const p = novo();
    const rng = new Rng(1);
    expect(aplicarCartoes(p, 'BRA1', 1, undefined, rng).jogos).toBe(0);
    expect(aplicarCartoes(p, 'BRA1', 1, undefined, rng).jogos).toBe(0);
    const r = aplicarCartoes(p, 'BRA1', 1, undefined, rng);
    expect(r).toEqual({ jogos: 1, motivo: 'amarelos' });
    expect(p.amarelos?.BRA1).toBe(0);
    expect(p.yellowCards).toBe(3);
    expect(podeSerRelacionado(p, 'BRA1')).toBe(false);
    expect(podeSerRelacionado(p, 'LIB')).toBe(true);
    expect(p.suspendedGames).toBe(1);
  });

  it('amarelos de competições diferentes não se somam', () => {
    const p = novo(2);
    const rng = new Rng(2);
    aplicarCartoes(p, 'BRA1', 1, undefined, rng);
    aplicarCartoes(p, 'BRA1', 1, undefined, rng);
    aplicarCartoes(p, 'LIB', 1, undefined, rng);
    aplicarCartoes(p, 'CDB', 1, undefined, rng);
    expect(p.suspendedGames).toBe(0);
    expect(p.yellowCards).toBe(4);
  });

  it('dois amarelos no jogo = vermelho, 1 jogo, sem entrar na contagem de amarelos', () => {
    const p = novo(3);
    const r = aplicarCartoes(p, 'BRA1', 0, 'dois-amarelos', new Rng(3));
    expect(r).toEqual({ jogos: 1, motivo: 'dois-amarelos' });
    expect(p.amarelos?.BRA1 ?? 0).toBe(0);
    expect(suspensoEm(p, 'BRA1')).toBe(1);
  });

  it('vermelho direto: 1 a 3 jogos, quase sempre 1', () => {
    const rng = new Rng(4);
    const ganchos = Array.from({ length: 2000 }, () => ganchoVermelhoDireto(rng));
    expect(Math.min(...ganchos)).toBe(1);
    expect(Math.max(...ganchos)).toBe(3);
    expect(ganchos.filter((g) => g === 1).length / ganchos.length).toBeGreaterThan(0.5);
  });

  it('a suspensão é cumprida nos jogos da própria competição', () => {
    const p = novo(5);
    aplicarCartoes(p, 'BRA1', 0, 'direto', new Rng(9));
    const jogos = suspensoEm(p, 'BRA1');
    expect(cumprirSuspensao(p, 'LIB')).toBe(false);
    expect(suspensoEm(p, 'BRA1')).toBe(jogos);
    for (let i = 0; i < jogos; i++) expect(cumprirSuspensao(p, 'BRA1')).toBe(true);
    expect(podeSerRelacionado(p, 'BRA1')).toBe(true);
    expect(p.suspendedGames).toBe(0);
  });

  it('suspensão de save antigo vale para o próximo jogo de qualquer competição', () => {
    const p = novo(6);
    p.suspendedGames = 1;
    expect(podeSerRelacionado(p, 'LIB')).toBe(false);
    expect(cumprirSuspensao(p, 'LIB')).toBe(true);
    expect(podeSerRelacionado(p, 'BRA1')).toBe(true);
  });
});

describe('lesões', () => {
  it('têm tipo e duração coerentes; CT bom acelera a volta', () => {
    const rng = new Rng(7);
    const tipos = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const l = sortearLesao(rng, 3);
      tipos.add(l.tipo);
      const t = LESOES.find((x) => x.nome === l.tipo)!;
      expect(l.slots).toBeGreaterThanOrEqual(Math.max(1, Math.floor(t.semanas[0] * 2 * 0.96) - 1));
      expect(l.slots).toBeLessThanOrEqual(Math.ceil(t.semanas[1] * 2 * 0.96) + 1);
    }
    expect(tipos.size).toBe(LESOES.length);
    const media = (ct: number) => {
      const r = new Rng(8);
      let s = 0;
      for (let i = 0; i < 3000; i++) s += sortearLesao(r, ct).slots;
      return s;
    };
    expect(media(5)).toBeLessThan(media(1));
  });
});

describe('suspenso ou lesionado não é relacionado', () => {
  const coach = { name: 'Teste', age: 40, exPlayer: false, career: null, titulosCarreira: false };

  it('sai do time titular e do banco, com o motivo', () => {
    const s = newGame({ seed: 11, coach, clubId: 0, settings: { halfSeconds: 15, mundialAnual: false } });
    const squad = squadOf(s, s.userClubId);
    const titular = s.players[s.lineup.starters[0]];
    const reserva = s.players[s.lineup.bench[0]];
    aplicarCartoes(titular, 'BRA1', 0, 'dois-amarelos', new Rng(1));
    reserva.injuredSlots = 4;
    reserva.lesao = 'Entorse no tornozelo';
    const r = repairLineup(s.lineup, squad, 'BRA1');
    expect(r.lineup.starters).not.toContain(titular.id);
    expect(r.lineup.bench).not.toContain(reserva.id);
    expect(r.lineup.starters).toHaveLength(11);
    expect(r.removidos.join(' ')).toMatch(/suspenso/);
    expect(r.removidos.join(' ')).toMatch(/entorse no tornozelo/);
    // Em outra competição o suspenso pode jogar.
    expect(available(titular, 'LIB')).toBe(true);
  });

  it('numa temporada simulada, ninguém indisponível fica na escalação do próximo jogo', () => {
    const s = newGame({ seed: 12, coach, clubId: 0, settings: { halfSeconds: 15, mundialAnual: false } });
    let checados = 0;
    let suspensoes = 0;
    for (let i = 0; i < 104 && !s.coach.fired; i++) {
      const r = playSlot(s);
      if (r.seasonEnded) break;
      const fx = nextUserFixture(s);
      if (!fx) continue;
      for (const id of [...s.lineup.starters, ...s.lineup.bench]) {
        expect(available(s.players[id], fx.compId), s.players[id].name).toBe(true);
        checados++;
      }
      suspensoes += s.players.filter((p) => p.suspendedGames > 0).length;
    }
    expect(checados).toBeGreaterThan(500);
    expect(suspensoes).toBeGreaterThan(0);
  }, 120_000);
});
