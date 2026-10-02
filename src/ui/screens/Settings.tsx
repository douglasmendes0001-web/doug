import { useState } from 'react';
import type { AutoSave } from '../../engine/types';
import { autoSaveMode, useLoadedGame } from '../game';
import { goalRoar, getSoundPrefs, setSoundPrefs, whistle } from '../sound';
import { CareerEditor } from './CareerEditor';

const AUTOSAVE: { id: AutoSave; label: string; desc: string }[] = [
  { id: 'partida', label: 'A cada partida', desc: 'Salva ao fim de cada jogo do seu time e também quando o app vai para segundo plano.' },
  { id: 'sempre', label: 'Sempre', desc: 'Salva a cada alteração (escalação, mensagens, mercado...) e em segundo plano.' },
  { id: 'manual', label: 'Manual', desc: 'Só salva quando você tocar em "Salvar agora".' },
];

export function Settings() {
  const { state, update, setState, toast, saveNow, dirty, lastSaved } = useLoadedGame();
  const [editing, setEditing] = useState(false);
  const [som, setSom] = useState(getSoundPrefs());
  const mudaSom = (p: Partial<typeof som>) => { setSoundPrefs(p); setSom(getSoundPrefs()); };
  const modo = autoSaveMode(state);

  if (editing) return <CareerEditor onClose={() => setEditing(false)} />;

  return (
    <div>
      <div className="panel">
        <h2>Salvamento</h2>
        <div className="choice-row">
          {AUTOSAVE.map((o) => (
            <button key={o.id} className={`choice ${modo === o.id ? 'on' : ''}`} onClick={() => update((g) => { g.settings.autoSave = o.id; })}>{o.label}</button>
          ))}
        </div>
        <p className="small muted">{AUTOSAVE.find((o) => o.id === modo)?.desc}</p>
        <div className="row-between small" style={{ margin: '6px 0' }}>
          <span>Slot {state.saveSlot ?? 1}{state.edited ? ' · carreira editada' : ''}</span>
          <span className={dirty ? 'gold' : 'pos'}>
            {dirty ? 'Alterações não salvas' : lastSaved ? `Salvo às ${new Date(lastSaved).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Salvo'}
          </span>
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={() => saveNow().then(() => toast('Jogo salvo!'))}>Salvar agora</button>
          <button className="btn" onClick={() => saveNow().then(() => setState(null))}>Salvar e voltar ao menu</button>
          {dirty && (
            <button className="btn danger" onClick={() => {
              if (window.confirm('Voltar ao menu sem salvar? O progresso desde o último salvamento será perdido.')) setState(null);
            }}>Sair sem salvar</button>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Modo editor</h2>
        <p className="small muted">Edite clubes e jogadores desta carreira: força, estrelas, estilo, habilidades, criar jogadores de 15 anos e mais.</p>
        <button className="btn" onClick={() => setEditing(true)}>Abrir editor da carreira</button>
      </div>

      <div className="panel">
        <h2>Sons</h2>
        <div className="choice-row">
          <button className={`choice ${som.on ? 'on' : ''}`} onClick={() => mudaSom({ on: true })}>Ligado</button>
          <button className={`choice ${!som.on ? 'on' : ''}`} onClick={() => mudaSom({ on: false })}>Desligado</button>
        </div>
        <div className="row-between" style={{ marginTop: 8 }}>
          <span className="small">Volume</span>
          <input type="range" min={0} max={1} step={0.05} value={som.volume} disabled={!som.on} style={{ flex: 1 }}
            onChange={(e) => mudaSom({ volume: Number(e.target.value) })} />
          <button className="btn small" disabled={!som.on} onClick={() => { whistle(1); goalRoar(true); }}>Testar</button>
        </div>
        <p className="small muted">Apito, torcida ao fundo, grito de gol, "uhh" nas chances, vaias, aplausos na apresentação e fanfarra nos títulos.</p>
      </div>

      <div className="panel">
        <h2>Duração de cada tempo</h2>
        <div className="choice-row">
          {([15, 30, 60] as const).map((s) => (
            <button key={s} className={`choice ${state.settings.halfSeconds === s ? 'on' : ''}`} onClick={() => update((g) => { g.settings.halfSeconds = s; })}>
              {s === 60 ? '1 min' : `${s} seg`}
            </button>
          ))}
        </div>
        <p className="small muted">Tempo real de cada metade da partida ao vivo.</p>
      </div>
      <div className="panel">
        <h2>Mundial de Clubes</h2>
        <div className="choice-row">
          <button className={`choice ${!state.settings.mundialAnual ? 'on' : ''}`} onClick={() => update((g) => { g.settings.mundialAnual = false; })}>A cada 4 anos (FIFA)</button>
          <button className={`choice ${state.settings.mundialAnual ? 'on' : ''}`} onClick={() => update((g) => { g.settings.mundialAnual = true; })}>Todo ano</button>
        </div>
        <p className="small muted">Formato atual da FIFA: 32 clubes, próxima edição em 2029. Vale a partir da próxima temporada.</p>
      </div>
    </div>
  );
}
