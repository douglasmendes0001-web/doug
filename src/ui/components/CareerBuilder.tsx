// Criador da história do técnico como jogador: jogos, gols, assistências,
// clubes com títulos, títulos pela seleção e prêmios individuais.

import { useState } from 'react';
import { PREMIOS_INDIVIDUAIS, careerTotals, clubTitleOptions, titulosSelecao } from '../../engine/career';
import { PAISES } from '../../engine/data/paises';
import type { CarreiraJogador, CountryCode, PlayerCareer } from '../../engine/types';
import type { World } from '../../engine/world';

export function emptyCareer(): PlayerCareer {
  return { games: 0, goals: 0, assists: 0, clubs: [], national: {}, individual: {} };
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="counter-row">
      <span className={value > 0 ? 'gold' : ''}>{label}</span>
      <button className="btn small" disabled={value <= 0} onClick={() => onChange(value - 1)}>−</button>
      <b>{value}</b>
      <button className="btn small" disabled={value >= 30} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function NumField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="form-field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <input className="input" type="number" inputMode="numeric" min={0} max={max} value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Math.round(Number(e.target.value) || 0))))} />
    </div>
  );
}

export function CareerBuilder({ world, nat, career, value, onChange }: {
  world: World; nat: CountryCode; career: CarreiraJogador; value: PlayerCareer; onChange: (pc: PlayerCareer) => void;
}) {
  const countries = [...new Set(world.clubs.map((c) => c.country))].sort((a, b) => PAISES[a].name.localeCompare(PAISES[b].name));
  const [country, setCountry] = useState<CountryCode>(countries.includes(nat) ? nat : countries[0]);
  const clubsOf = world.clubs.filter((c) => c.country === country).sort((a, b) => a.name.localeCompare(b.name));
  const [pick, setPick] = useState<number>(-1);
  const [open, setOpen] = useState<number | null>(null);
  const limite = career === 'umClube' ? 1 : 12;
  const set = (fn: (pc: PlayerCareer) => void) => {
    const pc = structuredClone(value);
    fn(pc);
    onChange(pc);
  };
  const tot = careerTotals(value);

  return (
    <div className="career-builder">
      <h3>Números como jogador</h3>
      <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <NumField label="Jogos" value={value.games} max={1500} onChange={(n) => set((pc) => { pc.games = n; })} />
        <NumField label="Gols" value={value.goals} max={1300} onChange={(n) => set((pc) => { pc.goals = n; })} />
        <NumField label="Assistências" value={value.assists} max={800} onChange={(n) => set((pc) => { pc.assists = n; })} />
      </div>

      <h3>Clubes em que jogou {career === 'umClube' && <span className="small">(um clube só)</span>}</h3>
      {value.clubs.map((c, i) => {
        const club = c.clubId !== undefined ? world.clubs[c.clubId] : undefined;
        const opts = club ? clubTitleOptions(club) : Object.keys(c.titles);
        const n = Object.values(c.titles).reduce((a, b) => a + b, 0);
        return (
          <div key={i} className="career-club" style={{ ['--c1' as string]: club?.colors[0] ?? 'var(--line)' }}>
            <div className="row-between">
              <button className="link-btn" onClick={() => setOpen(open === i ? null : i)}>
                <b>{c.name}</b> <span className="small muted">{n} título(s) {open === i ? '▲' : '▼'}</span>
              </button>
              <button className="btn small danger" onClick={() => set((pc) => { pc.clubs.splice(i, 1); })}>Remover</button>
            </div>
            {open === i && opts.map((t) => (
              <Counter key={t} label={t} value={c.titles[t] ?? 0} onChange={(v) => set((pc) => { pc.clubs[i].titles[t] = v; })} />
            ))}
          </div>
        );
      })}
      {value.clubs.length < limite && (
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <select className="sel" value={country} onChange={(e) => { setCountry(e.target.value as CountryCode); setPick(-1); }}>
            {countries.map((c) => <option key={c} value={c}>{PAISES[c].name}</option>)}
          </select>
          <select className="sel" style={{ flex: 1, minWidth: 0 }} value={pick} onChange={(e) => setPick(Number(e.target.value))}>
            <option value={-1}>Escolha o clube...</option>
            {clubsOf.filter((c) => !value.clubs.some((x) => x.clubId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn small primary" style={{ flex: 'none' }} disabled={pick < 0} onClick={() => {
            const club = world.clubs[pick];
            set((pc) => { pc.clubs.push({ name: club.name, clubId: club.id, titles: {} }); });
            setOpen(value.clubs.length);
            setPick(-1);
          }}>Adicionar</button>
        </div>
      )}

      <h3>Seleção ({PAISES[nat].name})</h3>
      {titulosSelecao(nat).map((t) => (
        <Counter key={t} label={t} value={value.national[t] ?? 0} onChange={(v) => set((pc) => { pc.national[t] = v; })} />
      ))}

      <h3>Prêmios individuais</h3>
      {PREMIOS_INDIVIDUAIS.map((t) => (
        <Counter key={t} label={t} value={value.individual[t] ?? 0} onChange={(v) => set((pc) => { pc.individual[t] = v; })} />
      ))}

      <div className="kv">
        <span className="k">Títulos por clubes</span><span>{tot.clube}</span>
        <span className="k">Títulos pela seleção</span><span>{tot.selecao}</span>
        <span className="k">Prêmios individuais</span><span>{tot.individuais}</span>
      </div>
    </div>
  );
}
