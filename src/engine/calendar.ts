// Calendário: o ano tem 52 semanas com 2 datas cada (quarta = "meio" e
// domingo = "fds"), totalizando 104 dias de jogo. Cada competição pertence a
// uma "trilha" (ex.: BRA-liga, BRA-copa, CONMEBOL). Trilhas que dividem clubes
// nunca recebem a mesma data — assim nenhum time joga duas vezes no mesmo dia.

import { PAISES } from './data/paises';
import { roundsNeeded } from './competitions';
import type { Competition, CountryCode } from './types';
import { SLOTS_PER_YEAR } from './types';

const CONFEDS = new Set(['CONMEBOL', 'UEFA', 'AFC', 'CAF', 'CONCACAF', 'OFC']);

function trackScope(track: string): string {
  return track.split('-')[0];
}

export function tracksConflict(a: string, b: string): boolean {
  if (a === b) return false;
  const sa = trackScope(a);
  const sb = trackScope(b);
  if (sa === 'FIFA' || sb === 'FIFA') return true;
  const aConf = CONFEDS.has(sa);
  const bConf = CONFEDS.has(sb);
  if (aConf && bConf) return false;
  if (!aConf && !bConf) return sa === sb;
  const [conf, country] = aConf ? [sa, sb] : [sb, sa];
  return PAISES[country as CountryCode]?.confed === conf;
}

export function slotWeek(slot: number): number {
  return Math.floor(slot / 2);
}

export function slotIsWeekend(slot: number): boolean {
  return slot % 2 === 1;
}

export function slotDate(year: number, slot: number): Date {
  const jan1 = new Date(year, 0, 1);
  const firstWed = 1 + ((3 - jan1.getDay() + 7) % 7);
  const day = firstWed + slotWeek(slot) * 7 + (slotIsWeekend(slot) ? 4 : 0);
  return new Date(year, 0, day);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function slotMonth(year: number, slot: number): number {
  return slotDate(year, slot).getMonth();
}

function evenlySpaced(candidates: number[], k: number): number[] {
  if (k <= 0) return [];
  if (candidates.length <= k) return candidates.slice();
  if (k === 1) return [candidates[0]];
  const out: number[] = [];
  for (let i = 0; i < k; i++) out.push(candidates[Math.round((i * (candidates.length - 1)) / (k - 1))]);
  return out;
}

const PRIORIDADE = (track: string): number => {
  const s = trackScope(track);
  if (s === 'FIFA') return 0;
  if (CONFEDS.has(s)) return 1;
  if (track.endsWith('-copa')) return 2;
  if (track.endsWith('-est')) return 3;
  return 4;
};

/**
 * Distribui as datas de todas as competições da temporada. Competições da
 * mesma trilha (clubes diferentes) compartilham as mesmas datas.
 */
export function scheduleSeason(comps: Competition[]) {
  const booked: string[][] = Array.from({ length: SLOTS_PER_YEAR }, () => []);
  const byTrack = new Map<string, Competition[]>();
  for (const c of comps) {
    const list = byTrack.get(c.def.track) ?? [];
    list.push(c);
    byTrack.set(c.def.track, list);
  }
  const tracks = [...byTrack.keys()].sort((a, b) => PRIORIDADE(a) - PRIORIDADE(b));

  for (const track of tracks) {
    const list = byTrack.get(track)!;
    const need = new Map(list.map((c) => [c, roundsNeeded(c.def, c.teams.length)]));
    const k = Math.max(...need.values());
    const { window, prefer } = list[0].def;
    const free = (s: number) => !booked[s].some((t) => tracksConflict(t, track));
    const inRange = (from: number, to: number) => {
      const out: number[] = [];
      for (let s = Math.max(0, from); s <= Math.min(SLOTS_PER_YEAR - 1, to); s++) if (free(s)) out.push(s);
      return out;
    };
    const ranges: [number, number][] = [
      [window[0] * 2, window[1] * 2 + 1],
      [window[0] * 2, SLOTS_PER_YEAR - 1],
      [0, SLOTS_PER_YEAR - 1],
    ];
    let chosen: number[] = [];
    for (const [from, to] of ranges) {
      const all = inRange(from, to);
      const preferred = prefer === 'any' ? all : all.filter((s) => slotIsWeekend(s) === (prefer === 'fds'));
      if (preferred.length >= k) {
        chosen = evenlySpaced(preferred, k);
        break;
      }
      if (all.length >= k) {
        // Usa todas as datas preferidas e completa com as outras, mantendo a ordem.
        const extra = evenlySpaced(all.filter((s) => !preferred.includes(s)), k - preferred.length);
        chosen = preferred.concat(extra).sort((a, b) => a - b);
        break;
      }
    }
    if (chosen.length < k) {
      // Último recurso: aceita conflito (não deve acontecer com os formatos atuais).
      const all = Array.from({ length: SLOTS_PER_YEAR }, (_, s) => s);
      chosen = evenlySpaced(all, k);
    }
    for (const s of chosen) booked[s].push(track);
    for (const c of list) c.slots = chosen.slice(0, need.get(c));
  }
}
