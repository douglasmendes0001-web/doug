// Contexto do jogo: o estado do motor é um objeto mutável guardado num ref.
// Toda alteração passa por `update`, que força a renderização. O salvamento
// segue a opção do jogador: a cada alteração, ao fim de cada partida ou manual.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { saveGame } from '../engine/save';
import type { AutoSave, GameState } from '../engine/types';

interface GameApi {
  state: GameState | null;
  version: number;
  setState: (s: GameState | null) => void;
  update: (fn: (s: GameState) => void) => void;
  /** Salva agora, independentemente da opção de salvamento automático. */
  saveNow: () => Promise<void>;
  /** Chamado ao fim de cada partida do usuário (salva se a opção permitir). */
  afterMatch: () => void;
  /** Há alterações ainda não salvas. */
  dirty: boolean;
  lastSaved: number | null;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<GameApi | null>(null);

export function autoSaveMode(s: GameState | null): AutoSave {
  return s?.settings.autoSave ?? 'partida';
}

export function GameProvider({ children }: { children: ReactNode }) {
  const ref = useRef<GameState | null>(null);
  const [version, setVersion] = useState(0);
  const [toastMsg, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  const saveNow = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    if (!ref.current) return;
    await saveGame(ref.current);
    setDirty(false);
    setLastSaved(Date.now());
  }, []);

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveNow().catch(() => undefined);
    }, 800);
  }, [saveNow]);

  const api = useMemo<GameApi>(() => ({
    state: ref.current,
    version,
    toastMsg,
    dirty,
    lastSaved,
    saveNow,
    setState: (s) => {
      window.clearTimeout(saveTimer.current);
      ref.current = s;
      setVersion((v) => v + 1);
      setDirty(false);
      setLastSaved(null);
      // Carreira nova ou recém-carregada: garante que o slot exista.
      if (s) scheduleSave();
    },
    update: (fn) => {
      if (!ref.current) return;
      fn(ref.current);
      setVersion((v) => v + 1);
      setDirty(true);
      if (autoSaveMode(ref.current) === 'sempre') scheduleSave();
    },
    afterMatch: () => {
      if (autoSaveMode(ref.current) !== 'manual') scheduleSave();
    },
    toast: (msg) => {
      setToast(msg);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    },
  }), [version, toastMsg, dirty, lastSaved, scheduleSave, saveNow]);

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
