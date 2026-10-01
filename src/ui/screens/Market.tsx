import { useMemo, useState } from 'react';
import { PAISES } from '../../engine/data/paises';
import {
  askingPrice, buyPlayer, loanFee, loanIn, salaryDemand, searchMarket, windowLabel, windowOpen,
} from '../../engine/transfers';
import { FREE_AGENT, type Pos } from '../../engine/types';
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
  const [years, setYears] = useState(3);
  const livres = country === 'LIVRES';
  const results = useMemo(
    () => searchMarket(state, {
      pos, livres, country: livres || !country ? undefined : country,
      maxPrice: onlyAffordable ? Math.max(0, club.money) : undefined,
    }),
    [pos, country, livres, onlyAffordable, club.money, state.slot, state],
  );
  const sel = confirm !== null ? state.players[confirm] : null;
  const countries = Object.entries(PAISES).filter(([code]) => state.clubs.some((c) => c.country === code && c.leagueId));
  const minhaJanela = windowOpen(state, club.country);
  const europa = windowOpen(state, 'ENG');

  const run = (fn: () => string) => {
    let msg = '';
    update(() => { msg = fn(); });
    toast(msg);
    setConfirm(null);
  };

  return (
    <div>
      <div className={`window-banner ${minhaJanela ? 'open' : 'closed'}`}>{windowLabel(state, club.country)}</div>
      {club.confed !== 'UEFA' && (
        <div className={`window-banner ${europa ? 'open' : 'closed'}`}>{windowLabel(state, 'ENG')} · propostas e compras com clubes europeus só nesse período</div>
      )}
      <div className="toolbar">
        <select className="sel" value={pos} onChange={(e) => setPos(e.target.value)}>
          {POSICOES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="sel" style={{ flex: 1 }} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="LIVRES">Agentes livres (sem clube)</option>
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
          <div className="small muted" style={{ padding: '2px 4px' }}>
            {p.clubId === FREE_AGENT ? 'Sem clube · assina a qualquer momento' : `${state.clubs[p.clubId].name} · pede ${formatMoney(askingPrice(p))}${p.forSale ? ' · à venda' : ''}`}
          </div>
          <PlayerRow p={p} hideResp onClick={() => setConfirm(p.id)} />
        </div>
      ))}
      {sel && (
        <div className="sheet-backdrop" onClick={() => setConfirm(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{sel.name} <span className="muted small">{sel.pos} · {sel.age} anos · {sel.stars}★</span></h2>
            <div className="kv">
              <span className="k">Clube</span><span>{sel.clubId === FREE_AGENT ? 'Sem clube' : state.clubs[sel.clubId].name}</span>
              <span className="k">Força</span><span>{Math.round(sel.force)}</span>
              <span className="k">Valor pedido</span><span>{formatMoney(askingPrice(sel))}</span>
              <span className="k">Salário pedido</span><span>{formatMoney(salaryDemand(sel))}/mês</span>
            </div>
            <h3>Duração do contrato</h3>
            <div className="choice-row">
              {[1, 2, 3, 4, 5].map((y) => (
                <button key={y} className={`choice ${years === y ? 'on' : ''}`} onClick={() => setYears(y)}>{y} {y === 1 ? 'ano' : 'anos'}</button>
              ))}
            </div>
            <p className="small muted">Contrato até dezembro de {state.year + years - 1}. Ao chegar, o respeito dele depende da sua experiência e da diferença de idade.</p>
            <div className="btn-row">
              <button className="btn primary" onClick={() => run(() => buyPlayer(state, sel.id, years))}>
                {sel.clubId === FREE_AGENT ? 'Assinar contrato' : 'Comprar'}
              </button>
              {sel.clubId !== FREE_AGENT && (
                <button className="btn" onClick={() => run(() => loanIn(state, sel.id))}>Pedir emprestado ({formatMoney(loanFee(sel))})</button>
              )}
              <button className="btn" onClick={() => setConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
