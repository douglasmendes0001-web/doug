import { describe, expect, it } from 'vitest';
import { handleMessageAction } from '../src/engine/actions';
import { TATICAS, execucaoTatica, taticaById } from '../src/engine/data/estilos';
import { HABILIDADES, HABILIDADES_POR_POS } from '../src/engine/data/habilidades';
import { forecastCompetition } from '../src/engine/forecast';
import { starsForForce, abilityCount } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { newGame, playSlot } from '../src/engine/season';
import { sponsorReview } from '../src/engine/sponsors';
import { buyPlayer, contractsSeasonEnd, loanIn, searchMarket, windowOpen } from '../src/engine/transfers';
import { FREE_AGENT, type GameState } from '../src/engine/types';
import { legendChance, youthIntake } from '../src/engine/youth';

const coach = { name: 'Dougz', age: 20, exPlayer: false, career: null, titulosCarreira: false };
const fresh = (seed = 11, clubId = 1): GameState => newGame({ seed, coach, clubId, settings: { halfSeconds: 15, mundialAnual: false } });

describe('habilidades, estrelas e estilos', () => {
  it('banco com 900+ habilidades separadas por posição', () => {
    expect(HABILIDADES.length).toBeGreaterThanOrEqual(900);
    for (const pos of ['G', 'ZG', 'LD', 'LE', 'VOL', 'MEI', 'ATA'] as const) expect(HABILIDADES_POR_POS[pos].length).toBe(130);
  });

  it('estrelas 1-7 com distribuição plausível e habilidades conforme a classe', () => {
    const s = fresh();
    const counts = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const p of s.players) {
      counts[p.stars]++;
      expect(p.abilities.length).toBe(abilityCount(p.stars));
      expect(new Set(p.abilities).size).toBe(p.abilities.length);
      for (const id of p.abilities) expect(HABILIDADES[id].pos).toBe(p.pos);
    }
    const total = s.players.length;
    console.log('estrelas:', counts.slice(1).map((c) => (c / total * 100).toFixed(2) + '%').join(' | '));
    // As estrelas seguem a faixa de força: 5★ 60-89, 6★ 90-104, 7★ 105+.
    for (const p of s.players) {
      expect(p.stars).toBe(starsForForce(p.force));
      if (p.force < 90) expect(p.stars).toBeLessThanOrEqual(5);
    }
    expect(counts[7]).toBeGreaterThan(0);
  });

  it('táticas complexas exigem técnico experiente', () => {
    expect(TATICAS.length).toBeGreaterThanOrEqual(10);
    const tiki = taticaById('tiki');
    expect(execucaoTatica(tiki, 0)).toBeLessThan(execucaoTatica(tiki, 90));
    expect(execucaoTatica(taticaById('equilibrado'), 0)).toBe(1);
  });
});

describe('base e joias lendárias', () => {
  it('investimento aumenta a chance de lendário e as joias nascem com 15 anos', () => {
    const s = fresh();
    const club = s.clubs[s.userClubId];
    club.baseLevel = 1; club.ct = 1; club.baseInvest = 0;
    const baixa = legendChance(club);
    club.baseLevel = 5; club.ct = 5; club.baseInvest = 1e12;
    const alta = legendChance(club);
    expect(alta).toBeGreaterThan(baixa * 5);

    const rng = new Rng(5);
    for (let i = 0; i < 60; i++) youthIntake(s, rng);
    // Joias lendárias: nascem com 15 anos, 1 a 5 estrelas e potencial para chegar a 6-7.
    const joias = club.youthIds.map((id) => s.players[id]).filter((p) => p.legend && p.stars <= 5);
    expect(joias.length).toBeGreaterThan(0);
    for (const p of joias) {
      expect(p.age).toBe(15);
      expect(p.stars).toBeGreaterThanOrEqual(1);
      expect(p.starCap).toBeGreaterThanOrEqual(6);
      expect(p.force).toBeGreaterThanOrEqual(54);
    }
  });
});

describe('patrocínios', () => {
  it('temporada brilhante traz nova marca e contraproposta da atual', () => {
    const s = fresh();
    const rng = new Rng(3);
    const atual = s.sponsors.master!;
    const valorAtual = atual.weekly;
    sponsorReview(s, rng, { score: 3, objetivoCumprido: true, titulos: 2, subiu: false, caiu: false });
    const msg = s.messages.find((m) => m.kind === 'patrocinio-oferta')!;
    expect(msg).toBeDefined();
    expect(msg.actions?.length).toBe(3);
    expect(msg.body).toMatch(/Argumentos/);
    expect(msg.data!.novoWeekly).toBeGreaterThan(valorAtual);
    const texto = handleMessageAction(s, rng, msg.id, 'contra');
    expect(texto).toMatch(/Contraproposta aceita/);
    expect(s.sponsors.master!.name).toBe(atual.name);
    expect(s.sponsors.master!.weekly).toBeGreaterThan(valorAtual);
    expect(s.sponsors.master!.bonusTitle).toBeGreaterThan(0);
  });

  it('temporada ruim faz a marca pedir ajuste ou sair', () => {
    const s = fresh();
    const nome = s.sponsors.master!.name;
    sponsorReview(s, new Rng(4), { score: -3, objetivoCumprido: false, titulos: 0, subiu: false, caiu: true });
    expect(s.sponsors.master!.name).not.toBe(nome);
  });
});

describe('mercado', () => {
  it('janela europeia abre em janeiro e julho/agosto', () => {
    const s = fresh();
    s.slot = 2;
    expect(windowOpen(s, 'ENG')).toBe(true);
    s.slot = 30; // semana 15
    expect(windowOpen(s, 'ENG')).toBe(false);
    expect(windowOpen(s, 'BRA')).toBe(false);
    s.slot = 56; // semana 28
    expect(windowOpen(s, 'ENG')).toBe(true);
  });

  it('fora da janela só agentes livres podem ser contratados', () => {
    const s = fresh();
    s.slot = 30;
    s.clubs[s.userClubId].money = 1e12;
    const alvo = searchMarket(s, { country: 'BRA' })[5];
    expect(buyPlayer(s, alvo.id, 3)).toMatch(/Fora da janela/);
    const livre = s.players.find((p) => p.clubId !== s.userClubId && !p.youth)!;
    const club = s.clubs[livre.clubId];
    club.playerIds = club.playerIds.filter((id) => id !== livre.id);
    livre.clubId = FREE_AGENT;
    expect(buyPlayer(s, livre.id, 2)).toMatch(/contratado/);
    expect(livre.contractUntil).toBe(s.year + 1);
  });

  it('empréstimo volta ao clube dono no fim do ano e contrato vencido vira agente livre', () => {
    const s = fresh();
    s.slot = 2;
    s.clubs[s.userClubId].money = 1e12;
    const dono = s.clubs.find((c) => c.leagueId === 'BRA1' && c.id !== s.userClubId)!;
    const reserva = dono.playerIds.map((id) => s.players[id]).sort((a, b) => a.force - b.force)[0];
    expect(loanIn(s, reserva.id)).toMatch(/emprestado/);
    expect(reserva.clubId).toBe(s.userClubId);
    const meu = s.clubs[s.userClubId].playerIds.map((id) => s.players[id]).find((p) => !p.loan)!;
    meu.contractUntil = s.year;
    contractsSeasonEnd(s, new Rng(1));
    expect(reserva.clubId).toBe(dono.id);
    // Saiu de graça (pode ter sido contratado por outro clube como agente livre).
    expect(meu.clubId).not.toBe(s.userClubId);
  });
});

describe('previsão', () => {
  it('probabilidades de título da Libertadores somam 100%', () => {
    const s = fresh();
    for (let i = 0; i < 30; i++) playSlot(s);
    const lib = s.competitions.find((c) => c.def.id === 'LIB')!;
    const rows = forecastCompetition(s, lib, 300);
    const soma = rows.reduce((a, r) => a + r.title, 0);
    expect(soma).toBeCloseTo(1, 5);
    expect(rows[0].title).toBeGreaterThan(rows[rows.length - 1].title);
  }, 60_000);
});
