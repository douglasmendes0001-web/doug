// Caixas de mensagens: diretoria, torcida organizada, mídia e jogadores.
// As mensagens reagem aos resultados, à fase do time e ao relacionamento do
// técnico com o elenco. Mensagens de jogadores trazem ações de resposta.

import { prestige } from './coach';
import { clamp, type Rng } from './rng';
import type { CanalMensagem, GameState, Message, MessageAction, Player } from './types';

export function pushMessage(
  state: GameState,
  channel: CanalMensagem,
  title: string,
  body: string,
  extra: Partial<Pick<Message, 'playerId' | 'kind' | 'actions' | 'data'>> = {},
): Message {
  const m: Message = { id: state.nextIds.message++, slot: state.slot, channel, title, body, read: false, ...extra };
  state.messages.unshift(m);
  if (state.messages.length > 250) state.messages.length = 250;
  return m;
}

export function unreadCount(state: GameState, channel?: CanalMensagem): number {
  return state.messages.filter((m) => !m.read && (!channel || m.channel === channel)).length;
}

const pick = <T>(rng: Rng, arr: T[]) => rng.pick(arr);

export interface MatchSummary {
  goalsFor: number;
  goalsAgainst: number;
  opponent: string;
  home: boolean;
  compName: string;
  expectedPts: number;
  streak: number;
  topScorer?: Player;
  decisive: boolean;
  eliminated?: boolean;
  advanced?: boolean;
}

/** Mensagens da torcida, mídia e diretoria após um jogo do usuário. */
export function afterUserMatchMessages(state: GameState, rng: Rng, s: MatchSummary) {
  const club = state.clubs[state.userClubId];
  const coach = state.coach;
  const diff = s.goalsFor - s.goalsAgainst;
  const placar = `${s.goalsFor} x ${s.goalsAgainst}`;
  const pts = diff > 0 ? 3 : diff === 0 ? 1 : 0;
  const surpresa = pts - s.expectedPts;

  // ---- Torcida organizada ----
  if (diff >= 3) {
    pushMessage(state, 'torcida', pick(rng, ['Goleada é o nosso nome!', 'Que noite!', 'Atropelo!']),
      pick(rng, [
        `A arquibancada não para de cantar depois do ${placar} sobre o ${s.opponent}. Assim que se joga com essa camisa!`,
        `${placar} no ${s.opponent}! A organizada está com você, professor. Continua assim!`,
      ]));
  } else if (s.streak >= 3) {
    pushMessage(state, 'torcida', 'Sequência de vitórias',
      `${s.streak} vitórias seguidas! A torcida já fala em título. Não deixa o time relaxar, ${coach.name}.`);
  } else if (s.streak <= -3) {
    pushMessage(state, 'torcida', pick(rng, ['Basta!', 'Protesto no CT', 'Paciência esgotada']),
      pick(rng, [
        `${-s.streak} jogos sem vencer. A organizada vai protestar no próximo treino. Queremos raça!`,
        `Faixas no CT: "Fora, ${coach.name}!" A paciência da torcida acabou depois de ${-s.streak} jogos sem vitória.`,
      ]));
  } else if (diff <= -3) {
    pushMessage(state, 'torcida', 'Vergonha', `Tomar ${placar} do ${s.opponent} é inaceitável. Exigimos explicações do técnico e dos jogadores!`);
  } else if (s.eliminated) {
    pushMessage(state, 'torcida', 'Eliminação dolorosa', `Cair na ${s.compName} desse jeito dói. A torcida cobra mais entrega nos jogos grandes.`);
  } else if (s.advanced) {
    pushMessage(state, 'torcida', 'Classificados!', `Passamos de fase na ${s.compName}! A organizada promete casa cheia no próximo jogo.`);
  } else if (rng.chance(0.25)) {
    if (pts === 3) pushMessage(state, 'torcida', 'Vitória!', `Boa vitória contra o ${s.opponent}. Isso, professor!`);
    else if (pts === 0) pushMessage(state, 'torcida', 'Cobrança', `Perder para o ${s.opponent} não dá. A organizada quer ver o time brigando mais.`);
  }

  // ---- Mídia ----
  const young = coach.age < 30;
  if (surpresa >= 1.5 && pts === 3) {
    pushMessage(state, 'midia', young ? `Jovem técnico surpreende` : `Zebra!`,
      young
        ? `Aos ${coach.age} anos, ${coach.name} vence o ${s.opponent} (${placar}) e começa a calar os críticos.`
        : `${club.name} vence o favorito ${s.opponent} por ${placar}. ${coach.name} armou bem o time.`);
  } else if (surpresa <= -1.5 && pts === 0) {
    pushMessage(state, 'midia', 'Vexame', young
      ? `${club.name} perde para o ${s.opponent}. Comentaristas questionam: ${coach.name}, de ${coach.age} anos, está pronto para o cargo?`
      : `${club.name} decepciona e perde para o ${s.opponent} por ${placar}. A pressão sobre ${coach.name} aumenta.`);
  } else if (s.topScorer && s.topScorer.seasonGoals >= 5 && rng.chance(0.2)) {
    pushMessage(state, 'midia', `${s.topScorer.name} em alta`,
      `${s.topScorer.name} já soma ${s.topScorer.seasonGoals} gols na temporada e vira o nome do ${club.name}.`);
  } else if (s.streak <= -4 && rng.chance(0.6)) {
    pushMessage(state, 'midia', 'Crise', `Bastidores: diretoria do ${club.name} já discute o futuro de ${coach.name}.`);
  } else if (rng.chance(0.15)) {
    pushMessage(state, 'midia', `${s.compName}: ${club.short} ${placar} ${s.opponent}`,
      pts === 3 ? `Resultado positivo para o ${club.name}, que segue na briga.` : pts === 1 ? `Empate morno para o ${club.name}.` : `Tropeço do ${club.name}.`);
  }
}

/** Diretoria reage quando a confiança cruza faixas importantes. */
export function confidenceMessages(state: GameState, before: number, after: number) {
  const c = state.coach;
  if (before >= 40 && after < 40) {
    pushMessage(state, 'diretoria', 'Resultados abaixo do esperado',
      `Professor ${c.name}, a diretoria está preocupada. Precisamos de reação imediata. Objetivo: ${state.seasonObjective ?? 'melhorar'}.`);
  } else if (before >= 20 && after < 20) {
    pushMessage(state, 'diretoria', 'Último aviso',
      `Seu cargo está em risco. Sem vitórias nos próximos jogos, a diretoria vai buscar outro técnico.`);
  } else if (before < 75 && after >= 75) {
    pushMessage(state, 'diretoria', 'Trabalho reconhecido',
      `A diretoria está satisfeita com o trabalho. Continue assim — você tem total respaldo.`);
  }
}

// ---------------- Pedidos dos jogadores ----------------

const ACOES_JOGAR: MessageAction[] = [
  { id: 'prometer', label: 'Prometer chance nos próximos 2 jogos' },
  { id: 'paciencia', label: 'Pedir paciência' },
  { id: 'vender', label: 'Colocar à venda' },
];
const ACOES_DESCANSO: MessageAction[] = [
  { id: 'poupar', label: 'Poupar no próximo jogo' },
  { id: 'esforco', label: 'Pedir esforço: o time precisa de você' },
];
const ACOES_INSATISFEITO: MessageAction[] = [
  { id: 'conversar', label: 'Conversar em particular' },
  { id: 'ignorar', label: 'Ignorar' },
];

function hasOpenRequest(state: GameState, playerId: number): boolean {
  return state.messages.some((m) => m.playerId === playerId && m.channel === 'jogador' && !m.resolved && m.actions);
}

/** Uma vez por semana, jogadores podem pedir para jogar, descansar ou reclamar. */
export function weeklyPlayerRequests(state: GameState, rng: Rng) {
  const club = state.clubs[state.userClubId];
  const squad = club.playerIds.map((id) => state.players[id]).filter((p) => !p.retired);
  const forces = squad.map((p) => p.force).sort((a, b) => b - a);
  const median = forces[Math.floor(forces.length / 2)] ?? 0;
  let sent = 0;
  for (const p of rng.shuffle(squad.slice())) {
    if (sent >= 2) break;
    if (hasOpenRequest(state, p.id) || p.injuredSlots > 0) continue;
    const ambitious = p.personality === 'ambicioso' || p.personality === 'lider' || p.personality === 'temperamental';
    if (p.benchStreak >= 3 && p.force >= median && rng.chance(ambitious ? 0.5 : 0.2)) {
      pushMessage(state, 'jogador', `${p.name} quer jogar`,
        p.age >= 30
          ? `Professor, tenho ${p.age} anos e muita história no futebol. Não vim aqui para ficar no banco. Quero minha chance.`
          : `Professor, estou treinando forte e me sinto pronto. Fico ${p.benchStreak} jogos sem entrar... Quero uma oportunidade.`,
        { playerId: p.id, kind: 'pedido-jogar', actions: ACOES_JOGAR });
      sent++;
    } else if (p.energy < 50 && p.age >= 29 && rng.chance(0.35)) {
      pushMessage(state, 'jogador', `${p.name} pede descanso`,
        `Professor, estou no limite físico. Se puder, prefiro ficar no banco no próximo jogo para me recuperar.`,
        { playerId: p.id, kind: 'pedido-banco', actions: ACOES_DESCANSO });
      sent++;
    } else if (p.respeito < 28 && rng.chance(0.2)) {
      pushMessage(state, 'jogador', `${p.name} está insatisfeito`,
        p.age - state.coach.age >= 8
          ? `Com todo respeito, professor... eu já jogava profissionalmente quando você ainda estava na escola. Não concordo com a forma como o grupo está sendo conduzido.`
          : `Não estou feliz com a forma como venho sendo tratado. Preciso de uma conversa.`,
        { playerId: p.id, kind: 'insatisfeito', actions: ACOES_INSATISFEITO });
      sent++;
    }
  }
}

/** Aplica a resposta do técnico a uma mensagem. Retorna um texto de retorno. */
export function respondMessage(state: GameState, rng: Rng, msgId: number, actionId: string): string {
  const m = state.messages.find((x) => x.id === msgId);
  if (!m || m.resolved) return '';
  m.read = true;
  const p = m.playerId !== undefined ? state.players[m.playerId] : undefined;
  let feedback = '';
  const adj = (delta: number) => {
    if (p) p.respeito = clamp(p.respeito + delta, 0, 100);
  };
  switch (`${m.kind}:${actionId}`) {
    case 'pedido-jogar:prometer':
      if (p) p.promiseUntilSlot = state.slot + 6;
      adj(6);
      feedback = `${p?.name} ficou animado com a promessa. Cumpra: ele precisa entrar em campo logo.`;
      break;
    case 'pedido-jogar:paciencia': {
      const calmo = p?.personality === 'tranquilo' || p?.personality === 'profissional';
      adj(calmo ? -1 : -5);
      feedback = calmo ? `${p?.name} entendeu e vai continuar trabalhando.` : `${p?.name} não gostou da resposta.`;
      break;
    }
    case 'pedido-jogar:vender':
      if (p) p.forSale = true;
      adj(-8);
      feedback = `${p?.name} foi colocado à venda. O clima com ele azedou.`;
      break;
    case 'pedido-banco:poupar':
      if (p) {
        p.energy = Math.min(100, p.energy + 12);
        state.lineup.starters = state.lineup.starters.filter((id) => id !== p.id);
      }
      adj(4);
      feedback = `${p?.name} agradeceu e foi tirado do time titular para descansar.`;
      break;
    case 'pedido-banco:esforco':
      adj(p?.personality === 'lider' || p?.personality === 'profissional' ? 1 : -3);
      feedback = `${p?.name} vai jogar mesmo cansado. Atenção ao risco de lesão.`;
      break;
    case 'insatisfeito:conversar': {
      const chance = 0.35 + prestige(state.coach) / 200;
      if (rng.chance(chance)) {
        adj(12);
        feedback = `A conversa foi boa. ${p?.name} passou a confiar mais em você.`;
      } else {
        adj(-4);
        feedback = `A conversa não andou. ${p?.name} continua resistente — vitórias podem mudar isso.`;
      }
      break;
    }
    case 'insatisfeito:ignorar':
      adj(-6);
      feedback = `${p?.name} se sentiu ignorado e o clima piorou.`;
      break;
    case 'proposta:aceitar':
    case 'proposta:recusar':
      // Tratadas pelo mercado.
      break;
  }
  m.resolved = actionId;
  return feedback;
}

export function seasonStartMessages(state: GameState) {
  const club = state.clubs[state.userClubId];
  const c = state.coach;
  pushMessage(state, 'diretoria', `Temporada ${state.year}`,
    `Bem-vindo à temporada ${state.year}, ${c.name}. Objetivo da diretoria: ${state.seasonObjective}. ` +
    `Orçamento disponível: ${formatMoney(club.money)}.`);
  if (state.coach.games === 0) {
    const young = c.age < 30;
    pushMessage(state, 'midia', young ? 'Aposta ousada' : 'Novo comando',
      young
        ? `Com apenas ${c.age} anos, ${c.name} é anunciado como técnico do ${club.name}. Especialistas dividem opiniões: ousadia ou imprudência?`
        : `${club.name} apresenta ${c.name}, ${c.age} anos${c.exPlayer ? ', ex-jogador' : ''}${c.titulosCarreira ? ' com carreira vitoriosa' : ''}.`);
    pushMessage(state, 'torcida', 'Recado da organizada',
      `Seja bem-vindo, ${c.name}. Aqui a cobrança é grande: queremos time aguerrido e respeito à camisa.`);
    const squad = club.playerIds.map((id) => state.players[id]);
    const desconfiados = squad.filter((p) => p.respeito < 35);
    if (desconfiados.length >= 3) {
      const nomes = desconfiados.sort((a, b) => b.age - a.age).slice(0, 3).map((p) => `${p.name} (${p.age})`).join(', ');
      pushMessage(state, 'jogador', 'Vestiário desconfiado',
        `Os mais experientes do elenco — ${nomes} — ainda não confiam no novo técnico. Vitórias, oportunidades e boas conversas vão mudar isso.`);
    }
  }
}

import { formatMoney } from './money';
export { formatMoney };
