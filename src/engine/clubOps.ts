// Administração do clube: finanças, estádio, CT, ingressos e mercado.

import { initialRespeito } from './coach';
import { leagueById } from './data/ligas';
import { formatMoney, pushMessage } from './inbox';
import { roundMoney } from './players';
import { clamp, type Rng } from './rng';
import type { Club, GameState, Player } from './types';

export function clubEco(club: Club): number {
  if (club.leagueId) return leagueById(club.leagueId).eco;
  return club.tier === 9 ? 0.01 : 0.3;
}

export function baseTicketPrice(club: Club): number {
  return Math.round(40 + 25 * Math.min(clubEco(club), 3));
}

export function logFinance(state: GameState, label: string, amount: number) {
  const club = state.clubs[state.userClubId];
  club.money += amount;
  state.financeLog.unshift({ slot: state.slot, year: state.year, label, amount: Math.round(amount) });
  if (state.financeLog.length > 80) state.financeLog.length = 80;
}

export function weeklySalaries(state: GameState, club: Club): number {
  return club.playerIds.reduce((s, id) => s + state.players[id].salary, 0) / 4.33;
}

/** Receitas e despesas semanais do clube do usuário. */
export function weeklyFinance(state: GameState) {
  const club = state.clubs[state.userClubId];
  const eco = clubEco(club);
  logFinance(state, 'Cotas de TV e patrocínio', roundMoney(1_200_000 * eco + 15_000));
  logFinance(state, 'Folha salarial', -roundMoney(weeklySalaries(state, club)));
  logFinance(state, 'Manutenção do estádio e CT', -roundMoney((club.stadium.capacity * 1.5 + club.ct * 30_000) * Math.max(eco, 0.05)));
  // Obras concluídas.
  const exp = club.stadium.expansion;
  if (exp && state.slot >= exp.readySlot) {
    club.stadium.capacity += exp.seats;
    club.stadium.expansion = undefined;
    pushMessage(state, 'diretoria', 'Obra concluída', `A ampliação do estádio terminou. Nova capacidade: ${club.stadium.capacity.toLocaleString('pt-BR')} lugares.`);
  }
  if (club.ctUpgradeReadySlot !== undefined && state.slot >= club.ctUpgradeReadySlot) {
    club.ct = Math.min(5, club.ct + 1);
    club.ctUpgradeReadySlot = undefined;
    pushMessage(state, 'diretoria', 'CT modernizado', `O centro de treinamento agora é nível ${club.ct}. Treinos rendem mais e a recuperação é mais rápida.`);
  }
  if (club.money < 0) state.coach.confDiretoria = clamp(state.coach.confDiretoria - 1.5, 0, 100);
}

/** Público e renda de um jogo em casa do usuário. */
export function homeGate(state: GameState, bigGame: boolean): { attendance: number; revenue: number; crowd: number } {
  const club = state.clubs[state.userClubId];
  const base = baseTicketPrice(club);
  const demand = 0.25 + 0.4 * (club.reputation / 100) + 0.35 * (state.coach.confTorcida / 100) + (bigGame ? 0.15 : 0);
  const priceFactor = clamp(1.35 - 0.35 * (club.ticketPrice / base), 0.25, 1.25);
  const ratio = clamp(demand * priceFactor, 0.05, 1);
  const attendance = Math.round(club.stadium.capacity * ratio);
  return { attendance, revenue: attendance * club.ticketPrice, crowd: ratio * (0.5 + 0.5 * state.coach.confTorcida / 100) };
}

// ---------------- Estádio e CT ----------------

export const EXPANSOES = [2000, 5000, 10000];

export function expansionCost(club: Club, seats: number): number {
  return roundMoney(seats * 1500 * clamp(clubEco(club), 0.15, 3));
}

export function expandStadium(state: GameState, seats: number): string {
  const club = state.clubs[state.userClubId];
  if (club.stadium.expansion) return 'Já existe uma obra em andamento no estádio.';
  const cost = expansionCost(club, seats);
  if (club.money < cost) return `Dinheiro insuficiente: a obra custa ${formatMoney(cost)}.`;
  logFinance(state, `Ampliação do estádio (+${seats} lugares)`, -cost);
  club.stadium.expansion = { seats, readySlot: state.slot + Math.ceil(seats / 1000) * 2 };
  return `Obra iniciada! ${seats.toLocaleString('pt-BR')} novos lugares em cerca de ${Math.ceil(seats / 1000)} semanas.`;
}

export function ctUpgradeCost(club: Club): number {
  return roundMoney(3_000_000 * club.ct * club.ct * clamp(clubEco(club), 0.1, 3));
}

export function upgradeCT(state: GameState): string {
  const club = state.clubs[state.userClubId];
  if (club.ct >= 5) return 'O CT já está no nível máximo.';
  if (club.ctUpgradeReadySlot !== undefined) return 'O CT já está em obras.';
  const cost = ctUpgradeCost(club);
  if (club.money < cost) return `Dinheiro insuficiente: a modernização custa ${formatMoney(cost)}.`;
  logFinance(state, `Modernização do CT (nível ${club.ct + 1})`, -cost);
  club.ctUpgradeReadySlot = state.slot + 16;
  return 'Obras no CT iniciadas! Ficam prontas em cerca de 8 semanas.';
}

export function setTicketPrice(state: GameState, price: number) {
  state.clubs[state.userClubId].ticketPrice = clamp(Math.round(price), 5, 2000);
}

// ---------------- Mercado ----------------

export function askingPrice(p: Player): number {
  return roundMoney(p.value * (p.forSale ? 0.95 : 1.25));
}

export function searchMarket(state: GameState, filters: { pos?: string; maxPrice?: number; minForce?: number; country?: string }): Player[] {
  const out: Player[] = [];
  for (const p of state.players) {
    if (p.retired || p.clubId === state.userClubId) continue;
    const club = state.clubs[p.clubId];
    if (!club || club.tier === 0) continue;
    if (filters.pos && p.pos !== filters.pos) continue;
    if (filters.country && club.country !== filters.country) continue;
    if (filters.minForce && p.force < filters.minForce) continue;
    if (filters.maxPrice && askingPrice(p) > filters.maxPrice) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.force - a.force).slice(0, 60);
}

function movePlayer(state: GameState, p: Player, toClubId: number) {
  const from = state.clubs[p.clubId];
  from.playerIds = from.playerIds.filter((id) => id !== p.id);
  state.clubs[toClubId].playerIds.push(p.id);
  p.clubId = toClubId;
  p.forSale = false;
  p.promiseUntilSlot = undefined;
  p.benchStreak = 0;
}

export function buyPlayer(state: GameState, playerId: number): string {
  const p = state.players[playerId];
  const club = state.clubs[state.userClubId];
  const seller = state.clubs[p.clubId];
  if (club.playerIds.length >= 36) return 'Elenco cheio (máximo 36 jogadores).';
  if (seller.playerIds.length <= 18) return `O ${seller.name} não quer vender: elenco muito curto.`;
  const price = askingPrice(p);
  if (club.money < price) return `Dinheiro insuficiente: o ${seller.name} pede ${formatMoney(price)}.`;
  logFinance(state, `Contratação de ${p.name}`, -price);
  seller.money += price;
  movePlayer(state, p, club.id);
  p.respeito = initialRespeito(state.coach, p);
  p.oportunidade = 50;
  pushMessage(state, 'midia', 'Reforço!', `${club.name} anuncia ${p.name} (${p.pos}, ${p.age} anos), ex-${seller.name}, por ${formatMoney(price)}.`);
  return `${p.name} contratado por ${formatMoney(price)}!`;
}

export function toggleForSale(state: GameState, playerId: number) {
  const p = state.players[playerId];
  if (p.clubId !== state.userClubId) return;
  p.forSale = !p.forSale;
}

/** Propostas semanais por jogadores à venda (e, às vezes, pelos destaques). */
export function weeklyOffers(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  for (const id of club.playerIds) {
    const p = state.players[id];
    const open = state.messages.some((m) => m.kind === 'proposta' && m.playerId === id && !m.resolved);
    if (open) continue;
    const chance = p.forSale ? 0.35 : p.force > club.baseForce * 1.15 ? 0.02 : 0;
    if (!rng.chance(chance)) continue;
    const buyers = state.clubs.filter((c) => c.id !== club.id && c.tier > 0 && c.tier < 9 && c.baseForce >= p.force * 0.85 && c.money > p.value * 0.6);
    if (!buyers.length) continue;
    const buyer = rng.pick(buyers);
    const amount = roundMoney(p.value * rng.range(p.forSale ? 0.75 : 1.0, p.forSale ? 1.1 : 1.4));
    pushMessage(state, 'diretoria', `Proposta por ${p.name}`,
      `O ${buyer.name} oferece ${formatMoney(amount)} por ${p.name}. A decisão é sua, professor.`,
      { playerId: p.id, kind: 'proposta', data: { amount, clubId: buyer.id }, actions: [{ id: 'aceitar', label: 'Aceitar' }, { id: 'recusar', label: 'Recusar' }] });
  }
}

export function resolveOffer(state: GameState, msgId: number, accept: boolean): string {
  const m = state.messages.find((x) => x.id === msgId);
  if (!m || m.resolved || m.kind !== 'proposta' || m.playerId === undefined || !m.data) return '';
  m.resolved = accept ? 'aceitar' : 'recusar';
  m.read = true;
  const p = state.players[m.playerId];
  if (!accept) return 'Proposta recusada.';
  if (p.clubId !== state.userClubId) return 'Esse jogador já não está no clube.';
  const club = state.clubs[state.userClubId];
  if (club.playerIds.length <= 16) return 'Venda bloqueada: o elenco ficaria curto demais.';
  const buyer = state.clubs[m.data.clubId];
  logFinance(state, `Venda de ${p.name}`, m.data.amount);
  buyer.money -= m.data.amount;
  movePlayer(state, p, buyer.id);
  p.respeito = 65;
  state.lineup.starters = state.lineup.starters.filter((id) => id !== p.id);
  state.lineup.bench = state.lineup.bench.filter((id) => id !== p.id);
  return `${p.name} vendido ao ${buyer.name} por ${formatMoney(m.data.amount)}.`;
}
