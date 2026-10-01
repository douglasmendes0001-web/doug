// Ponto único para responder às ações das mensagens (botões na caixa de entrada).

import { respondMessage } from './inbox';
import type { Rng } from './rng';
import { resolveInvestor, resolveSponsorMessage } from './sponsors';
import { resolveContractMessage, resolveOffer } from './transfers';
import type { GameState } from './types';

export function handleMessageAction(state: GameState, rng: Rng, msgId: number, actionId: string): string {
  const m = state.messages.find((x) => x.id === msgId);
  if (!m || m.resolved) return '';
  switch (m.kind) {
    case 'proposta':
      return resolveOffer(state, msgId, actionId === 'aceitar');
    case 'patrocinio-oferta':
    case 'patrocinio-ajuste':
      return resolveSponsorMessage(state, rng, msgId, actionId);
    case 'investidor':
      return resolveInvestor(state, msgId, actionId);
    case 'contrato':
      return resolveContractMessage(state, rng, msgId, actionId);
    default:
      return respondMessage(state, rng, msgId, actionId);
  }
}
