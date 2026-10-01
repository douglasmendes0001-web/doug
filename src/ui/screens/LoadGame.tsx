import { useEffect, useState } from 'react';
import { SLOTS, deleteSave, listSaves, loadGame, type SaveSummary } from '../../engine/save';
import { useGame } from '../game';

export function LoadGame({ onBack }: { onBack: () => void }) {
  const { setState } = useGame();
  const [saves, setSaves] = useState<SaveSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => listSaves().then(setSaves);
  useEffect(() => {
    refresh();
  }, []);

  const open = (slot: number) => {
    setBusy(true);
    loadGame(slot).then((g) => {
      setBusy(false);
      if (g) setState(g);
    });
  };

  return (
    <div className="screen">
      <div className="panel">
        <h2>Carregar jogo</h2>
        {saves === null && <p className="muted">Lendo saves...</p>}
        {saves && SLOTS.map((slot) => {
          const s = saves.find((x) => x.slot === slot);
          return (
            <div key={slot} className="save-slot">
              <div className="grow">
                <b>Slot {slot}</b>
                {s ? (
                  <div className="small">{s.coach} · {s.club} · temporada {s.year}{s.savedAt ? ` · salvo em ${new Date(s.savedAt).toLocaleString('pt-BR')}` : ''}</div>
                ) : <div className="small muted">vazio</div>}
              </div>
              {s && (
                <div className="btn-row">
                  <button className="btn small primary" onClick={() => open(slot)}>Carregar</button>
                  <button className="btn small danger" onClick={() => {
                    if (window.confirm(`Apagar a carreira do slot ${slot}? Não dá para desfazer.`)) deleteSave(slot).then(refresh);
                  }}>Apagar</button>
                </div>
              )}
            </div>
          );
        })}
        <button className="btn" style={{ marginTop: 10 }} onClick={onBack}>Voltar</button>
      </div>
      {busy && <div className="loading">Carregando carreira...</div>}
    </div>
  );
}
