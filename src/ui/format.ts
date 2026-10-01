import { formatDate, slotDate } from '../engine/calendar';
import { setorOf } from '../engine/players';
import type { GameState, Pos } from '../engine/types';

export { formatMoney } from '../engine/inbox';

export function sectorColor(pos: Pos): string {
  switch (setorOf(pos)) {
    case 'GOL': return 'var(--gol)';
    case 'DEF': return 'var(--def)';
    case 'MEI': return 'var(--mei)';
    default: return 'var(--ata)';
  }
}

export function dateOf(state: GameState, slot: number): string {
  return formatDate(slotDate(state.year, slot));
}

export function respeitoClass(r: number): string {
  return r < 35 ? 'low' : r < 60 ? 'mid' : 'high';
}

export function confClass(v: number): string {
  return v < 30 ? 'low' : v < 55 ? 'mid' : '';
}

export const PERSONALIDADE_LABEL: Record<string, string> = {
  lider: 'Líder', profissional: 'Profissional', temperamental: 'Temperamental', ambicioso: 'Ambicioso', tranquilo: 'Tranquilo',
};
