import { useState } from 'react';
import {
  MAX_FORMACOES_PERSONALIZADAS, esquemaOf, lineName, validateEsquema, type Esquema, type Lado,
} from '../../engine/data/formacoes';
import type { Pos } from '../../engine/types';
import { Pitch } from '../components/Pitch';
import { useLoadedGame } from '../game';

const POS_CAMPO: Pos[] = ['LD', 'ZG', 'LE', 'VOL', 'MEI', 'ATA'];
const POS_NOME: Record<Pos, string> = { G: 'Goleiro', LD: 'Lateral direito', ZG: 'Zagueiro', LE: 'Lateral esquerdo', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };
const LADOS: { id: Lado; label: string }[] = [{ id: 'E', label: 'Esquerda' }, { id: 'C', label: 'Centro' }, { id: 'D', label: 'Direita' }];

/** Editor de formação: o técnico muda função, lado e posição de cada vaga e salva como personalizada. */
export function FormationEditor({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useLoadedGame();
  const atual = esquemaOf(state.lineup);
  const [draft, setDraft] = useState<Esquema>(() => structuredClone(atual));
  const [sel, setSel] = useState<number | null>(1);
  const [nome, setNome] = useState(atual.custom ? atual.nome : `${atual.nome} (minha)`);
  const [erro, setErro] = useState('');
  const customs = state.customFormations ?? [];
  const slot = sel !== null ? draft.slots[sel] : null;

  const setSlot = (patch: Partial<Esquema['slots'][number]>) => {
    if (sel === null || sel === 0) return;
    setDraft((d) => ({ ...d, slots: d.slots.map((s, i) => (i === sel ? { ...s, ...patch } : s)) }));
    setErro('');
  };
  const mover = (dx: number, dy: number) => {
    if (!slot || sel === 0) return;
    setSlot({ x: Math.max(4, Math.min(96, slot.x + dx)), y: Math.max(12, Math.min(92, slot.y + dy)) });
  };

  const salvar = () => {
    const editingCustom = atual.custom && customs.some((c) => c.id === atual.id);
    if (!editingCustom && customs.length >= MAX_FORMACOES_PERSONALIZADAS) {
      setErro(`Você já tem ${MAX_FORMACOES_PERSONALIZADAS} formações personalizadas. Apague uma antes.`);
      return;
    }
    let n = 1;
    while (customs.some((c) => c.id === `custom-${n}`)) n++;
    const id = editingCustom ? atual.id : `custom-${n}`;
    const esquema: Esquema = {
      ...draft, id, custom: true, nome: nome.trim() || `Personalizada ${lineName(draft)}`,
      descricao: `Formação personalizada (${lineName(draft)}).`,
    };
    const e = validateEsquema(esquema);
    if (e) {
      setErro(e);
      return;
    }
    update((s) => {
      const list = (s.customFormations ?? []).filter((c) => c.id !== id);
      s.customFormations = [...list, esquema];
      s.lineup.formation = id;
      s.lineup.esquema = esquema;
      s.lineup.slots = undefined;
    });
    toast(`Formação "${esquema.nome}" salva e em uso.`);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Editar formação</h2>
        <p className="small muted" style={{ margin: 0 }}>Toque numa vaga, mude a função e o lado, e use as setas para posicionar. Base: {atual.nome} · desenho atual: {lineName(draft)}</p>
        <Pitch esquema={draft} selected={sel} onSlotClick={setSel} />
        {slot && sel !== null && sel > 0 ? (
          <div className="panel">
            <div className="field-row">
              <div className="form-field">
                <label>Função</label>
                <select className="sel" value={slot.pos} onChange={(e) => {
                  const pos = e.target.value as Pos;
                  setSlot({ pos, lado: pos === 'LD' ? 'D' : pos === 'LE' ? 'E' : slot.lado });
                }}>
                  {POS_CAMPO.map((p) => <option key={p} value={p}>{POS_NOME[p]}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Lado (pé ideal)</label>
                <select className="sel" value={slot.lado} onChange={(e) => setSlot({ lado: e.target.value as Lado })}>
                  {LADOS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div className="arrow-pad">
              <span />
              <button className="btn small" onClick={() => mover(0, 4)}>↑</button>
              <span />
              <button className="btn small" onClick={() => mover(-4, 0)}>←</button>
              <button className="btn small" onClick={() => mover(0, -4)}>↓</button>
              <button className="btn small" onClick={() => mover(4, 0)}>→</button>
            </div>
            <p className="small muted">Mais à frente = mais ataque; mais atrás = mais marcação. Vagas abertas cruzam mais; destros rendem melhor na direita e canhotos na esquerda.</p>
          </div>
        ) : <p className="small muted">O goleiro é fixo. Toque em outra vaga.</p>}
        <div className="form-field">
          <label>Nome da formação</label>
          <input className="input" value={nome} maxLength={28} onChange={(e) => setNome(e.target.value)} />
        </div>
        {erro && <div className="small neg" style={{ marginBottom: 6 }}>{erro}</div>}
        <div className="btn-row">
          <button className="btn primary" onClick={salvar}>Salvar e usar</button>
          <button className="btn" onClick={() => setDraft(structuredClone(atual))}>Desfazer</button>
          {atual.custom && (
            <button className="btn danger" onClick={() => {
              update((s) => {
                s.customFormations = (s.customFormations ?? []).filter((c) => c.id !== atual.id);
                s.lineup.formation = '4-4-2';
                s.lineup.esquema = undefined;
                s.lineup.slots = undefined;
              });
              onClose();
            }}>Apagar esta formação</button>
          )}
          <button className="btn" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
