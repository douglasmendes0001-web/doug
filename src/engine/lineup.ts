// Escalação: encaixe dos jogadores nas vagas da formação considerando a
// posição natural e o pé dominante (destro na direita, canhoto na esquerda,
// ambidestro em qualquer lado).

import type { TaticaId } from './data/estilos';
import { esquemaOf, formationCounts, presetById, type Esquema, type SlotFormacao } from './data/formacoes';
import type { Lineup, Player, Pos } from './types';

export const BENCH_SIZE = 9;
export const MAX_SUBS = 5;

const FIT: Partial<Record<Pos, Partial<Record<Pos, number>>>> = {
  // Lateral do outro lado: a função é a mesma; o lado é cobrado pelo pé (sideFit).
  LD: { LE: 0.98, ZG: 0.85, VOL: 0.8, MEI: 0.78 },
  LE: { LD: 0.98, ZG: 0.85, VOL: 0.8, MEI: 0.78 },
  ZG: { LD: 0.85, LE: 0.85, VOL: 0.85 },
  VOL: { ZG: 0.85, MEI: 0.9, LD: 0.8, LE: 0.8 },
  MEI: { VOL: 0.9, ATA: 0.88, LD: 0.78, LE: 0.78 },
  ATA: { MEI: 0.88 },
};

/** Fator de rendimento de um jogador atuando numa posição. */
export function positionFit(natural: Pos, playing: Pos): number {
  if (natural === playing) return 1;
  if (natural === 'G' || playing === 'G') return 0.35;
  return FIT[natural]?.[playing] ?? 0.7;
}

/**
 * Penalidade por jogar do lado "errado" para o pé dominante. Laterais sofrem
 * mais; pontas com o pé invertido ainda podem cortar para dentro.
 */
export function sideFit(p: Player, slot: SlotFormacao): number {
  if (slot.lado === 'C' || p.foot === 'A') return 1;
  if ((p.foot === 'D' ? 'D' : 'E') === slot.lado) return 1;
  switch (slot.pos) {
    case 'LD':
    case 'LE': return 0.9;
    case 'MEI': return 0.94;
    case 'ATA': return 0.96;
    default: return 0.97;
  }
}

export function slotFit(p: Player, slot: SlotFormacao): number {
  return positionFit(p.pos, slot.pos) * sideFit(p, slot);
}

export function available(p: Player): boolean {
  return !p.retired && p.injuredSlots <= 0 && p.suspendedGames <= 0;
}

/** Nota usada para escolher titulares: força ajustada pelo fôlego. */
function selectionScore(p: Player): number {
  return p.force * (0.7 + 0.3 * (p.energy / 100));
}

/** Melhora uma distribuição trocando pares de vagas enquanto houver ganho (2-opt). */
function improve(assign: (Player | undefined)[], esquema: Esquema) {
  const v = (p: Player | undefined, i: number) => (p ? p.force * slotFit(p, esquema.slots[i]) : 0);
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (let a = 0; a < assign.length; a++) {
      for (let b = a + 1; b < assign.length; b++) {
        const pa = assign[a];
        const pb = assign[b];
        if (v(pa, b) + v(pb, a) > v(pa, a) + v(pb, b) + 1e-6) {
          assign[a] = pb;
          assign[b] = pa;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}

/** Distribui os titulares nas vagas (vaga → id do jogador; -1 se vazia). */
export function assignSlots(starters: Player[], esquema: Esquema, manual?: number[]): number[] {
  const ids = new Set(starters.map((p) => p.id));
  if (manual && manual.length === esquema.slots.length && manual.every((id) => ids.has(id)) && new Set(manual).size === manual.length) {
    return manual.slice();
  }
  const pairs: { p: Player; i: number; v: number }[] = [];
  for (const p of starters) esquema.slots.forEach((sl, i) => pairs.push({ p, i, v: p.force * slotFit(p, sl) }));
  pairs.sort((a, b) => b.v - a.v);
  const assign: (Player | undefined)[] = new Array(esquema.slots.length).fill(undefined);
  const used = new Set<number>();
  for (const { p, i } of pairs) {
    if (assign[i] || used.has(p.id)) continue;
    assign[i] = p;
    used.add(p.id);
  }
  improve(assign, esquema);
  return assign.map((p) => (p ? p.id : -1));
}

/**
 * Escala o melhor time possível para a formação: cada vaga recebe o melhor
 * jogador disponível considerando posição, lado/pé e fôlego.
 */
export function autoLineup(squad: Player[], formation: string | Esquema, exclude: Set<number> = new Set(), tactic: TaticaId = 'equilibrado'): Lineup {
  const esquema = typeof formation === 'string' ? presetById(formation) ?? esquemaOf({ formation }) : formation;
  const pool = squad.filter((p) => available(p) && !exclude.has(p.id));
  const pairs: { p: Player; i: number; v: number }[] = [];
  for (const p of pool) esquema.slots.forEach((sl, i) => pairs.push({ p, i, v: selectionScore(p) * slotFit(p, sl) }));
  pairs.sort((a, b) => b.v - a.v);
  const assign: (Player | undefined)[] = new Array(esquema.slots.length).fill(undefined);
  const used = new Set<number>();
  for (const { p, i } of pairs) {
    if (assign[i] || used.has(p.id)) continue;
    assign[i] = p;
    used.add(p.id);
  }
  improve(assign, esquema);
  const starters = assign.filter((p): p is Player => !!p).map((p) => p.id);
  const bench = pool.filter((p) => !used.has(p.id)).sort((a, b) => selectionScore(b) - selectionScore(a));
  // Garante um goleiro reserva no banco.
  const gk = bench.find((p) => p.pos === 'G');
  const benchIds = gk ? [gk.id, ...bench.filter((p) => p.id !== gk.id).map((p) => p.id)] : bench.map((p) => p.id);
  return {
    formation: esquema.id,
    esquema: esquema.custom ? esquema : undefined,
    tactic,
    starters,
    bench: benchIds.slice(0, BENCH_SIZE),
  };
}

/** Corrige uma escalação salva: remove indisponíveis e completa as vagas. */
export function repairLineup(lineup: Lineup, squad: Player[]): { lineup: Lineup; changed: string[] } {
  const esquema = esquemaOf(lineup);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const changed: string[] = [];
  const ok = (id: number) => {
    const p = byId.get(id);
    if (!p || !available(p)) {
      if (p) changed.push(`${p.name} (${p.injuredSlots > 0 ? 'lesionado' : 'suspenso'}) saiu do time titular.`);
      return false;
    }
    return true;
  };
  const startersOk = lineup.starters.filter(ok);
  const players = startersOk.map((id) => byId.get(id)!);
  // Mantém a ordem manual quando existir; vagas de quem saiu ficam vazias.
  const manual = lineup.slots && lineup.slots.length === esquema.slots.length ? lineup.slots.map((id) => (startersOk.includes(id) ? id : -1)) : undefined;
  const slots = manual && manual.filter((id) => id >= 0).length === startersOk.length ? manual : assignSlots(players, esquema);
  const usedIds = new Set(slots.filter((id) => id >= 0));
  const candidates = squad.filter((p) => available(p) && !usedIds.has(p.id)).sort((a, b) => selectionScore(b) - selectionScore(a));
  slots.forEach((id, i) => {
    if (id >= 0) return;
    let best: Player | undefined;
    let bestV = -1;
    for (const c of candidates) {
      if (usedIds.has(c.id)) continue;
      const v = selectionScore(c) * slotFit(c, esquema.slots[i]);
      if (v > bestV) {
        bestV = v;
        best = c;
      }
    }
    if (best) {
      slots[i] = best.id;
      usedIds.add(best.id);
      changed.push(`${best.name} entrou no time titular.`);
    }
  });
  const starters = slots.filter((id) => id >= 0);
  const bench = lineup.bench.filter((id) => {
    const p = byId.get(id);
    return p && available(p) && !usedIds.has(id);
  });
  for (const p of squad) {
    if (bench.length >= BENCH_SIZE) break;
    if (available(p) && !usedIds.has(p.id) && !bench.includes(p.id)) bench.push(p.id);
  }
  return {
    lineup: {
      formation: lineup.formation,
      esquema: lineup.esquema,
      slots: lineup.slots ? slots : undefined,
      tactic: lineup.tactic ?? 'equilibrado',
      starters,
      bench: bench.slice(0, BENCH_SIZE),
    },
    changed,
  };
}

/** Quantidade de vagas por posição (para exibir na interface). */
export function countsOf(lineup: Lineup): Record<Pos, number> {
  return formationCounts(esquemaOf(lineup));
}
