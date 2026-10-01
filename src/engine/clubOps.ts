// Administração do clube: finanças, estádio, CT, ingressos e mercado.

import { leagueById } from './data/ligas';
import { formatMoney, pushMessage } from './inbox';
import { roundMoney } from './players';
import { clamp } from './rng';
import type { Club, GameState } from './types';

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
