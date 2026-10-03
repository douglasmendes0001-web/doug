import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { jobOffers, takeJob } from '../engine/endSeason';
import { unreadCount } from '../engine/inbox';
import { listSaves, loadGame, type SaveSummary } from '../engine/save';
import { advanceToNextUserMatch, userFixtureAtSlot, type SlotReport } from '../engine/season';
import type { ArtEvent, Fixture, GameState } from '../engine/types';
import { GameLogo, GameTitle, LegendArt, TitleArt, WelcomeArt } from './components/Art';
import { applause, fanfare, getSoundPrefs, setSoundPrefs } from './sound';
import { NIVEL, exitApp, useBack } from './back';
import { Editor } from './screens/Editor';
import { LoadGame } from './screens/LoadGame';
import { Header } from './components/Header';
import { IconBall, IconCalendar, IconGear, IconMail, IconShirt, IconStadium, IconTrophy } from './components/Icons';
import { GameProvider, useGame, useLoadedGame } from './game';
import { Calendar } from './screens/Calendar';
import { ClubScreen } from './screens/Club';
import { Competitions } from './screens/Competitions';
import { Inbox } from './screens/Inbox';
import { Market } from './screens/Market';
import { MatchScreen } from './screens/Match';
import { NewGame } from './screens/NewGame';
import { Settings } from './screens/Settings';
import { Squad } from './screens/Squad';

type Tab = 'elenco' | 'calendario' | 'mensagens' | 'competicoes' | 'clube' | 'mercado' | 'config';

function SeasonSummary({ state, onClose }: { state: GameState; onClose: () => void }) {
  useBack(onClose);
  const last = state.history[state.history.length - 1];
  if (!last) return null;
  const keys = ['BRA1', 'COPA-BRA', 'LIB', 'SUD', 'UCL', 'MUN', 'ARG1-AP', 'ARG1-CL', 'ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1'];
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Fim da temporada {last.year}</h2>
        <div className="kv">
          {keys.filter((k) => last.champions[k] !== undefined).map((k) => (
            <Fragment key={k}><span className="k">{state.competitions.find((c) => c.def.id === k)?.def.name ?? k}</span><span>{state.clubs[last.champions[k]].name}</span></Fragment>
          ))}
        </div>
        <p className="small muted">Confira as mensagens da diretoria com o balanço da temporada. Nova temporada: {state.year}.</p>
        <button className="btn primary" onClick={onClose}>Começar {state.year}</button>
      </div>
    </div>
  );
}

function Fired() {
  const { state, update, setState } = useLoadedGame();
  useBack(() => undefined, NIVEL.alerta); // precisa escolher um caminho
  const offers = jobOffers(state);
  return (
    <div className="sheet-backdrop">
      <div className="sheet">
        <h2>Você foi demitido</h2>
        <p>A diretoria do {state.clubs[state.userClubId].name} encerrou seu trabalho. Algumas propostas chegaram:</p>
        {offers.map((id) => {
          const c = state.clubs[id];
          return (
            <button key={id} className="club-pick" style={{ ['--c1' as string]: c.colors[0] }} onClick={() => update((s) => takeJob(s, id))}>
              <span className="grow">{c.name}<div className="small muted">{c.tier}ª divisão · {c.country}</div></span>
              <b>{Math.round(c.baseForce)}</b>
            </button>
          );
        })}
        <button className="btn danger" style={{ marginTop: 10 }} onClick={() => setState(null)}>Encerrar carreira</button>
      </div>
    </div>
  );
}

/** Mostra as artes pendentes (boas-vindas, título, lenda) uma de cada vez. */
function ArtOverlay({ art, onClose }: { art: ArtEvent; onClose: () => void }) {
  const { state } = useLoadedGame();
  const club = state.clubs[art.clubId];
  useBack(onClose, NIVEL.alerta);
  useEffect(() => {
    if (art.type === 'welcome') applause(3);
    else fanfare();
  }, [art]);
  if (!club) return null;
  return (
    <div className="art-backdrop">
      <div className="art-wrap">
        {art.type === 'welcome' && <WelcomeArt club={club} coach={art.coach} year={art.year} honor={art.honor} />}
        {art.type === 'title' && <TitleArt club={club} coach={art.coach} year={art.year} compName={art.compName} kind={art.kind} compId={art.compId} quotes={art.quotes} />}
        {art.type === 'legend' && <LegendArt club={club} coach={art.coach} honor={art.honor} seasons={art.seasons} titles={art.titles} year={art.year} />}
        <button className="btn gold" onClick={onClose}>Continuar ▶</button>
      </div>
    </div>
  );
}

/** Voltar na tela principal: pergunta antes de sair, salvando a carreira. */
function ExitSheet({ onClose }: { onClose: () => void }) {
  const { saveNow, setState } = useLoadedGame();
  useBack(onClose, NIVEL.alerta);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Sair da carreira?</h2>
        <p className="small muted">A carreira é salva antes de sair.</p>
        <div className="sheet-actions">
          <button className="btn primary" onClick={onClose}>Continuar jogando</button>
          <button className="btn" onClick={() => saveNow().then(() => setState(null))}>Salvar e ir ao menu</button>
          <button className="btn" onClick={() => saveNow().then(exitApp)}>Salvar e fechar o app</button>
        </div>
      </div>
    </div>
  );
}

function GameShell() {
  const { state, update, toast, toastMsg, afterMatch } = useLoadedGame();
  const [tab, setTab] = useState<Tab>('elenco');
  const [sair, setSair] = useState(false);
  const [matchFx, setMatchFx] = useState<Fixture | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(false);
  useBack(() => setTab('elenco'), NIVEL.aba, tab !== 'elenco' && !matchFx);
  useBack(() => setSair(true), NIVEL.tela, !matchFx);
  const pending = userFixtureAtSlot(state);
  const unread = unreadCount(state);

  const afterReports = (reports: SlotReport[]) => {
    if (reports.some((r) => r.seasonEnded)) setSummary(true);
  };

  const advance = () => {
    setBusy(true);
    setTimeout(() => {
      let reports: SlotReport[] = [];
      update((s) => { reports = advanceToNextUserMatch(s); });
      setBusy(false);
      afterReports(reports);
      if (reports.length) toast(`${reports.length} dia(s) de jogos simulados.`);
    }, 20);
  };

  if (matchFx) {
    return (
      <div className="app">
        <MatchScreen
          key={matchFx.id}
          fixture={matchFx}
          onBack={() => { setMatchFx(null); setTab('elenco'); }}
          onDone={(r) => { setMatchFx(null); afterReports([r]); afterMatch(); }}
        />
      </div>
    );
  }

  const NAV: { id: Tab; label: string; icon: ReactNode; badge?: number }[] = [
    { id: 'elenco', label: 'Elenco', icon: <IconBall /> },
    { id: 'calendario', label: 'Jogos', icon: <IconCalendar /> },
    { id: 'mensagens', label: 'Mensagens', icon: <IconMail />, badge: unread },
    { id: 'competicoes', label: 'Tabelas', icon: <IconTrophy /> },
    { id: 'clube', label: 'Clube', icon: <IconStadium /> },
    { id: 'mercado', label: 'Mercado', icon: <IconShirt /> },
    { id: 'config', label: 'Ajustes', icon: <IconGear /> },
  ];

  return (
    <div className="app">
      <Header />
      <div className="action-bar">
        {pending && !pending.played ? (
          <button className="btn gold" onClick={() => setMatchFx(pending)}>Jogar: {state.clubs[pending.home === state.userClubId ? pending.away : pending.home].name} ▶</button>
        ) : (
          <button className="btn primary" disabled={busy} onClick={advance}>Avançar até o próximo jogo ▶</button>
        )}
      </div>
      <div className="screen">
        {tab === 'elenco' && <Squad />}
        {tab === 'calendario' && <Calendar />}
        {tab === 'mensagens' && <Inbox />}
        {tab === 'competicoes' && <Competitions />}
        {tab === 'clube' && <ClubScreen />}
        {tab === 'mercado' && <Market />}
        {tab === 'config' && <Settings />}
      </div>
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button key={n.id} className={`nav-btn ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            <span className="nav-ico">{n.icon}</span>
            {n.label}
            {!!n.badge && <span className="badge">{n.badge > 99 ? '99+' : n.badge}</span>}
          </button>
        ))}
      </nav>
      {busy && <div className="loading">Simulando rodadas...</div>}
      {summary && <SeasonSummary state={state} onClose={() => setSummary(false)} />}
      {state.coach.fired && <Fired />}
      {sair && <ExitSheet onClose={() => setSair(false)} />}
      {!!state.pendingArt?.length && !busy && (
        <ArtOverlay art={state.pendingArt[0]} onClose={() => update((s) => { s.pendingArt = s.pendingArt?.slice(1); })} />
      )}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

type MenuScreen = 'menu' | 'novo' | 'carregar' | 'editor';

function Root() {
  const { state, setState } = useGame();
  const [screen, setScreen] = useState<MenuScreen>('menu');
  const [saves, setSaves] = useState<SaveSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [som, setSom] = useState(getSoundPrefs().on);
  useBack(() => setScreen('menu'), NIVEL.tela, !state && screen !== 'menu');

  useEffect(() => {
    if (!state && screen === 'menu') listSaves().then(setSaves);
  }, [state, screen]);
  // Ao entrar numa carreira, o menu volta para a tela inicial (para quando a carreira for fechada).
  useEffect(() => {
    if (state) setScreen('menu');
  }, [state]);

  const open = (slot: number) => {
    setBusy(true);
    loadGame(slot).then((g) => {
      setBusy(false);
      if (g) setState(g);
    });
  };

  if (state) return <GameShell />;
  if (screen === 'novo') return <div className="app"><NewGame onCancel={() => setScreen('menu')} /></div>;
  if (screen === 'carregar') return <div className="app"><LoadGame onBack={() => setScreen('menu')} /></div>;
  if (screen === 'editor') return <div className="app"><Editor onBack={() => setScreen('menu')} /></div>;

  const last = saves?.slice().sort((a, b) => b.savedAt - a.savedAt)[0];
  return (
    <div className="app">
      <div className="title-screen">
        <GameLogo size={230} />
        <GameTitle />
        <p className="muted">Do estadual ao Mundial de Clubes. Você é o técnico.</p>
        <div className="menu-buttons">
          {last && (
            <button className="btn gold menu-btn" onClick={() => open(last.slot)}>
              Continuar<div className="small">{last.coach} · {last.club} · {last.year}</div>
            </button>
          )}
          <button className="btn primary menu-btn" onClick={() => setScreen('novo')}>Novo jogo</button>
          <button className="btn menu-btn" disabled={!saves?.length} onClick={() => setScreen('carregar')}>
            Carregar jogo{saves && <div className="small muted">{saves.length ? `${saves.length} carreira(s) salva(s)` : 'nenhum jogo salvo'}</div>}
          </button>
          <button className="btn menu-btn" onClick={() => setScreen('editor')}>
            Modo editor<div className="small muted">edite clubes, jogadores, habilidades e estilos</div>
          </button>
        </div>
        <button className="btn small" onClick={() => { setSoundPrefs({ on: !som }); setSom(!som); }}>{som ? '🔊 Som ligado' : '🔇 Som desligado'}</button>
        <p className="small muted">Versão {__APP_VERSION__}</p>
      </div>
      {busy && <div className="loading">Carregando carreira...</div>}
    </div>
  );
}

export function App() {
  return (
    <GameProvider>
      <Root />
    </GameProvider>
  );
}
