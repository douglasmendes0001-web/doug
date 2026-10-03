// Formatação de dinheiro. Os valores chegam em euro e são mostrados na moeda
// do clube do técnico (ou na moeda de uma negociação), no padrão brasileiro:
// "R$ 52,4 mi", "€ 8,4 mi", "US$ 950 mil".

import { CAMBIO_INICIAL, SIMBOLO, emMoeda, moedaDoPais, type Cambio, type Moeda } from './economy';
import type { GameState } from './types';

let moedaAtual: Moeda = 'BRL';
let cambioAtual: Cambio = CAMBIO_INICIAL;

/** Atualiza a moeda de exibição e o câmbio a partir da carreira. */
export function syncMoney(state: GameState) {
  const club = state.clubs[state.userClubId];
  if (club) moedaAtual = moedaDoPais(club.country);
  cambioAtual = state.fx ?? CAMBIO_INICIAL;
}

export function moedaExibicao(): Moeda {
  return moedaAtual;
}

export function cambio(): Cambio {
  return cambioAtual;
}

function num(v: number, casas: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Valor em euro mostrado na moeda escolhida (padrão: a do clube do técnico). */
export function formatMoney(eur: number, moeda: Moeda = moedaAtual): string {
  const v = emMoeda(eur, moeda, cambioAtual);
  const a = Math.abs(v);
  let s: string;
  if (a >= 1_000_000_000) s = `${num(a / 1_000_000_000, 2)} bi`;
  else if (a >= 100_000_000) s = `${num(Math.round(a / 1_000_000), 0)} mi`;
  else if (a >= 1_000_000) s = `${num(a / 1_000_000, 1)} mi`;
  else if (a >= 1000) s = `${num(Math.round(a / 1000), 0)} mil`;
  else s = num(Math.round(a), 0);
  return `${v < 0 ? '-' : ''}${SIMBOLO[moeda]} ${s}`;
}

/**
 * Valor de uma negociação em outra moeda, com a conversão para a moeda do
 * clube: "€ 8,4 mi (≈ R$ 52,9 mi)".
 */
export function formatDeal(eur: number, moedaNegocio: Moeda): string {
  if (moedaNegocio === moedaAtual) return formatMoney(eur);
  return `${formatMoney(eur, moedaNegocio)} (≈ ${formatMoney(eur)})`;
}

/** Cotação de 1 unidade da moeda da negociação na moeda do clube: "€ 1 = R$ 6,30". */
export function cambioLabel(negocio: Moeda, local: Moeda = moedaAtual): string {
  if (negocio === local) return '';
  const emEuro = (m: Moeda) => (m === 'EUR' ? 1 : cambioAtual[m]);
  return `${SIMBOLO[negocio]} 1 = ${SIMBOLO[local]} ${num(emEuro(local) / emEuro(negocio), 2)}`;
}

export { moedaDoPais };
