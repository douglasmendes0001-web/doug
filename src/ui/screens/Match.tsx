import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTILOS, execucaoTatica, taticaById } from '../../engine/data/estilos';
import { MAX_SUBS } from '../../engine/lineup';
import { MatchSim, type MatchEvent } from '../../engine/match';
import { Rng } from '../../engine/rng';
import { applyMatchOutcome, compOf, playSlot, prepareMatch, simulateFixture, type SlotReport } from '../../engine/season';
import { fixtureRoundLabel } from '../../engine/standings';
import type { Fixture, Player } from '../../engine/types';
import { CLIMA_LABEL, altitudeGap } from '../../engine/weather';
import { useLoadedGame } from '../game';

interface Props {
  fixture: Fixture;
  onDone: (report: SlotReport) => void;
  onBack: () => void;
}

function readiness(p: Player): { label: string; cls: string } {
  const r = 0.35 * ((p.oportunidade - 50) / 50) + 0.35 * ((p.treino - 50) / 50) + 0.3 * ((p.respeito - 50) / 50) - (p.respeito < 35 ? 0.2 : 0);
  if (r > 0.2) return { label: 'Pronto', cls: 'high' };
  if (r > -0.15) return { label: 'Regular', cls: 'mid' };
  return { label: 'Sem ritmo', cls: 'low' };
}

export function MatchScreen({ fixture, onDone, onBack }: Props) {
  const { state, update } = useLoadedGame();
  const rngRef = useRef(new Rng(state.rng));
  const [phase, setPhase] = useState<'pre' | 'live' | 'end'>('pre');
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0);
  const [subOut, setSubOut] = useState<number | null>(null);
  const [showSubs, setShowSubs] = useState(false);
  const [subError, setSubError] = useState('');
  const htPaused = useRef(false);

  const u = state.userClubId;
  const side: 0 | 1 = fixture.home === u ? 0 : 1;
  const prepared = useMemo(() => prepareMatch(state, fixture, rngRef.current), [state, fixture]);
  const simRef = useRef<MatchSim | null>(null);
  if (!simRef.current) simRef.current = new MatchSim(prepared.ctx);
  const sim = simRef.current;

  const comp = compOf(state, fixture);
  const home = state.clubs[fixture.home];
  const away = state.clubs[fixture.away];
  const me = state.clubs[u];
  const gapMe = altitudeGap(prepared.ctx.venue.altitude, me.altitude);

  useEffect(() => {
    if (!running) return;
    const ms = (state.settings.halfSeconds * 1000) / 45;
    const id = window.setInterval(() => {
      sim.step();
      setTick((t) => t + 1);
      if (sim.isHalfTime && !htPaused.current) {
        htPaused.current = true;
        setRunning(false);
      }
      if (sim.finished) {
        setRunning(false);
        setPhase('end');
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [running, sim, state.settings.halfSeconds]);

  const finish = (quick: boolean) => {
    let report: SlotReport | undefined;
    update((s) => {
      const rng = rngRef.current;
      if (quick) simulateFixture(s, fixture, rng);
      else applyMatchOutcome(s, fixture, sim, rng, prepared);
      s.rng = rng.state;
      report = playSlot(s);
    });
    if (report) onDone(report);
  };

  const [hg, ag] = sim.score;
  const mySide = sim.sides[side];
  const totalPosse = sim.sides[0].posse + sim.sides[1].posse || 1;
  const events: MatchEvent[] = [...sim.events].reverse();

  if (phase === 'pre') {
    const starters = prepared.ctx[side === 0 ? 'home' : 'away'].lineup.starters.map((id) => state.players[id]);
    const avg = starters.reduce((a, p) => a + p.force, 0) / Math.max(1, starters.length);
    const tired = starters.filter((p) => p.energy < 60);
    const veteranosInsatisfeitos = starters.filter((p) => p.respeito < 30);
    return (
      <div className="screen">
        <div className="panel">
          <h2>{comp.def.name}</h2>
          <div className="small muted">{fixtureRoundLabel(state, fixture)}</div>
          <div className="score-line" style={{ marginTop: 10 }}>
            <div className="team-tag"><span className="team-color" style={{ background: home.colors[0] }} />{home.name}</div>
            <div className="score" style={{ fontSize: 22 }}>x</div>
            <div className="team-tag away">{away.name}<span className="team-color" style={{ background: away.colors[0] }} /></div>
          </div>
        </div>
        <div className="panel">
          <h2>Condições</h2>
          <div className="kv">
            <span className="k">Local</span><span>{fixture.neutral ? `Campo neutro (${prepared.ctx.venue.city ?? prepared.ctx.venue.country})` : prepared.ctx.venue.stadium.name}</span>
            <span className="k">Clima</span><span>{CLIMA_LABEL[prepared.ctx.weather.clima]}, {prepared.ctx.weather.temperature}°C</span>
            <span className="k">Altitude</span><span>{prepared.ctx.venue.altitude.toLocaleString('pt-BR')} m</span>
            {prepared.attendance !== undefined && (<><span className="k">Público esperado</span><span>{prepared.attendance.toLocaleString('pt-BR')}</span></>)}
          </div>
          {gapMe > 0 && <div className="warning small">Ar rarefeito: seu time joga {prepared.ctx.venue.altitude.toLocaleString('pt-BR')} m acima do nível do mar e vai cansar bem mais rápido, principalmente no 2º tempo. Considere poupar os mais velhos e usar as substituições cedo.</div>}
          {prepared.ctx.weather.clima === 'calor' && <div className="warning small" style={{ marginTop: 6 }}>Calor forte: desgaste físico maior, ainda mais para veteranos.</div>}
          {prepared.ctx.weather.clima === 'chuva' && <div className="warning small" style={{ marginTop: 6 }}>Chuva: gramado pesado, jogo mais imprevisível e mais faltas.</div>}
        </div>
        <div className="panel">
          <h2>Seu time ({state.lineup.formation} · {taticaById(state.lineup.tactic).nome})</h2>
          <div className="small">Execução da tática: <b>{Math.round(execucaoTatica(taticaById(state.lineup.tactic), state.coach.experience) * 100)}%</b></div>
          <div className="small">Força média dos titulares: <b>{avg.toFixed(1)}</b></div>
          {tired.length > 0 && <div className="small" style={{ color: '#ff8a80' }}>Cansados: {tired.map((p) => `${p.name} (${Math.round(p.energy)}%)`).join(', ')}</div>}
          {veteranosInsatisfeitos.length > 0 && <div className="small gold">Pouco comprometidos com você: {veteranosInsatisfeitos.map((p) => p.name).join(', ')}</div>}
          <div className="small muted" style={{ marginTop: 4 }}>{starters.map((p) => p.name).join(', ')}</div>
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={() => { setPhase('live'); setRunning(true); }}>Começar partida</button>
          <button className="btn" onClick={() => finish(true)}>Simular</button>
          <button className="btn" onClick={onBack}>Voltar ao elenco</button>
        </div>
      </div>
    );
  }

  return (
    <div className="match">
      <div className="scoreboard">
        <div className="score-line">
          <div className="team-tag"><span className="team-color" style={{ background: home.colors[0] }} />{home.short}</div>
          <div className="score">{hg} x {ag}</div>
          <div className="team-tag away">{away.short}<span className="team-color" style={{ background: away.colors[0] }} /></div>
        </div>
        <div className="clock">{sim.finished ? 'Fim de jogo' : sim.isHalfTime ? 'Intervalo' : `${sim.displayMinute}'`}{sim.pens ? ` · pênaltis ${sim.pens[0]} x ${sim.pens[1]}` : ''}</div>
        <div className="stat-bar">
          <span>{Math.round((sim.sides[0].posse / totalPosse) * 100)}%</span>
          <div className="track"><div style={{ width: `${(sim.sides[0].posse / totalPosse) * 100}%`, background: 'var(--green-2)' }} /><div style={{ flex: 1, background: '#3a4f45' }} /></div>
          <span style={{ textAlign: 'right' }}>{Math.round((sim.sides[1].posse / totalPosse) * 100)}%</span>
        </div>
        <div className="match-info">
          <span>Posse</span>
          <span>Finalizações {sim.sides[0].shots} x {sim.sides[1].shots}</span>
          <span>{CLIMA_LABEL[prepared.ctx.weather.clima]} {prepared.ctx.weather.temperature}°C</span>
          {prepared.ctx.venue.altitude > 1500 && <span>{prepared.ctx.venue.altitude} m</span>}
          <span>Subs {mySide.subsUsed}/{MAX_SUBS}</span>
        </div>
      </div>

      {showSubs && !sim.finished ? (
        <div className="events">
          <div className="panel">
            <h2>{subOut === null ? 'Quem sai?' : 'Quem entra?'}</h2>
            {subError && <div className="small" style={{ color: '#ff8a80' }}>{subError}</div>}
            {subOut === null && mySide.onField.map((f) => (
              <button key={f.p.id} className="club-pick" style={{ ['--c1' as string]: f.injured ? 'var(--red)' : 'var(--line)' }} onClick={() => { setSubOut(f.p.id); setSubError(''); }}>
                <b style={{ width: 36 }}>{f.pos}</b><span className="grow">{f.p.name}{f.injured ? ' (lesionado)' : ''}</span>
                <span className="small">E {Math.round(f.p.energy)}%</span><b>{Math.round(f.p.force)}</b>
              </button>
            ))}
            {subOut !== null && mySide.bench.map((p) => {
              const r = readiness(p);
              return (
                <button key={p.id} className="club-pick" onClick={() => {
                  const res = sim.substitute(side, subOut, p.id);
                  if (!res.ok) setSubError(res.error ?? '');
                  else { setSubOut(null); setShowSubs(false); setTick((t) => t + 1); }
                }}>
                  <b style={{ width: 36 }}>{p.pos}</b><span className="grow">{p.name} <span className="stars">{'★'.repeat(p.stars)}</span> <span className="style-tag">{ESTILOS[p.style].curto}</span></span>
                  <span className={`resp ${r.cls}`}>{r.label}</span><b>{Math.round(p.force)}</b>
                </button>
              );
            })}
            <p className="small muted">"Pronto" depende do ritmo de jogo, do treino e da relação com você. Quem está sem ritmo ou insatisfeito pode atrapalhar em vez de ajudar.</p>
            <button className="btn small" onClick={() => { setSubOut(null); setShowSubs(false); }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="events">
          {events.map((e, i) => (
            <div key={i} className={`event ${e.type}`}>
              <span className="min">{e.minute === '0' ? '' : `${e.minute}'`}</span>
              <span style={{ color: e.side === side ? undefined : e.side === -1 ? 'var(--gold)' : 'var(--muted)' }}>{e.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="match-controls">
        {phase === 'end' ? (
          <button className="btn gold" onClick={() => finish(false)}>Continuar</button>
        ) : (
          <>
            <button className="btn primary" onClick={() => setRunning((r) => !r)}>{running ? 'Pausar' : sim.minute === 0 ? 'Iniciar' : 'Continuar'}</button>
            <button className="btn" disabled={mySide.subsUsed >= MAX_SUBS} onClick={() => { setRunning(false); setShowSubs(true); }}>Substituir</button>
            <button className="btn" title="Acelerar até o fim" onClick={() => { setRunning(false); while (!sim.finished) sim.step(); setPhase('end'); setTick((t) => t + 1); }}>Fim ▸▸</button>
          </>
        )}
      </div>
    </div>
  );
}
