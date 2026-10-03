import { describe, expect, it } from 'vitest';
import { VALOR_MAXIMO, clubRevenue, marketValue, monthlySalary } from '../src/engine/economy';
import { migrarSave } from '../src/engine/migrations';
import { formatDeal, formatMoney, syncMoney } from '../src/engine/money';
import { newGame } from '../src/engine/season';
import { agreedTransfersSeasonEnd, resolveYouthOffer } from '../src/engine/transfers';
import { pushMessage } from '../src/engine/inbox';
import { createWorld } from '../src/engine/world';

const coach = { name: 'Teste', age: 40, exPlayer: false, career: null, titulosCarreira: false };

describe('economia realista', () => {
  it('valores de mercado respeitam o teto europeu de € 358 mi', () => {
    expect(marketValue(135, 22, 7, 135, 'ENG')).toBeGreaterThan(300_000_000);
    expect(marketValue(135, 19, 7, 200, 'ENG')).toBeLessThanOrEqual(VALOR_MAXIMO);
    const w = createWorld(3);
    const max = Math.max(...w.players.map((p) => p.value));
    expect(max).toBeLessThanOrEqual(VALOR_MAXIMO);
    expect(max).toBeGreaterThan(120_000_000); // craques da Premier League passam de € 120 mi
  });

  it('Brasil: valores, salários, receitas e patrocínio master na ordem de grandeza real', () => {
    const w = createWorld(3);
    const fla = w.clubs.find((c) => c.name === 'Flamengo')!;
    const elenco = fla.playerIds.map((id) => w.players[id]);
    const total = elenco.reduce((s, p) => s + p.value, 0);
    expect(total).toBeGreaterThan(120_000_000); // Transfermarkt 2026: ~€ 230 mi
    expect(total).toBeLessThan(400_000_000);
    expect(clubRevenue(fla)).toBeGreaterThan(150_000_000); // receita do Flamengo ~R$ 1,3 bi
    const s = newGame({ seed: 3, coach, clubId: fla.id, settings: { halfSeconds: 15, mundialAnual: false } }, w);
    const masterAno = s.sponsors.master!.weekly * 52 * 6.3;
    expect(masterAno).toBeGreaterThan(120_000_000); // Betano paga ~R$ 268 mi/ano
    expect(masterAno).toBeLessThan(320_000_000);
    // Série D: salários de poucos milhares de reais.
    expect(monthlySalary(marketValue(10, 25, 2, 10, 'BRA'), 'BRA') * 6.3).toBeLessThan(20_000);
  });

  it('mostra na moeda do clube e converte negociações em euro e dólar', () => {
    const w = createWorld(3);
    const fla = w.clubs.find((c) => c.name === 'Flamengo')!;
    const s = newGame({ seed: 3, coach, clubId: fla.id, settings: { halfSeconds: 15, mundialAnual: false } }, w);
    syncMoney(s);
    expect(formatMoney(1_000_000)).toBe('R$ 6,3 mi');
    expect(formatDeal(10_000_000, 'EUR')).toBe('€ 10,0 mi (≈ R$ 63,0 mi)');
    expect(formatDeal(1_000_000, 'USD')).toBe('US$ 1,2 mi (≈ R$ 6,3 mi)');
  });
});

describe('base brasileira vendida ao exterior', () => {
  it('a venda é paga na hora, mas o garoto só se muda aos 18 anos', () => {
    const w = createWorld(5);
    const fla = w.clubs.find((c) => c.name === 'Flamengo')!;
    const s = newGame({ seed: 5, coach, clubId: fla.id, settings: { halfSeconds: 15, mundialAnual: false } }, w);
    const club = s.clubs[s.userClubId];
    const garoto = s.players[club.youthIds[0]];
    garoto.age = 16;
    const comprador = s.clubs.find((c) => c.confed === 'UEFA' && c.tier === 1)!;
    const msg = pushMessage(s, 'diretoria', 'Proposta', 'teste', { playerId: garoto.id, kind: 'proposta-base', data: { amount: 5_000_000, clubId: comprador.id }, actions: [] });
    const antes = club.money;
    resolveYouthOffer(s, msg.id, true);
    expect(club.money).toBeGreaterThan(antes);
    expect(garoto.saleAgreed?.clubId).toBe(comprador.id);
    agreedTransfersSeasonEnd(s); // 16 anos: fica
    expect(club.youthIds).toContain(garoto.id);
    garoto.age = 18;
    agreedTransfersSeasonEnd(s);
    expect(club.youthIds).not.toContain(garoto.id);
    expect(garoto.clubId).toBe(comprador.id);
    expect(comprador.playerIds).toContain(garoto.id);
  });
});

describe('migração de save antigo', () => {
  it('converte a carreira da versão 2 para a economia em euro', () => {
    const s = newGame({ seed: 9, coach, clubId: 1, settings: { halfSeconds: 15, mundialAnual: false } });
    s.version = 2;
    s.fx = undefined;
    for (const p of s.players) p.value = 999_999_999;
    migrarSave(s);
    expect(s.version).toBe(5);
    expect(s.fx?.BRL).toBeGreaterThan(5);
    expect(Math.max(...s.players.map((p) => p.value))).toBeLessThanOrEqual(VALOR_MAXIMO);
    expect(s.sponsors.master).toBeTruthy();
  });
});
