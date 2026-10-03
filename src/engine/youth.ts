// Categorias de base (15 a 20 anos). Duas safras por ano. A chance de surgir
// uma joia lendária cresce com o nível da base, o CT e o dinheiro investido
// (patrocínios de base, investidores e aportes do clube).

import { initialRespeito } from './coach';
import { logFinance } from './clubOps';
import { clubRevenue, clubSize } from './economy';
import { formatMoney, pushMessage } from './inbox';
import { createPlayer, marketValue, monthlySalary, roundMoney, rollStars, SQUAD_TEMPLATE, syncAbilities, STAR_LABEL } from './players';
import { clamp, type Rng } from './rng';
import type { Club, GameState, Player } from './types';

/** 0-1: quanto o investimento da temporada pesa (≈ 4% da receita anual enche a barra). */
export function investFactor(club: Club): number {
  return clamp(club.baseInvest / (clubRevenue(club) * 0.04 + 150_000), 0, 1);
}

/** Probabilidade de cada garoto da safra ser uma joia lendária. */
export function legendChance(club: Club): number {
  return 0.002 + 0.003 * club.baseLevel + 0.0015 * club.ct + 0.03 * investFactor(club);
}

export function intakeSize(club: Club): number {
  return 2 + Math.floor(club.baseLevel / 2);
}

function createLegend(rng: Rng, state: GameState, club: Club, id: number): Player {
  const inv = investFactor(club);
  const weights = [40, 25, 18, 11, 6].map((w, i) => w * (1 + inv * i * 0.5));
  const lvl = rng.weighted([1, 2, 3, 4, 5], (x) => weights[x - 1]);
  const pos = rng.pick(['G', 'ZG', 'MEI', 'ATA', 'ATA', 'MEI', 'VOL', 'LD', 'LE'] as const);
  const p = createPlayer(rng, id, club.id, club.country, pos, 60, { age: 15, stars: lvl, year: state.year });
  p.force = 64 + 4 * lvl + rng.int(-3, 4);
  p.potential = Math.min(135, p.force + rng.int(20, 35));
  p.legend = true;
  p.starCap = lvl >= 4 ? 7 : 6;
  p.personality = rng.chance(0.5) ? 'ambicioso' : 'lider';
  p.value = marketValue(p.force, p.age, Math.max(lvl, 5), p.potential, club.country);
  p.salary = roundMoney(monthlySalary(p.value, club.country) * 0.25);
  return p;
}

/** Nova safra da base do clube do usuário. */
export function youthIntake(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  const inv = investFactor(club);
  const novos: Player[] = [];
  for (let i = 0; i < intakeSize(club); i++) {
    const id = state.players.length;
    let p: Player;
    if (rng.next() < legendChance(club)) {
      p = createLegend(rng, state, club, id);
    } else {
      const pos = SQUAD_TEMPLATE[rng.int(0, SQUAD_TEMPLATE.length - 1)];
      const base = club.baseForce * (0.32 + 0.06 * club.baseLevel + 0.12 * inv);
      const stars = rollStars(rng, -0.6 + inv + club.baseLevel * 0.15);
      p = createPlayer(rng, id, club.id, club.country, pos, base, { age: rng.int(15, 17), stars, year: state.year });
      p.potential = Math.round(clamp(p.force + rng.range(8, 20 + 5 * club.baseLevel + 15 * inv), p.force, 130));
      if (stars < 5 && rng.chance(0.3 + inv * 0.3)) p.starCap = stars + 1;
      p.value = marketValue(p.force, p.age, p.stars, p.potential, club.country);
      p.salary = roundMoney(monthlySalary(p.value, club.country) * 0.25);
    }
    p.youth = true;
    p.nat = club.country;
    p.contractUntil = state.year + 3;
    p.respeito = initialRespeito(state.coach, p);
    state.players.push(p);
    club.youthIds.push(p.id);
    novos.push(p);
  }
  state.nextIds.player = state.players.length;
  const legend = novos.find((p) => p.legend);
  if (legend) {
    pushMessage(state, 'midia', 'JOIA RARA NA BASE!',
      `O ${club.name} revelou ${legend.name}, ${legend.pos} de ${legend.age} anos, já com força ${legend.force} e ${legend.stars} estrela(s). Olheiros da Europa já ligaram. Pode virar uma lenda.`);
  }
  pushMessage(state, 'diretoria', 'Nova safra da base',
    `Chegaram ${novos.length} garotos às categorias de base: ` +
    novos.map((p) => `${p.name} (${p.pos}, ${p.age} anos, força ${p.force}, ${p.stars}★${p.legend ? ' — LENDÁRIO' : ''})`).join('; ') + '.');
}

/** Treino semanal dos garotos da base. */
export function weeklyYouthTraining(state: GameState) {
  const club = state.clubs[state.userClubId];
  const mult = (0.6 + 0.1 * club.ct) * (0.7 + 0.12 * club.baseLevel) * (1 + 0.5 * investFactor(club));
  const intens = state.treino === 'forte' ? 1.3 : state.treino === 'leve' ? 0.7 : 1;
  for (const id of club.youthIds) {
    const p = state.players[id];
    if (p.force >= p.potential) continue;
    p.force = Math.min(p.potential, p.force + 0.12 * mult * intens * (p.legend ? 2 : 1));
    p.energy = 100;
  }
}

/** Ganho de estrelas ao fim da temporada (joias lendárias sobem mais rápido). */
export function starGrowth(rng: Rng, p: Player) {
  if (p.stars >= p.starCap) return;
  const chance = p.legend ? 0.55 : p.age <= 22 ? 0.2 : 0;
  if (rng.chance(chance)) {
    p.stars++;
    syncAbilities(rng, p);
  }
}

export function promoteYouth(state: GameState, id: number): string {
  const club = state.clubs[state.userClubId];
  const p = state.players[id];
  if (!club.youthIds.includes(id)) return '';
  if (club.playerIds.length >= 36) return 'Elenco profissional cheio (máximo 36).';
  club.youthIds = club.youthIds.filter((x) => x !== id);
  club.playerIds.push(id);
  p.youth = false;
  p.value = marketValue(p.force, p.age, p.stars, p.potential, club.country);
  p.salary = Math.max(p.salary, roundMoney(monthlySalary(p.value, club.country) * 0.6));
  p.oportunidade = 40;
  return `${p.name} foi promovido ao time profissional!`;
}

export function releaseYouth(state: GameState, id: number): string {
  const club = state.clubs[state.userClubId];
  const p = state.players[id];
  if (p.saleAgreed) return `${p.name} já está vendido ao ${state.clubs[p.saleAgreed.clubId].name} e sai aos 18 anos.`;
  club.youthIds = club.youthIds.filter((x) => x !== id);
  p.retired = true;
  return `${p.name} foi dispensado da base.`;
}

/** Aporte do clube nas categorias de base. */
export function investInBase(state: GameState, amount: number): string {
  const club = state.clubs[state.userClubId];
  if (club.money < amount) return `Dinheiro insuficiente para investir ${formatMoney(amount)}.`;
  logFinance(state, 'Investimento nas categorias de base', -amount);
  club.baseInvest += amount;
  return `${formatMoney(amount)} investidos na base. Chance de joia lendária por garoto: ${(legendChance(club) * 100).toFixed(1)}%.`;
}

export function baseUpgradeCost(club: Club): number {
  return roundMoney(150_000 * club.baseLevel * club.baseLevel * clubSize(club));
}

export function upgradeBase(state: GameState): string {
  const club = state.clubs[state.userClubId];
  if (club.baseLevel >= 5) return 'As categorias de base já estão no nível máximo.';
  const cost = baseUpgradeCost(club);
  if (club.money < cost) return `Dinheiro insuficiente: a melhoria custa ${formatMoney(cost)}.`;
  logFinance(state, `Estrutura da base (nível ${club.baseLevel + 1})`, -cost);
  club.baseLevel++;
  return `Categorias de base agora são nível ${club.baseLevel}. Safras maiores e mais talentosas.`;
}

/** Virada de ano: garotos envelhecem; quem passa de 20 sobe ou é dispensado. */
export function youthSeasonEnd(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  for (const id of [...club.youthIds]) {
    const p = state.players[id];
    p.age++;
    starGrowth(rng, p);
    if (p.age > 20) {
      if (p.force >= club.baseForce * 0.7 || p.legend) {
        const msg = promoteYouth(state, id);
        if (msg) pushMessage(state, 'diretoria', 'Promoção automática', `${msg} Com ${p.age} anos ele não pode mais jogar na base.`);
      } else {
        releaseYouth(state, id);
        pushMessage(state, 'diretoria', 'Fim de ciclo na base', `${p.name} completou ${p.age} anos sem nível para o profissional e foi liberado.`);
      }
    }
  }
  // Metade do investimento "envelhece" a cada ano.
  club.baseInvest *= 0.5;
}

export { STAR_LABEL };
