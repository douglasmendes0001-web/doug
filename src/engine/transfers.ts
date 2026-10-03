// Mercado: janelas de transferência (europeia e sul-americana), contratos,
// renovações, agentes livres, empréstimos, compras, vendas e propostas.

import { recusaPorPrestigio } from './prestige';
import { initialRespeito } from './coach';
import { formatDate, slotDate, slotWeek } from './calendar';
import { logFinance } from './clubOps';
import { PAISES } from './data/paises';
import { moedaDoPais } from './economy';
import { formatMoney, pushMessage } from './inbox';
import { cambioLabel, formatDeal } from './money';
import { marketValue, monthlySalary, roundMoney } from './players';
import { clamp, type Rng } from './rng';
import { investorCut } from './sponsors';
import { FREE_AGENT, SLOTS_PER_YEAR, type Club, type CountryCode, type GameState, type Player } from './types';

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
export function salaryDemand(p: Player, renew = false, country?: CountryCode): number {
  let s = monthlySalary(p.value, country) * (1 + 0.08 * (p.stars - 2));
  if (renew && p.respeito < 35) s *= 1.3;
  if (p.clubId === FREE_AGENT) s *= 1.15;
  return roundMoney(Math.max(s, p.salary * (renew ? 1.05 : 1)));
}

export function loanFee(p: Player): number {
  return roundMoney(p.value * 0.08);
}

// ---------------- Busca ----------------

export type MarketSort = 'forca' | 'valor' | 'idade' | 'jovem' | 'estrelas' | 'salario' | 'custo';

export interface MarketFilters {
  /** Parte do nome. */
  nome?: string;
  pos?: string;
  /** Preço máximo (€) pedido pelo clube. */
  maxPrice?: number;
  maxSalary?: number;
  minForce?: number;
  minStars?: number;
  minAge?: number;
  maxAge?: number;
  foot?: 'D' | 'E' | 'A';
  country?: string;
  /** Liga específica (ex.: ENG1). */
  leagueId?: string;
  livres?: boolean;
  sort?: MarketSort;
  limit?: number;
}

const ORDENAR: Record<MarketSort, (a: Player, b: Player) => number> = {
  forca: (a, b) => b.force - a.force,
  valor: (a, b) => b.value - a.value,
  idade: (a, b) => b.age - a.age,
  jovem: (a, b) => a.age - b.age || b.force - a.force,
  estrelas: (a, b) => b.stars - a.stars || b.force - a.force,
  salario: (a, b) => a.salary - b.salary,
  custo: (a, b) => b.force / Math.max(1, askingPrice(b)) - a.force / Math.max(1, askingPrice(a)),
};

export function searchMarket(state: GameState, f: MarketFilters): Player[] {
  const out: Player[] = [];
  const nome = f.nome?.trim().toLowerCase();
  for (const p of state.players) {
    if (p.retired || p.youth || p.clubId === state.userClubId || p.saleAgreed) continue;
    if (f.livres) {
      if (p.clubId !== FREE_AGENT) continue;
    } else {
      const club = state.clubs[p.clubId];
      if (!club || (club.tier === 0 && club.confed !== 'CONCACAF')) continue;
      if (f.country === 'NA' ? club.confed !== 'CONCACAF' : f.country && club.country !== f.country) continue;
      if (f.leagueId && club.leagueId !== f.leagueId) continue;
    }
    if (p.loan) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (nome && !p.name.toLowerCase().includes(nome)) continue;
    if (f.minForce && p.force < f.minForce) continue;
    if (f.minStars && p.stars < f.minStars) continue;
    if (f.minAge && p.age < f.minAge) continue;
    if (f.maxAge && p.age > f.maxAge) continue;
    if (f.foot && p.foot !== f.foot) continue;
    if (f.maxSalary !== undefined && p.salary > f.maxSalary) continue;
    if (f.maxPrice !== undefined && askingPrice(p) > f.maxPrice) continue;
    out.push(p);
  }
  return out.sort(ORDENAR[f.sort ?? 'forca']).slice(0, f.limit ?? 80);
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
  if (p.saleAgreed) return `${p.name} já está vendido ao ${state.clubs[p.saleAgreed.clubId].name}.`;
  const semProjecao = recusaPorPrestigio(state, club, p);
  if (semProjecao) return semProjecao;
  const price = askingPrice(p);
  const moeda = seller ? moedaDoPais(seller.country) : moedaDoPais(club.country);
  if (club.money < price) return `Dinheiro insuficiente: ${seller?.name ?? 'o jogador'} pede ${formatDeal(price, moeda)}.`;
  const salary = salaryDemand(p, false, club.country);
  if (price > 0) logFinance(state, `Contratação de ${p.name}`, -price);
  if (seller) seller.money += price;
  movePlayer(state, p, club.id);
  p.salary = salary;
  p.contractUntil = state.year + clamp(years, 1, 5) - 1;
  p.respeito = initialRespeito(state.coach, p);
  p.oportunidade = 50;
  pushMessage(state, 'midia', 'Reforço!',
    `${club.name} anuncia ${p.name} (${p.pos}, ${p.age} anos, ${p.stars}★)${seller ? `, ex-${seller.name}, por ${formatDeal(price, moeda)}` : ', que estava sem clube'}. Contrato até dezembro de ${p.contractUntil}.`);
  return `${p.name} contratado${price ? ` por ${formatDeal(price, moeda)}` : ''}! Salário ${formatMoney(salary)}/mês até ${p.contractUntil}.`;
}

export function loanIn(state: GameState, playerId: number): string {
  const p = state.players[playerId];
  const club = state.clubs[state.userClubId];
  if (p.clubId === FREE_AGENT) return 'Agente livre não pode ser emprestado: contrate-o.';
  const blocked = canTrade(state, club.country, p);
  if (blocked) return `Fora da janela: ${blocked}`;
  const owner = state.clubs[p.clubId];
  const semProjecao = recusaPorPrestigio(state, club, p);
  if (semProjecao) return semProjecao;
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
  if (p.saleAgreed) return `${p.name} já está vendido e não pode ser emprestado.`;
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
  if (p.clubId !== state.userClubId || p.loan || p.saleAgreed) return;
  p.forSale = !p.forSale;
}

/** Clubes da América do Norte (MLS e Liga MX) compram na própria janela, em dólar. */
function compradoresAmericaDoNorte(state: GameState, p: Player): Club[] {
  if (!windowOpen(state, 'USA')) return [];
  return state.clubs.filter((c) => c.confed === 'CONCACAF' && (c.country === 'USA' || c.country === 'MEX' || c.country === 'CAN') && c.baseForce >= p.force * 0.75);
}

function textoProposta(state: GameState, buyer: Club, amount: number): string {
  const moeda = moedaDoPais(buyer.country);
  const cambio = cambioLabel(moeda, moedaDoPais(state.clubs[state.userClubId].country));
  return `${formatDeal(amount, moeda)}${cambio ? ` — câmbio do ano: ${cambio}` : ''}`;
}

/** Propostas semanais, respeitando as janelas de quem compra. */
export function weeklyOffers(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  youthOffers(state, rng);
  if (!windowOpen(state, club.country) && !windowOpen(state, 'ENG') && !windowOpen(state, 'USA')) return;
  const europaAberta = windowOpen(state, 'ENG');
  for (const id of club.playerIds) {
    const p = state.players[id];
    if (p.loan || p.saleAgreed) continue;
    const open = state.messages.some((m) => (m.kind === 'proposta' || m.kind === 'proposta-base') && m.playerId === id && !m.resolved);
    if (open) continue;
    const destaque = p.force > club.baseForce * 1.12 || p.stars >= 4;
    const chance = p.forSale ? 0.35 : destaque ? (europaAberta ? 0.06 : 0.02) : 0;
    if (!rng.chance(chance)) continue;
    const buyers = state.clubs.filter((c) => c.id !== club.id && c.tier > 0 && c.tier < 9 && c.baseForce >= p.force * 0.85 && c.money > p.value * 0.6
      && windowOpen(state, c.country) && windowOpen(state, club.country));
    // Clubes europeus só compram na janela europeia.
    const europeus = europaAberta ? state.clubs.filter((c) => c.confed === 'UEFA' && c.tier === 1 && c.baseForce >= p.force * 0.8) : [];
    const norteAmericanos = club.confed !== 'CONCACAF' ? compradoresAmericaDoNorte(state, p) : [];
    const r = rng.next();
    const pool = destaque && europeus.length && r < 0.55 ? europeus
      : norteAmericanos.length && r < 0.75 && p.age >= 24 ? norteAmericanos
      : buyers.length ? buyers : europeus.length ? europeus : norteAmericanos;
    if (!pool.length) continue;
    const buyer = rng.pick(pool);
    const exterior = buyer.country !== club.country && buyer.confed !== club.confed;
    const amount = roundMoney(p.value * rng.range(p.forSale ? 0.75 : 1.0, p.forSale ? 1.1 : 1.4) * (exterior ? 1.2 : 1));
    const titulo = buyer.confed === 'UEFA' && club.confed !== 'UEFA' ? 'Proposta da Europa' : buyer.confed === 'CONCACAF' ? 'Proposta da América do Norte' : 'Proposta';
    pushMessage(state, 'diretoria', `${titulo} por ${p.name}`,
      `O ${buyer.name} (${PAISES[buyer.country].name}) oferece ${textoProposta(state, buyer, amount)} por ${p.name}.${exterior ? ' O jogador sonha em jogar fora do país.' : ''} A decisão é sua, professor.`,
      { playerId: p.id, kind: 'proposta', data: { amount, clubId: buyer.id }, actions: [{ id: 'aceitar', label: 'Aceitar' }, { id: 'recusar', label: 'Recusar' }] });
  }
}

/**
 * Clubes do exterior de olho na base brasileira. Pela regra da FIFA (artigo 19),
 * o garoto só pode se mudar ao completar 18 anos: a venda é acertada e paga
 * agora, mas ele continua no clube até lá.
 */
function youthOffers(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  if (club.country !== 'BRA' || !windowOpen(state, 'ENG')) return;
  for (const id of club.youthIds) {
    const p = state.players[id];
    if (p.saleAgreed) continue;
    if (state.messages.some((m) => m.kind === 'proposta-base' && m.playerId === id && !m.resolved)) continue;
    const joia = p.legend || p.stars >= 4 || p.potential >= club.baseForce * 1.25;
    if (!joia || !rng.chance(p.legend ? 0.12 : 0.04)) continue;
    const pool = state.clubs.filter((c) => c.confed === 'UEFA' && c.tier === 1 && c.reputation >= 60);
    if (!pool.length) continue;
    const buyer = rng.pick(pool);
    const amount = roundMoney(Math.max(p.value, 300_000) * rng.range(1.1, 1.8));
    const anoSaida = state.year + Math.max(0, 18 - p.age);
    const espera = p.age >= 18 ? 'Como ele já tem 18 anos, pode se mudar imediatamente.' : `Pela regra da FIFA, menores de 18 não podem se transferir para o exterior: se aceitar, o ${buyer.name} paga agora e ${p.name} continua aqui até completar 18 anos (temporada ${anoSaida}).`;
    pushMessage(state, 'diretoria', `Europa de olho na base: ${p.name}`,
      `O ${buyer.name} (${PAISES[buyer.country].name}) oferece ${textoProposta(state, buyer, amount)} por ${p.name} (${p.pos}, ${p.age} anos, ${p.stars}★, potencial ${Math.round(p.potential)}). ${espera}`,
      { playerId: p.id, kind: 'proposta-base', data: { amount, clubId: buyer.id }, actions: [{ id: 'aceitar', label: 'Vender' }, { id: 'recusar', label: 'Recusar' }] });
  }
}

/** Vendas de garotos da base: aceite, pagamento e saída aos 18 anos. */
export function resolveYouthOffer(state: GameState, msgId: number, accept: boolean): string {
  const m = state.messages.find((x) => x.id === msgId);
  if (!m || m.resolved || m.playerId === undefined || !m.data) return '';
  m.resolved = accept ? 'aceitar' : 'recusar';
  m.read = true;
  if (!accept) return 'Proposta recusada: o garoto segue no clube.';
  const p = state.players[m.playerId];
  const club = state.clubs[state.userClubId];
  if (!club.youthIds.includes(p.id) && p.clubId !== club.id) return 'Esse jogador já não está no clube.';
  const buyer = state.clubs[m.data.clubId];
  const cut = investorCut(state);
  logFinance(state, `Venda de ${p.name} (base) ao ${buyer.name}`, m.data.amount);
  if (cut > 0) logFinance(state, `Parte dos investidores (${Math.round(cut * 100)}%) na venda de ${p.name}`, -roundMoney(m.data.amount * cut));
  if (p.age >= 18) {
    club.youthIds = club.youthIds.filter((x) => x !== p.id);
    p.youth = false;
    movePlayer(state, p, buyer.id);
    return `${p.name} vendido ao ${buyer.name} por ${formatMoney(m.data.amount)} e já se apresenta no novo clube.`;
  }
  p.saleAgreed = { clubId: buyer.id, amount: m.data.amount };
  return `Venda acertada: ${formatMoney(m.data.amount)} já entraram no caixa. ${p.name} fica até completar 18 anos e então se muda para o ${buyer.name}.`;
}

/** Virada do ano: quem tem venda acertada e completou 18 anos se muda. */
export function agreedTransfersSeasonEnd(state: GameState) {
  const club = state.clubs[state.userClubId];
  for (const p of state.players) {
    if (!p.saleAgreed || p.retired || p.age < 18) continue;
    const buyer = state.clubs[p.saleAgreed.clubId];
    const origem = state.clubs[p.clubId];
    if (origem) origem.youthIds = origem.youthIds.filter((x) => x !== p.id);
    p.youth = false;
    p.saleAgreed = undefined;
    movePlayer(state, p, buyer.id);
    p.contractUntil = state.year + 4;
    if (origem?.id === club.id) {
      pushMessage(state, 'midia', `${p.name} se despede rumo à Europa`,
        `Aos 18 anos, ${p.name} deixa o ${club.name} e se apresenta ao ${buyer.name}, como previa o acordo fechado quando ainda era da base.`);
    }
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
  if (p.saleAgreed) return `${p.name} já está vendido.`;
  logFinance(state, `Venda de ${p.name} ao ${buyer.name}`, m.data.amount);
  if (cut > 0) logFinance(state, `Parte dos investidores (${Math.round(cut * 100)}%) na venda de ${p.name}`, -roundMoney(m.data.amount * cut));
  buyer.money -= m.data.amount;
  movePlayer(state, p, buyer.id);
  p.respeito = 65;
  return `${p.name} vendido ao ${buyer.name} por ${formatDeal(m.data.amount, moedaDoPais(buyer.country))}.`;
}

// ---------------- Contratos ----------------

/** Lembretes de contratos que vencem no fim do ano (semana 40). */
export function contractReminders(state: GameState) {
  const club = state.clubs[state.userClubId];
  for (const id of club.playerIds) {
    const p = state.players[id];
    if (p.loan || p.contractUntil > state.year) continue;
    if (state.messages.some((m) => m.kind === 'contrato' && m.playerId === id && !m.resolved)) continue;
    const demanda = salaryDemand(p, true, club.country);
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
      p.salary = Math.max(p.salary, monthlySalary(marketValue(p.force, p.age, p.stars, p.potential, state.clubs[p.clubId].country), state.clubs[p.clubId].country));
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
