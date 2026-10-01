import { compOf } from '../../engine/season';
import { fixtureRoundLabel } from '../../engine/standings';
import { CLIMA_LABEL } from '../../engine/weather';
import { useLoadedGame } from '../game';
import { dateOf } from '../format';

export function Calendar() {
  const { state } = useLoadedGame();
  const u = state.userClubId;
  const mine = state.fixtures.filter((f) => f.home === u || f.away === u).sort((a, b) => a.slot - b.slot);
  let w = 0, d = 0, l = 0;
  for (const f of mine) {
    if (!f.played) continue;
    const gf = f.home === u ? f.hg : f.ag;
    const ga = f.home === u ? f.ag : f.hg;
    if (gf > ga) w++; else if (gf === ga) d++; else l++;
  }
  return (
    <div>
      <div className="panel row-between">
        <span>Temporada {state.year}</span>
        <span className="small">{w}V {d}E {l}D</span>
      </div>
      {mine.length === 0 && <div className="panel muted">Nenhum jogo agendado.</div>}
      {mine.map((f) => {
        const comp = compOf(state, f);
        const home = f.home === u;
        const opp = state.clubs[home ? f.away : f.home];
        const gf = home ? f.hg : f.ag;
        const ga = home ? f.ag : f.hg;
        const res = !f.played ? '' : gf > ga ? 'V' : gf === ga ? 'E' : 'D';
        const color = res === 'V' ? 'var(--green-2)' : res === 'D' ? 'var(--red)' : res === 'E' ? 'var(--gold)' : 'var(--line)';
        return (
          <div key={f.id} className="msg" style={{ borderLeftColor: color, opacity: f.slot < state.slot && !f.played ? 0.5 : 1 }}>
            <div className="msg-title">
              <span>{f.neutral ? 'N' : home ? 'C' : 'F'} · {opp.name}</span>
              <span>{f.played ? `${gf} x ${ga}${f.pens ? ` (${home ? f.pens[0] : f.pens[1]}-${home ? f.pens[1] : f.pens[0]} pên.)` : ''}` : dateOf(state, f.slot)}</span>
            </div>
            <div className="small muted">
              {comp.def.short} · {fixtureRoundLabel(state, f)}
              {f.played && f.weather && ` · ${CLIMA_LABEL[f.weather]} ${f.temperature}°C`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
