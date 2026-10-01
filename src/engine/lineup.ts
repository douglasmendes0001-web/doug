// Formações, adequação de posição e escalação automática.

import type { Formacao, Lineup, Player, Pos } from './types';

export const FORMACOES: Record<Formacao, Record<Pos, number>> = {
  '4-4-2': { G: 1, LD: 1, ZG: 2, LE: 1, VOL: 2, MEI: 2, ATA: 2 },
  '4-3-3': { G: 1, LD: 1, ZG: 2, LE: 1, VOL: 1, MEI: 2, ATA: 3 },
  '3-5-2': { G: 1, LD: 1, ZG: 3, LE: 1, VOL: 2, MEI: 1, ATA: 2 },
  '4-5-1': { G: 1, LD: 1, ZG: 2, LE: 1, VOL: 2, MEI: 3, ATA: 1 },
  '5-3-2': { G: 1, LD: 1, ZG: 3, LE: 1, VOL: 1, MEI: 2, ATA: 2 },
  '4-2-3-1': { G: 1, LD: 1, ZG: 2, LE: 1, VOL: 2, MEI: 3, ATA: 1 },
};

export const BENCH_SIZE = 9;
export const MAX_SUBS = 5;

const FIT: Partial<Record<Pos, Partial<Record<Pos, number>>>> = {
  LD: { LE: 0.9, ZG: 0.85, VOL: 0.8, MEI: 0.75 },
  LE: { LD: 0.9, ZG: 0.85, VOL: 0.8, MEI: 0.75 },
  ZG: { LD: 0.85, LE: 0.85, VOL: 0.85 },
  VOL: { ZG: 0.85, MEI: 0.9, LD: 0.8, LE: 0.8 },
  MEI: { VOL: 0.9, ATA: 0.88, LD: 0.75, LE: 0.75 },
  ATA: { MEI: 0.88 },
};

/** Fator de rendimento de um jogador atuando numa posição. */
export function positionFit(natural: Pos, playing: Pos): number {
  if (natural === playing) return 1;
  if (natural === 'G' || playing === 'G') return 0.35;
  return FIT[natural]?.[playing] ?? 0.7;
}

export function available(p: Player): boolean {
  return !p.retired && p.injuredSlots <= 0 && p.suspendedGames <= 0;
}

/** Nota usada para escolher titulares: força ajustada pelo fôlego. */
function selectionScore(p: Player): number {
  return p.force * (0.7 + 0.3 * (p.energy / 100));
}

/**
 * Escala o melhor time possível para a formação, preenchendo cada posição
 * com o melhor jogador disponível (aceitando improvisação quando falta gente).
 */
export function autoLineup(squad: Player[], formation: Formacao, exclude: Set<number> = new Set()): Lineup {
  const pool = squad.filter((p) => available(p) && !exclude.has(p.id));
  const used = new Set<number>();
  const starters: number[] = [];
  const need = FORMACOES[formation];
  const order: Pos[] = ['G', 'ZG', 'LD', 'LE', 'VOL', 'MEI', 'ATA'];
  for (const pos of order) {
    for (let k = 0; k < need[pos]; k++) {
      let best: Player | undefined;
      let bestScore = -1;
      for (const p of pool) {
        if (used.has(p.id)) continue;
        const s = selectionScore(p) * positionFit(p.pos, pos);
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      if (best) {
        used.add(best.id);
        starters.push(best.id);
      }
    }
  }
  const bench = pool
    .filter((p) => !used.has(p.id))
    .sort((a, b) => selectionScore(b) - selectionScore(a));
  // Garante um goleiro reserva no banco.
  const gk = bench.find((p) => p.pos === 'G');
  const benchIds = gk ? [gk.id, ...bench.filter((p) => p.id !== gk.id).map((p) => p.id)] : bench.map((p) => p.id);
  return { formation, starters, bench: benchIds.slice(0, BENCH_SIZE) };
}

/**
 * Atribui a cada titular a posição em que vai jogar na formação, com base na
 * posição natural (casando primeiro os encaixes perfeitos).
 */
export function assignPositions(starters: Player[], formation: Formacao): Map<number, Pos> {
  const slots: Pos[] = [];
  const need = FORMACOES[formation];
  (Object.keys(need) as Pos[]).forEach((pos) => {
    for (let i = 0; i < need[pos]; i++) slots.push(pos);
  });
  const result = new Map<number, Pos>();
  const remaining = [...starters];
  // Encaixes naturais primeiro.
  for (let i = slots.length - 1; i >= 0; i--) {
    const idx = remaining.findIndex((p) => p.pos === slots[i]);
    if (idx >= 0) {
      result.set(remaining[idx].id, slots[i]);
      remaining.splice(idx, 1);
      slots.splice(i, 1);
    }
  }
  // Depois, melhor adequação para o que sobrou.
  for (const p of remaining) {
    let bestI = 0;
    let bestFit = -1;
    slots.forEach((s, i) => {
      const f = positionFit(p.pos, s);
      if (f > bestFit) {
        bestFit = f;
        bestI = i;
      }
    });
    if (slots.length) {
      result.set(p.id, slots[bestI]);
      slots.splice(bestI, 1);
    } else {
      result.set(p.id, p.pos);
    }
  }
  return result;
}

/** Corrige uma escalação salva: remove indisponíveis e completa as vagas. */
export function repairLineup(lineup: Lineup, squad: Player[]): { lineup: Lineup; changed: string[] } {
  const byId = new Map(squad.map((p) => [p.id, p]));
  const changed: string[] = [];
  const starters = lineup.starters.filter((id) => {
    const p = byId.get(id);
    if (!p || !available(p)) {
      if (p) changed.push(`${p.name} (${p.injuredSlots > 0 ? 'lesionado' : 'suspenso'}) saiu do time titular.`);
      return false;
    }
    return true;
  });
  const bench = lineup.bench.filter((id) => {
    const p = byId.get(id);
    return p && available(p) && !starters.includes(id);
  });
  if (starters.length < 11) {
    const need = FORMACOES[lineup.formation];
    // Preenche as posições que faltam com o melhor disponível.
    const counts: Record<string, number> = {};
    for (const id of starters) {
      const pos = byId.get(id)!.pos;
      counts[pos] = (counts[pos] ?? 0) + 1;
    }
    const candidates = squad.filter(available).sort((a, b) => selectionScore(b) - selectionScore(a));
    for (const pos of Object.keys(need) as Pos[]) {
      while ((counts[pos] ?? 0) < need[pos] && starters.length < 11) {
        const c = candidates.find((p) => !starters.includes(p.id) && p.pos === pos)
          ?? candidates.find((p) => !starters.includes(p.id));
        if (!c) break;
        starters.push(c.id);
        counts[pos] = (counts[pos] ?? 0) + 1;
        changed.push(`${c.name} entrou no time titular.`);
      }
    }
  }
  const benchFinal = bench.filter((id) => !starters.includes(id));
  if (benchFinal.length < BENCH_SIZE) {
    for (const p of squad) {
      if (benchFinal.length >= BENCH_SIZE) break;
      if (available(p) && !starters.includes(p.id) && !benchFinal.includes(p.id)) benchFinal.push(p.id);
    }
  }
  return { lineup: { formation: lineup.formation, starters, bench: benchFinal.slice(0, BENCH_SIZE) }, changed };
}
