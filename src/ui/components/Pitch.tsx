// Campinho com as vagas da formação. O ataque fica para cima.

import type { Esquema } from '../../engine/data/formacoes';
import { slotFit } from '../../engine/lineup';
import type { Player } from '../../engine/types';

function shortName(n: string): string {
  const parts = n.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : n;
}

export function Pitch({ esquema, players, selected, onSlotClick }: {
  esquema: Esquema;
  /** Jogador em cada vaga (mesma ordem de esquema.slots). */
  players?: (Player | undefined)[];
  selected?: number | null;
  onSlotClick?: (i: number) => void;
}) {
  return (
    <div className="pitch">
      <div className="pitch-lines">
        <div className="pitch-mid" />
        <div className="pitch-circle" />
        <div className="pitch-box top" />
        <div className="pitch-box bottom" />
      </div>
      {esquema.slots.map((sl, i) => {
        const p = players?.[i];
        const fit = p ? slotFit(p, sl) : 1;
        const cls = !p ? 'empty' : fit >= 0.97 ? 'ok' : fit >= 0.88 ? 'warn' : 'bad';
        return (
          <button
            key={i}
            className={`pitch-slot ${cls} ${selected === i ? 'sel' : ''}`}
            style={{ left: `${sl.x}%`, top: `${100 - sl.y}%` }}
            onClick={() => onSlotClick?.(i)}
            title={p ? `${p.name} (${p.pos}, pé ${p.foot})` : sl.pos}
          >
            <span className="pitch-dot">{sl.pos}{sl.lado !== 'C' && sl.pos !== 'LD' && sl.pos !== 'LE' ? sl.lado : ''}</span>
            {p && <span className="pitch-name">{shortName(p.name)} <i>{p.foot}</i></span>}
          </button>
        );
      })}
    </div>
  );
}
