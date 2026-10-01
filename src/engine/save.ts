// Persistência no IndexedDB (funciona no navegador e no WebView do Capacitor).
// O estado inteiro tem alguns MB, acima do limite prático do localStorage.
// São 3 slots de carreira e um banco de dados editável (modo editor).

import { del, get, set } from 'idb-keyval';
import { SAVE_VERSION } from './season';
import type { GameState } from './types';
import type { World } from './world';

export const SLOTS = [1, 2, 3] as const;
const slotKey = (slot: number) => `futebol-manager-save-${slot}`;
const META_KEY = 'futebol-manager-meta';
const EDITOR_KEY = 'futebol-manager-editor-world';

export interface SaveSummary {
  slot: number;
  coach: string;
  club: string;
  year: number;
  savedAt: number;
}

type Meta = Record<number, SaveSummary>;

async function readMeta(): Promise<Meta> {
  try {
    return ((await get(META_KEY)) as Meta | undefined) ?? {};
  } catch {
    return {};
  }
}

export async function saveGame(state: GameState): Promise<void> {
  const slot = state.saveSlot ?? 1;
  await set(slotKey(slot), state);
  const meta = await readMeta();
  meta[slot] = { slot, coach: state.coach.name, club: state.clubs[state.userClubId].name, year: state.year, savedAt: Date.now() };
  await set(META_KEY, meta);
}

export async function loadGame(slot: number): Promise<GameState | null> {
  try {
    const s = (await get(slotKey(slot))) as GameState | undefined;
    if (!s || s.version !== SAVE_VERSION) return null;
    s.saveSlot = slot;
    return s;
  } catch {
    return null;
  }
}

/** Resumo dos slots ocupados (inclui saves antigos sem metadados). */
export async function listSaves(): Promise<SaveSummary[]> {
  const meta = await readMeta();
  const out: SaveSummary[] = [];
  for (const slot of SLOTS) {
    if (meta[slot]) {
      out.push(meta[slot]);
      continue;
    }
    const s = await loadGame(slot);
    if (s) out.push({ slot, coach: s.coach.name, club: s.clubs[s.userClubId].name, year: s.year, savedAt: 0 });
  }
  return out;
}

export async function deleteSave(slot: number): Promise<void> {
  await del(slotKey(slot));
  const meta = await readMeta();
  delete meta[slot];
  await set(META_KEY, meta);
}

// ---------------- Banco de dados do editor ----------------

export async function loadEditorWorld(): Promise<World | null> {
  try {
    const w = (await get(EDITOR_KEY)) as { version: number; world: World } | undefined;
    return w && w.version === SAVE_VERSION ? w.world : null;
  } catch {
    return null;
  }
}

export async function saveEditorWorld(world: World): Promise<void> {
  await set(EDITOR_KEY, { version: SAVE_VERSION, world });
}

export async function deleteEditorWorld(): Promise<void> {
  await del(EDITOR_KEY);
}
