import { useMemo, useState } from 'react';
import { askingPrice, buyPlayer, searchMarket } from '../../engine/clubOps';
import { PAISES } from '../../engine/data/paises';
import type { Pos } from '../../engine/types';
import { useLoadedGame } from '../game';
import { formatMoney } from '../format';
import { PlayerRow } from './Squad';

const POSICOES: Pos[] = ['G', 'LD', 'ZG', 'LE', 'VOL', 'MEI', 'ATA'];

export function Market() {
  const { state, update, toast } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const [pos, setPos] = useState<string>('ATA');
  const [country, setCountry] = useState<string>(club.country);
  const [onlyAffordable, setOnlyAffordable] = useState(true);
  const [confirm, setConfirm] = useState<number | null>(null);
  const results = useMemo(
    () => searchMarket(state, { pos, country: country || undefined, maxPrice: onlyAffordable ? Math.max(0, club.money) : undefined }),
    [pos, country, onlyAffordable, club.money, state.slot],
  );
  const sel = confirm !== null ? state.players[confirm] : null;
  const countries = Object.entries(PAISES).filter(([code]) => state.clubs.some((c) => c.country === code && c.leagueId));

  return (
    <div>
      <div className="toolbar">
        <select className="sel" value={pos} onChange={(e) => setPos(e.target.value)}>
          {POSICOES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="sel" style={{ flex: 1 }} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Todos os países</option>
          {countries.map(([code, m]) => <option key={code} value={code}>{m.name}</option>)}
        </select>
      </div>
      <div className="toolbar small">
        <label style={{ color: 'var(--text)' }}><input type="checkbox" checked={onlyAffordable} onChange={(e) => setOnlyAffordable(e.target.checked)} /> Só o que cabe no orçamento ({formatMoney(club.money)})</label>
      </div>
      {results.length === 0 && <div className="panel muted">Nenhum jogador encontrado com esses filtros.</div>}
      {results.map((p) => (
        <div key={p.id}>
          <div className="small muted" style={{ padding: '2px 4px' }}>{state.clubs[p.clubId].name} · pede {formatMoney(askingPrice(p))}{p.forSale ? ' · à venda' : ''}</div>
          <PlayerRow p={p} onClick={() => setConfirm(p.id)} />
        </div>
      ))}
      {sel && (
        <div className="sheet-backdrop" onClick={() => setConfirm(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Contratar {sel.name}?</h2>
            <p>{sel.pos}, {sel.age} anos, força {Math.round(sel.force)}. O {state.clubs[sel.clubId].name} pede <b>{formatMoney(askingPrice(sel))}</b>. Salário: {formatMoney(sel.salary)}/mês.</p>
            <p className="small muted">Ao chegar, o respeito dele por você depende da sua experiência e da diferença de idade.</p>
            <div className="btn-row">
              <button className="btn primary" onClick={() => { let msg = ''; update((s) => { msg = buyPlayer(s, sel.id); }); toast(msg); setConfirm(null); }}>Fazer proposta</button>
              <button className="btn" onClick={() => setConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
