// Sorteio da história do técnico como jogador: até 5 tentativas; o usuário
// escolhe a melhor. Esgotadas as chances, só voltando à tela inicial.

import { NIVEL_LABEL, SORTEIOS_HISTORIA, careerTotals } from '../../engine/career';
import { PAISES } from '../../engine/data/paises';
import type { PlayerCareer } from '../../engine/types';

const n = (v: number, um: string, varios: string) => `${v} ${v === 1 ? um : varios}`;
const periodo = (a?: [number, number]) => (a ? (a[0] === a[1] ? `${a[0]} · ` : `${a[0]}–${a[1]} · `) : '');
const lista = (r: Record<string, number>) => Object.entries(r).filter(([, n]) => n > 0).map(([k, n]) => `${n}x ${k}`).join(', ');

export function CareerCard({ pc, escolhida, onEscolher, numero }: { pc: PlayerCareer; escolhida?: boolean; onEscolher?: () => void; numero?: number }) {
  const t = careerTotals(pc);
  return (
    <div className={`draw-card ${escolhida ? 'on' : ''} nivel-${pc.nivel ?? 'comum'}`} onClick={onEscolher}>
      <div className="row-between">
        <b>{numero !== undefined ? `História ${numero}` : 'Como jogador'}</b>
        <span className="draw-nivel">{NIVEL_LABEL[pc.nivel ?? 'comum']}</span>
      </div>
      <div className="small">
        {pc.posicao} · {n(pc.games, 'jogo', 'jogos')} · {n(pc.goals, 'gol', 'gols')} · {n(pc.assists, 'assistência', 'assistências')} · <b className="gold">{n(t.total, 'título', 'títulos')}</b>
      </div>
      {pc.clubs.map((c, i) => (
        <div key={i} className="draw-club">
          <div>
            <b>{c.name}</b>{c.country && <span className="muted"> ({PAISES[c.country]?.name})</span>}
            {c.lenda && <span className="honor-tag" style={{ marginLeft: 6 }}>LENDA</span>}
          </div>
          <div className="small muted">
            {periodo(c.anos)}{n(c.jogos ?? 0, 'jogo', 'jogos')} · {n(c.gols ?? 0, 'gol', 'gols')} · {c.assistencias ?? 0} assist.
          </div>
          {lista(c.titles) && <div className="small">{lista(c.titles)}</div>}
        </div>
      ))}
      {pc.selecao ? (
        <div className="draw-club">
          <div><b>Seleção</b>{pc.selecao.lenda && <span className="honor-tag" style={{ marginLeft: 6 }}>LENDA</span>}</div>
          <div className="small muted">{n(pc.selecao.jogos, 'jogo', 'jogos')} · {n(pc.selecao.gols, 'gol', 'gols')} · {pc.selecao.assistencias} assist.</div>
          {lista(pc.national) && <div className="small">{lista(pc.national)}</div>}
        </div>
      ) : <div className="small muted">Nunca foi convocado para a seleção.</div>}
      {lista(pc.individual) && <div className="small"><b className="gold">Prêmios:</b> {lista(pc.individual)}</div>}
      {onEscolher && <div className="draw-pick">{escolhida ? '✓ Esta é a minha história' : 'Tocar para escolher'}</div>}
    </div>
  );
}

export function CareerDraw({ sorteios, escolhida, onSortear, onEscolher, onVoltarInicio }: {
  sorteios: PlayerCareer[];
  escolhida: number;
  onSortear: () => void;
  onEscolher: (i: number) => void;
  onVoltarInicio: () => void;
}) {
  const restantes = SORTEIOS_HISTORIA - sorteios.length;
  return (
    <div className="career-draw">
      <div className="row-between">
        <span className="small">Chances restantes: <b className="gold">{restantes}</b> de {SORTEIOS_HISTORIA}</span>
        <button className="btn gold small" style={{ flex: 'none' }} disabled={restantes <= 0} onClick={onSortear}>
          {sorteios.length ? 'Sortear outra' : 'Sortear minha história'}
        </button>
      </div>
      {sorteios.length === 0 && (
        <p className="small muted">O jogo sorteia sua carreira: clubes do Brasil ou do exterior (30% de chance de um clube de nível mundial), gols, assistências, títulos, seleção e se você virou lenda. Você tem 5 chances e escolhe a melhor.</p>
      )}
      {restantes <= 0 && (
        <div className="warning small" style={{ margin: '8px 0' }}>
          Você usou as {SORTEIOS_HISTORIA} chances. Escolha uma das histórias abaixo ou volte à tela inicial para tentar de novo.
          <button className="btn small" style={{ marginTop: 8, display: 'block' }} onClick={onVoltarInicio}>Voltar à tela inicial</button>
        </div>
      )}
      {sorteios.map((pc, i) => (
        <CareerCard key={i} pc={pc} numero={i + 1} escolhida={i === escolhida} onEscolher={() => onEscolher(i)} />
      )).reverse()}
    </div>
  );
}
