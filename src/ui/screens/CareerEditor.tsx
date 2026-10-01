import { useState } from 'react';
import { initialRespeito } from '../../engine/coach';
import type { Player } from '../../engine/types';
import { useLoadedGame } from '../game';
import { ClubBrowser, ClubEditor } from './Editor';

/** Modo editor dentro da carreira: as mudanças valem na hora para este jogo salvo. */
export function CareerEditor({ onClose }: { onClose: () => void }) {
  const { state, update } = useLoadedGame();
  const [clubId, setClubId] = useState<number | null>(state.userClubId);

  const changed = () => update((s) => {
    s.edited = true;
    s.nextIds.player = s.players.length;
    // Jogadores excluídos saem da escalação.
    const ids = new Set(s.clubs[s.userClubId].playerIds);
    s.lineup.starters = s.lineup.starters.filter((id) => ids.has(id));
    s.lineup.bench = s.lineup.bench.filter((id) => ids.has(id));
  });

  const onPlayerAdded = (p: Player) => {
    p.contractUntil = state.year + 2;
    if (p.clubId === state.userClubId) p.respeito = initialRespeito(state.coach, p);
  };

  return (
    <div>
      <div className="panel">
        <div className="row-between">
          <h2><span className="editor-badge">EDITOR</span> Esta carreira</h2>
          <button className="btn small" onClick={onClose}>Fechar</button>
        </div>
        <p className="small muted" style={{ margin: '4px 0' }}>
          As alterações valem na hora para esta carreira, incluindo os adversários. Ela fica marcada como "editada".
          Para editar o banco usado em carreiras novas, use o Modo editor do menu inicial.
        </p>
        {clubId !== state.userClubId && (
          <button className="btn small" onClick={() => setClubId(state.userClubId)}>Ir para o meu clube</button>
        )}
      </div>
      {clubId !== null ? (
        <ClubEditor world={state} clubId={clubId} onChange={changed} onBack={() => setClubId(null)} onPlayerAdded={onPlayerAdded} />
      ) : (
        <ClubBrowser world={state} onPick={setClubId} highlight={state.userClubId} />
      )}
    </div>
  );
}
