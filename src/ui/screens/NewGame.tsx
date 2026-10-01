import { useEffect, useMemo, useState } from 'react';
import { IDADE_EX_JOGADOR, IDADE_MAX, IDADE_MIN, ageWarning, experienceLabel, initialExperience } from '../../engine/coach';
import { LIGAS } from '../../engine/data/ligas';
import { PAISES } from '../../engine/data/paises';
import { SLOTS, listSaves, loadEditorWorld, type SaveSummary } from '../../engine/save';
import { newGame } from '../../engine/season';
import type { CarreiraJogador, CountryCode } from '../../engine/types';
import { createWorld, type World } from '../../engine/world';
import { Flag } from '../components/Flag';
import { useGame } from '../game';

const PAISES_JOGAVEIS = [...new Set(LIGAS.map((l) => l.country))];
const NACIONALIDADES = (Object.keys(PAISES) as CountryCode[]).sort((a, b) => PAISES[a].name.localeCompare(PAISES[b].name));
const STEPS = ['Técnico', 'Time', 'Configurações'];

export function NewGame({ onCancel }: { onCancel: () => void }) {
  const { setState } = useGame();
  const seed = useMemo(() => (Date.now() ^ (Math.random() * 1e9)) | 0, []);
  const randomWorld = useMemo(() => createWorld(seed), [seed]);
  const [editorWorld, setEditorWorld] = useState<World | null>(null);
  const [useEditor, setUseEditor] = useState(false);
  const [saves, setSaves] = useState<SaveSummary[]>([]);
  useEffect(() => {
    loadEditorWorld().then((w) => {
      setEditorWorld(w);
      if (w) setUseEditor(true);
    });
    listSaves().then((s) => {
      setSaves(s);
      const free = SLOTS.find((x) => !s.some((y) => y.slot === x));
      if (free) setSlot(free);
    });
  }, []);
  const world = useEditor && editorWorld ? editorWorld : randomWorld;

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState(35);
  const [nat, setNat] = useState<CountryCode>('BRA');
  const [exPlayer, setExPlayer] = useState(false);
  const [career, setCareer] = useState<CarreiraJogador>('variosClubes');
  const [titulos, setTitulos] = useState(false);
  const [country, setCountry] = useState<CountryCode>('BRA');
  const [leagueId, setLeagueId] = useState('BRA1');
  const [clubId, setClubId] = useState<number | null>(null);
  const [halfSeconds, setHalfSeconds] = useState<15 | 30 | 60>(30);
  const [mundialAnual, setMundialAnual] = useState(false);
  const [slot, setSlot] = useState(1);
  const [creating, setCreating] = useState(false);

  const ligas = LIGAS.filter((l) => l.country === country);
  const clubs = world.clubs.filter((c) => c.leagueId === leagueId).sort((a, b) => b.baseForce - a.baseForce);
  const coachInput = { name, age, nat, exPlayer: age >= IDADE_EX_JOGADOR && exPlayer, career, titulosCarreira: titulos };
  const exp = initialExperience(coachInput);
  const club = clubId !== null ? world.clubs[clubId] : null;
  const occupied = saves.find((s) => s.slot === slot);

  const start = () => {
    if (clubId === null) return;
    setCreating(true);
    setTimeout(() => {
      // O banco do editor é copiado: a carreira não altera o banco salvo.
      const base = useEditor && editorWorld ? structuredClone(editorWorld) : randomWorld;
      const state = newGame({ seed, coach: coachInput, clubId, settings: { halfSeconds, mundialAnual } }, base);
      state.saveSlot = slot;
      setState(state);
    }, 30);
  };

  return (
    <div className="screen">
      <div className="steps">{STEPS.map((s, i) => <div key={s} className={i <= step ? 'on' : ''} />)}</div>
      <div className="small muted" style={{ marginBottom: 6 }}>Passo {step + 1} de 3 · {STEPS[step]}</div>

      {step === 0 && (
        <div className="panel">
          <h2>Seu técnico</h2>
          <div className="form-field">
            <label>Nome do técnico</label>
            <input className="input" value={name} maxLength={24} placeholder="Ex.: Dougz" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Idade: {age} anos</label>
            <input type="range" min={IDADE_MIN} max={IDADE_MAX} value={age} onChange={(e) => setAge(Number(e.target.value))} />
          </div>
          <div className="warning" style={{ marginBottom: 12 }}>{ageWarning(age)}</div>
          <div className="form-field">
            <label>Nacionalidade</label>
            <div className="row-between" style={{ gap: 8 }}>
              <Flag country={nat} />
              <select className="sel" style={{ flex: 1 }} value={nat} onChange={(e) => setNat(e.target.value as CountryCode)}>
                {NACIONALIDADES.map((c) => <option key={c} value={c}>{PAISES[c].name}</option>)}
              </select>
            </div>
            <span className="small muted">Jogadores compatriotas começam confiando um pouco mais em você.</span>
          </div>

          {age >= IDADE_EX_JOGADOR && (
            <>
              <div className="form-field">
                <label>Foi jogador de futebol?</label>
                <div className="choice-row">
                  <button className={`choice ${exPlayer ? 'on' : ''}`} onClick={() => setExPlayer(true)}>Sim</button>
                  <button className={`choice ${!exPlayer ? 'on' : ''}`} onClick={() => setExPlayer(false)}>Não</button>
                </div>
              </div>
              {exPlayer && (
                <>
                  <div className="form-field">
                    <label>Carreira como jogador</label>
                    <div className="choice-row">
                      <button className={`choice ${career === 'variosClubes' ? 'on' : ''}`} onClick={() => setCareer('variosClubes')}>Passou por vários clubes</button>
                      <button className={`choice ${career === 'umClube' ? 'on' : ''}`} onClick={() => setCareer('umClube')}>Ficou em um clube só</button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Teve carreira de títulos?</label>
                    <div className="choice-row">
                      <button className={`choice ${titulos ? 'on' : ''}`} onClick={() => setTitulos(true)}>Sim, foi campeão</button>
                      <button className={`choice ${!titulos ? 'on' : ''}`} onClick={() => setTitulos(false)}>Não</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <div className="kv">
            <span className="k">Experiência inicial</span><span className="gold">{experienceLabel(exp)} ({exp}/100)</span>
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={onCancel}>Menu</button>
            <button className="btn primary" disabled={!name.trim()} onClick={() => setStep(1)}>Escolher time</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel">
          <h2>Escolha seu time</h2>
          {editorWorld && (
            <label className="row-between small" style={{ marginBottom: 8 }}>
              <span><span className="editor-badge">EDITOR</span> Usar o banco de dados do modo editor</span>
              <input type="checkbox" checked={useEditor} onChange={(e) => { setUseEditor(e.target.checked); setClubId(null); }} />
            </label>
          )}
          <div className="toolbar">
            <select className="sel" value={country} onChange={(e) => {
              const c = e.target.value as CountryCode;
              setCountry(c);
              setLeagueId(LIGAS.find((l) => l.country === c)!.id);
              setClubId(null);
            }}>
              {PAISES_JOGAVEIS.map((c) => <option key={c} value={c}>{PAISES[c].name}</option>)}
            </select>
            <select className="sel" style={{ flex: 1, minWidth: 0 }} value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setClubId(null); }}>
              {ligas.map((l) => <option key={l.id} value={l.id}>{l.tournaments[0].name.replace(/ — (Apertura|Finalización)/, '')} ({l.tier}ª div.)</option>)}
            </select>
          </div>
          <p className="small muted">{ligas.find((l) => l.id === leagueId)?.formatoReal}</p>
          {clubs.map((c) => (
            <button key={c.id} className="club-pick" style={{ ['--c1' as string]: c.colors[0], outline: clubId === c.id ? '2px solid var(--gold)' : undefined }} onClick={() => setClubId(c.id)}>
              <Flag country={c.country} />
              <span className="grow">{c.name}<div className="small muted">{c.city ?? c.state} · estádio {c.stadium.capacity.toLocaleString('pt-BR')} · CT {c.ct} · base {c.baseLevel}</div></span>
              <b style={{ fontSize: 20 }}>{Math.round(c.baseForce)}</b>
            </button>
          ))}
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setStep(0)}>Voltar</button>
            <button className="btn primary" disabled={clubId === null} onClick={() => setStep(2)}>Próximo</button>
          </div>
        </div>
      )}

      {step === 2 && club && (
        <div className="panel">
          <h2>Configurações</h2>
          <div className="form-field">
            <label>Duração de cada tempo da partida</label>
            <div className="choice-row">
              {([15, 30, 60] as const).map((s) => (
                <button key={s} className={`choice ${halfSeconds === s ? 'on' : ''}`} onClick={() => setHalfSeconds(s)}>{s === 60 ? '1 min' : `${s} seg`}</button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label>Copa do Mundo de Clubes</label>
            <div className="choice-row">
              <button className={`choice ${!mundialAnual ? 'on' : ''}`} onClick={() => setMundialAnual(false)}>A cada 4 anos (critério FIFA, 1ª em 2029)</button>
              <button className={`choice ${mundialAnual ? 'on' : ''}`} onClick={() => setMundialAnual(true)}>Todo ano</button>
            </div>
          </div>
          <div className="form-field">
            <label>Salvar no slot</label>
            <div className="slot-pick">
              {SLOTS.map((s) => (
                <button key={s} className={`choice ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>
                  Slot {s}<div className="small">{saves.find((x) => x.slot === s)?.club ?? 'vazio'}</div>
                </button>
              ))}
            </div>
            {occupied && <span className="small neg">Atenção: a carreira de {occupied.coach} ({occupied.club}) neste slot será substituída.</span>}
          </div>
          <div className="kv">
            <span className="k">Técnico</span><span>{name}, {age} anos, {PAISES[nat].name}</span>
            <span className="k">Clube</span><span>{club.name}</span>
            <span className="k">Experiência</span><span>{experienceLabel(exp)}</span>
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setStep(1)}>Voltar</button>
            <button className="btn gold" disabled={creating} onClick={start}>{creating ? 'Montando o mundo...' : 'Começar carreira'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
