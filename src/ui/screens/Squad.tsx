import { useState } from 'react';
import { experienceLabel } from '../../engine/coach';
import { ESTILOS, TATICAS, execucaoTatica, taticaById, type TaticaId } from '../../engine/data/estilos';
import { HABILIDADES } from '../../engine/data/habilidades';
import { CATEGORIA_LABEL, FORMACOES_PADRAO, esquemaOf, type CategoriaFormacao } from '../../engine/data/formacoes';
import { BENCH_SIZE, assignSlots, autoLineup } from '../../engine/lineup';
import { PE_LABEL, POS_ORDER, STAR_LABEL } from '../../engine/players';
import { Rng } from '../../engine/rng';
import { squadOf } from '../../engine/season';
import { loanOut, toggleForSale } from '../../engine/transfers';
import type { Player } from '../../engine/types';
import { Pitch } from '../components/Pitch';
import { FormationEditor } from './FormationEditor';
import { investFactor, legendChance, promoteYouth, releaseYouth } from '../../engine/youth';
import { Flag } from '../components/Flag';
import { useLoadedGame } from '../game';
import { PERSONALIDADE_LABEL, formatMoney, respeitoClass, sectorColor } from '../format';

type SortKey = 'posicao' | 'forca' | 'estrelas' | 'idade' | 'energia' | 'respeito' | 'valor';

const SORTS: Record<SortKey, { label: string; fn: (a: Player, b: Player) => number }> = {
  posicao: { label: 'Posição', fn: (a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.force - a.force },
  forca: { label: 'Força', fn: (a, b) => b.force - a.force },
  estrelas: { label: 'Estrelas', fn: (a, b) => b.stars - a.stars || b.force - a.force },
  idade: { label: 'Idade', fn: (a, b) => b.age - a.age },
  energia: { label: 'Energia', fn: (a, b) => b.energy - a.energy },
  respeito: { label: 'Respeito', fn: (a, b) => a.respeito - b.respeito },
  valor: { label: 'Valor', fn: (a, b) => b.value - a.value },
};

export function Stars({ n, cap }: { n: number; cap?: number }) {
  return (
    <span className={`stars ${n >= 6 ? 'legend' : n >= 4 ? 'top' : ''}`} title={`${n} estrela(s): ${STAR_LABEL[n]}`}>
      {'★'.repeat(n)}
      {cap !== undefined && cap > n && <span className="stars-cap">{'☆'.repeat(cap - n)}</span>}
    </span>
  );
}

export function PlayerRow({ p, role, onClick, year, hideResp }: { p: Player; role?: 'titular' | 'reserva' | 'fora'; onClick?: () => void; year?: number; hideResp?: boolean }) {
  const hab = p.abilities.slice(0, 2).map((id) => HABILIDADES[id]?.nome).join(' / ');
  return (
    <div className={`player-row ${role === 'fora' ? 'fora' : ''} ${p.legend ? 'is-legend' : ''}`} style={{ ['--sector' as string]: sectorColor(p.pos) }} onClick={onClick}>
      <div className="p-left">
        <span className="p-pos">{p.pos}</span>
        <Flag country={p.nat} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="p-name">{p.name} <Stars n={p.stars} /></div>
        <div className="p-traits">
          <span className="style-tag">{ESTILOS[p.style].curto}</span>
          <span className="ellipsis">{hab}</span>
        </div>
        <div className="p-stats">
          <span>I: {p.age}</span>
          <span title={PE_LABEL[p.foot]}>Pé: {p.foot}</span>
          <span>E: {Math.round(p.energy)}%</span>
          <span><b>V: {formatMoney(p.value).replace('$', '')}</b></span>
          <span>S: {formatMoney(p.salary).replace('$', '')}</span>
          {!hideResp && <span className={`resp ${respeitoClass(p.respeito)}`} title="Respeito pelo técnico">R {Math.round(p.respeito)}</span>}
          {p.seasonGoals > 0 && <span>⚽{p.seasonGoals}</span>}
          {p.seasonAssists > 0 && <span>A{p.seasonAssists}</span>}
        </div>
      </div>
      <div className="p-right">
        <div className="p-icons">
          {p.loan && <span className="tag">EMP</span>}
          {year !== undefined && p.contractUntil <= year && !p.youth && <span className="tag warn" title="Contrato termina em dezembro">FIM</span>}
          {p.injuredSlots > 0 && <span className="inj" title="Lesionado">+{p.injuredSlots}</span>}
          {p.suspendedGames > 0 && <span className="card-r" title="Suspenso" />}
          {p.yellowCards > 0 && p.suspendedGames === 0 && <span className="card-y" title={`${p.yellowCards} amarelo(s)`} />}
          {p.forSale && <span className="small gold">$</span>}
          {role === 'titular' && <span className="star">★</span>}
          {role === 'reserva' && <span className="bench-mark">R</span>}
        </div>
        <div className="p-force">{Math.round(p.force)}</div>
      </div>
    </div>
  );
}

function PlayerDetails({ p, year }: { p: Player; year: number }) {
  const est = ESTILOS[p.style];
  return (
    <>
      <div className="kv">
        <span className="k">Classe</span><span><Stars n={p.stars} cap={p.starCap} /> {STAR_LABEL[p.stars]}{p.legend ? ' · JOIA LENDÁRIA' : ''}</span>
        <span className="k">Força / potencial</span><span>{Math.round(p.force)} / {p.age <= 23 ? Math.round(p.potential) : '—'}</span>
        <span className="k">Estilo de jogo</span><span className="gold">{est.nome}</span>
        <span className="k">Pé dominante</span><span>{PE_LABEL[p.foot]}</span>
      </div>
      <p className="small muted" style={{ margin: '0 0 6px' }}>{est.descricao}</p>
      <h3>Habilidades ({p.abilities.length})</h3>
      <ul className="hab-list">
        {p.abilities.map((id) => <li key={id}>{HABILIDADES[id]?.nome}</li>)}
      </ul>
      <div className="kv">
        <span className="k">Personalidade</span><span>{PERSONALIDADE_LABEL[p.personality]}</span>
        <span className="k">Gols / assist. / jogos</span><span>{p.seasonGoals} / {p.seasonAssists} / {p.seasonGames}</span>
        <span className="k">Valor / salário</span><span>{formatMoney(p.value)} / {formatMoney(p.salary)}</span>
        <span className="k">Contrato</span><span className={p.contractUntil <= year ? 'gold' : ''}>até dez/{p.contractUntil}</span>
        {p.loan && (<><span className="k">Empréstimo</span><span>até dez/{p.loan.untilYear}</span></>)}
        {p.injuredSlots > 0 && (<><span className="k">Lesão</span><span className="inj">{p.injuredSlots} dias de jogo</span></>)}
        {p.suspendedGames > 0 && (<><span className="k">Suspensão</span><span>{p.suspendedGames} jogo(s)</span></>)}
        {p.promiseUntilSlot !== undefined && (<><span className="k">Promessa</span><span className="gold">Prometeu chance a ele</span></>)}
      </div>
      {[
        ['Respeito pelo técnico', p.respeito],
        ['Ritmo de jogo', p.oportunidade],
        ['Preparo (treino)', p.treino],
        ['Energia', p.energy],
      ].map(([k, v]) => (
        <div key={k as string} style={{ margin: '6px 0' }}>
          <div className="row-between small"><span className="muted">{k}</span><span>{Math.round(v as number)}</span></div>
          <div className="meter"><div style={{ width: `${v}%`, background: (v as number) < 35 ? 'var(--red)' : undefined }} /></div>
        </div>
      ))}
    </>
  );
}

const ORDEM_CATEGORIAS: CategoriaFormacao[] = ['ofensiva', 'contra-ataque', 'posse', 'equilibrada', 'defensiva'];

function TacticPanel() {
  const { state, update } = useLoadedGame();
  const { tactic, starters } = state.lineup;
  const [editando, setEditando] = useState(false);
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const esquema = esquemaOf(state.lineup);
  const t = taticaById(tactic);
  const exec = execucaoTatica(t, state.coach.experience);
  const encaixe = starters.filter((id) => t.favorece.includes(state.players[id]?.style)).length;
  const titulares = starters.map((id) => state.players[id]).filter(Boolean);
  const slots = assignSlots(titulares, esquema, state.lineup.slots);
  const noCampo = slots.map((id) => (id >= 0 ? state.players[id] : undefined));
  const customs = state.customFormations ?? [];

  const trocarFormacao = (id: string) => update((s) => {
    const custom = (s.customFormations ?? []).find((c) => c.id === id);
    s.lineup.formation = id;
    s.lineup.esquema = custom;
    s.lineup.slots = undefined;
  });
  const tocarVaga = (i: number) => {
    if (selSlot === null) {
      setSelSlot(i);
      return;
    }
    if (selSlot !== i) {
      update((s) => {
        const arr = slots.slice();
        [arr[selSlot], arr[i]] = [arr[i], arr[selSlot]];
        s.lineup.slots = arr.every((id) => id >= 0) ? arr : undefined;
      });
    }
    setSelSlot(null);
  };

  return (
    <div className="panel">
      <div className="toolbar" style={{ padding: 0 }}>
        <label>Formação:</label>
        <select className="sel" style={{ flex: 1, minWidth: 0 }} value={esquema.id} onChange={(e) => trocarFormacao(e.target.value)}>
          {ORDEM_CATEGORIAS.map((c) => (
            <optgroup key={c} label={CATEGORIA_LABEL[c]}>
              {FORMACOES_PADRAO.filter((f) => f.categoria === c).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </optgroup>
          ))}
          {customs.length > 0 && (
            <optgroup label="Minhas formações">
              {customs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      <div className="small muted" style={{ marginTop: 4 }}>
        <b className="gold">{esquema.custom ? 'Personalizada' : CATEGORIA_LABEL[esquema.categoria]}</b> · {esquema.descricao}
      </div>
      <Pitch esquema={esquema} players={noCampo} selected={selSlot} onSlotClick={tocarVaga} />
      <div className="pitch-legend">
        <span><b style={{ background: 'var(--green-2)' }} />encaixe ideal</span>
        <span><b style={{ background: 'var(--gold)' }} />pé/lado trocado</span>
        <span><b style={{ background: 'var(--red)' }} />fora de posição</span>
      </div>
      <p className="small muted" style={{ margin: '4px 0' }}>Toque em dois jogadores do campo para trocar as posições. A letra amarela é o pé (D, E ou A).</p>
      <div className="btn-row">
        <button className="btn small" onClick={() => setEditando(true)}>Editar formação</button>
        <button className="btn small" onClick={() => update((s) => { s.lineup = autoLineup(squadOf(s, s.userClubId), esquemaOf(s.lineup), new Set(), s.lineup.tactic); })}>
          Escalar automático
        </button>
        {state.lineup.slots && <button className="btn small" onClick={() => update((s) => { s.lineup.slots = undefined; })}>Posições automáticas</button>}
      </div>
      <div className="toolbar" style={{ padding: '10px 0 4px' }}>
        <label>Estilo de jogo:</label>
        <select className="sel" style={{ flex: 1 }} value={tactic} onChange={(e) => update((s) => { s.lineup.tactic = e.target.value as TaticaId; })}>
          {TATICAS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </div>
      <div className="small muted">{t.descricao}</div>
      <div className="row-between small" style={{ marginTop: 6 }}>
        <span>Execução: <b className={exec < 0.7 ? 'neg' : exec < 1 ? 'gold' : 'pos'}>{Math.round(exec * 100)}%</b>{exec < 1 && ' (falta experiência)'}</span>
        {t.favorece.length > 0 && <span>Encaixe: <b>{encaixe}/11</b> titulares no estilo</span>}
      </div>
      {t.favorece.length > 0 && (
        <div className="small muted" style={{ marginTop: 4 }}>Favorece: {[...new Set(t.favorece.map((id) => ESTILOS[id].nome))].join(', ')}</div>
      )}
      {editando && <FormationEditor onClose={() => setEditando(false)} />}
    </div>
  );
}

function YouthTab({ onSelect }: { onSelect: (id: number) => void }) {
  const { state } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const youth = club.youthIds.map((id) => state.players[id]).sort((a, b) => b.force - a.force);
  const inv = investFactor(club);
  return (
    <div>
      <div className="panel">
        <h2>Categorias de base (15 a 20 anos)</h2>
        <div className="kv">
          <span className="k">Nível da base / CT</span><span>{club.baseLevel}/5 · {club.ct}/5</span>
          <span className="k">Investimento na temporada</span><span>{formatMoney(club.baseInvest)}</span>
          <span className="k">Chance de joia lendária por garoto</span><span className="gold">{(legendChance(club) * 100).toFixed(1)}%</span>
        </div>
        <div className="meter" title="Peso do investimento"><div style={{ width: `${inv * 100}%`, background: 'var(--gold)' }} /></div>
        <p className="small muted">Duas safras por ano (janeiro e julho). Patrocínios da base, investidores e aportes do clube (aba Clube) aumentam a qualidade dos garotos e a chance de surgir um lendário.</p>
      </div>
      {youth.length === 0 && <div className="panel muted">Nenhum garoto na base ainda.</div>}
      {youth.map((p) => <PlayerRow key={p.id} p={p} onClick={() => onSelect(p.id)} />)}
    </div>
  );
}

export function Squad() {
  const { state, update, toast } = useLoadedGame();
  const [sort, setSort] = useState<SortKey>('posicao');
  const [tab, setTab] = useState<'pro' | 'base'>('pro');
  const [selected, setSelected] = useState<number | null>(null);
  const club = state.clubs[state.userClubId];
  const squad = squadOf(state, state.userClubId).sort(SORTS[sort].fn);
  const { starters, bench } = state.lineup;
  const roleOf = (id: number) => (starters.includes(id) ? 'titular' : bench.includes(id) ? 'reserva' : 'fora');
  const sel = selected !== null ? state.players[selected] : null;

  const setRole = (id: number, role: 'titular' | 'reserva' | 'fora', swapWith?: number) => update((s) => {
    const l = s.lineup;
    if (swapWith === undefined) l.slots = undefined;
    l.starters = l.starters.filter((x) => x !== id);
    l.bench = l.bench.filter((x) => x !== id);
    if (role === 'titular') {
      if (swapWith !== undefined) {
        l.starters = l.starters.map((x) => (x === swapWith ? id : x));
        if (l.slots) l.slots = l.slots.map((x) => (x === swapWith ? id : x));
        l.bench = [swapWith, ...l.bench].slice(0, BENCH_SIZE);
      } else l.starters.push(id);
    } else if (role === 'reserva') {
      l.bench = [...l.bench, id];
      if (l.bench.length > BENCH_SIZE) l.bench = l.bench.slice(-BENCH_SIZE);
    }
  });
  const run = (fn: (s: typeof state) => string) => {
    let msg = '';
    update((s) => { msg = fn(s); });
    if (msg) toast(msg);
    setSelected(null);
  };

  const avgResp = squad.reduce((a, p) => a + p.respeito, 0) / Math.max(1, squad.length);
  const coach = state.coach;

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'pro' ? 'active' : ''}`} onClick={() => setTab('pro')}>Profissional ({squad.length})</button>
        <button className={`tab ${tab === 'base' ? 'active' : ''}`} onClick={() => setTab('base')}>Base ({club.youthIds.length})</button>
      </div>

      {tab === 'base' ? <YouthTab onSelect={setSelected} /> : (
        <>
          <TacticPanel />
          <div className="toolbar">
            <span className="small">Titulares <b>{starters.length}/11</b> · Banco <b>{bench.length}/{BENCH_SIZE}</b></span>
            <span className="grow" />
            <label>Ordenar:</label>
            <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="toolbar small" style={{ paddingTop: 0 }}>
            <span title="Média de respeito do elenco pelo técnico">Moral com o elenco: <b className={`resp ${respeitoClass(avgResp)}`}>{Math.round(avgResp)}</b></span>
          </div>
          {starters.length !== 11 && <div className="warning small" style={{ marginBottom: 6 }}>Escale exatamente 11 titulares (faltando, o jogo completa automaticamente).</div>}
          {squad.map((p) => <PlayerRow key={p.id} p={p} role={roleOf(p.id)} year={state.year} onClick={() => setSelected(p.id)} />)}
        </>
      )}

      {sel && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{sel.name} <span className="muted small">{sel.pos} · {sel.age} anos</span></h2>
            <PlayerDetails p={sel} year={state.year} />
            {sel.youth ? (
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={() => run((s) => promoteYouth(s, sel.id))}>Promover ao profissional</button>
                <button className="btn danger" onClick={() => run((s) => releaseYouth(s, sel.id))}>Dispensar</button>
              </div>
            ) : (
              <>
                {sel.respeito < 40 && sel.age > coach.age && (
                  <p className="small gold">Veterano desconfiado de um técnico mais novo ({experienceLabel(coach.experience).toLowerCase()}). Vitórias e oportunidades aumentam o respeito.</p>
                )}
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn" disabled={roleOf(sel.id) === 'titular' || starters.length >= 11 || sel.injuredSlots > 0 || sel.suspendedGames > 0}
                    onClick={() => { setRole(sel.id, 'titular'); setSelected(null); }}>Titular</button>
                  <button className="btn" disabled={roleOf(sel.id) === 'reserva'} onClick={() => { setRole(sel.id, 'reserva'); setSelected(null); }}>Reserva</button>
                  <button className="btn" disabled={roleOf(sel.id) === 'fora'} onClick={() => { setRole(sel.id, 'fora'); setSelected(null); }}>Não relacionar</button>
                  {!sel.loan && (
                    <>
                      <button className="btn" onClick={() => run((s) => { toggleForSale(s, sel.id); return s.players[sel.id].forSale ? 'Colocado à venda: aguarde propostas' : 'Retirado da lista de venda'; })}>
                        {sel.forSale ? 'Tirar da venda' : 'Colocar à venda'}
                      </button>
                      <button className="btn" onClick={() => run((s) => { const r = new Rng(s.rng); const m = loanOut(s, r, sel.id); s.rng = r.state; return m; })}>Emprestar até dezembro</button>
                    </>
                  )}
                </div>
                {roleOf(sel.id) !== 'titular' && starters.length >= 11 && sel.injuredSlots <= 0 && sel.suspendedGames <= 0 && (
                  <>
                    <h3>Entrar no time no lugar de:</h3>
                    {starters.map((id) => state.players[id]).sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos]).map((s) => (
                      <button key={s.id} className="btn small" style={{ margin: 2 }} onClick={() => { setRole(sel.id, 'titular', s.id); setSelected(null); }}>
                        {s.pos} {s.name} ({Math.round(s.force)})
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
