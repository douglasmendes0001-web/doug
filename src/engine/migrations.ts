// Migração de saves antigos. Versão 2 → 3: a economia passou a ser em euro
// com valores reais, então valores, salários, caixa, ingressos, prêmios e
// patrocínios são recalculados. O resto da carreira (elenco, títulos,
// histórico, mensagens) é mantido.

import {
  CAMBIO_INICIAL, PREMIO_CONTINENTAL, baseTicketPrice, clubRevenue, cupPrize, estadualPrize, leaguePrize,
  marketValue, monthlySalary, revenueFloorFor, roundMoney,
} from './economy';
import { pushMessage } from './inbox';
import { syncMoney } from './money';
import { Rng } from './rng';
import { initialSponsors } from './sponsors';
import { appendNorthAmerica } from './world';
import { FREE_AGENT, type Club, type GameState, type Player } from './types';

/** Recalcula valores, salários, receitas e caixa de um mundo (carreira ou editor). */
export function migrarEconomiaMundo(clubs: Club[], players: Player[]) {
  for (const p of players) {
    if (p.retired) continue;
    const country = p.clubId === FREE_AGENT ? undefined : clubs[p.clubId]?.country;
    p.value = marketValue(p.force, p.age, p.stars, p.potential, country);
    p.salary = roundMoney(monthlySalary(p.value, country) * (p.youth ? 0.25 : 1));
  }
  for (const c of clubs) {
    const folha = c.playerIds.reduce((s, id) => s + (players[id]?.salary ?? 0), 0) * 12;
    c.revenueFloor = Math.round(revenueFloorFor(folha));
    c.ticketPrice = baseTicketPrice(c);
    c.money = roundMoney(clubRevenue(c) * (0.08 + c.reputation / 1000));
    c.baseInvest = 0;
  }
}

export function migrarSave(state: GameState): GameState {
  if (state.version === 2) {
    migrarEconomiaMundo(state.clubs, state.players);
    state.fx = { ...CAMBIO_INICIAL };
    syncMoney(state);
    for (const c of state.competitions) {
      const d = c.def;
      if (d.kind === 'liga' && d.leagueId) d.prize = leaguePrize(d.leagueId);
      else if (d.kind === 'copa' && d.country) d.prize = cupPrize(d.country);
      else if (d.kind === 'estadual') d.prize = estadualPrize(d.id.replace('EST-', ''));
      else d.prize = PREMIO_CONTINENTAL[d.id] ?? d.prize;
    }
    // Propostas abertas tinham valores na escala antiga: expiram.
    for (const m of state.messages) {
      if (!m.resolved && m.actions?.length) m.resolved = 'expirou';
    }
    const rng = new Rng(state.rng ^ 0x5eed);
    initialSponsors(state, rng);
    state.financeLog = [];
    state.version = 3;
    pushMessage(state, 'diretoria', 'Economia atualizada',
      'Os valores do futebol foram atualizados para a realidade de 2026: valores de mercado (teto de € 358 milhões na Europa), salários, receitas, ' +
      'patrocínios e premiações. O caixa do clube foi recalculado e os contratos de patrocínio renegociados. Negociações com a Europa são em euro ' +
      'e com a América do Norte em dólar, sempre com a conversão para a moeda do clube.');
  }
  if (state.version === 3) {
    appendNorthAmerica(state, state.seed, FREE_AGENT);
    state.nextIds.player = state.players.length;
    state.version = 4;
    pushMessage(state, 'midia', 'Futebol da América do Norte',
      'A partir da próxima temporada entram em campo a MLS, a Liga MX, a liga canadense, a U.S. Open Cup, o Canadian Championship, a Leagues Cup e a Concacaf Champions Cup, ' +
      'com os clubes reais. O campeão da Concachampions garante vaga no Mundial de Clubes. Clubes da MLS e da Liga MX já negociam no mercado (em dólar).');
  }
  return state;
}

/** Banco do modo editor salvo em versões antigas. */
export function migrarMundo(world: { clubs: Club[]; players: Player[] }, version: number, seed = 20260101) {
  if (version === 2) migrarEconomiaMundo(world.clubs, world.players);
  if (version <= 3) appendNorthAmerica(world, seed, FREE_AGENT);
}
