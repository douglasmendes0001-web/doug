// Geração de jogadores, valores de mercado e salários.

import { ESTRANGEIROS } from './data/paises';
import { namePool } from './data/nomes';
import { clamp, type Rng } from './rng';
import type { CountryCode, Personalidade, Player, Pos } from './types';

export const TRAITS: Record<Pos, string[]> = {
  G: ['Colocação', 'Reflexo', 'Saída do gol', 'Pênaltis'],
  LD: ['Velocidade', 'Cruzamento', 'Marcação', 'Desarme', 'Resistência'],
  LE: ['Velocidade', 'Cruzamento', 'Marcação', 'Desarme', 'Resistência'],
  ZG: ['Marcação', 'Desarme', 'Cabeceio', 'Velocidade', 'Passe'],
  VOL: ['Desarme', 'Marcação', 'Passe', 'Resistência', 'Armação'],
  MEI: ['Passe', 'Armação', 'Drible', 'Finalização', 'Resistência'],
  ATA: ['Finalização', 'Cabeceio', 'Velocidade', 'Drible', 'Oportunismo'],
};

/** Composição padrão de um elenco de 24 jogadores. */
export const SQUAD_TEMPLATE: Pos[] = [
  'G', 'G', 'G', 'LD', 'LD', 'ZG', 'ZG', 'ZG', 'ZG', 'LE', 'LE',
  'VOL', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA', 'ATA', 'MEI', 'ZG',
];

const PERSONALIDADES: [Personalidade, number][] = [
  ['lider', 10], ['profissional', 35], ['temperamental', 15], ['ambicioso', 20], ['tranquilo', 20],
];

export function marketValue(force: number, age: number): number {
  const ageFactor = age <= 21 ? 1.3 : age <= 26 ? 1.15 : age <= 29 ? 1 : age <= 31 ? 0.7 : 0.4;
  const raw = 0.25 * Math.pow(Math.max(1, force), 4.2) * ageFactor;
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

export function createPlayer(
  rng: Rng,
  id: number,
  clubId: number,
  clubCountry: CountryCode,
  pos: Pos,
  baseForce: number,
  opts: { reserve?: boolean; age?: number } = {},
): Player {
  const nat = pickNat(rng, clubCountry);
  const age = opts.age ?? randomAge(rng);
  const spread = Math.max(3, baseForce * 0.1);
  let force = rng.normal(baseForce + (opts.reserve ? -spread * 0.8 : spread * 0.25), spread * 0.75);
  // Jovens costumam estar abaixo do auge; veteranos também.
  if (age <= 20) force -= spread * 0.6;
  if (age >= 34) force -= spread * 0.4;
  force = Math.round(clamp(force, 1, 130));
  const growth = age < 24 ? (24 - age) * rng.range(0.6, 2.4) : 0;
  const potential = Math.round(clamp(force + growth, force, 135));
  const traitList = TRAITS[pos];
  const t1 = rng.pick(traitList);
  let t2 = rng.pick(traitList);
  while (t2 === t1) t2 = rng.pick(traitList);
  const value = marketValue(force, age);
  return {
    id,
    name: playerName(rng, nat),
    nat,
    pos,
    age,
    force,
    potential,
    traits: [t1, t2],
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
    benchStreak: 0,
    value,
    salary: monthlySalary(value),
    forSale: false,
  };
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
