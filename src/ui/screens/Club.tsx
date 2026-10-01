import { experienceLabel } from '../../engine/coach';
import {
  EXPANSOES, baseTicketPrice, ctUpgradeCost, expandStadium, expansionCost, setTicketPrice, upgradeCT, weeklySalaries,
} from '../../engine/clubOps';
import { clubEco } from '../../engine/clubOps';
import { roundMoney } from '../../engine/players';
import { performanceLabel } from '../../engine/sponsors';
import type { TreinoIntensidade } from '../../engine/types';
import { baseUpgradeCost, investFactor, investInBase, legendChance, upgradeBase } from '../../engine/youth';
import { useLoadedGame } from '../game';
import { dateOf, formatMoney } from '../format';

const TREINOS: { id: TreinoIntensidade; label: string; desc: string }[] = [
  { id: 'leve', label: 'Leve', desc: 'Recupera mais energia, preparo cai.' },
  { id: 'normal', label: 'Normal', desc: 'Equilíbrio entre fôlego e preparo.' },
  { id: 'forte', label: 'Forte', desc: 'Mais preparo e evolução dos jovens, menos energia.' },
];

export function ClubScreen() {
  const { state, update, toast } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const c = state.coach;
  const run = (fn: () => string) => { let msg = ''; update(() => { msg = fn(); }); if (msg) toast(msg); };
  const base = baseTicketPrice(club);

  return (
    <div>
      <div className="panel">
        <h2>Técnico</h2>
        <div className="kv">
          <span className="k">Nome / idade</span><span>{c.name}, {c.age} anos</span>
          <span className="k">Experiência</span><span>{experienceLabel(c.experience)} ({Math.round(c.experience)})</span>
          <span className="k">Carreira como jogador</span>
          <span>{c.exPlayer ? `${c.career === 'umClube' ? 'Um clube só' : 'Vários clubes'}${c.titulosCarreira ? ', com títulos' : ', sem títulos'}` : 'Não foi jogador'}</span>
          <span className="k">Jogos (V-E-D)</span><span>{c.games} ({c.wins}-{c.draws}-{c.losses})</span>
          <span className="k">Objetivo da temporada</span><span className="gold">{state.seasonObjective}</span>
        </div>
        {c.titles.length > 0 && <div className="small">Títulos: {c.titles.join(' · ')}</div>}
      </div>

      <div className="panel">
        <h2>Treinamento</h2>
        <div className="choice-row">
          {TREINOS.map((t) => (
            <button key={t.id} className={`choice ${state.treino === t.id ? 'on' : ''}`} onClick={() => update((s) => { s.treino = t.id; })}>{t.label}</button>
          ))}
        </div>
        <p className="small muted">{TREINOS.find((t) => t.id === state.treino)?.desc} O nível do CT multiplica os efeitos.</p>
      </div>

      <div className="panel">
        <h2>Patrocínios</h2>
        {state.sponsors.master ? (
          <div className="sponsor-card">
            <div className="row-between"><b>{state.sponsors.master.name}</b><span className="small muted">master · {state.sponsors.master.sector}</span></div>
            <div className="small">{formatMoney(state.sponsors.master.weekly)}/semana · contrato até dez/{state.sponsors.master.untilYear} · {state.sponsors.master.seasons} temporada(s) de parceria</div>
            {state.sponsors.master.bonusTitle > 0 && <div className="small gold">Bônus por título: {formatMoney(state.sponsors.master.bonusTitle)}</div>}
            {state.sponsors.master.clausula && <div className="small neg">Cláusula de desempenho: corta 30% após temporada ruim</div>}
          </div>
        ) : <div className="muted small">Sem patrocinador master.</div>}
        <h3>Categorias de base</h3>
        {state.sponsors.base.map((b) => (
          <div key={b.name} className="row-between small" style={{ padding: '3px 0' }}>
            <span>{b.name} <span className="muted">({b.sector})</span></span><span>{formatMoney(b.weekly)}/sem</span>
          </div>
        ))}
        {state.sponsors.base.length === 0 && <div className="small muted">Nenhum patrocinador na base.</div>}
        <p className="small muted">
          As marcas reagem ao desempenho. Última temporada: {state.lastPerformance === undefined ? '—' : performanceLabel(state.lastPerformance)}.
          Numa temporada brilhante surge uma marca maior e a atual faz contraproposta; em temporadas ruins, pedem redução ou saem.
        </p>
      </div>

      <div className="panel">
        <h2>Categorias de base e investidores</h2>
        <div className="kv">
          <span className="k">Nível da base</span><span>{'■'.repeat(club.baseLevel)}{'□'.repeat(5 - club.baseLevel)} ({club.baseLevel}/5)</span>
          <span className="k">Investido na temporada</span><span>{formatMoney(club.baseInvest)}</span>
          <span className="k">Chance de joia lendária / garoto</span><span className="gold">{(legendChance(club) * 100).toFixed(1)}%</span>
        </div>
        <div className="meter"><div style={{ width: `${investFactor(club) * 100}%`, background: 'var(--gold)' }} /></div>
        <div className="btn-row" style={{ marginTop: 8 }}>
          {[1, 5, 15].map((m) => {
            const v = roundMoney(m * 1_000_000 * Math.max(0.05, Math.min(clubEco(club), 3)));
            return <button key={m} className="btn small" onClick={() => run(() => investInBase(state, v))}>Investir {formatMoney(v)}</button>;
          })}
          <button className="btn small" disabled={club.baseLevel >= 5} onClick={() => run(() => upgradeBase(state))}>
            Ampliar estrutura ({formatMoney(baseUpgradeCost(club))})
          </button>
        </div>
        <h3>Investidores</h3>
        {club.investors.filter((i) => i.untilYear >= state.year).map((i) => (
          <div key={i.name + i.untilYear} className="row-between small" style={{ padding: '3px 0' }}>
            <span>{i.name}</span><span>{Math.round(i.share * 100)}% das vendas até {i.untilYear}</span>
          </div>
        ))}
        {club.investors.filter((i) => i.untilYear >= state.year).length === 0 && <div className="small muted">Nenhum investidor. Propostas chegam pela diretoria no início da temporada.</div>}
      </div>

      <div className="panel">
        <h2>Estádio</h2>
        <div className="kv">
          <span className="k">{club.stadium.name}</span><span>{club.stadium.capacity.toLocaleString('pt-BR')} lugares</span>
          {club.stadium.expansion && (<><span className="k">Obra em andamento</span><span>+{club.stadium.expansion.seats.toLocaleString('pt-BR')} até {dateOf(state, club.stadium.expansion.readySlot)}</span></>)}
        </div>
        <div className="btn-row">
          {EXPANSOES.map((seats) => (
            <button key={seats} className="btn small" disabled={!!club.stadium.expansion} onClick={() => run(() => expandStadium(state, seats))}>
              +{seats.toLocaleString('pt-BR')} ({formatMoney(expansionCost(club, seats))})
            </button>
          ))}
        </div>
        <h3>Ingresso</h3>
        <div className="row-between">
          <button className="btn small" onClick={() => update((s) => setTicketPrice(s, club.ticketPrice - 5))}>− 5</button>
          <span style={{ fontSize: 20 }}>{formatMoney(club.ticketPrice)}</span>
          <button className="btn small" onClick={() => update((s) => setTicketPrice(s, club.ticketPrice + 5))}>+ 5</button>
        </div>
        <p className="small muted">Preço de referência da divisão: {formatMoney(base)}. Ingresso caro esvazia o estádio e irrita a torcida; casa cheia empurra o time.</p>
      </div>

      <div className="panel">
        <h2>Centro de Treinamento</h2>
        <div className="kv">
          <span className="k">Nível</span><span>{'■'.repeat(club.ct)}{'□'.repeat(5 - club.ct)} ({club.ct}/5)</span>
          {club.ctUpgradeReadySlot !== undefined && (<><span className="k">Modernização</span><span>pronta em {dateOf(state, club.ctUpgradeReadySlot)}</span></>)}
        </div>
        <p className="small muted">O CT acelera a recuperação física, o retorno de lesionados, o preparo do elenco e a evolução dos jovens.</p>
        <button className="btn small" disabled={club.ct >= 5 || club.ctUpgradeReadySlot !== undefined} onClick={() => run(() => upgradeCT(state))}>
          Modernizar ({formatMoney(ctUpgradeCost(club))})
        </button>
      </div>

      <div className="panel">
        <h2>Finanças</h2>
        <div className="kv">
          <span className="k">Saldo</span><span>{formatMoney(club.money)}</span>
          <span className="k">Folha salarial semanal</span><span>{formatMoney(weeklySalaries(state, club))}</span>
        </div>
        <h3>Últimos lançamentos</h3>
        {state.financeLog.slice(0, 15).map((f, i) => (
          <div key={i} className="row-between small" style={{ padding: '3px 0', borderBottom: '1px solid rgba(43,74,58,.5)' }}>
            <span>{f.label}</span>
            <span style={{ color: f.amount >= 0 ? '#9be7a5' : '#ff8a80' }}>{formatMoney(f.amount)}</span>
          </div>
        ))}
        {state.financeLog.length === 0 && <div className="small muted">Nenhum lançamento ainda.</div>}
      </div>
    </div>
  );
}
