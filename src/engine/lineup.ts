// Escalação: encaixe dos jogadores nas vagas da formação considerando a
// posição natural e o pé dominante (destro na direita, canhoto na esquerda,
// ambidestro em qualquer lado).

import type { TaticaId } from './data/estilos';
import { esquemaOf, formationCounts, presetById, type Esquema, type SlotFormacao } from './data/formacoes';
import { podeSerRelacionado, suspensoEm } from './discipline';
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

/** Pode ser relacionado (para um jogo da competição `compId`, se informada). */
export function available(p: Player, compId?: string): boolean {
  return podeSerRelacionado(p, compId);
}

/** Motivo de o jogador não poder ser relacionado. */
export function motivoIndisponivel(p: Player, compId?: string): string | undefined {
  if (p.retired) return 'aposentado';
  if (p.injuredSlots > 0) return `lesionado${p.lesao ? ` — ${p.lesao.toLowerCase()}` : ''}`;
  const s = suspensoEm(p, compId);
  if (s > 0) return `suspenso por ${s} jogo${s > 1 ? 's' : ''}`;
  return undefined;
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
export function autoLineup(squad: Player[], formation: string | Esquema, exclude: Set<number> = new Set(), tactic: TaticaId = 'equilibrado', compId?: string): Lineup {
  const esquema = typeof formation === 'string' ? presetById(formation) ?? esquemaOf({ formation }) : formation;
  const pool = squad.filter((p) => available(p, compId) && !exclude.has(p.id));
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

/**
 * Corrige uma escalação salva para um jogo da competição `compId`: tira quem
 * está lesionado ou suspenso (titulares e banco) e completa as vagas.
 * `removidos` lista quem saiu e por quê.
 */
export function repairLineup(lineup: Lineup, squad: Player[], compId?: string): { lineup: Lineup; changed: string[]; removidos: string[] } {
  const esquema = esquemaOf(lineup);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const changed: string[] = [];
  const removidos: string[] = [];
  const ok = (id: number, onde: string) => {
    const p = byId.get(id);
    if (!p || !available(p, compId)) {
      if (p) {
        const txt = `${p.name} saiu ${onde}: ${motivoIndisponivel(p, compId)}.`;
        changed.push(txt);
        removidos.push(txt);
      }
      return false;
    }
    return true;
  };
  const startersOk = lineup.starters.filter((id) => ok(id, 'do time titular'));
  const players = startersOk.map((id) => byId.get(id)!);
  // Mantém a ordem manual quando existir; vagas de quem saiu ficam vazias.
  const manual = lineup.slots && lineup.slots.length === esquema.slots.length ? lineup.slots.map((id) => (startersOk.includes(id) ? id : -1)) : undefined;
  const slots = manual && manual.filter((id) => id >= 0).length === startersOk.length ? manual : assignSlots(players, esquema);
  const usedIds = new Set(slots.filter((id) => id >= 0));
  const candidates = squad.filter((p) => available(p, compId) && !usedIds.has(p.id)).sort((a, b) => selectionScore(b) - selectionScore(a));
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
  const bench = lineup.bench.filter((id) => !usedIds.has(id) && ok(id, 'do banco'));
  const reservas = squad.filter((p) => available(p, compId) && !usedIds.has(p.id) && !bench.includes(p.id)).sort((a, b) => selectionScore(b) - selectionScore(a));
  if (!bench.some((id) => byId.get(id)?.pos === 'G')) {
    const gk = reservas.find((p) => p.pos === 'G');
    if (gk) bench.unshift(gk.id);
  }
  for (const p of reservas) {
    if (bench.length >= BENCH_SIZE) break;
    if (!bench.includes(p.id)) bench.push(p.id);
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
    removidos,
  };
}

/** Quantidade de vagas por posição (para exibir na interface). */
export function countsOf(lineup: Lineup): Record<Pos, number> {
  return formationCounts(esquemaOf(lineup));
}

// ---------------- Edição manual da escalação ----------------

/** Vagas atuais (vaga → id do jogador, -1 se vazia). */
export function currentSlots(lineup: Lineup, get: (id: number) => Player | undefined): number[] {
  const esquema = esquemaOf(lineup);
  const titulares = lineup.starters.map(get).filter((p): p is Player => !!p);
  return assignSlots(titulares, esquema, lineup.slots);
}

function fixar(lineup: Lineup, slots: number[]) {
  lineup.starters = slots.filter((id) => id >= 0);
  lineup.slots = slots.every((id) => id >= 0) ? slots : undefined;
}

/**
 * Coloca um jogador numa vaga do campo. Se ele já era titular, troca de lugar
 * com quem estava na vaga; se vinha do banco, quem sai ocupa o lugar dele no
 * banco; se não estava relacionado, quem sai vai para o banco (se houver vaga).
 */
export function placeInSlot(lineup: Lineup, get: (id: number) => Player | undefined, slot: number, playerId: number) {
  const slots = currentSlots(lineup, get);
  const sai = slots[slot] ?? -1;
  if (sai === playerId) return;
  const j = slots.indexOf(playerId);
  if (j >= 0) {
    slots[j] = sai;
    slots[slot] = playerId;
  } else {
    slots[slot] = playerId;
    const b = lineup.bench.indexOf(playerId);
    if (b >= 0) {
      if (sai >= 0) lineup.bench[b] = sai;
      else lineup.bench.splice(b, 1);
    } else if (sai >= 0 && lineup.bench.length < BENCH_SIZE) {
      lineup.bench.push(sai);
    }
  }
  fixar(lineup, slots);
}

/** Tira um titular do campo e manda para o banco (a vaga fica vazia). */
export function starterToBench(lineup: Lineup, get: (id: number) => Player | undefined, playerId: number) {
  const slots = currentSlots(lineup, get).map((id) => (id === playerId ? -1 : id));
  fixar(lineup, slots);
  lineup.slots = undefined;
  if (!lineup.bench.includes(playerId)) {
    if (lineup.bench.length >= BENCH_SIZE) lineup.bench.pop();
    lineup.bench.push(playerId);
  }
}

/** Relaciona um jogador no banco (substituindo outro reserva se estiver cheio). */
export function addToBench(lineup: Lineup, playerId: number, replace?: number) {
  lineup.starters = lineup.starters.filter((id) => id !== playerId);
  if (lineup.bench.includes(playerId)) return;
  const r = replace !== undefined ? lineup.bench.indexOf(replace) : -1;
  if (r >= 0) lineup.bench[r] = playerId;
  else if (lineup.bench.length < BENCH_SIZE) lineup.bench.push(playerId);
}

/** Tira o jogador da lista (nem titular nem reserva). */
export function unlist(lineup: Lineup, playerId: number) {
  if (lineup.starters.includes(playerId)) lineup.slots = undefined;
  lineup.starters = lineup.starters.filter((id) => id !== playerId);
  lineup.bench = lineup.bench.filter((id) => id !== playerId);
}
