// Escalação no estilo dos jogos de celular: toque numa vaga do campo para
// escolher quem joga ali; toque num reserva para colocá-lo em campo. Tudo com
// a nota de encaixe (posição e pé) visível antes de decidir.

import { useState } from 'react';
import { ESTILOS } from '../../engine/data/estilos';
import { esquemaOf, type SlotFormacao } from '../../engine/data/formacoes';
import {
  BENCH_SIZE, addToBench, autoLineup, available, currentSlots, motivoIndisponivel, placeInSlot, slotFit, starterToBench, unlist,
} from '../../engine/lineup';
import { POS_ORDER } from '../../engine/players';
import { nextUserFixture, squadOf } from '../../engine/season';
import type { GameState, Player } from '../../engine/types';
import { NIVEL, useBack } from '../back';
import { Pitch } from '../components/Pitch';
import { useLoadedGame } from '../game';
import { sectorColor } from '../format';

function slotLabel(sl: SlotFormacao): string {
  return sl.pos + (sl.lado !== 'C' && sl.pos !== 'LD' && sl.pos !== 'LE' ? (sl.lado === 'E' ? ' esq.' : ' dir.') : '');
}

function fitInfo(fit: number): { cls: string; label: string } {
  if (fit >= 0.97) return { cls: 'ok', label: 'ideal' };
  if (fit >= 0.88) return { cls: 'warn', label: 'pé/lado trocado' };
  return { cls: 'bad', label: 'fora de posição' };
}

function lastName(n: string) {
  const parts = n.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : n;
}

/** Linha compacta usada nas listas de escolha. */
function PickRow({ p, fit, tag, onClick, disabled }: { p: Player; fit?: number; tag?: string; onClick: () => void; disabled?: string }) {
  const f = fit !== undefined ? fitInfo(fit) : undefined;
  return (
    <button className="pick-row" style={{ ['--sector' as string]: sectorColor(p.pos) }} onClick={onClick} disabled={!!disabled}>
      <span className="pick-pos">{p.pos}</span>
      <span className="pick-main">
        <span className="pick-name">{p.name} <span className="stars">{'★'.repeat(p.stars)}</span></span>
        <span className="pick-sub">
          {disabled ?? <>{ESTILOS[p.style].curto} · pé {p.foot} · {Math.round(p.energy)}% energia{tag ? ` · ${tag}` : ''}</>}
        </span>
      </span>
      {f && <span className={`fit-chip ${f.cls}`}>{f.label}</span>}
      <span className="pick-force">{Math.round(fit !== undefined ? p.force * fit : p.force)}</span>
    </button>
  );
}

/** Competição do próximo jogo: a suspensão vale só nela. */
function proximaComp(state: GameState): string | undefined {
  return nextUserFixture(state)?.compId;
}

function motivo(p: Player, compId: string | undefined): string | undefined {
  const m = motivoIndisponivel(p, compId);
  return m && m[0].toUpperCase() + m.slice(1);
}

/** Escolher quem joga numa vaga do campo. */
function SlotSheet({ slot, onClose, onDetails }: { slot: number; onClose: () => void; onDetails: (id: number) => void }) {
  const { state, update } = useLoadedGame();
  const comp = proximaComp(state);
  useBack(onClose, NIVEL.folha);
  const get = (id: number) => state.players[id];
  const esquema = esquemaOf(state.lineup);
  const sl = esquema.slots[slot];
  const slots = currentSlots(state.lineup, get);
  const atual = slots[slot] >= 0 ? get(slots[slot]) : undefined;
  const squad = squadOf(state, state.userClubId).filter((p) => p.id !== atual?.id);
  const nota = (p: Player) => p.force * slotFit(p, sl);
  const grupos: { titulo: string; lista: Player[]; tag?: (p: Player) => string }[] = [
    { titulo: 'No banco', lista: squad.filter((p) => state.lineup.bench.includes(p.id)) },
    {
      titulo: 'Titulares (trocam de lugar)', lista: squad.filter((p) => slots.includes(p.id)),
      tag: (p) => `hoje: ${slotLabel(esquema.slots[slots.indexOf(p.id)])}`,
    },
    { titulo: 'Não relacionados', lista: squad.filter((p) => !slots.includes(p.id) && !state.lineup.bench.includes(p.id)) },
  ];
  const escolher = (id: number) => {
    update((s) => placeInSlot(s.lineup, (x) => s.players[x], slot, id));
    onClose();
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>Quem joga de {slotLabel(sl)}?</h2>
        {atual && (
          <div className="current-box">
            <PickRow p={atual} fit={slotFit(atual, sl)} tag="em campo" onClick={() => onDetails(atual.id)} />
            <div className="btn-row" style={{ marginTop: 6 }}>
              <button className="btn small" onClick={() => onDetails(atual.id)}>Ver ficha</button>
              <button className="btn small" onClick={() => { update((s) => starterToBench(s.lineup, (x) => s.players[x], atual.id)); onClose(); }}>Mandar para o banco</button>
            </div>
          </div>
        )}
        <p className="small muted">O número é a força já ajustada para esta posição e o lado do pé.</p>
        {grupos.map((g) => g.lista.length > 0 && (
          <div key={g.titulo}>
            <h3>{g.titulo}</h3>
            {g.lista.sort((a, b) => nota(b) - nota(a)).map((p) => (
              <PickRow key={p.id} p={p} fit={slotFit(p, sl)} tag={g.tag?.(p)} disabled={motivo(p, comp)} onClick={() => escolher(p.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ações de um reserva (ou de uma vaga vazia do banco). */
function BenchSheet({ playerId, onClose, onDetails }: { playerId: number | null; onClose: () => void; onDetails: (id: number) => void }) {
  const { state, update } = useLoadedGame();
  const comp = proximaComp(state);
  const [verTodas, setVerTodas] = useState(false);
  useBack(onClose, NIVEL.folha);
  const get = (id: number) => state.players[id];
  const esquema = esquemaOf(state.lineup);
  const slots = currentSlots(state.lineup, get);
  const p = playerId !== null ? get(playerId) : undefined;
  const fora = squadOf(state, state.userClubId).filter((x) => !slots.includes(x.id) && !state.lineup.bench.includes(x.id))
    .sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.force - a.force);

  if (!p) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <h2>Relacionar no banco</h2>
          {fora.length === 0 && <p className="small muted">Todo o elenco já está relacionado.</p>}
          {fora.map((x) => (
            <PickRow key={x.id} p={x} disabled={motivo(x, comp)} onClick={() => { update((s) => addToBench(s.lineup, x.id)); onClose(); }} />
          ))}
        </div>
      </div>
    );
  }
  const todas = esquema.slots.map((sl, i) => ({ sl, i, fit: slotFit(p, sl), sai: slots[i] >= 0 ? get(slots[i]) : undefined }))
    .sort((a, b) => b.fit - a.fit || (a.sai?.force ?? 0) - (b.sai?.force ?? 0));
  const boas = todas.filter((v) => v.fit >= 0.85);
  const vagas = verTodas || boas.length === 0 ? todas : boas;
  const bloqueio = motivo(p, comp);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>{p.name} <span className="muted small">{p.pos} · {p.age} anos · força {Math.round(p.force)}</span></h2>
        <div className="btn-row" style={{ marginBottom: 6 }}>
          <button className="btn small" onClick={() => onDetails(p.id)}>Ver ficha</button>
          <button className="btn small" onClick={() => { update((s) => unlist(s.lineup, p.id)); onClose(); }}>Tirar da lista</button>
        </div>
        {bloqueio ? <p className="small neg">{bloqueio}: não pode entrar em campo.</p> : (
          <>
            <h3>Entrar em campo no lugar de:</h3>
            {vagas.map(({ sl, i, fit, sai }) => {
              const f = fitInfo(fit);
              return (
                <button key={i} className="swap-row" onClick={() => { update((s) => placeInSlot(s.lineup, (x) => s.players[x], i, p.id)); onClose(); }}>
                  <span className="pick-pos">{slotLabel(sl)}</span>
                  <span className="pick-main">
                    <span className="pick-name">{sai ? `${sai.name} (${Math.round(sai.force)})` : 'vaga vazia'}</span>
                    <span className="pick-sub">{p.name.split(' ')[0]} renderia {Math.round(p.force * fit)} aqui</span>
                  </span>
                  <span className={`fit-chip ${f.cls}`}>{f.label}</span>
                </button>
              );
            })}
            {vagas.length < todas.length && (
              <button className="btn small" onClick={() => setVerTodas(true)}>Mostrar outras posições ({todas.length - vagas.length}, fora da função)</button>
            )}
          </>
        )}
        {fora.length > 0 && (
          <>
            <h3>Trocar no banco por:</h3>
            {fora.slice(0, 12).map((x) => (
              <PickRow key={x.id} p={x} disabled={motivo(x, comp)} onClick={() => { update((s) => addToBench(s.lineup, x.id, p.id)); onClose(); }} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** Campo + banco com edição por toque. */
export function LineupBoard({ onDetails }: { onDetails: (id: number) => void }) {
  const { state, update } = useLoadedGame();
  const comp = proximaComp(state);
  const [slotSel, setSlotSel] = useState<number | null>(null);
  const [benchSel, setBenchSel] = useState<number | null | undefined>(undefined);
  const get = (id: number) => state.players[id];
  const esquema = esquemaOf(state.lineup);
  const slots = currentSlots(state.lineup, get);
  const noCampo = slots.map((id) => (id >= 0 ? get(id) : undefined));
  const bench = state.lineup.bench.map(get).filter(Boolean);
  const fora = squadOf(state, state.userClubId).filter((p) => !slots.includes(p.id) && !state.lineup.bench.includes(p.id));
  const indisponiveis = [...noCampo, ...bench].filter((p): p is Player => !!p && !available(p, comp));

  return (
    <div className="panel lineup-board">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Escalação</h2>
        <span className="small muted">{state.lineup.starters.length}/11 em campo · {bench.length}/{BENCH_SIZE} no banco</span>
      </div>
      <Pitch esquema={esquema} players={noCampo} selected={slotSel} onSlotClick={setSlotSel} showForce />
      <p className="hint">Toque numa posição do campo para escolher quem joga ali.</p>

      <div className="row-between" style={{ marginTop: 6 }}>
        <h3 style={{ margin: 0 }}>Banco de reservas</h3>
        <span className="small muted">toque para pôr em campo</span>
      </div>
      <div className="bench-grid">
        {Array.from({ length: BENCH_SIZE }, (_, i) => {
          const p = bench[i];
          if (!p) {
            return <button key={i} className="bench-chip empty" onClick={() => setBenchSel(null)} disabled={!fora.length}><span>+</span><small>vaga</small></button>;
          }
          return (
            <button key={p.id} className={`bench-chip ${available(p, comp) ? '' : 'out'}`} style={{ ['--sector' as string]: sectorColor(p.pos) }} onClick={() => setBenchSel(p.id)}>
              <span className="bench-force">{Math.round(p.force)}</span>
              <small>{p.pos} · {lastName(p.name)}</small>
            </button>
          );
        })}
      </div>
      {indisponiveis.length > 0 && (
        <div className="warning small" style={{ marginTop: 8 }}>
          Indisponíveis na lista: {indisponiveis.map((p) => `${p.name} (${motivoIndisponivel(p, comp)})`).join(', ')}. Troque-os ou o jogo completa automaticamente.
        </div>
      )}
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn small primary" onClick={() => update((s) => {
          s.lineup = { ...autoLineup(squadOf(s, s.userClubId), esquemaOf(s.lineup), new Set(), s.lineup.tactic, proximaComp(s)), formation: s.lineup.formation, esquema: s.lineup.esquema };
        })}>Escalar automático</button>
        {state.lineup.slots && <button className="btn small" onClick={() => update((s) => { s.lineup.slots = undefined; })}>Reorganizar posições</button>}
      </div>

      {slotSel !== null && <SlotSheet slot={slotSel} onClose={() => setSlotSel(null)} onDetails={(id) => { setSlotSel(null); onDetails(id); }} />}
      {benchSel !== undefined && <BenchSheet playerId={benchSel} onClose={() => setBenchSel(undefined)} onDetails={(id) => { setBenchSel(undefined); onDetails(id); }} />}
    </div>
  );
}
