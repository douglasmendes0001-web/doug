import { useMemo, useState } from 'react';
import { sortedTable, stageLabel } from '../../engine/competitions';
import { PAISES } from '../../engine/data/paises';
import { topScorers } from '../../engine/standings';
import type { Competition, GameState } from '../../engine/types';
import { useLoadedGame } from '../game';

function Tables({ state, comp, stageIdx }: { state: GameState; comp: Competition; stageIdx: number }) {
  const st = comp.stages[stageIdx];
  const def = comp.def.stages[stageIdx];
  const u = state.userClubId;
  if (def.type === 'ko') {
    if (!st.koRounds.length) return <div className="muted small">Ainda não começou.</div>;
    return (
      <>
        {st.koRounds.map((round, ri) => {
          const n = round.length * 2;
          const name = n === 2 ? 'Final' : n === 4 ? 'Semifinal' : n === 8 ? 'Quartas de final' : n === 16 ? 'Oitavas de final' : `Fase de ${n}`;
          return (
            <div className="bracket-round" key={ri}>
              <h3>{name}</h3>
              {round.map((t) => {
                const fxs = t.fixtureIds.map((id) => state.fixtures[id]);
                let ga = 0, gb = 0;
                const played = fxs.filter((f) => f.played);
                for (const f of played) {
                  if (f.home === t.a) { ga += f.hg; gb += f.ag; } else { ga += f.ag; gb += f.hg; }
                }
                const pens = fxs[fxs.length - 1].pens;
                return (
                  <div className="tie" key={t.id} style={t.a === u || t.b === u ? { background: 'rgba(78,163,95,0.2)' } : undefined}>
                    <span className={t.winner === t.a ? 'w' : ''}>{state.clubs[t.a].name}</span>
                    <span>{played.length ? `${ga} x ${gb}` : 'x'}{pens ? ' (p)' : ''}</span>
                    <span className={`r ${t.winner === t.b ? 'w' : ''}`}>{state.clubs[t.b].name}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </>
    );
  }
  if (!st.started) return <div className="muted small">Ainda não começou.</div>;
  const advance = def.type === 'rr' ? def.advance ?? (st.tables.length === 1 ? def.advanceTotal : undefined) : def.advanceTotal;
  return (
    <>
      {st.tables.map((table, gi) => (
        <div key={gi} style={{ marginBottom: 10 }}>
          {st.tables.length > 1 && <h3>Grupo {String.fromCharCode(65 + gi)}</h3>}
          <table className="tbl">
            <thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead>
            <tbody>
              {sortedTable(table).map((r, i) => (
                <tr key={r.clubId} className={r.clubId === u ? 'me' : ''}>
                  <td className={advance && i < advance ? 'zone-up' : ''}>{i + 1}</td>
                  <td>{state.clubs[r.clubId].name}</td>
                  <td><b>{r.pts}</b></td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf - r.ga}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

export function Competitions() {
  const { state } = useLoadedGame();
  const u = state.userClubId;
  const mine = state.competitions.filter((c) => c.teams.includes(u));
  const [country, setCountry] = useState<string>('MINE');
  const list = useMemo(() => {
    if (country === 'MINE') return mine;
    if (country === 'INT') return state.competitions.filter((c) => c.def.kind === 'continental' || c.def.kind === 'mundial');
    return state.competitions.filter((c) => c.def.country === country);
  }, [country, state.competitions, mine]);
  const [compId, setCompId] = useState<string>(mine[0]?.def.id ?? state.competitions[0].def.id);
  const comp = list.find((c) => c.def.id === compId) ?? list[0];
  const [stageSel, setStageSel] = useState<number | null>(null);
  const stageIdx = comp ? (stageSel !== null && stageSel < comp.def.stages.length ? stageSel : comp.stageIdx) : 0;
  const countries = [...new Set(state.competitions.map((c) => c.def.country).filter(Boolean))] as string[];
  const scorers = comp ? topScorers(state, comp, 5) : [];

  return (
    <div>
      <div className="toolbar">
        <select className="sel" value={country} onChange={(e) => { setCountry(e.target.value); setStageSel(null); setCompId(''); }}>
          <option value="MINE">Minhas competições</option>
          <option value="INT">Internacionais</option>
          {countries.map((c) => <option key={c} value={c}>{PAISES[c as keyof typeof PAISES].name}</option>)}
        </select>
        <select className="sel" style={{ flex: 1, minWidth: 0 }} value={comp?.def.id ?? ''} onChange={(e) => { setCompId(e.target.value); setStageSel(null); }}>
          {list.map((c) => <option key={c.def.id} value={c.def.id}>{c.def.name}</option>)}
        </select>
      </div>
      {!comp && <div className="panel muted">Nenhuma competição.</div>}
      {comp && (
        <div className="panel">
          <div className="row-between">
            <h2>{comp.def.name} {comp.season}</h2>
            <span className="small muted">{stageLabel(comp)}</span>
          </div>
          {comp.champion !== undefined && <div className="gold" style={{ marginBottom: 6 }}>Campeão: {state.clubs[comp.champion].name}</div>}
          {comp.def.stages.length > 1 && (
            <div className="tabs">
              {comp.def.stages.map((s, i) => (
                <button key={i} className={`tab ${i === stageIdx ? 'active' : ''}`} onClick={() => setStageSel(i)}>{s.name}</button>
              ))}
            </div>
          )}
          <Tables state={state} comp={comp} stageIdx={stageIdx} />
          {scorers.length > 0 && (
            <>
              <h3>Artilharia</h3>
              {scorers.map((s) => (
                <div key={s.player.id} className="row-between small" style={{ padding: '2px 0' }}>
                  <span>{s.player.name} <span className="muted">({state.clubs[s.player.clubId]?.short})</span></span><b>{s.goals}</b>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
