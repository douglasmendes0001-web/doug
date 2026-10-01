import { useState } from 'react';
import { resolveOffer } from '../../engine/clubOps';
import { respondMessage, unreadCount } from '../../engine/inbox';
import { Rng } from '../../engine/rng';
import type { CanalMensagem } from '../../engine/types';
import { useLoadedGame } from '../game';
import { dateOf } from '../format';

const CANAIS: { id: CanalMensagem; label: string }[] = [
  { id: 'diretoria', label: 'Diretoria' },
  { id: 'torcida', label: 'Torcida' },
  { id: 'midia', label: 'Mídia' },
  { id: 'jogador', label: 'Jogadores' },
];

export function Inbox() {
  const { state, update, toast } = useLoadedGame();
  const [canal, setCanal] = useState<CanalMensagem>('diretoria');
  const msgs = state.messages.filter((m) => m.channel === canal);

  const act = (msgId: number, kind: string | undefined, actionId: string) => {
    let feedback = '';
    update((s) => {
      if (kind === 'proposta') feedback = resolveOffer(s, msgId, actionId === 'aceitar');
      else {
        const rng = new Rng(s.rng);
        feedback = respondMessage(s, rng, msgId, actionId);
        s.rng = rng.state;
      }
    });
    if (feedback) toast(feedback);
  };

  return (
    <div>
      <div className="tabs">
        {CANAIS.map((c) => {
          const n = unreadCount(state, c.id);
          return (
            <button key={c.id} className={`tab ${canal === c.id ? 'active' : ''}`} onClick={() => setCanal(c.id)}>
              {c.label}
              {n > 0 && <span className="badge">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="row-between small" style={{ marginBottom: 6 }}>
        <span className="muted">{msgs.length} mensagens</span>
        <button className="btn small" onClick={() => update((s) => s.messages.forEach((m) => { if (m.channel === canal) m.read = true; }))}>Marcar todas como lidas</button>
      </div>
      {msgs.length === 0 && <div className="panel muted">Nenhuma mensagem por aqui.</div>}
      {msgs.map((m) => (
        <div key={m.id} className={`msg ${m.read ? '' : 'unread'}`} onClick={() => !m.read && update(() => { m.read = true; })}>
          <div className="msg-title"><span>{m.title}</span><span className="muted small">{dateOf(state, m.slot)}</span></div>
          <div className="msg-body">{m.body}</div>
          {m.actions && !m.resolved && (
            <div className="msg-actions">
              {m.actions.map((a) => (
                <button key={a.id} className="btn small" onClick={(e) => { e.stopPropagation(); act(m.id, m.kind, a.id); }}>{a.label}</button>
              ))}
            </div>
          )}
          {m.resolved && m.actions && <div className="msg-resolved">Respondido: {m.actions.find((a) => a.id === m.resolved)?.label ?? 'resolvido em campo'}</div>}
        </div>
      ))}
    </div>
  );
}
