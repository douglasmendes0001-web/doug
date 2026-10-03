// Botão "voltar" do Android (e tecla Esc no navegador). Cada tela, folha ou
// janela aberta registra o que "voltar" deve fazer; o registro mais recente
// é atendido primeiro — como uma pilha de navegação.

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';

type Handler = { fn: () => void; nivel: number; ordem: number };
const pilha: Handler[] = [];
let contador = 0;

/** Camadas: telas (0), abas e sub-telas (1), folhas e janelas (2), janelas sobre folhas (3). */
export const NIVEL = { tela: 0, aba: 1, folha: 2, alerta: 3 } as const;

/** Executa o "voltar" da camada mais acima. Retorna false se não havia nada. */
export function handleBack(): boolean {
  let top: Handler | undefined;
  for (const h of pilha) if (!top || h.nivel > top.nivel || (h.nivel === top.nivel && h.ordem > top.ordem)) top = h;
  if (!top) return false;
  top.fn();
  return true;
}

/**
 * Registra a ação de voltar enquanto o componente estiver montado (e `ativo`).
 * Vence o nível mais alto; no mesmo nível, o registrado por último.
 */
export function useBack(fn: () => void, nivel: number = NIVEL.folha, ativo = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!ativo) return;
    const h: Handler = { fn: () => ref.current(), nivel, ordem: ++contador };
    pilha.push(h);
    return () => {
      const i = pilha.lastIndexOf(h);
      if (i >= 0) pilha.splice(i, 1);
    };
  }, [ativo, nivel]);
}

/** Liga o botão físico do Android e a tecla Esc. Sem nada na pilha, sai do app. */
export function installBackButton() {
  if (Capacitor.isNativePlatform()) {
    void App.addListener('backButton', () => {
      if (!handleBack()) void App.exitApp();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') handleBack();
  });
}

export function exitApp() {
  if (Capacitor.isNativePlatform()) void App.exitApp();
}
