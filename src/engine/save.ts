// Persistência no IndexedDB (funciona no navegador e no WebView do Capacitor).
// O estado inteiro tem alguns MB, acima do limite prático do localStorage.

import { del, get, set } from 'idb-keyval';
import { SAVE_VERSION } from './season';
import type { GameState } from './types';

const KEY = 'futebol-manager-save-1';

export async function saveGame(state: GameState): Promise<void> {
  await set(KEY, state);
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const s = (await get(KEY)) as GameState | undefined;
    if (!s || s.version !== SAVE_VERSION) return null;
    return s;
  } catch {
    return null;
  }
}

export async function deleteSave(): Promise<void> {
  await del(KEY);
}
