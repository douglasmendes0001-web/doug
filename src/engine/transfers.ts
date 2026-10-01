// Mercado: janelas de transferência (europeia e sul-americana), contratos,
// renovações, agentes livres, empréstimos, compras, vendas e propostas.

import { initialRespeito } from './coach';
import { formatDate, slotDate, slotWeek } from './calendar';
import { logFinance } from './clubOps';
import { PAISES } from './data/paises';
import { formatMoney, pushMessage } from './inbox';
import { marketValue, monthlySalary, roundMoney } from './players';
import { clamp, type Rng } from './rng';
import { investorCut } from './sponsors';
import { FREE_AGENT, SLOTS_PER_YEAR, type CountryCode, type GameState, type Player } from './types';

// ---------------- Janelas ----------------

type Regiao = 'UEFA' | 'CONMEBOL' | 'OUTRAS';

/** Semanas (0-51) em que cada mercado está aberto. Europa: jan e jul-ago. */
export const JANELAS: Record<Regiao, [number, number][]> = {
  UEFA: [[0, 4], [26, 34]],
  CONMEBOL: [[0, 9], [27, 32]],
  OUTRAS: [[0, 8], [26, 33]],
};

function regiao(country: CountryCode): Regiao {
  const c = PAISES[country].confed;
  return c === 'UEFA' ? 'UEFA' : c === 'CONMEBOL' ? 'CONMEBOL' : 'OUTRAS';
}

export function windowOpen(state: GameState, country: CountryCode, slot = state.slot): boolean {
  const w = slotWeek(Math.min(slot, SLOTS_PER_YEAR - 1));
  return JANELAS[regiao(country)].some(([a, b]) => w >= a && w <= b);
}

export function windowLabel(state: GameState, country: CountryCode): string {
  const reg = regiao(country);
  const w = slotWeek(Math.min(state.slot, SLOTS_PER_YEAR - 1));
  const nome = reg === 'UEFA' ? 'Janela europeia' : reg === 'CONMEBOL' ? 'Janela sul-americana' : 'Janela';
  const aberta = JANELAS[reg].find(([a, b]) => w >= a && w <= b);
  if (aberta) return `${nome} aberta até ${formatDate(slotDate(state.year, aberta[1] * 2 + 1))}`;
  const prox = JANELAS[reg].find(([a]) => a > w);
  return prox ? `${nome} fechada — abre em ${formatDate(slotDate(state.year, prox[0] * 2))}` : `${nome} fechada — abre em janeiro`;
}

/** Para negociar, a janela do clube comprador e a do vendedor precisam estar abertas. */
function canTrade(state: GameState, buyerCountry: CountryCode, p: Player): string | null {
  if (p.clubId === FREE_AGENT) return null; // agentes livres podem assinar a qualquer momento
  if (!windowOpen(state, buyerCountry)) return windowLabel(state, buyerCountry) + '.';
  const seller = state.clubs[p.clubId];
  if (!windowOpen(state, seller.country)) return `${windowLabel(state, seller.country)} (mercado do vendedor).`;
  return null;
}

// ---------------- Preços e salários ----------------

export function askingPrice(p: Player): number {
  if (p.clubId === FREE_AGENT) return 0;
  return roundMoney(p.value * (p.forSale ? 0.95 : 1.25));
}

/** Salário mensal que o jogador pede para assinar/renovar. */
export function salaryDemand(p: Player, renew = false): number {
  let s = monthlySalary(p.value) * (1 + 0.08 * (p.stars - 2));
  if (renew && p.respeito < 35) s *= 1.3;
  if (p.clubId === FREE_AGENT) s *= 1.15;
  return roundMoney(Math.max(s, p.salary * (renew ? 1.05 : 1)));
}

export function loanFee(p: Player): number {
  return roundMoney(p.value * 0.08);
}

// ---------------- Busca ----------------

export interface MarketFilters {
  pos?: string;
  maxPrice?: number;
  minForce?: number;
  country?: string;
  livres?: boolean;
}

export function searchMarket(state: GameState, f: MarketFilters): Player[] {
  const out: Player[] = [];
  for (const p of state.players) {
    if (p.retired || p.youth || p.clubId === state.userClubId) continue;
    if (f.livres) {
      if (p.clubId !== FREE_AGENT) continue;
    } else {
      const club = state.clubs[p.clubId];
      if (!club || club.tier === 0) continue;
      if (f.country && club.country !== f.country) continue;
    }
    if (p.loan) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (f.minForce && p.force < f.minForce) continue;
    if (f.maxPrice !== undefined && askingPrice(p) > f.maxPrice) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.force - a.force).slice(0, 60);
}

function removeFromClub(state: GameState, p: Player) {
  if (p.clubId === FREE_AGENT) return;
  const from = state.clubs[p.clubId];
  from.playerIds = from.playerIds.filter((id) => id !== p.id);
  if (p.clubId === state.userClubId) {
    state.lineup.starters = state.lineup.starters.filter((id) => id !== p.id);
    state.lineup.bench = state.lineup.bench.filter((id) => id !== p.id);
  }
}

function movePlayer(state: GameState, p: Player, toClubId: number) {
  removeFromClub(state, p);
  if (toClubId !== FREE_AGENT) state.clubs[toClubId].playerIds.push(p.id);
  p.clubId = toClubId;
  p.forSale = false;
  p.promiseUntilSlot = undefined;
  p.benchStreak = 0;
}

// ---------------- Compra, empréstimo e venda ----------------

export function buyPlayer(state: GameState, playerId: number, years: number): string {
  const p = state.players[playerId];
  const club = state.clubs[state.userClubId];
  if (club.playerIds.length >= 36) return 'Elenco cheio (máximo 36 jogadores).';
  const blocked = canTrade(state, club.country, p);
  if (blocked) return `Fora da janela: ${blocked}`;
  const free = p.clubId === FREE_AGENT;
  const seller = free ? undefined : state.clubs[p.clubId];
  if (seller && seller.playerIds.length <= 18) return `O ${seller.name} não quer vender: elenco muito curto.`;
  const price = askingPrice(p);
  if (club.money < price) return `Dinheiro insuficiente: ${seller?.name ?? 'o jogador'} pede ${formatMoney(price)}.`;
  const salary = salaryDemand(p);
  if (price > 0) logFinance(state, `Contratação de ${p.name}`, -price);
  if (seller) seller.money += price;
  movePlayer(state, p, club.id);
  p.salary = salary;
  p.contractUntil = state.year + clamp(years, 1, 5) - 1;
  p.respeito = initialRespeito(state.coach, p);
  p.oportunidade = 50;
  pushMessage(state, 'midia', 'Reforço!',
    `${club.name} anuncia ${p.name} (${p.pos}, ${p.age} anos, ${p.stars}★)${seller ? `, ex-${seller.name}, por ${formatMoney(price)}` : ', que estava sem clube'}. Contrato até dezembro de ${p.contractUntil}.`);
  return `${p.name} contratado${price ? ` por ${formatMoney(price)}` : ''}! Salário ${formatMoney(salary)}/mês até ${p.contractUntil}.`;
}

export function loanIn(state: GameState, playerId: number): string {
  const p = state.players[playerId];
  const club = state.clubs[state.userClubId];
  if (p.clubId === FREE_AGENT) return 'Agente livre não pode ser emprestado: contrate-o.';
  const blocked = canTrade(state, club.country, p);
  if (blocked) return `Fora da janela: ${blocked}`;
  const owner = state.clubs[p.clubId];
  const top = owner.playerIds.map((id) => state.players[id]).sort((a, b) => b.force - a.force).slice(0, 13).map((x) => x.id);
  if (top.includes(p.id)) return `O ${owner.name} não empresta jogadores que são titulares.`;
  if (owner.playerIds.length <= 20) return `O ${owner.name} está com elenco curto e não empresta ninguém.`;
  if (club.playerIds.length >= 36) return 'Elenco cheio (máximo 36 jogadores).';
  const fee = loanFee(p);
  if (club.money < fee) return `Dinheiro insuficiente: o empréstimo custa ${formatMoney(fee)}.`;
  logFinance(state, `Empréstimo de ${p.name} (${owner.short})`, -fee);
  owner.money += fee;
  const from = p.clubId;
  movePlayer(state, p, club.id);
  p.loan = { fromClubId: from, untilYear: state.year };
  p.respeito = initialRespeito(state.coach, p);
  return `${p.name} chega emprestado pelo ${owner.name} até dezembro. Taxa: ${formatMoney(fee)}.`;
}

export function loanOut(state: GameState, rng: Rng, playerId: number): string {
  const p = state.players[playerId];
  const club = state.clubs[state.userClubId];
  if (p.clubId !== club.id || p.loan) return '';
  if (!windowOpen(state, club.country)) return `Fora da janela: ${windowLabel(state, club.country)}.`;
  if (club.playerIds.length <= 18) return 'Elenco curto demais para emprestar.';
  const destinos = state.clubs.filter((c) => c.country === club.country && c.id !== club.id && c.leagueId && c.tier >= club.tier && c.playerIds.length < 30);
  if (!destinos.length) return 'Nenhum clube interessado no momento.';
  const dest = rng.pick(destinos.sort((a, b) => Math.abs(a.baseForce - p.force) - Math.abs(b.baseForce - p.force)).slice(0, 5));
  movePlayer(state, p, dest.id);
  p.loan = { fromClubId: club.id, untilYear: state.year };
  return `${p.name} foi emprestado ao ${dest.name} até dezembro, para ganhar ritmo de jogo. O ${dest.name} paga o salário.`;
}

export function toggleForSale(state: GameState, playerId: number) {
  const p = state.players[playerId];
  if (p.clubId !== state.userClubId || p.loan) return;
  p.forSale = !p.forSale;
}

/** Propostas semanais, respeitando as janelas de quem compra. */
export function weeklyOffers(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  if (!windowOpen(state, club.country) && !windowOpen(state, 'ENG')) return;
  const europaAberta = windowOpen(state, 'ENG');
  for (const id of club.playerIds) {
    const p = state.players[id];
    if (p.loan) continue;
    const open = state.messages.some((m) => m.kind === 'proposta' && m.playerId === id && !m.resolved);
    if (open) continue;
    const destaque = p.force > club.baseForce * 1.12 || p.stars >= 4;
    const chance = p.forSale ? 0.35 : destaque ? (europaAberta ? 0.06 : 0.02) : 0;
    if (!rng.chance(chance)) continue;
    const buyers = state.clubs.filter((c) => c.id !== club.id && c.tier > 0 && c.tier < 9 && c.baseForce >= p.force * 0.85 && c.money > p.value * 0.6
      && windowOpen(state, c.country) && windowOpen(state, club.country));
    // Clubes europeus só compram na janela europeia.
    const europeus = europaAberta ? state.clubs.filter((c) => c.confed === 'UEFA' && c.tier === 1 && c.baseForce >= p.force * 0.8) : [];
    const pool = destaque && europeus.length && rng.chance(0.6) ? europeus : buyers;
    if (!pool.length) continue;
    const buyer = rng.pick(pool);
    const europeu = buyer.confed === 'UEFA' && club.confed !== 'UEFA';
    const amount = roundMoney(p.value * rng.range(p.forSale ? 0.75 : 1.0, p.forSale ? 1.1 : 1.4) * (europeu ? 1.25 : 1));
    pushMessage(state, 'diretoria', `${europeu ? 'Proposta da Europa' : 'Proposta'} por ${p.name}`,
      `O ${buyer.name} oferece ${formatMoney(amount)} por ${p.name}.${europeu ? ' A janela europeia está aberta e o jogador sonha com a Europa.' : ''} A decisão é sua, professor.`,
      { playerId: p.id, kind: 'proposta', data: { amount, clubId: buyer.id }, actions: [{ id: 'aceitar', label: 'Aceitar' }, { id: 'recusar', label: 'Recusar' }] });
  }
}

export function resolveOffer(state: GameState, msgId: number, accept: boolean): string {
  const m = state.messages.find((x) => x.id === msgId);
  if (!m || m.resolved || m.kind !== 'proposta' || m.playerId === undefined || !m.data) return '';
  m.resolved = accept ? 'aceitar' : 'recusar';
  m.read = true;
  const p = state.players[m.playerId];
  if (!accept) {
    // Jogador que sonhava com a Europa fica chateado.
    if (state.clubs[m.data.clubId]?.confed === 'UEFA' && state.clubs[state.userClubId].confed !== 'UEFA') p.respeito = clamp(p.respeito - 6, 0, 100);
    return 'Proposta recusada.';
  }
  if (p.clubId !== state.userClubId) return 'Esse jogador já não está no clube.';
  const club = state.clubs[state.userClubId];
  if (club.playerIds.length <= 16) return 'Venda bloqueada: o elenco ficaria curto demais.';
  const buyer = state.clubs[m.data.clubId];
  const cut = investorCut(state);
  logFinance(state, `Venda de ${p.name}`, m.data.amount);
  if (cut > 0) logFinance(state, `Parte dos investidores (${Math.round(cut * 100)}%) na venda de ${p.name}`, -roundMoney(m.data.amount * cut));
  buyer.money -= m.data.amount;
  movePlayer(state, p, buyer.id);
  p.respeito = 65;
  return `${p.name} vendido ao ${buyer.name} por ${formatMoney(m.data.amount)}.`;
}

// ---------------- Contratos ----------------

/** Lembretes de contratos que vencem no fim do ano (semana 40). */
export function contractReminders(state: GameState) {
  const club = state.clubs[state.userClubId];
  for (const id of club.playerIds) {
    const p = state.players[id];
    if (p.loan || p.contractUntil > state.year) continue;
    if (state.messages.some((m) => m.kind === 'contrato' && m.playerId === id && !m.resolved)) continue;
    const demanda = salaryDemand(p, true);
    const recusa = p.respeito < 20;
    pushMessage(state, 'jogador', `Contrato de ${p.name} termina em dezembro`,
      recusa
        ? `${p.name} (${p.age} anos, ${p.stars}★) avisou ao empresário que não pretende renovar: a relação com o técnico está desgastada. Uma última conversa pode mudar isso.`
        : `${p.name} (${p.age} anos, ${p.stars}★) aceita renovar por ${formatMoney(demanda)}/mês (hoje ganha ${formatMoney(p.salary)}). Sem renovação, ele sai de graça no fim da temporada.`,
      {
        playerId: id, kind: 'contrato', data: { demanda },
        actions: recusa
          ? [{ id: 'conversar', label: 'Tentar convencer' }, { id: 'liberar', label: 'Deixar sair' }]
          : [{ id: 'renovar2', label: 'Renovar por 2 anos' }, { id: 'renovar4', label: 'Renovar por 4 anos' }, { id: 'liberar', label: 'Deixar sair' }],
      });
  }
}

export function resolveContractMessage(state: GameState, rng: Rng, msgId: number, actionId: string): string {
  const m = state.messages.find((x) => x.id === msgId);
  if (!m || m.resolved || m.playerId === undefined || !m.data) return '';
  m.resolved = actionId;
  m.read = true;
  const p = state.players[m.playerId];
  if (p.clubId !== state.userClubId) return 'Esse jogador já não está no clube.';
  if (actionId === 'liberar') return `${p.name} vai deixar o clube no fim do contrato.`;
  if (actionId === 'conversar') {
    if (rng.chance(0.4)) {
      p.respeito = clamp(p.respeito + 15, 0, 100);
      p.salary = roundMoney(m.data.demanda * 1.2);
      p.contractUntil = state.year + 2;
      return `${p.name} foi convencido e renovou por 2 anos (salário ${formatMoney(p.salary)}).`;
    }
    return `${p.name} não mudou de ideia e sairá no fim do ano.`;
  }
  const anos = actionId === 'renovar4' ? 4 : 2;
  p.salary = m.data.demanda;
  p.contractUntil = state.year + anos;
  p.respeito = clamp(p.respeito + 4, 0, 100);
  return `${p.name} renovou até dezembro de ${p.contractUntil} por ${formatMoney(p.salary)}/mês.`;
}

/**
 * Virada do ano: empréstimos voltam, contratos vencidos viram agentes livres
 * (IA renova a maioria) e clubes da IA com elenco curto contratam livres.
 */
export function contractsSeasonEnd(state: GameState, rng: Rng) {
  const year = state.year;
  for (const p of state.players) {
    if (p.retired || p.youth) continue;
    if (p.loan && p.loan.untilYear <= year) {
      const back = p.loan.fromClubId;
      p.loan = undefined;
      movePlayer(state, p, back);
      if (back === state.userClubId) {
        p.respeito = initialRespeito(state.coach, p) + 5;
        pushMessage(state, 'diretoria', 'Fim de empréstimo', `${p.name} voltou do empréstimo com ${p.seasonGames} jogos na temporada.`);
      }
      continue;
    }
    if (p.clubId === FREE_AGENT) {
      if (p.age >= 34 && rng.chance(0.5)) p.retired = true;
      continue;
    }
    if (p.contractUntil > year) continue;
    if (p.clubId === state.userClubId) {
      const renovou = state.messages.some((m) => m.kind === 'contrato' && m.playerId === p.id && m.resolved?.startsWith('renovar'));
      if (!renovou) {
        movePlayer(state, p, FREE_AGENT);
        pushMessage(state, 'midia', 'Saída de graça', `${p.name} deixa o ${state.clubs[state.userClubId].name} ao fim do contrato e está livre no mercado.`);
      }
      continue;
    }
    if (rng.chance(0.85)) {
      p.contractUntil = year + rng.int(1, 3);
      p.salary = Math.max(p.salary, monthlySalary(marketValue(p.force, p.age, p.stars)));
    } else {
      movePlayer(state, p, FREE_AGENT);
    }
  }
  // IA contrata agentes livres para fechar o elenco.
  const livres = state.players.filter((p) => p.clubId === FREE_AGENT && !p.retired);
  for (const club of state.clubs) {
    if (club.id === state.userClubId || club.playerIds.length >= 22 || club.tier === 0) continue;
    const alvo = livres
      .filter((p) => p.clubId === FREE_AGENT && Math.abs(p.force - club.baseForce) < club.baseForce * 0.25)
      .slice(0, 22 - club.playerIds.length);
    for (const p of alvo) {
      movePlayer(state, p, club.id);
      p.contractUntil = year + 1 + rng.int(0, 2);
    }
  }
}
