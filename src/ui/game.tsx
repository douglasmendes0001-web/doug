// Contexto do jogo: o estado do motor é um objeto mutável guardado num ref.
// Toda alteração passa por `update`, que força a renderização e agenda o
// salvamento automático no IndexedDB.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { saveGame } from '../engine/save';
import type { GameState } from '../engine/types';

interface GameApi {
  state: GameState | null;
  version: number;
  setState: (s: GameState | null) => void;
  update: (fn: (s: GameState) => void) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const ref = useRef<GameState | null>(null);
  const [version, setVersion] = useState(0);
  const [toastMsg, setToast] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (ref.current) saveGame(ref.current).catch(() => undefined);
    }, 800);
  }, []);

  const api = useMemo<GameApi>(() => ({
    state: ref.current,
    version,
    toastMsg,
    setState: (s) => {
      ref.current = s;
      setVersion((v) => v + 1);
      if (s) scheduleSave();
    },
    update: (fn) => {
      if (!ref.current) return;
      fn(ref.current);
      setVersion((v) => v + 1);
      scheduleSave();
    },
    toast: (msg) => {
      setToast(msg);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    },
  }), [version, toastMsg, scheduleSave]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGame(): GameApi {
  const g = useContext(Ctx);
  if (!g) throw new Error('useGame fora do GameProvider');
  return g;
}

/** Atalho para telas que só existem com jogo carregado. */
export function useLoadedGame(): GameApi & { state: GameState } {
  const g = useGame();
  if (!g.state) throw new Error('Nenhum jogo carregado');
  return g as GameApi & { state: GameState };
}
