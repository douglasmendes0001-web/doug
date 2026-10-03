import { useMemo, useState } from 'react';
import { moedaDoPais } from '../../engine/economy';
import { LIGAS } from '../../engine/data/ligas';
import { PAISES } from '../../engine/data/paises';
import { cambioLabel, formatDeal } from '../../engine/money';
import {
  askingPrice, buyPlayer, loanFee, loanIn, salaryDemand, searchMarket, windowLabel, windowOpen, type MarketFilters, type MarketSort,
} from '../../engine/transfers';
import { FREE_AGENT, type CountryCode, type Pos } from '../../engine/types';
import { NIVEL, useBack } from '../back';
import { useLoadedGame } from '../game';
import { formatMoney } from '../format';
import { PlayerRow } from './Squad';
import { PRESTIGIO_MINIMO_CRAQUE, clubPrestige, craqueBig5, recusaPorPrestigio } from '../../engine/prestige';

const POSICOES: Pos[] = ['G', 'LD', 'ZG', 'LE', 'VOL', 'MEI', 'ATA'];
const PRECOS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
const SALARIOS = [10_000, 30_000, 60_000, 120_000, 250_000, 500_000, 1_000_000];
const ORDENS: { id: MarketSort; label: string }[] = [
  { id: 'forca', label: 'Mais fortes' },
  { id: 'custo', label: 'Melhor custo-benefício' },
  { id: 'jovem', label: 'Mais jovens' },
  { id: 'estrelas', label: 'Mais estrelas' },
  { id: 'valor', label: 'Mais valiosos' },
  { id: 'salario', label: 'Menor salário' },
];

interface Filtros {
  nome: string;
  pos: string;
  origem: string; // '' todos, 'LIVRES', 'NA' América do Norte, país ou liga ("L:ENG1")
  idade: [number, number];
  minForce: number;
  minStars: number;
  preco: string; // '' qualquer, 'orc' orçamento, ou número
  salario: string;
  pe: '' | 'D' | 'E' | 'A';
  sort: MarketSort;
}

const PADRAO = (country: string): Filtros => ({
  nome: '', pos: '', origem: country, idade: [15, 45], minForce: 0, minStars: 1, preco: 'orc', salario: '', pe: '', sort: 'forca',
});

function ativos(f: Filtros, padrao: Filtros): number {
  let n = 0;
  if (f.origem !== padrao.origem) n++;
  if (f.idade[0] !== 15 || f.idade[1] !== 45) n++;
  if (f.minForce > 0) n++;
  if (f.minStars > 1) n++;
  if (f.preco !== 'orc') n++;
  if (f.salario) n++;
  if (f.pe) n++;
  return n;
}

export function Market() {
  const { state, update, toast } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const padrao = PADRAO(club.country);
  const [f, setF] = useState<Filtros>(padrao);
  const [abrirFiltros, setAbrirFiltros] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  useBack(() => setConfirm(null), NIVEL.folha, confirm !== null);
  useBack(() => setAbrirFiltros(false), NIVEL.aba, abrirFiltros);
  const [years, setYears] = useState(3);
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((x) => ({ ...x, [k]: v }));

  const filtros: MarketFilters = useMemo(() => {
    const o = f.origem;
    return {
      nome: f.nome || undefined,
      pos: f.pos || undefined,
      livres: o === 'LIVRES',
      country: o === 'LIVRES' || o.startsWith('L:') ? undefined : o || undefined,
      leagueId: o.startsWith('L:') ? o.slice(2) : undefined,
      minAge: f.idade[0], maxAge: f.idade[1],
      minForce: f.minForce || undefined, minStars: f.minStars > 1 ? f.minStars : undefined,
      maxPrice: f.preco === 'orc' ? Math.max(0, club.money) : f.preco ? Number(f.preco) : undefined,
      maxSalary: f.salario ? Number(f.salario) : undefined,
      foot: f.pe || undefined,
      sort: f.sort,
    };
  }, [f, club.money]);
  const results = useMemo(() => searchMarket(state, filtros), [filtros, state, state.slot]);
  const sel = confirm !== null ? state.players[confirm] : null;
  const recusa = sel ? recusaPorPrestigio(state, club, sel) : null;
  const prestigio = clubPrestige(state, club);
  const paises = (Object.keys(PAISES) as CountryCode[]).filter((code) => state.clubs.some((c) => c.country === code && c.leagueId));
  const minhaJanela = windowOpen(state, club.country);
  const europa = windowOpen(state, 'ENG');
  const nFiltros = ativos(f, padrao);

  const run = (fn: () => string) => {
    let msg = '';
    update(() => { msg = fn(); });
    toast(msg);
    setConfirm(null);
  };
  const precoDe = (pid: number) => {
    const p = state.players[pid];
    const vendedor = p.clubId === FREE_AGENT ? undefined : state.clubs[p.clubId];
    return formatDeal(askingPrice(p), vendedor ? moedaDoPais(vendedor.country) : moedaDoPais(club.country));
  };

  return (
    <div>
      <div className={`window-banner ${minhaJanela ? 'open' : 'closed'}`}>{windowLabel(state, club.country)}</div>
      {club.confed !== 'UEFA' && (
        <div className={`window-banner ${europa ? 'open' : 'closed'}`}>{windowLabel(state, 'ENG')} · negociações com a Europa (em euro) só nesse período</div>
      )}

      <div className="market-search">
        <input className="input" placeholder="Buscar jogador pelo nome" value={f.nome} onChange={(e) => set('nome', e.target.value)} />
        <button className={`btn filter-btn ${nFiltros ? 'on' : ''}`} onClick={() => setAbrirFiltros((x) => !x)}>
          Filtros{nFiltros ? ` (${nFiltros})` : ''}
        </button>
      </div>
      <div className="chip-row">
        <button className={`chip ${f.pos === '' ? 'on' : ''}`} onClick={() => set('pos', '')}>Todas</button>
        {POSICOES.map((p) => <button key={p} className={`chip ${f.pos === p ? 'on' : ''}`} onClick={() => set('pos', p)}>{p}</button>)}
      </div>

      {abrirFiltros && (
        <div className="panel filter-panel">
          <div className="form-field">
            <label>Onde procurar</label>
            <select className="sel" value={f.origem} onChange={(e) => set('origem', e.target.value)}>
              <option value="">Todos os países</option>
              <option value="LIVRES">Agentes livres (sem clube)</option>
              <option value="NA">América do Norte (MLS e Liga MX) · em dólar</option>
              {paises.map((code) => (
                <optgroup key={code} label={PAISES[code].name}>
                  <option value={code}>{PAISES[code].name} (todas as divisões)</option>
                  {LIGAS.filter((l) => l.country === code).map((l) => (
                    <option key={l.id} value={`L:${l.id}`}>{l.tournaments[0].name.replace(/ — (Apertura|Finalización)/, '')}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field-row">
            <div className="form-field">
              <label>Idade: {f.idade[0]} a {f.idade[1]} anos</label>
              <div className="num-input">
                <select className="sel" value={f.idade[0]} onChange={(e) => set('idade', [Number(e.target.value), Math.max(Number(e.target.value), f.idade[1])])}>
                  {Array.from({ length: 31 }, (_, i) => 15 + i).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <span>a</span>
                <select className="sel" value={f.idade[1]} onChange={(e) => set('idade', [Math.min(f.idade[0], Number(e.target.value)), Number(e.target.value)])}>
                  {Array.from({ length: 31 }, (_, i) => 15 + i).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Pé dominante</label>
              <select className="sel" value={f.pe} onChange={(e) => set('pe', e.target.value as Filtros['pe'])}>
                <option value="">Qualquer</option>
                <option value="D">Destro</option>
                <option value="E">Canhoto</option>
                <option value="A">Ambidestro</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>Força mínima: {f.minForce || 'qualquer'}</label>
            <input type="range" min={0} max={130} step={5} value={f.minForce} onChange={(e) => set('minForce', Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label>Estrelas mínimas</label>
            <div className="chip-row" style={{ margin: 0 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} className={`chip ${f.minStars === n ? 'on' : ''}`} onClick={() => set('minStars', n)}>{n}★</button>)}
            </div>
          </div>
          <div className="field-row">
            <div className="form-field">
              <label>Preço até</label>
              <select className="sel" value={f.preco} onChange={(e) => set('preco', e.target.value)}>
                <option value="orc">Cabe no orçamento</option>
                <option value="">Qualquer preço</option>
                {PRECOS.map((v) => <option key={v} value={v}>{formatMoney(v)}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Salário até (mês)</label>
              <select className="sel" value={f.salario} onChange={(e) => set('salario', e.target.value)}>
                <option value="">Qualquer</option>
                {SALARIOS.map((v) => <option key={v} value={v}>{formatMoney(v)}</option>)}
              </select>
            </div>
          </div>
          <div className="btn-row">
            <button className="btn small" onClick={() => setF(padrao)}>Limpar filtros</button>
            <button className="btn small primary" onClick={() => setAbrirFiltros(false)}>Ver {results.length}{results.length >= 80 ? '+' : ''} jogadores</button>
          </div>
        </div>
      )}

      <div className="toolbar small">
        <span>{results.length >= 80 ? '80+' : results.length} encontrado(s) · orçamento {formatMoney(club.money)}</span>
        <span className="grow" />
        <select className="sel" value={f.sort} onChange={(e) => set('sort', e.target.value as MarketSort)}>
          {ORDENS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      {results.length === 0 && <div className="panel muted">Nenhum jogador encontrado. Tente ampliar os filtros (por exemplo, "Qualquer preço").</div>}
      {results.map((p) => (
        <div key={p.id}>
          <div className="small muted market-line">
            {p.clubId === FREE_AGENT ? 'Sem clube · assina a qualquer momento' : `${state.clubs[p.clubId].name} (${PAISES[state.clubs[p.clubId].country].name}) · pede ${precoDe(p.id)}${p.forSale ? ' · à venda' : ''}`}
            {prestigio < PRESTIGIO_MINIMO_CRAQUE && craqueBig5(state, p) && <span className="tag warn" style={{ marginLeft: 6 }}>exige clube intercontinental</span>}
          </div>
          <PlayerRow p={p} hideResp onClick={() => setConfirm(p.id)} />
        </div>
      ))}
      {sel && (
        <div className="sheet-backdrop" onClick={() => setConfirm(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>{sel.name} <span className="muted small">{sel.pos} · {sel.age} anos · {sel.stars}★</span></h2>
            <div className="kv">
              <span className="k">Clube</span><span>{sel.clubId === FREE_AGENT ? 'Sem clube' : `${state.clubs[sel.clubId].name} (${PAISES[state.clubs[sel.clubId].country].name})`}</span>
              <span className="k">Força / potencial</span><span>{Math.round(sel.force)}{sel.age <= 23 ? ` / ${Math.round(sel.potential)}` : ''}</span>
              <span className="k">Valor de mercado</span><span>{formatMoney(sel.value)}</span>
              <span className="k">Preço pedido</span><span className="gold">{precoDe(sel.id)}</span>
              <span className="k">Salário pedido</span><span>{formatMoney(salaryDemand(sel, false, club.country))}/mês</span>
            </div>
            {sel.clubId !== FREE_AGENT && moedaDoPais(state.clubs[sel.clubId].country) !== moedaDoPais(club.country) && (
              <p className="small muted">Negociação em {moedaDoPais(state.clubs[sel.clubId].country) === 'EUR' ? 'euro' : 'dólar'}, convertida pelo câmbio do ano ({cambioLabel(moedaDoPais(state.clubs[sel.clubId].country), moedaDoPais(club.country))}).</p>
            )}
            {recusa && <div className="warning small" style={{ margin: '8px 0' }}><b>Sem negociação:</b> {recusa}</div>}
            <h3>Duração do contrato</h3>
            <div className="choice-row">
              {[1, 2, 3, 4, 5].map((y) => (
                <button key={y} className={`choice ${years === y ? 'on' : ''}`} onClick={() => setYears(y)}>{y} {y === 1 ? 'ano' : 'anos'}</button>
              ))}
            </div>
            <p className="small muted">Contrato até dezembro de {state.year + years - 1}. Ao chegar, o respeito dele depende da sua experiência e da diferença de idade.</p>
            <div className="sheet-actions">
              <button className="btn primary" disabled={!!recusa} onClick={() => run(() => buyPlayer(state, sel.id, years))}>
                {sel.clubId === FREE_AGENT ? 'Assinar contrato' : `Comprar por ${precoDe(sel.id)}`}
              </button>
              {sel.clubId !== FREE_AGENT && (
                <button className="btn" disabled={!!recusa} onClick={() => run(() => loanIn(state, sel.id))}>Pedir emprestado ({formatMoney(loanFee(sel))})</button>
              )}
              <button className="btn" onClick={() => setConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
