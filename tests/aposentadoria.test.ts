import { describe, expect, it } from 'vitest';
import { momentosDoJogo, registrarMomento, resumoCarreira } from '../src/engine/career';
import { aposentar, jobOffers, pedirDemissao, takeJob } from '../src/engine/endSeason';
import { newGame, playSlot } from '../src/engine/season';

const coach = { name: 'Teste', age: 40, exPlayer: false, career: null, titulosCarreira: false };
const jogo = () => newGame({ seed: 31, coach, clubId: 0, settings: { halfSeconds: 15, mundialAnual: false } });

describe('demissão e aposentadoria', () => {
  it('a carreira começa com o momento da estreia', () => {
    const s = jogo();
    expect(s.coach.momentos?.[0].tipo).toBe('estreia');
    expect(s.coach.momentos?.[0].texto).toContain(s.clubs[0].name);
  });

  it('pedir demissão abre as propostas; aceitar uma fecha a passagem e abre outra', () => {
    const s = jogo();
    pedirDemissao(s);
    expect(s.coach.fired).toBe(true);
    expect(s.coach.pediuDemissao).toBe(true);
    const novo = jobOffers(s)[0];
    takeJob(s, novo);
    expect(s.coach.fired).toBe(false);
    expect(s.coach.pediuDemissao).toBeUndefined();
    expect(s.coach.history).toHaveLength(2);
    expect(s.coach.history![0].toYear).toBe(s.year);
    expect(s.coach.momentos?.some((m) => m.tipo === 'clube' && m.clubId === novo)).toBe(true);
  });

  it('aposentar encerra a carreira, fecha a passagem e registra a despedida', () => {
    const s = jogo();
    s.coach.games = 300;
    s.coach.wins = 150;
    s.coach.draws = 75;
    s.coach.losses = 75;
    s.coach.titles = ['Campeonato Carioca 2026'];
    aposentar(s);
    expect(s.coach.aposentadoEm).toBe(s.year);
    expect(s.coach.fired).toBe(true);
    expect(s.coach.history![0].toYear).toBe(s.year);
    expect(s.coach.momentos!.at(-1)!.tipo).toBe('adeus');
    const r = resumoCarreira(s.coach);
    expect(r.jogos).toBe(300);
    expect(r.aproveitamento).toBe(58); // (150*3 + 75) / 900
    expect(r.titulos).toBe(1);
    expect(r.clubes).toBe(1);
  });

  it('marcas de jogos, vitórias e goleadas viram grandes momentos', () => {
    const s = jogo();
    s.coach.games = 100;
    s.coach.wins = 100;
    momentosDoJogo(s, 5, 0, 'Vasco', 'Brasileirão');
    const textos = s.coach.momentos!.map((m) => m.texto);
    expect(textos).toContain('100º jogo como técnico');
    expect(textos).toContain('100ª vitória como técnico');
    expect(textos.some((t) => t.includes('Goleada de 5 x 0 sobre o Vasco'))).toBe(true);
  });

  it('a lista de momentos tem limite e descarta primeiro os menos marcantes', () => {
    const s = jogo();
    registrarMomento(s, { tipo: 'titulo', texto: 'Campeão da Libertadores', compId: 'LIB', compName: 'Libertadores', kind: 'continental' });
    for (let i = 0; i < 300; i++) registrarMomento(s, { tipo: 'goleada', texto: `goleada ${i}` });
    expect(s.coach.momentos!.length).toBeLessThanOrEqual(120);
    expect(s.coach.momentos!.some((m) => m.tipo === 'titulo')).toBe(true);
    expect(s.coach.momentos!.some((m) => m.tipo === 'estreia')).toBe(true);
  });

  it('numa temporada, cada título do técnico vira um grande momento', () => {
    const s = jogo();
    for (let i = 0; i < 104; i++) {
      if (s.coach.fired) break;
      if (playSlot(s).seasonEnded) break;
    }
    const titulos = s.coach.momentos!.filter((m) => m.tipo === 'titulo');
    expect(titulos.length).toBe(s.coach.titles.length);
  }, 120_000);
});
