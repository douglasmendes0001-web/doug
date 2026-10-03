// Cartões e lesões com as regras atuais (CBF/Conmebol/UEFA):
//
// - Amarelos contam por competição: 3 amarelos na mesma competição = 1 jogo de
//   suspensão nela, e a contagem zera.
// - Dois amarelos no mesmo jogo = vermelho: 1 jogo de suspensão, e esses
//   amarelos não entram na contagem.
// - Vermelho direto: 1 jogo (falta comum), 2 (jogada violenta) ou 3 (agressão).
// - A suspensão é cumprida nos próximos jogos da mesma competição. Suspenso ou
//   lesionado não pode ser relacionado (nem titular, nem banco).
// - Lesões têm tipo e tempo de recuperação; o CT do clube encurta o tempo.

import type { Rng } from './rng';
import type { Player } from './types';

export const AMARELOS_PARA_SUSPENSAO = 3;

/** Suspensão vinda de saves antigos: vale para o próximo jogo de qualquer competição. */
const QUALQUER = '*';

function suspensoes(p: Player): Record<string, number> {
  if (!p.suspensoes) p.suspensoes = p.suspendedGames > 0 ? { [QUALQUER]: p.suspendedGames } : {};
  return p.suspensoes;
}

function sincronizar(p: Player) {
  const s = suspensoes(p);
  for (const k of Object.keys(s)) if (s[k] <= 0) delete s[k];
  p.suspendedGames = Object.values(s).reduce((a, b) => a + b, 0);
}

/** Jogos de suspensão a cumprir na competição (sem competição: total). */
export function suspensoEm(p: Player, compId?: string): number {
  if (compId === undefined) return p.suspensoes ? Object.values(p.suspensoes).reduce((a, b) => a + b, 0) : p.suspendedGames;
  if (!p.suspensoes) return p.suspendedGames;
  return (p.suspensoes[compId] ?? 0) + (p.suspensoes[QUALQUER] ?? 0);
}

/** Pode ser relacionado para um jogo da competição (sem competição: para qualquer jogo). */
export function podeSerRelacionado(p: Player, compId?: string): boolean {
  return !p.retired && p.injuredSlots <= 0 && suspensoEm(p, compId) <= 0;
}

export function suspender(p: Player, compId: string, jogos: number) {
  const s = suspensoes(p);
  s[compId] = (s[compId] ?? 0) + jogos;
  sincronizar(p);
}

/** Cumpre um jogo de suspensão (o time jogou essa competição sem ele). */
export function cumprirSuspensao(p: Player, compId: string): boolean {
  const s = suspensoes(p);
  const k = (s[QUALQUER] ?? 0) > 0 ? QUALQUER : (s[compId] ?? 0) > 0 ? compId : undefined;
  if (!k) return false;
  s[k]--;
  sincronizar(p);
  return true;
}

export function amarelosEm(p: Player, compId: string): number {
  return p.amarelos?.[compId] ?? 0;
}

export type Expulsao = 'dois-amarelos' | 'direto';

export interface Punicao {
  /** Jogos de suspensão gerados nesta partida (0 se nenhum). */
  jogos: number;
  motivo?: 'amarelos' | Expulsao;
}

/** Jogos de suspensão por vermelho direto: 1 (60%), 2 (30%) ou 3 (10%). */
export function ganchoVermelhoDireto(rng: Rng): number {
  const r = rng.next();
  return r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
}

/**
 * Aplica os cartões de uma partida ao jogador. `amarelosNoJogo`: amarelos que
 * recebeu nesta partida; `expulsao`: se foi expulso e como.
 */
export function aplicarCartoes(p: Player, compId: string, amarelosNoJogo: number, expulsao: Expulsao | undefined, rng: Rng): Punicao {
  if (expulsao === 'direto') {
    const jogos = ganchoVermelhoDireto(rng);
    suspender(p, compId, jogos);
    return { jogos, motivo: 'direto' };
  }
  if (expulsao === 'dois-amarelos') {
    // Os dois amarelos viraram vermelho: não entram na contagem.
    suspender(p, compId, 1);
    return { jogos: 1, motivo: 'dois-amarelos' };
  }
  if (amarelosNoJogo <= 0) return { jogos: 0 };
  p.yellowCards += amarelosNoJogo;
  const mapa = (p.amarelos ??= {});
  mapa[compId] = (mapa[compId] ?? 0) + amarelosNoJogo;
  if (mapa[compId] >= AMARELOS_PARA_SUSPENSAO) {
    mapa[compId] = 0;
    suspender(p, compId, 1);
    return { jogos: 1, motivo: 'amarelos' };
  }
  return { jogos: 0 };
}

/** Fim de temporada: zera cartões e suspensões. */
export function zerarCartoes(p: Player) {
  p.yellowCards = 0;
  p.suspendedGames = 0;
  p.amarelos = undefined;
  p.suspensoes = undefined;
}

// ---------------- Lesões ----------------

interface TipoLesao {
  nome: string;
  /** Semanas de recuperação (mínimo e máximo). */
  semanas: [number, number];
  peso: number;
}

export const LESOES: TipoLesao[] = [
  { nome: 'Pancada (contusão)', semanas: [0.5, 1], peso: 30 },
  { nome: 'Estiramento muscular', semanas: [1, 2], peso: 20 },
  { nome: 'Lesão muscular na coxa', semanas: [2, 5], peso: 16 },
  { nome: 'Lesão na panturrilha', semanas: [2, 4], peso: 8 },
  { nome: 'Entorse no tornozelo', semanas: [2, 5], peso: 10 },
  { nome: 'Lesão no adutor', semanas: [3, 6], peso: 5 },
  { nome: 'Fratura', semanas: [6, 10], peso: 4 },
  { nome: 'Lesão no menisco', semanas: [6, 12], peso: 4 },
  { nome: 'Ruptura do ligamento cruzado', semanas: [26, 36], peso: 3 },
];

/** Sorteia o tipo e a duração (em dias de jogo; 2 por semana). O CT bom acelera a volta. */
export function sortearLesao(rng: Rng, ct: number): { tipo: string; slots: number } {
  const t = rng.weighted(LESOES, (l) => l.peso);
  const semanas = t.semanas[0] + rng.next() * (t.semanas[1] - t.semanas[0]);
  const fatorCT = 1.2 - ct * 0.08; // CT 1: 1,12 · CT 5: 0,8
  return { tipo: t.nome, slots: Math.max(1, Math.round(semanas * 2 * fatorCT)) };
}

export function tempoDeLesao(slots: number): string {
  if (slots <= 2) return 'cerca de 1 semana';
  const semanas = Math.round(slots / 2);
  if (semanas < 8) return `cerca de ${semanas} semanas`;
  return `cerca de ${Math.round(semanas / 4.3)} meses`;
}
