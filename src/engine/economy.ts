// Economia do jogo. Todo dinheiro é guardado em euro (€) e mostrado na moeda
// do clube do técnico: real (Brasil), euro (Europa) ou dólar (demais países
// das Américas). Receitas, valores de mercado e salários seguem a ordem de
// grandeza real de 2026 (fontes: balanços dos clubes, Transfermarkt, Deloitte).

import { PAISES } from './data/paises';
import { clamp, type Rng } from './rng';
import type { Club, CountryCode, GameState } from './types';

// ---------------- Moedas e câmbio ----------------

export type Moeda = 'BRL' | 'EUR' | 'USD';

/** Quanto vale 1 euro em cada moeda. */
export interface Cambio {
  BRL: number;
  USD: number;
}

/** Referência de 2026: € 1 ≈ R$ 6,30 ≈ US$ 1,17. */
export const CAMBIO_INICIAL: Cambio = { BRL: 6.3, USD: 1.17 };

export const SIMBOLO: Record<Moeda, string> = { BRL: 'R$', EUR: '€', USD: 'US$' };
export const NOME_MOEDA: Record<Moeda, string> = { BRL: 'real', EUR: 'euro', USD: 'dólar' };

/** Moeda das negociações e das finanças de um clube do país. */
export function moedaDoPais(country: CountryCode): Moeda {
  if (country === 'BRA') return 'BRL';
  return PAISES[country]?.confed === 'UEFA' ? 'EUR' : 'USD';
}

export function emMoeda(eur: number, moeda: Moeda, cambio: Cambio = CAMBIO_INICIAL): number {
  return moeda === 'EUR' ? eur : eur * cambio[moeda];
}

export function deMoeda(valor: number, moeda: Moeda, cambio: Cambio = CAMBIO_INICIAL): number {
  return moeda === 'EUR' ? valor : valor / cambio[moeda];
}

/** Oscilação anual do câmbio (passeio aleatório com limites). */
export function oscilarCambio(state: GameState, rng: Rng): Cambio {
  const c = state.fx ?? { ...CAMBIO_INICIAL };
  state.fx = {
    BRL: Math.round(clamp(c.BRL * Math.exp(rng.normal(0, 0.06)), 4.8, 8.5) * 100) / 100,
    USD: Math.round(clamp(c.USD * Math.exp(rng.normal(0, 0.035)), 0.95, 1.4) * 100) / 100,
  };
  return state.fx;
}

// ---------------- Receitas dos clubes ----------------

/** Receita anual (milhões de €) do menor e do maior clube de cada liga. */
const RECEITA: Record<string, [number, number]> = {
  BRA1: [28, 210], BRA2: [4, 28], BRA3: [0.8, 5], BRA4: [0.15, 1.2],
  ARG1: [6, 110], ARG2: [0.8, 6],
  CHI1: [3, 30], CHI2: [0.4, 3], COL1: [3, 35], COL2: [0.4, 3],
  ECU1: [2.5, 30], ECU2: [0.3, 2.5], BOL1: [1.5, 12], BOL2: [0.2, 1.2],
  ENG1: [150, 850], ENG2: [20, 90], ESP1: [45, 900], ESP2: [8, 40],
  GER1: [60, 900], GER2: [12, 60], ITA1: [45, 480], ITA2: [8, 40],
  FRA1: [35, 820], FRA2: [6, 35], POR1: [8, 260], POR2: [1.5, 10],
  NED1: [10, 260], NED2: [2, 12], TUR1: [12, 260], TUR2: [2, 15],
  SCO1: [5, 140], SCO2: [1, 8], GRE1: [4, 75], GRE2: [0.5, 4],
};

/** Clubes sem liga no jogo (externos e só-estaduais). */
function receitaExterna(club: Club): [number, number] {
  if (club.tier === 9) return [0.03, 0.4];
  if (club.confed === 'UEFA') return [5, 60];
  if (club.confed === 'CONMEBOL') return [2, 25];
  if (club.confed === 'CONCACAF') return [15, 120];
  return [3, 40];
}

/** Receita anual estimada (€): faixa da liga × tamanho/reputação do clube. */
export function clubRevenue(club: Club): number {
  const [lo, hi] = (club.leagueId && RECEITA[club.leagueId]) || receitaExterna(club);
  const repTier = club.tier === 0 ? 1 : club.tier === 9 ? 5 : club.tier;
  const q = clamp((club.reputation - (35 - (repTier - 1) * 12)) / 60, 0, 1);
  return Math.max((lo + (hi - lo) * Math.pow(q, 2.2)) * 1_000_000, club.revenueFloor ?? 0);
}

/**
 * Piso de receita definido na criação do mundo: um clube nunca começa com a
 * folha salarial acima de ~45% da receita (o resto paga TV, custos e reforços).
 */
export function revenueFloorFor(annualPayroll: number): number {
  return annualPayroll * 2.2;
}

/** Porte do clube para custos de obras (0,25 a 4). */
export function clubSize(club: Club): number {
  return clamp(clubRevenue(club) / 50_000_000, 0.25, 4);
}

/** Premiação do campeão de liga (≈ 5% da receita do maior clube). */
export function leaguePrize(leagueId: string): number {
  const r = RECEITA[leagueId];
  return Math.round((r ? r[1] * 0.05 : 1) * 1_000_000);
}

export function cupPrize(country: CountryCode): number {
  if (country === 'BRA') return 12_000_000; // Copa do Brasil paga como poucas copas no mundo
  const top = RECEITA[`${country}1`];
  return Math.round((top ? top[1] * 0.03 : 1) * 1_000_000);
}

export const PREMIO_CONTINENTAL: Record<string, number> = {
  LIB: 21_000_000, SUD: 8_500_000, UCL: 45_000_000, UEL: 18_000_000, UECL: 8_000_000, MUN: 100_000_000,
};

export function estadualPrize(uf: string): number {
  return ['SP', 'RJ', 'MG', 'RS'].includes(uf) ? 800_000 : 250_000;
}

/** Ingresso médio (€) da liga. */
export function baseTicketPrice(club: Club): number {
  const porPais: Partial<Record<CountryCode, number>> = {
    BRA: 12, ARG: 8, CHI: 7, COL: 7, ECU: 6, BOL: 4,
    ENG: 55, ESP: 35, GER: 30, ITA: 32, FRA: 30, POR: 20, NED: 25, TUR: 20, SCO: 22, GRE: 15,
    USA: 35, MEX: 15, CAN: 30,
  };
  const base = porPais[club.country] ?? (club.confed === 'UEFA' ? 15 : 8);
  const tierFactor = club.tier <= 1 ? 1 : club.tier === 2 ? 0.6 : club.tier === 3 ? 0.4 : 0.3;
  return Math.max(2, Math.round(base * tierFactor));
}

/** Custo por lugar numa ampliação de estádio (€). */
export function custoPorLugar(club: Club): number {
  if (club.confed === 'UEFA') return 4_000;
  if (club.country === 'BRA') return 1_500;
  return 1_000;
}

// ---------------- Valor de mercado e salário ----------------

/** Teto de valor de mercado (o mais caro da Europa). */
export const VALOR_MAXIMO = 358_000_000;

/** Valor (€) de um jogador de 2★ no auge, por força (interpolação geométrica). */
const CURVA_VALOR: [number, number][] = [
  [0, 5_000], [10, 30_000], [20, 150_000], [30, 600_000], [40, 1_800_000], [50, 5_000_000],
  [60, 11_000_000], [70, 12_000_000], [80, 14_000_000], [90, 20_000_000], [100, 30_000_000],
  [110, 45_000_000], [120, 70_000_000], [135, 120_000_000],
];

const STAR_VALUE = [1, 0.8, 1, 1.15, 1.35, 1.6, 2, 2.4];

/** Visibilidade do mercado: a mesma força vale mais na Premier League do que na Grécia. */
const MERCADO_PAIS: Partial<Record<CountryCode, number>> = {
  ENG: 1.15, ESP: 1, GER: 1, ITA: 0.95, FRA: 0.95, POR: 0.45, NED: 0.45, TUR: 0.4, SCO: 0.2, GRE: 0.2,
  BRA: 1, ARG: 0.75, COL: 0.55, CHI: 0.55, ECU: 0.55, BOL: 0.35, URU: 0.5, PAR: 0.45,
  USA: 0.7, MEX: 0.6, CAN: 0.6,
};

/** Clubes brasileiros e ingleses pagam mais em relação ao valor de venda. */
const SALARIO_PAIS: Partial<Record<CountryCode, number>> = {
  BRA: 1.35, ENG: 1.25, TUR: 1.3, ARG: 0.9, USA: 1.2, MEX: 1.1,
};

function curva(force: number): number {
  const f = clamp(force, 0, 135);
  for (let i = 1; i < CURVA_VALOR.length; i++) {
    const [f1, v1] = CURVA_VALOR[i];
    if (f <= f1) {
      const [f0, v0] = CURVA_VALOR[i - 1];
      const t = (f - f0) / (f1 - f0);
      return v0 * Math.pow(v1 / v0, t);
    }
  }
  return CURVA_VALOR[CURVA_VALOR.length - 1][1];
}

function fatorIdade(age: number): number {
  if (age <= 17) return 0.8;
  if (age <= 20) return 1.05;
  if (age <= 24) return 1.15;
  if (age <= 27) return 1.05;
  const tabela: Record<number, number> = { 28: 0.95, 29: 0.85, 30: 0.72, 31: 0.6, 32: 0.48, 33: 0.37, 34: 0.28, 35: 0.2 };
  return tabela[age] ?? Math.max(0.05, 0.2 - 0.04 * (age - 35));
}

export function roundMoney(v: number): number {
  if (v >= 1_000_000) return Math.round(v / 10_000) * 10_000;
  if (v >= 10_000) return Math.round(v / 100) * 100;
  return Math.round(v / 10) * 10;
}

/**
 * Valor de mercado (€). Jovens valem pelo potencial; o país do clube pesa
 * pela vitrine. Nunca passa de € 358 milhões.
 */
export function marketValue(force: number, age: number, stars = 2, potential?: number, country?: CountryCode): number {
  const promessa = potential !== undefined && potential > force ? (potential - force) * (age <= 20 ? 0.6 : age <= 23 ? 0.35 : 0) : 0;
  const mercado = country ? MERCADO_PAIS[country] ?? (PAISES[country]?.confed === 'UEFA' ? 0.4 : 0.45) : 1;
  const v = curva(force + promessa) * fatorIdade(age) * (STAR_VALUE[stars] ?? 1) * mercado;
  return roundMoney(clamp(v, 5_000, VALOR_MAXIMO));
}

/** Salário mensal (€) proporcional ao valor, ajustado pelo país. */
export function monthlySalary(value: number, country?: CountryCode): number {
  const fator = country ? SALARIO_PAIS[country] ?? 1 : 1;
  const piso = !country ? 400 : PAISES[country]?.confed === 'UEFA' ? 1_500 : 400;
  return roundMoney(0.07 * Math.pow(Math.max(1, value), 0.907) * fator + piso);
}
