// Geração de jogadores, valores de mercado e salários.

import { ESTILOS_POR_POS } from './data/estilos';
import { HABILIDADES, HABILIDADES_POR_POS, type Habilidade } from './data/habilidades';
import { ESTRANGEIROS } from './data/paises';
import { namePool } from './data/nomes';
import { clamp, type Rng } from './rng';
import type { CountryCode, Personalidade, Player, Pos } from './types';

/** Composição padrão de um elenco de 24 jogadores. */
export const SQUAD_TEMPLATE: Pos[] = [
  'G', 'G', 'G', 'LD', 'LD', 'ZG', 'ZG', 'ZG', 'ZG', 'LE', 'LE',
  'VOL', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA', 'ATA', 'MEI', 'ZG',
];

const PERSONALIDADES: [Personalidade, number][] = [
  ['lider', 10], ['profissional', 35], ['temperamental', 15], ['ambicioso', 20], ['tranquilo', 20],
];

/** Valor de mercado relativo por estrelas (índice = estrelas). */
const STAR_VALUE = [1, 0.9, 1, 1.15, 1.5, 2, 3, 4.5];

export function marketValue(force: number, age: number, stars = 2): number {
  const ageFactor = age <= 21 ? 1.3 : age <= 26 ? 1.15 : age <= 29 ? 1 : age <= 31 ? 0.7 : 0.4;
  const raw = 0.25 * Math.pow(Math.max(1, force), 4.2) * ageFactor * (STAR_VALUE[stars] ?? 1);
  return roundMoney(Math.max(20_000, raw));
}

export function monthlySalary(value: number): number {
  return roundMoney(value * 0.006 + 3_000);
}

export function roundMoney(v: number): number {
  if (v >= 1_000_000) return Math.round(v / 1000) * 1000;
  return Math.round(v / 100) * 100;
}

function pickNat(rng: Rng, clubCountry: CountryCode): CountryCode {
  const foreign = ESTRANGEIROS[clubCountry];
  if (foreign && rng.chance(0.14)) return rng.pick(foreign);
  return clubCountry;
}

export function playerName(rng: Rng, nat: CountryCode): string {
  const pool = namePool(nat);
  if (pool.nick && rng.chance(0.22)) return rng.pick(pool.nick);
  return `${rng.pick(pool.first)} ${rng.pick(pool.last)}`;
}

function randomAge(rng: Rng): number {
  return clamp(Math.round(rng.normal(26, 4.2)), 17, 37);
}

export const STAR_LABEL = ['', 'Comum', 'Bom', 'Muito bom', 'Desequilibrante', 'Craque', 'Lendário', 'Lenda viva'];

/** 1-3 estrelas: 4 habilidades; 4-5: 5; 6-7: 6. */
export function abilityCount(stars: number): number {
  return stars <= 3 ? 4 : stars <= 5 ? 5 : 6;
}

/**
 * Sorteia a classe do jogador. `shift` > 0 quando ele é melhor que a média do
 * clube (craques do time tendem a ter mais estrelas).
 */
export function rollStars(rng: Rng, shift: number): number {
  const z = rng.normal(0, 1) + 0.7 * shift;
  const limits = [-0.35, 0.5, 1.3, 2.0, 2.9, 3.8];
  const idx = limits.findIndex((l) => z < l);
  return idx === -1 ? 7 : idx + 1;
}

function baseIndex(h: Habilidade): number {
  // Cada habilidade-base ocupa 5 entradas consecutivas (sempre + 4 condições).
  return Math.floor(HABILIDADES_POR_POS[h.pos].indexOf(h) / 5);
}

/** Completa as habilidades até a quantidade exigida pelas estrelas, sem repetir a mesma base. */
export function syncAbilities(rng: Rng, p: Player) {
  const want = abilityCount(p.stars);
  const list = HABILIDADES_POR_POS[p.pos];
  const usedBases = new Set(p.abilities.map((id) => baseIndex(HABILIDADES[id])));
  let guard = 0;
  while (p.abilities.length < want && guard++ < 200) {
    const h = rng.pick(list);
    const b = baseIndex(h);
    if (usedBases.has(b)) continue;
    usedBases.add(b);
    p.abilities.push(h.id);
  }
}

export function createPlayer(
  rng: Rng,
  id: number,
  clubId: number,
  clubCountry: CountryCode,
  pos: Pos,
  baseForce: number,
  opts: { reserve?: boolean; age?: number; stars?: number; year?: number } = {},
): Player {
  const nat = pickNat(rng, clubCountry);
  const age = opts.age ?? randomAge(rng);
  const spread = Math.max(3, baseForce * 0.1);
  let force = rng.normal(baseForce + (opts.reserve ? -spread * 0.8 : spread * 0.25), spread * 0.75);
  // Jovens costumam estar abaixo do auge; veteranos também.
  if (age <= 20) force -= spread * 0.6;
  if (age >= 34) force -= spread * 0.4;
  const stars = opts.stars ?? rollStars(rng, (force - baseForce) / spread);
  // Estrelas altas puxam a força para cima dentro do clube.
  if (stars >= 4) force += spread * (stars - 3) * 0.35;
  force = Math.round(clamp(force, 1, 130));
  const growth = age < 24 ? (24 - age) * rng.range(0.6, 2.4) : 0;
  const potential = Math.round(clamp(force + growth, force, 135));
  const starCap = age <= 21 && stars < 5 && rng.chance(0.25) ? stars + 1 : stars;
  const value = marketValue(force, age, stars);
  const p: Player = {
    id,
    name: playerName(rng, nat),
    nat,
    pos,
    age,
    force,
    potential,
    stars,
    starCap,
    legend: stars >= 6 || undefined,
    abilities: [],
    style: rng.pick(ESTILOS_POR_POS[pos]),
    personality: rng.weighted(PERSONALIDADES, ([, w]) => w)[0],
    energy: 100,
    respeito: 65,
    oportunidade: 60,
    treino: 60,
    clubId,
    injuredSlots: 0,
    suspendedGames: 0,
    yellowCards: 0,
    seasonGoals: 0,
    seasonGames: 0,
    seasonAssists: 0,
    benchStreak: 0,
    value,
    salary: monthlySalary(value),
    forSale: false,
    contractUntil: (opts.year ?? 2026) + rng.int(0, 3),
  };
  syncAbilities(rng, p);
  return p;
}

export function abilityNames(p: Player): string[] {
  return p.abilities.map((id) => HABILIDADES[id]?.nome ?? '?');
}

export const POS_LABEL: Record<Pos, string> = {
  G: 'G', LD: 'LD', ZG: 'ZG', LE: 'LE', VOL: 'VOL', MEI: 'MEI', ATA: 'ATA',
};

export const POS_ORDER: Record<Pos, number> = { G: 0, LD: 1, ZG: 2, LE: 3, VOL: 4, MEI: 5, ATA: 6 };

export function setorOf(pos: Pos): 'GOL' | 'DEF' | 'MEI' | 'ATA' {
  if (pos === 'G') return 'GOL';
  if (pos === 'LD' || pos === 'LE' || pos === 'ZG') return 'DEF';
  if (pos === 'VOL' || pos === 'MEI') return 'MEI';
  return 'ATA';
}
