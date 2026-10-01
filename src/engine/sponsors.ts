// Patrocínios (master e categorias de base) e investidores. As marcas entram,
// saem e mudam de valor conforme o desempenho do técnico. Numa temporada
// brilhante surge uma marca maior — e a atual faz uma contraproposta.

import { clubEco, logFinance } from './clubOps';
import { INVESTIDORES, MARCAS_BASE, MARCAS_MASTER } from './data/marcas';
import { formatMoney, pushMessage } from './inbox';
import { roundMoney } from './players';
import { clamp, type Rng } from './rng';
import type { GameState, Sponsor } from './types';

export function masterWeekly(tier: number, eco: number): number {
  return roundMoney(120_000 * Math.pow(1.8, tier - 1) * clamp(eco, 0.02, 4));
}

export function baseWeekly(tier: number, eco: number): number {
  return roundMoney(6_000 * tier * clamp(eco, 0.05, 4));
}

function brand(rng: Rng, list: [string, string][], exclude: string[]): [string, string] {
  const pool = list.filter(([n]) => !exclude.includes(n));
  return rng.pick(pool.length ? pool : list);
}

function usedNames(state: GameState): string[] {
  return [state.sponsors.master?.name ?? '', ...state.sponsors.base.map((s) => s.name)];
}

function makeMaster(state: GameState, rng: Rng, tier: number, years: number, exclude: string[] = []): Sponsor {
  const [name, sector] = brand(rng, MARCAS_MASTER, exclude);
  const eco = clubEco(state.clubs[state.userClubId]);
  return { name, sector, tier, weekly: roundMoney(masterWeekly(tier, eco) * rng.range(0.92, 1.08)), untilYear: state.year + years - 1, seasons: 0, bonusTitle: 0 };
}

function makeBase(state: GameState, rng: Rng): Sponsor {
  const [name, sector] = brand(rng, MARCAS_BASE, usedNames(state));
  const tier = rng.int(1, 3);
  const eco = clubEco(state.clubs[state.userClubId]);
  return { name, sector, tier, weekly: baseWeekly(tier, eco), untilYear: state.year + 1, seasons: 0, bonusTitle: 0 };
}

/** Patrocínios iniciais do clube do usuário (novo jogo ou novo emprego). */
export function initialSponsors(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  const tier = clamp(Math.round(club.reputation / 20), 1, 5);
  state.sponsors = { master: makeMaster(state, rng, tier, rng.int(2, 3)), base: [] };
  const nBase = club.reputation > 60 ? 2 : 1;
  for (let i = 0; i < nBase; i++) state.sponsors.base.push(makeBase(state, rng));
}

/** Receita semanal. O dinheiro dos patrocinadores da base também conta como investimento na base. */
export function weeklySponsorIncome(state: GameState) {
  const club = state.clubs[state.userClubId];
  const m = state.sponsors.master;
  if (m) logFinance(state, `Patrocínio master: ${m.name}`, m.weekly);
  for (const b of state.sponsors.base) {
    logFinance(state, `Patrocínio da base: ${b.name}`, b.weekly);
    club.baseInvest += b.weekly;
  }
}

export function titleBonus(state: GameState, compName: string) {
  const m = state.sponsors.master;
  if (m && m.bonusTitle > 0) logFinance(state, `Bônus de título (${m.name}): ${compName}`, m.bonusTitle);
}

// ---------------- Desempenho e revisão anual ----------------

export interface SeasonPerformance {
  score: number;
  objetivoCumprido: boolean;
  titulos: number;
  subiu: boolean;
  caiu: boolean;
}

export function performanceLabel(score: number): string {
  if (score >= 3) return 'brilhante';
  if (score >= 2) return 'excelente';
  if (score >= 1) return 'boa';
  if (score >= 0) return 'regular';
  if (score >= -1) return 'ruim';
  return 'péssima';
}

const ARGUMENTOS = [
  (s: Sponsor) => `Estamos juntos há ${Math.max(1, s.seasons)} temporada(s) — fomos parceiros também nos momentos difíceis.`,
  () => 'Nossa marca já está associada à camisa: uma troca agora confunde o torcedor e derruba a venda de uniformes.',
  () => 'Pagamos sempre em dia. A proposta concorrente tem cláusula de desempenho e pode ser reduzida se o time cair de produção.',
  () => 'Além do master, vamos apoiar ações sociais com a torcida e as categorias de base.',
  (_s: Sponsor, novo: string) => `A ${novo} costuma trocar de clube a cada dois anos. Nós queremos uma parceria longa.`,
];

/** Chamado na virada da temporada (antes de avançar o ano). */
export function sponsorReview(state: GameState, rng: Rng, perf: SeasonPerformance) {
  const club = state.clubs[state.userClubId];
  const eco = clubEco(club);
  let m = state.sponsors.master;
  if (m) m.seasons++;

  // Cláusula de desempenho: marca nova corta valor após temporada ruim.
  if (m?.clausula && perf.score <= -1) {
    const novo = roundMoney(m.weekly * 0.7);
    pushMessage(state, 'diretoria', `${m.name} aciona cláusula`,
      `Pela cláusula de desempenho, a ${m.name} reduziu o patrocínio de ${formatMoney(m.weekly)} para ${formatMoney(novo)} por semana.`);
    m.weekly = novo;
  }

  if (!m) {
    state.sponsors.master = makeMaster(state, rng, 1, 2);
    m = state.sponsors.master;
  }
  const expiring = m.untilYear <= state.year;

  if (perf.score >= 2) {
    // Temporada brilhante: uma marca maior aparece e a atual contra-ataca.
    const novoTier = clamp(m.tier + (perf.score >= 3 ? 2 : 1), 1, 5);
    const [nome, setor] = brand(rng, MARCAS_MASTER, usedNames(state));
    const novoWeekly = roundMoney(Math.max(masterWeekly(novoTier, eco), m.weekly * 1.3) * rng.range(1, 1.15));
    const contraWeekly = roundMoney(m.weekly + (novoWeekly - m.weekly) * rng.range(0.55, 0.9));
    const contraBonus = roundMoney(contraWeekly * rng.int(4, 10));
    const args = rng.shuffle(ARGUMENTOS.slice()).slice(0, 3).map((f) => `• ${f(m!, nome)}`).join('\n');
    const nomeIdx = MARCAS_MASTER.findIndex(([n]) => n === nome);
    pushMessage(state, 'diretoria', `Disputa pelo patrocínio master`,
      `Depois de uma temporada ${performanceLabel(perf.score)}, a ${nome} (${setor}) oferece ${formatMoney(novoWeekly)} por semana por 3 anos, com cláusula de desempenho.\n\n` +
      `A ${m.name}, patrocinadora atual (${formatMoney(m.weekly)}/semana), fez uma contraproposta: ${formatMoney(contraWeekly)}/semana por 3 anos + bônus de ${formatMoney(contraBonus)} por título. Argumentos:\n${args}\n\nA decisão é sua, professor.`,
      {
        kind: 'patrocinio-oferta',
        data: { nomeIdx, novoTier, novoWeekly, contraWeekly, contraBonus },
        actions: [
          { id: 'nova', label: `Fechar com a ${nome} (${formatMoney(novoWeekly)}/sem)` },
          { id: 'contra', label: `Aceitar a contraproposta da ${m.name}` },
          { id: 'manter', label: 'Manter o contrato atual como está' },
        ],
      });
  } else if (perf.score <= -2 || (expiring && perf.score <= -1)) {
    // Saída: a marca não renova e uma menor assume.
    const saiu = m.name;
    const novo = makeMaster(state, rng, Math.max(1, m.tier - 1), 2, [saiu]);
    state.sponsors.master = novo;
    pushMessage(state, 'diretoria', `${saiu} deixa o clube`,
      `Após uma temporada ${performanceLabel(perf.score)}, a ${saiu} encerrou o patrocínio. A ${novo.name} (${novo.sector}) assume o master por ${formatMoney(novo.weekly)}/semana.`);
  } else if (perf.score <= -1) {
    const ajuste = roundMoney(m.weekly * 0.75);
    pushMessage(state, 'diretoria', `${m.name} pede ajuste`,
      `A ${m.name} quer reduzir o patrocínio de ${formatMoney(m.weekly)} para ${formatMoney(ajuste)} por semana por causa da temporada ${performanceLabel(perf.score)}. Se recusarmos, ela sai e entra uma marca menor.`,
      {
        kind: 'patrocinio-ajuste', data: { ajuste },
        actions: [{ id: 'aceitar', label: 'Aceitar a redução' }, { id: 'recusar', label: 'Recusar (a marca sai)' }],
      });
  } else if (expiring) {
    const novoValor = roundMoney(m.weekly * (1 + 0.08 * perf.score + 0.03));
    m.weekly = novoValor;
    m.untilYear = state.year + 2;
    pushMessage(state, 'diretoria', `${m.name} renova`, `A ${m.name} renovou o patrocínio master por mais 2 anos: ${formatMoney(novoValor)} por semana.`);
  }

  // Patrocinadores da base.
  const base = state.sponsors.base;
  if (perf.score >= 1 && base.length < 3) {
    const b = makeBase(state, rng);
    base.push(b);
    pushMessage(state, 'diretoria', 'Novo patrocínio na base', `A ${b.name} vai patrocinar as categorias de base: ${formatMoney(b.weekly)}/semana, investidos na formação dos garotos.`);
  } else if (perf.score <= -1 && base.length > 0 && rng.chance(0.6)) {
    const b = base.splice(rng.int(0, base.length - 1), 1)[0];
    pushMessage(state, 'diretoria', 'Patrocinador da base sai', `A ${b.name} encerrou o apoio às categorias de base.`);
  }
  for (const b of base) {
    b.seasons++;
    if (b.untilYear <= state.year) b.untilYear = state.year + 2;
  }
}

export function resolveSponsorMessage(state: GameState, rng: Rng, msgId: number, actionId: string): string {
  const msg = state.messages.find((x) => x.id === msgId);
  if (!msg || msg.resolved || !msg.data) return '';
  msg.resolved = actionId;
  msg.read = true;
  const m = state.sponsors.master;
  if (msg.kind === 'patrocinio-oferta') {
    const d = msg.data;
    if (actionId === 'nova') {
      const [name, sector] = MARCAS_MASTER[d.nomeIdx] ?? MARCAS_MASTER[0];
      const antigo = m?.name;
      state.sponsors.master = { name, sector, tier: d.novoTier, weekly: d.novoWeekly, untilYear: state.year + 2, seasons: 0, bonusTitle: 0, clausula: true };
      return `Acordo fechado com a ${name}! ${antigo ? `A ${antigo} se despede do clube.` : ''}`;
    }
    if (actionId === 'contra' && m) {
      m.weekly = d.contraWeekly;
      m.bonusTitle = d.contraBonus;
      m.untilYear = state.year + 2;
      m.clausula = false;
      return `Contraproposta aceita: a ${m.name} segue na camisa por ${formatMoney(m.weekly)}/semana + bônus por título.`;
    }
    return 'Contrato atual mantido. A patrocinadora agradece a confiança.';
  }
  if (msg.kind === 'patrocinio-ajuste' && m) {
    if (actionId === 'aceitar') {
      m.weekly = msg.data.ajuste;
      return `Redução aceita: a ${m.name} fica por ${formatMoney(m.weekly)}/semana.`;
    }
    const novo = makeMaster(state, rng, Math.max(1, m.tier - 1), 2, [m.name]);
    state.sponsors.master = novo;
    return `A ${m.name} saiu. A ${novo.name} assume o master por ${formatMoney(novo.weekly)}/semana.`;
  }
  return '';
}

// ---------------- Investidores ----------------

/** No início da temporada, grupos podem oferecer dinheiro para CT ou base em troca de parte das vendas. */
export function investorOffer(state: GameState, rng: Rng, lastScore: number) {
  const club = state.clubs[state.userClubId];
  if (club.ct >= 5 && club.baseLevel >= 5) return;
  if (!rng.chance(clamp(0.3 + 0.1 * lastScore + club.reputation / 400, 0.1, 0.8))) return;
  const eco = clamp(clubEco(club), 0.05, 4);
  const kind = club.ct >= 5 ? 1 : club.baseLevel >= 5 ? 0 : rng.int(0, 1);
  const amount = roundMoney(rng.range(8, 20) * 1_000_000 * eco);
  const share = rng.int(5, 15);
  const nameIdx = rng.int(0, INVESTIDORES.length - 1);
  const alvo = kind === 0 ? `modernizar o CT (nível ${club.ct} → ${club.ct + 1})` : `as categorias de base (nível ${club.baseLevel} → ${club.baseLevel + 1}) e o treinamento dos garotos de 15 a 20 anos`;
  pushMessage(state, 'diretoria', `Proposta de investidores: ${INVESTIDORES[nameIdx]}`,
    `O ${INVESTIDORES[nameIdx]} quer aplicar ${formatMoney(amount)} para ${alvo}. Em troca, fica com ${share}% de todas as vendas de jogadores pelas próximas 3 temporadas. Quanto mais investimento na base, maior a chance de surgir uma joia — até um jogador lendário.`,
    {
      kind: 'investidor', data: { kind, amount, share, nameIdx },
      actions: [{ id: 'aceitar', label: 'Aceitar o investimento' }, { id: 'recusar', label: 'Recusar' }],
    });
}

export function resolveInvestor(state: GameState, msgId: number, actionId: string): string {
  const msg = state.messages.find((x) => x.id === msgId);
  if (!msg || msg.resolved || !msg.data) return '';
  msg.resolved = actionId;
  msg.read = true;
  if (actionId !== 'aceitar') return 'Proposta de investimento recusada.';
  const club = state.clubs[state.userClubId];
  const d = msg.data;
  const name = INVESTIDORES[d.nameIdx] ?? INVESTIDORES[0];
  club.investors.push({ name, share: d.share / 100, untilYear: state.year + 2 });
  if (d.kind === 0) {
    club.ct = Math.min(5, club.ct + 1);
    club.baseInvest += d.amount * 0.3;
    return `Investimento aceito! CT agora é nível ${club.ct}.`;
  }
  club.baseLevel = Math.min(5, club.baseLevel + 1);
  club.baseInvest += d.amount;
  return `Investimento aceito! Categorias de base agora são nível ${club.baseLevel}.`;
}

/** Fatia das vendas que vai para investidores ativos (máx. 40%). */
export function investorCut(state: GameState): number {
  const club = state.clubs[state.userClubId];
  club.investors = club.investors.filter((i) => i.untilYear >= state.year);
  return Math.min(0.4, club.investors.reduce((s, i) => s + i.share, 0));
}
