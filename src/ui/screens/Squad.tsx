import { useState } from 'react';
import { experienceLabel } from '../../engine/coach';
import { toggleForSale } from '../../engine/clubOps';
import { BENCH_SIZE, FORMACOES, autoLineup } from '../../engine/lineup';
import { POS_ORDER } from '../../engine/players';
import { squadOf } from '../../engine/season';
import type { Formacao, Player } from '../../engine/types';
import { Flag } from '../components/Flag';
import { useLoadedGame } from '../game';
import { PERSONALIDADE_LABEL, formatMoney, respeitoClass, sectorColor } from '../format';

type SortKey = 'posicao' | 'forca' | 'idade' | 'energia' | 'respeito' | 'valor';

const SORTS: Record<SortKey, { label: string; fn: (a: Player, b: Player) => number }> = {
  posicao: { label: 'Posição', fn: (a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.force - a.force },
  forca: { label: 'Força', fn: (a, b) => b.force - a.force },
  idade: { label: 'Idade', fn: (a, b) => b.age - a.age },
  energia: { label: 'Energia', fn: (a, b) => b.energy - a.energy },
  respeito: { label: 'Respeito', fn: (a, b) => a.respeito - b.respeito },
  valor: { label: 'Valor', fn: (a, b) => b.value - a.value },
};

export function PlayerRow({ p, role, onClick }: { p: Player; role?: 'titular' | 'reserva' | 'fora'; onClick?: () => void }) {
  return (
    <div className={`player-row ${role === 'fora' ? 'fora' : ''}`} style={{ ['--sector' as string]: sectorColor(p.pos) }} onClick={onClick}>
      <div className="p-left">
        <span className="p-pos">{p.pos}</span>
        <Flag country={p.nat} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="p-name">{p.name}</div>
        <div className="p-traits">
          <span>{p.traits[0]}/{p.traits[1]}</span>
          {p.seasonGoals > 0 && <span>⚽{p.seasonGoals}</span>}
          <span className={`resp ${respeitoClass(p.respeito)}`} title="Respeito pelo técnico">R {Math.round(p.respeito)}</span>
        </div>
        <div className="p-stats">
          <span>I: {p.age}</span>
          <span>E: {Math.round(p.energy)}%</span>
          <span><b>V: {formatMoney(p.value).replace('$', '')}</b></span>
          <span>S: {formatMoney(p.salary).replace('$', '')}</span>
        </div>
      </div>
      <div className="p-right">
        <div className="p-icons">
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

export function Squad() {
  const { state, update, toast } = useLoadedGame();
  const [sort, setSort] = useState<SortKey>('posicao');
  const [selected, setSelected] = useState<number | null>(null);
  const squad = squadOf(state, state.userClubId).sort(SORTS[sort].fn);
  const { starters, bench, formation } = state.lineup;
  const roleOf = (id: number) => (starters.includes(id) ? 'titular' : bench.includes(id) ? 'reserva' : 'fora');
  const sel = selected !== null ? state.players[selected] : null;

  const setRole = (id: number, role: 'titular' | 'reserva' | 'fora', swapWith?: number) => update((s) => {
    const l = s.lineup;
    l.starters = l.starters.filter((x) => x !== id);
    l.bench = l.bench.filter((x) => x !== id);
    if (role === 'titular') {
      if (swapWith !== undefined) {
        l.starters = l.starters.map((x) => (x === swapWith ? id : x));
        l.bench = [swapWith, ...l.bench].slice(0, BENCH_SIZE);
      } else l.starters.push(id);
    } else if (role === 'reserva') {
      l.bench = [...l.bench, id];
      if (l.bench.length > BENCH_SIZE) l.bench = l.bench.slice(-BENCH_SIZE);
    }
  });

  const avgResp = squad.reduce((a, p) => a + p.respeito, 0) / Math.max(1, squad.length);
  const coach = state.coach;

  return (
    <div>
      <div className="toolbar">
        <span className="muted">{squad.length} jogadores</span>
        <span className="grow" />
        <label>Ordenar por:</label>
        <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="toolbar">
        <label>Tática:</label>
        <select className="sel" value={formation} onChange={(e) => update((s) => { s.lineup.formation = e.target.value as Formacao; })}>
          {Object.keys(FORMACOES).map((f) => <option key={f}>{f}</option>)}
        </select>
        <span className="grow" />
        <button className="btn small" onClick={() => update((s) => { s.lineup = autoLineup(squadOf(s, s.userClubId), s.lineup.formation); })}>
          Escalar automático
        </button>
      </div>
      <div className="toolbar small">
        <span>Titulares: <b>{starters.length}/11</b></span>
        <span>Banco: <b>{bench.length}/{BENCH_SIZE}</b></span>
        <span className="grow" />
        <span title="Média de respeito do elenco pelo técnico">Moral com o elenco: <b className={`resp ${respeitoClass(avgResp)}`}>{Math.round(avgResp)}</b></span>
      </div>
      {starters.length !== 11 && <div className="warning small" style={{ marginBottom: 6 }}>Escale exatamente 11 titulares (faltando, o jogo completa automaticamente).</div>}
      {squad.map((p) => <PlayerRow key={p.id} p={p} role={roleOf(p.id)} onClick={() => setSelected(p.id)} />)}

      {sel && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{sel.name} <span className="muted small">{sel.pos} · {sel.age} anos</span></h2>
            <div className="kv">
              <span className="k">Força / potencial</span><span>{Math.round(sel.force)} / {sel.age <= 23 ? '★'.repeat(Math.max(1, Math.min(5, Math.round((sel.potential - sel.force) / 4) + 1))) : '—'}</span>
              <span className="k">Características</span><span>{sel.traits.join(', ')}</span>
              <span className="k">Personalidade</span><span>{PERSONALIDADE_LABEL[sel.personality]}</span>
              <span className="k">Gols / jogos na temporada</span><span>{sel.seasonGoals} / {sel.seasonGames}</span>
              <span className="k">Valor / salário</span><span>{formatMoney(sel.value)} / {formatMoney(sel.salary)}</span>
              {sel.injuredSlots > 0 && (<><span className="k">Lesão</span><span className="inj">{sel.injuredSlots} dias de jogo</span></>)}
              {sel.suspendedGames > 0 && (<><span className="k">Suspensão</span><span>{sel.suspendedGames} jogo(s)</span></>)}
              {sel.promiseUntilSlot !== undefined && (<><span className="k">Promessa</span><span className="gold">Prometeu chance a ele</span></>)}
            </div>
            {[
              ['Respeito pelo técnico', sel.respeito],
              ['Ritmo de jogo', sel.oportunidade],
              ['Preparo (treino)', sel.treino],
              ['Energia', sel.energy],
            ].map(([k, v]) => (
              <div key={k as string} style={{ margin: '6px 0' }}>
                <div className="row-between small"><span className="muted">{k}</span><span>{Math.round(v as number)}</span></div>
                <div className="meter"><div style={{ width: `${v}%`, background: (v as number) < 35 ? 'var(--red)' : undefined }} /></div>
              </div>
            ))}
            {sel.respeito < 40 && sel.age > coach.age && (
              <p className="small gold">Veterano desconfiado de um técnico mais novo ({experienceLabel(coach.experience).toLowerCase()}). Vitórias e oportunidades aumentam o respeito.</p>
            )}
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn" disabled={roleOf(sel.id) === 'titular' || starters.length >= 11 || sel.injuredSlots > 0 || sel.suspendedGames > 0}
                onClick={() => { setRole(sel.id, 'titular'); setSelected(null); }}>Titular</button>
              <button className="btn" disabled={roleOf(sel.id) === 'reserva'} onClick={() => { setRole(sel.id, 'reserva'); setSelected(null); }}>Reserva</button>
              <button className="btn" disabled={roleOf(sel.id) === 'fora'} onClick={() => { setRole(sel.id, 'fora'); setSelected(null); }}>Não relacionar</button>
              <button className="btn" onClick={() => { update((s) => toggleForSale(s, sel.id)); toast(sel.forSale ? 'Retirado da lista de venda' : 'Colocado à venda: aguarde propostas'); }}>
                {sel.forSale ? 'Tirar da venda' : 'Colocar à venda'}
              </button>
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
          </div>
        </div>
      )}
    </div>
  );
}
