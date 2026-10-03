// Administração do clube: finanças, estádio, CT, ingressos e mercado.

import { baseTicketPrice as ingressoBase, clubRevenue, clubSize, custoPorLugar } from './economy';
import { formatMoney, pushMessage } from './inbox';
import { roundMoney } from './players';
import { clamp } from './rng';
import type { Club, GameState } from './types';

/** Ingresso de referência (€) — o preço praticado pela liga. */
export function baseTicketPrice(club: Club): number {
  return ingressoBase(club);
}

/** Parte da receita anual que entra como cotas de TV e receitas comerciais. */
export const PARTE_TV = 0.52;
/** Custos fixos (funcionários, viagens, dívidas, administração) em relação à receita. */
export const PARTE_CUSTOS = 0.28;

/** Receitas e despesas fixas por semana (sem salários, patrocínios e bilheteria). */
export function weeklyFixed(club: Club): { tv: number; custos: number } {
  const rev = clubRevenue(club);
  const custos = rev * PARTE_CUSTOS + club.stadium.capacity * 60 + club.ct * rev * 0.01;
  return { tv: roundMoney((rev * PARTE_TV) / 52), custos: roundMoney(custos / 52) };
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
  const fixo = weeklyFixed(club);
  logFinance(state, 'Cotas de TV e receitas comerciais', fixo.tv);
  logFinance(state, 'Folha salarial', -roundMoney(weeklySalaries(state, club)));
  logFinance(state, 'Custos fixos (funcionários, viagens, estádio e CT)', -fixo.custos);
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
  return roundMoney(seats * custoPorLugar(club));
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
  return roundMoney(250_000 * club.ct * club.ct * clubSize(club));
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
  state.clubs[state.userClubId].ticketPrice = clamp(Math.round(price), 1, 500);
}
