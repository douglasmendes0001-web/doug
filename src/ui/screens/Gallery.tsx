import { useMemo, useState } from 'react';
import { PAISES } from '../../engine/data/paises';
import type { CompKind, GameState } from '../../engine/types';
import { ClubCrest, Trophy, trophyKind } from '../components/Art';
import { useLoadedGame } from '../game';

interface Conquista {
  compId: string;
  name: string;
  kind: CompKind;
  years: number[];
}

const ORDEM: Partial<Record<CompKind, number>> = { mundial: 0, continental: 1, liga: 2, copa: 3, estadual: 4 };

/** Títulos do clube conquistados durante a carreira (histórico + competições já encerradas no ano). */
export function clubTrophies(state: GameState, clubId: number): Conquista[] {
  const map = new Map<string, Conquista>();
  const add = (compId: string, name: string, kind: CompKind, year: number) => {
    const c = map.get(compId) ?? { compId, name, kind, years: [] };
    if (!c.years.includes(year)) c.years.push(year);
    map.set(compId, c);
  };
  for (const h of state.history) {
    for (const [compId, champ] of Object.entries(h.champions)) {
      if (champ !== clubId) continue;
      const def = state.competitions.find((c) => c.def.id === compId)?.def;
      add(compId, h.names?.[compId] ?? def?.name ?? compId, h.kinds?.[compId] ?? def?.kind ?? 'liga', h.year);
    }
  }
  for (const c of state.competitions) {
    if (c.finished && c.champion === clubId) add(c.def.id, c.def.name, c.def.kind, c.season);
  }
  return [...map.values()].sort((a, b) => (ORDEM[a.kind] ?? 9) - (ORDEM[b.kind] ?? 9) || b.years.length - a.years.length);
}

const SECOES: { titulo: string; kinds: CompKind[] }[] = [
  { titulo: 'Internacionais', kinds: ['mundial', 'continental'] },
  { titulo: 'Nacionais', kinds: ['liga', 'copa'] },
  { titulo: 'Estaduais', kinds: ['estadual'] },
];

export function Gallery() {
  const { state } = useLoadedGame();
  const [country, setCountry] = useState<string>(state.clubs[state.userClubId].country);
  const [clubId, setClubId] = useState(state.userClubId);
  const countries = useMemo(() => [...new Set(state.clubs.map((c) => c.country))], [state.clubs]);
  const clubs = useMemo(() => state.clubs.filter((c) => c.country === country).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)), [state.clubs, country]);
  const club = state.clubs[clubId];
  const trofeus = clubTrophies(state, clubId);
  const total = trofeus.reduce((s, t) => s + t.years.length, 0);
  const lendas = club.legends ?? [];
  const meusTitulos = state.coach.titles;

  return (
    <div>
      <div className="toolbar">
        <select className="sel" value={country} onChange={(e) => {
          setCountry(e.target.value);
          const first = state.clubs.find((c) => c.country === e.target.value);
          if (first) setClubId(first.id);
        }}>
          {countries.map((c) => <option key={c} value={c}>{PAISES[c].name}</option>)}
        </select>
        <select className="sel" style={{ flex: 1, minWidth: 0 }} value={clubId} onChange={(e) => setClubId(Number(e.target.value))}>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <ClubCrest club={club} size={64} />
        <div>
          <h2 style={{ margin: 0 }}>Galeria de títulos</h2>
          <div className="small">{club.name} · <b className="gold">{total}</b> título(s) desde {state.history[0]?.year ?? state.year}</div>
        </div>
      </div>

      {trofeus.length === 0 && (
        <div className="panel">
          <p className="small muted">Nenhum título conquistado nesta carreira ainda. A sala de troféus está esperando.</p>
        </div>
      )}
      {SECOES.map((sec) => {
        const lista = trofeus.filter((t) => sec.kinds.includes(t.kind));
        if (!lista.length) return null;
        const n = lista.reduce((a, t) => a + t.years.length, 0);
        return (
          <div key={sec.titulo} className="panel">
            <div className="row-between"><h2>{sec.titulo}</h2><span className="gallery-count small-count">{n}</span></div>
            <div className="gallery-grid">
              {lista.map((t) => {
                const tk = trophyKind(t.kind, t.compId);
                const intl = tk === 'mundial' || tk.startsWith('continental');
                return (
                  <div key={t.compId} className={`gallery-item ${intl ? 'internacional' : ''}`}>
                    <Trophy kind={tk} size={64} id={`g-${t.compId}`} />
                    <div className="gallery-count">{t.years.length}x</div>
                    <div className="small"><b>{t.name}</b></div>
                    <div className="gallery-years">{t.years.slice().sort((a, b) => a - b).join(' · ')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="small muted" style={{ margin: '0 4px 8px' }}>A galeria conta os títulos conquistados a partir do início desta carreira (títulos reais anteriores a {state.history[0]?.year ?? state.year} não entram).</p>

      <div className="panel">
        <h2>Lendas e ídolos do banco</h2>
        {lendas.length === 0 && <p className="small muted">Nenhum técnico homenageado ainda. Ídolo: 5 temporadas (ou 2 com 3 títulos). Lenda: 8 temporadas (ou 5 com 3 títulos).</p>}
        {lendas.map((l) => (
          <div key={l.coach} className="legend-row">
            <span className={`honor-tag ${l.honor}`}>{l.honor === 'lenda' ? 'LENDA' : 'ÍDOLO'}</span>
            <span style={{ flex: 1 }}>{l.coach}</span>
            <span className="small muted">{l.seasons} temp. · {l.titles} título(s)</span>
          </div>
        ))}
      </div>

      {clubId === state.userClubId && (
        <div className="panel">
          <h2>Títulos de {state.coach.name}</h2>
          {meusTitulos.length === 0 ? <p className="small muted">Ainda sem títulos como técnico.</p> : (
            <ul className="hab-list">{meusTitulos.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
