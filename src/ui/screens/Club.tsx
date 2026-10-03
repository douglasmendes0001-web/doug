import { IDADE_TETO, careerTotals } from '../../engine/career';
import { experienceLabel } from '../../engine/coach';
import {
  EXPANSOES, baseTicketPrice, ctUpgradeCost, expandStadium, expansionCost, setTicketPrice, upgradeCT, weeklySalaries,
} from '../../engine/clubOps';
import { NOME_MOEDA, SIMBOLO, clubRevenue, moedaDoPais } from '../../engine/economy';
import { cambio } from '../../engine/money';
import { weeklyFixed } from '../../engine/clubOps';
import { useState } from 'react';
import { NIVEL, useBack } from '../back';
import { ClubCrest } from '../components/Art';
import { Gallery } from './Gallery';
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

type SubAba = 'tecnico' | 'financas' | 'estrutura' | 'galeria';
const SUBABAS: { id: SubAba; label: string }[] = [
  { id: 'tecnico', label: 'Técnico' },
  { id: 'financas', label: 'Finanças' },
  { id: 'estrutura', label: 'Estrutura' },
  { id: 'galeria', label: 'Galeria' },
];

export function ClubScreen() {
  const { state } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const [aba, setAba] = useState<SubAba>('tecnico');
  useBack(() => setAba('tecnico'), NIVEL.aba, aba !== 'tecnico');
  return (
    <div>
      <div className="club-hero">
        <ClubCrest club={club} size={46} />
        <div style={{ minWidth: 0 }}>
          <div className="club-hero-name">{club.name}</div>
          <div className="small muted">{club.stadium.name} · {club.stadium.capacity.toLocaleString('pt-BR')} lugares · CT {club.ct}/5 · base {club.baseLevel}/5</div>
        </div>
      </div>
      <div className="subtabs">
        {SUBABAS.map((a) => (
          <button key={a.id} className={`subtab ${aba === a.id ? 'active' : ''}`} onClick={() => setAba(a.id)}>{a.label}</button>
        ))}
      </div>
      {aba === 'tecnico' && <TecnicoTab />}
      {aba === 'financas' && <FinancasTab />}
      {aba === 'estrutura' && <EstruturaTab />}
      {aba === 'galeria' && <Gallery />}
    </div>
  );
}

function TecnicoTab() {
  const { state, update } = useLoadedGame();
  const c = state.coach;
  return (
    <div>
      <div className="panel">
        <h2>Técnico</h2>
        <div className="kv">
          <span className="k">Nome / idade</span><span>{c.name}, {c.age} anos{c.age >= IDADE_TETO ? ' (não envelhece mais)' : ''}</span>
          <span className="k">Experiência</span><span>{experienceLabel(c.experience)} ({Math.round(c.experience)})</span>
          <span className="k">Carreira como jogador</span>
          <span>{c.exPlayer ? `${c.career === 'umClube' ? 'Um clube só' : 'Vários clubes'}${c.titulosCarreira ? ', com títulos' : ', sem títulos'}` : 'Não foi jogador'}</span>
          <span className="k">Jogos (V-E-D)</span><span>{c.games} ({c.wins}-{c.draws}-{c.losses})</span>
          <span className="k">Objetivo da temporada</span><span className="gold">{state.seasonObjective}</span>
        </div>
        {c.titles.length > 0 && <div className="small">Títulos: {c.titles.join(' · ')}</div>}
        {c.playerCareer && (() => {
          const pc = c.playerCareer;
          const t = careerTotals(pc);
          const lista = (r: Record<string, number>) => Object.entries(r).filter(([, n]) => n > 0).map(([k, n]) => `${n}x ${k}`).join(', ');
          return (
            <>
              <h3>Como jogador</h3>
              <div className="small">{pc.games} jogos · {pc.goals} gols · {pc.assists} assistências · {t.total} títulos · {t.individuais} prêmios</div>
              {pc.clubs.map((cl, i) => <div key={i} className="small"><b>{cl.name}</b>{lista(cl.titles) ? `: ${lista(cl.titles)}` : ''}</div>)}
              {lista(pc.national) && <div className="small"><b>Seleção</b>: {lista(pc.national)}</div>}
              {lista(pc.individual) && <div className="small"><b>Individuais</b>: {lista(pc.individual)}</div>}
            </>
          );
        })()}
        {!!c.history?.length && (
          <>
            <h3>Passagens como técnico</h3>
            {c.history.slice().reverse().map((h, i) => (
              <div key={i} className="stint-row">
                <span><b>{h.clubName}</b> {h.honor && <span className={`honor-tag ${h.honor}`}>{h.honor === 'lenda' ? 'LENDA' : 'ÍDOLO'}</span>}</span>
                <span className="muted">{h.fromYear}–{h.toYear ?? 'atual'}</span>
                <span className="muted">{h.seasons} temp. · {h.games} jogos · {h.wins} vitórias</span>
                <span className="gold">{h.titles.length} título(s)</span>
              </div>
            ))}
          </>
        )}
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
    </div>
  );
}

function FinancasTab() {
  const { state } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const rev = clubRevenue(club);
  const fixo = weeklyFixed(club);
  const master = state.sponsors.master?.weekly ?? 0;
  const baseSp = state.sponsors.base.reduce((a, b) => a + b.weekly, 0);
  const folha = weeklySalaries(state, club);
  const saldoSemana = fixo.tv + master + baseSp - folha - fixo.custos;
  const moeda = moedaDoPais(club.country);
  const fx = cambio();
  return (
    <div>
      <div className="stat-grid">
        <div className="stat-tile"><div className="lbl">Saldo em caixa</div><div className={`val ${club.money < 0 ? 'neg' : ''}`}>{formatMoney(club.money)}</div></div>
        <div className="stat-tile"><div className="lbl">Receita anual</div><div className="val">{formatMoney(rev)}</div></div>
        <div className="stat-tile"><div className="lbl">Folha por mês</div><div className="val">{formatMoney(folha * 4.33)}</div></div>
        <div className="stat-tile"><div className="lbl">Resultado semanal</div><div className={`val ${saldoSemana < 0 ? 'neg' : 'pos'}`}>{formatMoney(saldoSemana)}</div></div>
      </div>
      {moeda !== 'EUR' && (
        <div className="panel small">
          <b className="gold">Câmbio {state.year}:</b> € 1 = {SIMBOLO[moeda]} {fx[moeda].toFixed(2).replace('.', ',')}
          {moeda === 'BRL' && <> · US$ 1 = R$ {(fx.BRL / fx.USD).toFixed(2).replace('.', ',')}</>}
          <div className="muted">As finanças estão em {NOME_MOEDA[moeda]}. Negociações com a Europa são em euro e com a América do Norte em dólar, convertidas pelo câmbio do ano.</div>
        </div>
      )}
      <div className="panel">
        <h2>Por semana</h2>
        <div className="fin-row"><span>Cotas de TV e receitas comerciais</span><span className="pos">{formatMoney(fixo.tv)}</span></div>
        <div className="fin-row"><span>Patrocínio master</span><span className="pos">{formatMoney(master)}</span></div>
        <div className="fin-row"><span>Patrocínios da base</span><span className="pos">{formatMoney(baseSp)}</span></div>
        <div className="fin-row"><span>Folha salarial</span><span className="neg">-{formatMoney(folha)}</span></div>
        <div className="fin-row"><span>Custos fixos (funcionários, viagens, estádio e CT)</span><span className="neg">-{formatMoney(fixo.custos)}</span></div>
        <div className="fin-row total"><span>Resultado (sem bilheteria e prêmios)</span><span className={saldoSemana < 0 ? 'neg' : 'pos'}>{formatMoney(saldoSemana)}</span></div>
        <p className="small muted">Bilheteria entra a cada jogo em casa; premiações, a cada título; vendas de jogadores, na hora.</p>
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

      <FinanceLog />
    </div>
  );
}

function FinanceLog() {
  const { state } = useLoadedGame();
  return (
    <div className="panel">
      <h2>Últimos lançamentos</h2>
      {state.financeLog.slice(0, 20).map((f, i) => (
        <div key={i} className="fin-row small">
          <span>{f.label}</span>
          <span className={f.amount >= 0 ? 'pos' : 'neg'}>{formatMoney(f.amount)}</span>
        </div>
      ))}
      {state.financeLog.length === 0 && <div className="small muted">Nenhum lançamento ainda.</div>}
    </div>
  );
}

function EstruturaTab() {
  const { state, update, toast } = useLoadedGame();
  const club = state.clubs[state.userClubId];
  const run = (fn: () => string) => { let msg = ''; update(() => { msg = fn(); }); if (msg) toast(msg); };
  const base = baseTicketPrice(club);
  const passo = club.ticketPrice < 20 ? 1 : 5;
  return (
    <div>
      <div className="panel">
        <h2>Categorias de base e investidores</h2>
        <div className="kv">
          <span className="k">Nível da base</span><span>{'■'.repeat(club.baseLevel)}{'□'.repeat(5 - club.baseLevel)} ({club.baseLevel}/5)</span>
          <span className="k">Investido na temporada</span><span>{formatMoney(club.baseInvest)}</span>
          <span className="k">Chance de joia lendária / garoto</span><span className="gold">{(legendChance(club) * 100).toFixed(1)}%</span>
        </div>
        <div className="meter"><div style={{ width: `${investFactor(club) * 100}%`, background: 'var(--gold)' }} /></div>
        <div className="btn-row" style={{ marginTop: 8 }}>
          {[0.005, 0.015, 0.04].map((m) => {
            const v = roundMoney(m * clubRevenue(club) + 20_000);
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
          <button className="btn small" onClick={() => update((s) => setTicketPrice(s, club.ticketPrice - passo))}>−</button>
          <span style={{ fontSize: 20 }}>{formatMoney(club.ticketPrice)}</span>
          <button className="btn small" onClick={() => update((s) => setTicketPrice(s, club.ticketPrice + passo))}>+</button>
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

    </div>
  );
}
