import { deleteSave, saveGame } from '../../engine/save';
import { useLoadedGame } from '../game';

export function Settings() {
  const { state, update, setState, toast } = useLoadedGame();
  return (
    <div>
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
      <div className="panel">
        <h2>Jogo</h2>
        <div className="btn-row">
          <button className="btn" onClick={() => saveGame(state).then(() => toast('Jogo salvo!'))}>Salvar agora</button>
          <button className="btn danger" onClick={() => {
            if (window.confirm('Abandonar esta carreira e voltar ao menu? O jogo salvo será apagado.')) {
              deleteSave().then(() => setState(null));
            }
          }}>Novo jogo</button>
        </div>
        <p className="small muted">O jogo é salvo automaticamente no aparelho.</p>
      </div>
    </div>
  );
}
