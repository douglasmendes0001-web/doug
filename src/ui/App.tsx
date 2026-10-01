import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { jobOffers, takeJob } from '../engine/endSeason';
import { unreadCount } from '../engine/inbox';
import { loadGame } from '../engine/save';
import { advanceToNextUserMatch, userFixtureAtSlot, type SlotReport } from '../engine/season';
import type { Fixture, GameState } from '../engine/types';
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

function GameShell() {
  const { state, update, toast, toastMsg } = useLoadedGame();
  const [tab, setTab] = useState<Tab>('elenco');
  const [matchFx, setMatchFx] = useState<Fixture | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(false);
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
          onDone={(r) => { setMatchFx(null); afterReports([r]); }}
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
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

function Root() {
  const { state, setState } = useGame();
  const [saved, setSaved] = useState<GameState | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGame().then(setSaved);
  }, []);

  if (state) return <GameShell />;
  if (creating) return <div className="app"><NewGame onCancel={() => setCreating(false)} /></div>;
  return (
    <div className="app">
      <div className="title-screen">
        <h1>Futebol <span>Manager</span></h1>
        <p className="muted">Comande seu clube do estadual ao Mundial de Clubes.</p>
        {saved === undefined && <p className="muted">Carregando...</p>}
        {saved && (
          <button className="btn gold" style={{ width: 260 }} onClick={() => setState(saved)}>
            Continuar carreira<div className="small">{saved.coach.name} · {saved.clubs[saved.userClubId].name} · {saved.year}</div>
          </button>
        )}
        <button className="btn primary" style={{ width: 260, flex: 'none' }} onClick={() => setCreating(true)}>Novo jogo</button>
      </div>
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
