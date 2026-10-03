import { useEffect, useRef, useState } from 'react';
import { ESTILOS, ESTILOS_POR_POS, type EstiloId } from '../../engine/data/estilos';
import { HABILIDADES, HABILIDADES_POR_POS } from '../../engine/data/habilidades';
import { LIGAS } from '../../engine/data/ligas';
import { PAISES } from '../../engine/data/paises';
import {
  EDITOR_SEED, IDADE_NOVO_JOGADOR, addPlayer, editClub, editPlayer, recalcClubForce, removePlayer, toggleAbility,
} from '../../engine/editor';
import { PE_LABEL, POS_ORDER, STAR_LABEL, abilityCount } from '../../engine/players';
import { deleteEditorWorld, loadEditorWorld, saveEditorWorld } from '../../engine/save';
import type { CountryCode, Player, Pos } from '../../engine/types';
import { createWorld, type World } from '../../engine/world';
import { Flag } from '../components/Flag';
import { formatMoney } from '../format';
import { PlayerRow } from './Squad';
import { NIVEL, useBack } from '../back';

const POSICOES: Pos[] = ['G', 'LD', 'ZG', 'LE', 'VOL', 'MEI', 'ATA'];
const PAISES_COM_CLUBES = [...new Set(LIGAS.map((l) => l.country))];
const NACIONALIDADES = (Object.keys(PAISES) as CountryCode[]).sort((a, b) => PAISES[a].name.localeCompare(PAISES[b].name));

function NumField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <div className="num-input">
        <button className="btn small" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <input className="input" type="number" min={min} max={max} value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))} />
        <button className="btn small" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}

function PlayerEditor({ world, id, onChange, onClose }: { world: World; id: number; onChange: () => void; onClose: () => void }) {
  useBack(onClose, NIVEL.folha);
  const p = world.players[id];
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  const habs = HABILIDADES_POR_POS[p.pos].filter((h) => !filtro || h.nome.toLowerCase().includes(filtro.toLowerCase()));
  const max = abilityCount(p.stars);
  const edit = (e: Parameters<typeof editPlayer>[2]) => {
    editPlayer(world, id, e);
    recalcClubForce(world, p.clubId);
    onChange();
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Editar jogador</h2>
        <div className="form-field">
          <label>Nome</label>
          <input className="input" defaultValue={p.name} maxLength={28} onBlur={(e) => edit({ name: e.target.value })} />
        </div>
        <div className="field-row">
          <div className="form-field">
            <label>Posição</label>
            <select className="sel" value={p.pos} onChange={(e) => edit({ pos: e.target.value as Pos })}>
              {POSICOES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Nacionalidade</label>
            <select className="sel" value={p.nat} onChange={(e) => edit({ nat: e.target.value as CountryCode })}>
              {NACIONALIDADES.map((c) => <option key={c} value={c}>{PAISES[c].name}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <NumField label="Idade" value={p.age} min={15} max={45} onChange={(v) => edit({ age: v })} />
          <NumField label="Força" value={p.force} min={1} max={135} onChange={(v) => edit({ force: v })} />
        </div>
        <NumField label="Potencial (até onde pode evoluir)" value={p.potential} min={1} max={135} onChange={(v) => edit({ potential: v })} />

        <div className="form-field">
          <label>Pé dominante</label>
          <div className="choice-row">
            {(['D', 'E', 'A'] as const).map((ft) => (
              <button key={ft} className={`choice ${p.foot === ft ? 'on' : ''}`} onClick={() => edit({ foot: ft })}>{PE_LABEL[ft]}</button>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label>Estrelas: {p.stars} — {STAR_LABEL[p.stars]} ({max} habilidades)</label>
          <div className="choice-row">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} className={`choice ${p.stars === n ? 'on' : ''}`} onClick={() => edit({ stars: n })}>{n}★</button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Estilo de jogo</label>
          <div className="choice-row" style={{ flexWrap: 'wrap' }}>
            {ESTILOS_POR_POS[p.pos].map((st: EstiloId) => (
              <button key={st} className={`choice ${p.style === st ? 'on' : ''}`} onClick={() => edit({ style: st })}>{ESTILOS[st].curto}</button>
            ))}
          </div>
          <span className="small muted">{ESTILOS[p.style].descricao}</span>
        </div>

        <h3>Habilidades ({p.abilities.length}/{max})</h3>
        <ul className="hab-list">{p.abilities.map((a) => <li key={a}>{HABILIDADES[a].nome}</li>)}</ul>
        {erro && <div className="small neg">{erro}</div>}
        <input className="input" placeholder={`Buscar entre as ${HABILIDADES_POR_POS[p.pos].length} habilidades de ${p.pos}...`} value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 6 }}>
          {habs.map((h) => {
            const on = p.abilities.includes(h.id);
            return (
              <label key={h.id} className={`ability-pick ${on ? 'on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => { setErro(toggleAbility(world, id, h.id) ?? ''); onChange(); }} />
                <span>{h.nome}</span>
              </label>
            );
          })}
        </div>

        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onClose}>Concluir</button>
          <button className="btn danger" onClick={() => {
            if (!window.confirm(`Excluir ${p.name} do banco de dados?`)) return;
            const msg = removePlayer(world, id);
            if (msg) setErro(msg);
            else { recalcClubForce(world, p.clubId); onChange(); onClose(); }
          }}>Excluir jogador</button>
        </div>
      </div>
    </div>
  );
}

export interface ClubEditorProps {
  world: World;
  clubId: number;
  onChange: () => void;
  onBack: () => void;
  /** Ajustes extras ao criar jogador (ex.: respeito pelo técnico na carreira). */
  onPlayerAdded?: (p: Player) => void;
}

export function ClubEditor({ world, clubId, onChange, onBack, onPlayerAdded }: ClubEditorProps) {
  const club = world.clubs[clubId];
  const [selected, setSelected] = useState<number | null>(null);
  const [novoPos, setNovoPos] = useState<Pos>('ATA');
  useBack(onBack, NIVEL.aba);
  const players = club.playerIds.map((id) => world.players[id]).sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.force - a.force);
  const youth = (club.youthIds ?? []).map((id) => world.players[id]).filter((p) => !p.retired);
  const edit = (e: Parameters<typeof editClub>[2]) => { editClub(world, clubId, e); onChange(); };
  return (
    <div>
      <div className="panel">
        <div className="row-between">
          <h2>{club.name}</h2>
          <button className="btn small" onClick={onBack}>← Clubes</button>
        </div>
        <div className="form-field">
          <label>Nome do clube</label>
          <input className="input" key={`n${clubId}`} defaultValue={club.name} maxLength={32} onBlur={(e) => edit({ name: e.target.value })} />
        </div>
        <div className="field-row">
          <div className="form-field">
            <label>Sigla</label>
            <input className="input" key={`s${clubId}`} defaultValue={club.short} maxLength={3} onBlur={(e) => edit({ short: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Cores</label>
            <div className="num-input">
              <input type="color" className="color-input" value={club.colors[0]} onChange={(e) => edit({ colors: [e.target.value, club.colors[1]] })} />
              <input type="color" className="color-input" value={club.colors[1]} onChange={(e) => edit({ colors: [club.colors[0], e.target.value] })} />
            </div>
          </div>
        </div>
        <div className="field-row">
          <NumField label="CT (1-5)" value={club.ct} min={1} max={5} onChange={(v) => edit({ ct: v })} />
          <NumField label="Base (1-5)" value={club.baseLevel} min={1} max={5} onChange={(v) => edit({ baseLevel: v })} />
        </div>
        <div className="field-row">
          <div className="form-field">
            <label>Estádio (lugares)</label>
            <input className="input" type="number" key={`c${clubId}`} defaultValue={club.stadium.capacity} onBlur={(e) => edit({ capacity: Number(e.target.value) })} />
          </div>
          <div className="form-field">
            <label>Caixa ({formatMoney(club.money, 'EUR')})</label>
            <input className="input" type="number" key={`m${clubId}`} defaultValue={Math.round(club.money / 1_000_000)} onBlur={(e) => edit({ money: Number(e.target.value) * 1_000_000 })} />
            <span className="small muted">em milhões de euros (o jogo converte para a moeda do clube)</span>
          </div>
        </div>
        <div className="small muted">Força média do elenco: <b>{Math.round(club.baseForce)}</b> · {players.length} jogadores</div>
      </div>

      <div className="panel">
        <h2>Adicionar jogador</h2>
        <div className="toolbar" style={{ padding: 0 }}>
          <select className="sel" value={novoPos} onChange={(e) => setNovoPos(e.target.value as Pos)}>
            {POSICOES.map((x) => <option key={x}>{x}</option>)}
          </select>
          <button className="btn primary" style={{ flex: 1 }} onClick={() => {
            const p = addPlayer(world, clubId, novoPos);
            onPlayerAdded?.(p);
            recalcClubForce(world, clubId);
            onChange();
            setSelected(p.id);
          }}>Criar jogador ({IDADE_NOVO_JOGADOR} anos)</button>
        </div>
        <p className="small muted">Novos jogadores começam com {IDADE_NOVO_JOGADOR} anos; depois você ajusta nome, força, estrelas, estilo e habilidades.</p>
      </div>

      {players.map((p) => <PlayerRow key={p.id} p={p} hideResp onClick={() => setSelected(p.id)} />)}
      {youth.length > 0 && <h3 style={{ margin: '12px 4px 6px' }}>Categorias de base</h3>}
      {youth.map((p) => <PlayerRow key={p.id} p={p} hideResp onClick={() => setSelected(p.id)} />)}
      {selected !== null && <PlayerEditor world={world} id={selected} onChange={onChange} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** Lista de clubes com busca e filtro por país/liga. */
export function ClubBrowser({ world, onPick, highlight }: { world: World; onPick: (id: number) => void; highlight?: number }) {
  const [country, setCountry] = useState<CountryCode>(highlight !== undefined ? world.clubs[highlight].country : 'BRA');
  const [leagueId, setLeagueId] = useState<string>(highlight !== undefined ? world.clubs[highlight].leagueId ?? 'OUTROS' : 'BRA1');
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const clubs = q
    ? world.clubs.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 40)
    : world.clubs.filter((c) => (leagueId === 'OUTROS' ? c.country === country && !c.leagueId : c.leagueId === leagueId)).sort((a, b) => b.baseForce - a.baseForce);
  return (
    <div className="panel">
      <input className="input" placeholder="Buscar clube pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      {!busca && (
        <div className="toolbar">
          <select className="sel" value={country} onChange={(e) => {
            const c = e.target.value as CountryCode;
            setCountry(c);
            setLeagueId(LIGAS.find((l) => l.country === c)?.id ?? 'OUTROS');
          }}>
            {PAISES_COM_CLUBES.map((c) => <option key={c} value={c}>{PAISES[c].name}</option>)}
          </select>
          <select className="sel" style={{ flex: 1, minWidth: 0 }} value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
            {LIGAS.filter((l) => l.country === country).map((l) => <option key={l.id} value={l.id}>{l.tournaments[0].name.replace(/ — (Apertura|Finalización)/, '')}</option>)}
            <option value="OUTROS">Outros clubes (estaduais)</option>
          </select>
        </div>
      )}
      {clubs.map((c) => (
        <button key={c.id} className="club-pick" style={{ ['--c1' as string]: c.colors[0], outline: c.id === highlight ? '2px solid var(--gold)' : undefined }} onClick={() => onPick(c.id)}>
          <Flag country={c.country} />
          <span className="grow">{c.name}<div className="small muted">{c.playerIds.length} jogadores · CT {c.ct} · base {c.baseLevel}</div></span>
          <b style={{ fontSize: 20 }}>{Math.round(c.baseForce)}</b>
        </button>
      ))}
      {clubs.length === 0 && <p className="muted small">Nenhum clube encontrado.</p>}
    </div>
  );
}

export function Editor({ onBack }: { onBack: () => void }) {
  const worldRef = useRef<World | null>(null);
  const [, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [clubId, setClubId] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadEditorWorld().then((w) => {
      worldRef.current = w ?? createWorld(EDITOR_SEED);
      setStatus(w ? 'Banco editado carregado.' : 'Banco original. As alterações são salvas automaticamente.');
      setLoading(false);
    });
    return () => window.clearTimeout(timer.current);
  }, []);

  const changed = () => {
    setVersion((v) => v + 1);
    setStatus('Salvando...');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (worldRef.current) saveEditorWorld(worldRef.current).then(() => setStatus('Alterações salvas. Valem para as próximas carreiras.'));
    }, 700);
  };

  const world = worldRef.current;

  if (loading || !world) return <div className="screen"><div className="loading">Abrindo banco de dados...</div></div>;

  return (
    <div className="screen">
      <div className="panel">
        <div className="row-between">
          <h2><span className="editor-badge">EDITOR</span> Banco de dados</h2>
          <button className="btn small" onClick={onBack}>Menu</button>
        </div>
        <p className="small muted" style={{ margin: '4px 0' }}>{status}</p>
        <p className="small muted" style={{ margin: '4px 0' }}>
          Edite clubes e jogadores livremente. As mudanças valem para as próximas carreiras (opção "Usar o banco do editor" no Novo jogo); carreiras já salvas não mudam.
        </p>
        <button className="btn small danger" onClick={() => {
          if (!window.confirm('Descartar todas as edições e voltar ao banco original?')) return;
          deleteEditorWorld().then(() => {
            worldRef.current = createWorld(EDITOR_SEED);
            setClubId(null);
            setStatus('Banco original restaurado.');
            setVersion((v) => v + 1);
          });
        }}>Restaurar banco original</button>
      </div>

      {clubId !== null ? (
        <ClubEditor world={world} clubId={clubId} onChange={changed} onBack={() => setClubId(null)} />
      ) : (
        <ClubBrowser world={world} onPick={setClubId} />
      )}
    </div>
  );
}
