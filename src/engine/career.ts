// Carreira do técnico: história como jogador, passagens por clubes, status de
// ídolo/lenda e as artes de boas-vindas, título e homenagem.

import { COPAS, LIGAS } from './data/ligas';
import { PAISES } from './data/paises';
import { NOMES_ESTADUAIS } from './data/brasil';
import { pushMessage } from './inbox';
import { clamp, type Rng } from './rng';
import type { ArtEvent, CarreiraJogador, Club, Coach, CoachStint, CountryCode, GameState, GrandeMomento, Honra, PlayerCareer, TipoMomento } from './types';

/** Idade a partir da qual o técnico para de envelhecer (e pode seguir quantas temporadas quiser). */
export const IDADE_TETO = 80;

export const PREMIOS_INDIVIDUAIS = [
  'Bola de Ouro', 'Melhor jogador do mundo (FIFA)', 'Chuteira de Ouro', 'Artilheiro de campeonato',
  'Melhor jogador de campeonato', 'Revelação do ano', 'Seleção do campeonato',
];

export function titulosSelecao(nat: CountryCode): string[] {
  const conf = PAISES[nat]?.confed;
  const continental: Record<string, string> = {
    CONMEBOL: 'Copa América', UEFA: 'Eurocopa', CONCACAF: 'Copa Ouro', AFC: 'Copa da Ásia', CAF: 'Copa Africana de Nações', OFC: 'Copa das Nações da OFC',
  };
  return ['Copa do Mundo', continental[conf] ?? 'Copa continental', 'Copa das Confederações', 'Olimpíadas (ouro)', 'Mundial Sub-20'];
}

/** Títulos que um jogador poderia ter ganho por um clube (conforme o país do clube). */
export function clubTitleOptions(club: Club): string[] {
  const out: string[] = [];
  for (const l of LIGAS.filter((x) => x.country === club.country)) {
    for (const t of l.tournaments) out.push(t.name);
  }
  const copa = COPAS.find((c) => c.country === club.country);
  if (copa) out.push(copa.name);
  if (club.country === 'BRA' && club.state) out.push(`Campeonato ${NOMES_ESTADUAIS[club.state] ?? 'Estadual'}`);
  if (club.confed === 'CONMEBOL') out.push('Copa Libertadores', 'Copa Sul-Americana');
  if (club.confed === 'UEFA') out.push('Liga dos Campeões', 'Liga Europa', 'Liga Conferência');
  out.push('Mundial de Clubes');
  return [...new Set(out)];
}

const soma = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + Math.max(0, b), 0);

export function careerTotals(pc?: PlayerCareer): { clube: number; selecao: number; individuais: number; total: number } {
  if (!pc) return { clube: 0, selecao: 0, individuais: 0, total: 0 };
  const clube = pc.clubs.reduce((a, c) => a + soma(c.titles), 0);
  const selecao = soma(pc.national);
  const individuais = soma(pc.individual);
  return { clube, selecao, individuais, total: clube + selecao };
}

/** Bônus de experiência (0-25) vindo da carreira como jogador. */
export function careerExperienceBonus(pc?: PlayerCareer): number {
  if (!pc) return 0;
  const t = careerTotals(pc);
  return Math.min(25, Math.min(10, t.clube) + Math.min(8, t.selecao * 2) + Math.min(6, t.individuais * 2) + (pc.games >= 400 ? 3 : pc.games >= 200 ? 1 : 0));
}

/** Bônus de prestígio (0-20) perante os jogadores. */
export function careerPrestigeBonus(pc?: PlayerCareer): number {
  if (!pc) return 0;
  const t = careerTotals(pc);
  return Math.min(20, t.total * 1.2 + t.individuais * 3);
}

// ---------------- Artes ----------------

export function pushArt(state: GameState, art: ArtEvent) {
  state.pendingArt = [...(state.pendingArt ?? []), art];
}

// ---------------- Grandes momentos ----------------

const MAX_MOMENTOS = 120;
/** Ao passar do limite, saem primeiro os momentos menos marcantes. */
const DESCARTE: TipoMomento[] = ['goleada', 'marco', 'clube'];

export function registrarMomento(state: GameState, m: Omit<GrandeMomento, 'year' | 'clubId' | 'clubName'> & { clubId?: number }) {
  const coach = state.coach;
  const clubId = m.clubId ?? state.userClubId;
  const lista = (coach.momentos ??= []);
  lista.push({ ...m, year: state.year, clubId, clubName: state.clubs[clubId]?.name ?? '' });
  while (lista.length > MAX_MOMENTOS) {
    const tipo = DESCARTE.find((t) => lista.some((x) => x.tipo === t));
    const i = tipo ? lista.findIndex((x) => x.tipo === tipo) : 0;
    lista.splice(i, 1);
  }
}

const MARCOS_JOGOS = [100, 250, 500, 750, 1000, 1500];
const MARCOS_VITORIAS = [100, 250, 500, 750, 1000];

/** Depois de cada jogo: marcas de jogos e vitórias e goleadas históricas. */
export function momentosDoJogo(state: GameState, gf: number, ga: number, adversario: string, compName: string) {
  const c = state.coach;
  if (MARCOS_JOGOS.includes(c.games)) registrarMomento(state, { tipo: 'marco', texto: `${c.games}º jogo como técnico` });
  if (gf > ga && MARCOS_VITORIAS.includes(c.wins)) registrarMomento(state, { tipo: 'marco', texto: `${c.wins}ª vitória como técnico` });
  if (gf - ga >= 4) registrarMomento(state, { tipo: 'goleada', texto: `Goleada de ${gf} x ${ga} sobre o ${adversario} (${compName})` });
}

/** Resumo para a arte de despedida. */
export function resumoCarreira(coach: Coach) {
  const jogos = coach.games;
  const pontos = coach.wins * 3 + coach.draws;
  const historia = coach.history ?? [];
  const inicio = historia[0]?.fromYear;
  const fim = coach.aposentadoEm ?? historia[historia.length - 1]?.toYear;
  return {
    jogos,
    aproveitamento: jogos ? Math.round((pontos / (jogos * 3)) * 100) : 0,
    vitoriasPct: jogos ? Math.round((coach.wins / jogos) * 100) : 0,
    titulos: coach.titles.length,
    clubes: new Set(historia.map((h) => h.clubId)).size,
    temporadas: inicio !== undefined && fim !== undefined ? fim - inicio + 1 : historia.reduce((s, h) => s + h.seasons, 0),
    inicio,
    fim,
    honras: historia.filter((h) => h.honor).length,
  };
}

// ---------------- Passagens por clubes ----------------

export function currentStint(state: GameState): CoachStint | undefined {
  const h = state.coach.history ?? [];
  const last = h[h.length - 1];
  return last && last.toYear === undefined && last.clubId === state.userClubId ? last : undefined;
}

export function honorAt(club: Club, coachName: string): Honra | undefined {
  const l = club.legends?.find((x) => x.coach === coachName);
  return l?.honor;
}

/** Começa (ou recomeça) uma passagem e agenda a arte de boas-vindas. */
export function openStint(state: GameState, clubId: number) {
  const coach = state.coach;
  const club = state.clubs[clubId];
  coach.history = coach.history ?? [];
  const estreia = coach.history.length === 0;
  coach.history.push({ clubId, clubName: club.name, fromYear: state.year, seasons: 0, games: 0, wins: 0, titles: [] });
  registrarMomento(state, { clubId, tipo: estreia ? 'estreia' : 'clube', texto: estreia ? `Estreia como técnico no ${club.name}` : `Assume o comando do ${club.name}` });
  const honor = honorAt(club, coach.name);
  if (honor) {
    // O retorno de um ídolo: torcida e elenco recebem de braços abertos.
    coach.confTorcida = clamp(coach.confTorcida + (honor === 'lenda' ? 35 : 20), 0, 100);
    coach.confDiretoria = clamp(coach.confDiretoria + (honor === 'lenda' ? 15 : 8), 0, 100);
    for (const id of club.playerIds) state.players[id].respeito = clamp(state.players[id].respeito + (honor === 'lenda' ? 15 : 8), 0, 100);
    pushMessage(state, 'torcida', honor === 'lenda' ? 'A LENDA VOLTOU!' : 'O ídolo está de volta',
      `${coach.name} está de volta ao ${club.name}! A arquibancada nunca esqueceu o que você fez por este clube.`);
  }
  if (!honor && idoloComoJogador(coach, club)) {
    // Ídolo dos tempos de jogador: a torcida recebe de braços abertos.
    coach.confTorcida = clamp(coach.confTorcida + 15, 0, 100);
    for (const id of club.playerIds) state.players[id].respeito = clamp(state.players[id].respeito + 6, 0, 100);
    pushMessage(state, 'torcida', 'Nosso ídolo agora é o técnico!',
      `${coach.name} fez história com a camisa do ${club.name} como jogador. Agora volta para comandar o time da beira do campo!`);
  }
  pushArt(state, { type: 'welcome', clubId, coach: coach.name, year: state.year, honor });
}

export function closeStint(state: GameState) {
  const s = currentStint(state);
  if (s) s.toYear = state.year;
}

export function stintMatch(state: GameState, win: boolean) {
  const s = currentStint(state);
  if (!s) return;
  s.games++;
  if (win) s.wins++;
}

export function stintTitle(state: GameState, title: string) {
  currentStint(state)?.titles.push(title);
}

/**
 * Fim de temporada: conta a temporada no clube e concede status de ídolo ou
 * lenda. A honraria fica registrada no clube mesmo que o técnico saia.
 */
export function stintSeasonEnd(state: GameState): Honra | undefined {
  const s = currentStint(state);
  if (!s) return undefined;
  s.seasons++;
  const t = s.titles.length;
  const novo: Honra | undefined = s.seasons >= 8 || (s.seasons >= 5 && t >= 3) ? 'lenda'
    : s.seasons >= 5 || (s.seasons >= 2 && t >= 3) ? 'idolo' : undefined;
  if (!novo || s.honor === novo || (s.honor === 'lenda' && novo === 'idolo')) return undefined;
  s.honor = novo;
  const club = state.clubs[s.clubId];
  const coach = state.coach;
  club.legends = (club.legends ?? []).filter((l) => l.coach !== coach.name);
  club.legends.push({ coach: coach.name, honor: novo, seasons: s.seasons, titles: t, until: state.year });
  coach.confTorcida = clamp(coach.confTorcida + 10, 0, 100);
  const nome = novo === 'lenda' ? 'LENDA' : 'ÍDOLO';
  pushMessage(state, 'torcida', `${coach.name}, ${nome} do ${club.name}!`,
    `${s.seasons} temporadas e ${t} título(s). A torcida declara: você é ${novo === 'lenda' ? 'uma lenda eterna' : 'um ídolo'} deste clube. Seu nome vai estar para sempre no nosso hino de arquibancada.`);
  pushMessage(state, 'midia', `${coach.name} entra para a história`,
    `Com ${s.seasons} temporadas no comando do ${club.name}, ${coach.name} recebe o status de ${novo === 'lenda' ? 'lenda' : 'ídolo'} do clube.`);
  pushMessage(state, 'diretoria', 'Homenagem oficial',
    `A diretoria aprovou uma homenagem permanente: ${coach.name} passa a constar na galeria de ${novo === 'lenda' ? 'lendas' : 'ídolos'} do ${club.name}, mesmo que um dia deixe o clube.`);
  pushArt(state, { type: 'legend', clubId: s.clubId, coach: coach.name, year: state.year, honor: novo, seasons: s.seasons, titles: t });
  registrarMomento(state, { clubId: s.clubId, tipo: 'honra', texto: `Declarado ${novo === 'lenda' ? 'LENDA' : 'ídolo'} do ${club.name} (${s.seasons} temporadas, ${t} título${t === 1 ? '' : 's'})` });
  return novo;
}

// ---------------- Sorteio da história como jogador ----------------

export const SORTEIOS_HISTORIA = 5;

const POSICOES_JOGADOR: [string, number, number, number][] = [
  // posição, peso, gols por jogo, assistências por jogo (jogador "bom")
  ['Goleiro', 8, 0.002, 0.004], ['Zagueiro', 18, 0.06, 0.03], ['Lateral', 14, 0.05, 0.12],
  ['Volante', 14, 0.06, 0.08], ['Meia', 22, 0.2, 0.25], ['Atacante', 24, 0.45, 0.15],
];

const NIVEIS: { id: NonNullable<PlayerCareer['nivel']>; peso: number; q: number; mult: number }[] = [
  { id: 'comum', peso: 45, q: 0, mult: 0.7 },
  { id: 'bom', peso: 35, q: 1, mult: 1 },
  { id: 'craque', peso: 14, q: 2, mult: 1.3 },
  { id: 'lenda', peso: 6, q: 3, mult: 1.6 },
];

export const NIVEL_LABEL: Record<NonNullable<PlayerCareer['nivel']>, string> = {
  comum: 'Jogador comum', bom: 'Bom jogador', craque: 'Craque', lenda: 'Lenda do futebol',
};

type TipoTitulo = 'liga' | 'copa' | 'estadual' | 'continental' | 'continental2' | 'mundial';

function tipoTitulo(nome: string): TipoTitulo {
  if (nome === 'Mundial de Clubes') return 'mundial';
  if (/Libertadores|Liga dos Campeões/.test(nome)) return 'continental';
  if (/Sul-Americana|Liga Europa|Conferência|Concacaf/.test(nome)) return 'continental2';
  if (nome.startsWith('Campeonato ') && !/Brasileiro/.test(nome)) return 'estadual';
  if (/Copa|Taça|Open Cup|Championship|Pokal/.test(nome)) return 'copa';
  return 'liga';
}

/**
 * Sorteia a carreira de jogador do técnico: posição, nível, clubes (do Brasil
 * ou do exterior; 30% de chance de cada clube ser de nível mundial), números,
 * títulos por clube, passagem pela seleção e prêmios.
 */
export function sortearCarreira(
  clubs: Club[], nat: CountryCode, tipo: CarreiraJogador, idadeTecnico: number, rng: Rng, prestigio: (c: Club) => number,
): PlayerCareer {
  const [posicao, , golsBase, assistBase] = rng.weighted(POSICOES_JOGADOR, (x) => x[1]);
  const nivel = rng.weighted(NIVEIS, (n) => n.peso);
  const anoAtual = 2026;
  const inicio = anoAtual - idadeTecnico + rng.int(17, 19);
  const fim = Math.min(anoAtual - 1, inicio + rng.int(13, 20) + (nivel.q >= 2 ? rng.int(0, 3) : 0));
  const anos = Math.max(4, fim - inicio + 1);

  // Clubes: um só ou de 2 a 6; anos repartidos ao acaso.
  const nClubes = tipo === 'umClube' ? 1 : Math.min(anos, rng.int(2, 6));
  const cortes = new Set<number>();
  while (cortes.size < nClubes - 1) cortes.add(rng.int(1, anos - 1));
  const marcos = [0, ...[...cortes].sort((a, b) => a - b), anos];

  const candidatos = clubs.filter((c) => c.tier >= 0 && c.tier <= 3 && c.playerIds.length > 0);
  const mundiais = candidatos.filter((c) => prestigio(c) >= 4);
  const usados = new Set<number>();
  const escolherClube = (): Club => {
    let pool: Club[];
    if (mundiais.length && rng.chance(0.3)) pool = mundiais;
    else {
      const emCasa = candidatos.filter((c) => c.country === nat);
      pool = emCasa.length && rng.chance(0.55) ? emCasa : candidatos.filter((c) => c.country !== nat);
      // Craques jogam em clubes fortes; jogadores comuns, em qualquer um.
      pool = pool.filter((c) => (nivel.q >= 2 ? c.tier <= 1 : nivel.q === 1 ? c.tier <= 2 : true));
    }
    pool = pool.filter((c) => !usados.has(c.id));
    if (!pool.length) pool = candidatos.filter((c) => !usados.has(c.id));
    const c = rng.weighted(pool, (x) => Math.pow(Math.max(5, x.baseForce) / 50, 1 + nivel.q));
    usados.add(c.id);
    return c;
  };

  const pc: PlayerCareer = { games: 0, goals: 0, assists: 0, clubs: [], national: {}, individual: {}, posicao, nivel: nivel.id };
  for (let i = 0; i < nClubes; i++) {
    const club = escolherClube();
    const a0 = inicio + marcos[i];
    const a1 = inicio + marcos[i + 1] - 1;
    const temporadas = a1 - a0 + 1;
    const jogos = Math.round(temporadas * rng.int(22, 46) * rng.range(0.7, 1));
    const gols = Math.round(jogos * golsBase * nivel.mult * rng.range(0.6, 1.3));
    const assistencias = Math.round(jogos * assistBase * nivel.mult * rng.range(0.6, 1.3));
    const forca = clamp(club.baseForce / 100, 0.1, 1.2);
    const pres = prestigio(club);
    const titles: Record<string, number> = {};
    let conquistas = 0;
    // Divisão do título: grandes clubes nunca caem para a Série C/D (no máximo,
    // um raro título da Série B, como Palmeiras 2003 e Corinthians 2008);
    // os demais oscilam entre a própria divisão e as vizinhas.
    const gigante = pres >= 3 || (club.tier === 1 && club.reputation >= 80);
    const divisao = new Map<string, number>();
    for (const l of LIGAS.filter((x) => x.country === club.country)) for (const tt of l.tournaments) divisao.set(tt.name, l.tier);
    const pesoDivisao = (nome: string): number => {
      const tier = divisao.get(nome);
      if (tier === undefined) return 1;
      const atual = club.tier >= 1 && club.tier <= 4 ? club.tier : 1;
      if (gigante) return tier === 1 ? 1 : tier === 2 ? 0.12 : 0;
      if (tier === atual) return 1;
      return Math.abs(tier - atual) === 1 ? 0.3 : 0;
    };
    for (let t = 0; t < temporadas; t++) {
      for (const nome of clubTitleOptions(club)) {
        const tipoT = tipoTitulo(nome);
        const peso = pesoDivisao(nome);
        if (peso === 0) continue;
        let p = 0;
        if (tipoT === 'liga') p = 0.04 + 0.18 * forca + 0.03 * nivel.q;
        else if (tipoT === 'copa') p = 0.03 + 0.1 * forca + 0.02 * nivel.q;
        else if (tipoT === 'estadual') p = 0.08 + 0.2 * forca;
        // Títulos internacionais são raros para jogadores comuns.
        else if (tipoT === 'continental') p = (pres >= 3 ? 0.02 + 0.03 * nivel.q : 0.005) * [0.4, 1, 1.3, 1.6][nivel.q];
        else if (tipoT === 'continental2') p = (pres >= 2 ? 0.03 + 0.02 * nivel.q : 0.01) * [0.4, 1, 1.3, 1.6][nivel.q];
        else if (tipoT === 'mundial') p = (pres >= 4 ? 0.01 + 0.015 * nivel.q : 0) * [0.3, 1, 1.3, 1.6][nivel.q];
        // Ligas com dois torneios (Apertura/Clausura) dividem a chance.
        if (/Apertura|Clausura|Torneo/.test(nome)) p *= 0.6;
        p *= peso;
        if (rng.chance(p)) {
          titles[nome] = (titles[nome] ?? 0) + 1;
          conquistas++;
        }
      }
    }
    const lenda = temporadas >= 5 && (conquistas >= 3 || gols >= 100 || (nivel.q >= 2 && rng.chance(0.5)) || rng.chance(0.15));
    pc.clubs.push({ name: club.name, clubId: club.id, country: club.country, titles, anos: [a0, a1], jogos, gols, assistencias, lenda: lenda || undefined });
    pc.games += jogos;
    pc.goals += gols;
    pc.assists += assistencias;
  }

  // Seleção.
  const chamado = [0.08, 0.35, 0.8, 1][nivel.q];
  if (rng.chance(chamado)) {
    const faixa: [number, number][] = [[1, 8], [5, 40], [30, 95], [70, 150]];
    const jogos = rng.int(...faixa[nivel.q]);
    const gols = Math.round(jogos * golsBase * nivel.mult * 0.7 * rng.range(0.5, 1.3));
    const assistencias = Math.round(jogos * assistBase * nivel.mult * 0.7 * rng.range(0.5, 1.3));
    const peso = nat === 'BRA' ? 1.5 : nat === 'ARG' || nat === 'GER' || nat === 'FRA' || nat === 'ESP' || nat === 'ITA' ? 1.3 : 0.6;
    const [copa, continental, confed, olimpiada, sub20] = titulosSelecao(nat);
    const chance: [string, number, number][] = [
      [copa, [0, 0.03, 0.15, 0.35][nivel.q] * peso, 1],
      [continental, [0.02, 0.15, 0.4, 0.6][nivel.q] * peso, 3],
      [confed, [0, 0.08, 0.2, 0.3][nivel.q] * peso, 2],
      [olimpiada, [0, 0.04, 0.1, 0.15][nivel.q] * peso, 1],
      [sub20, [0.02, 0.1, 0.2, 0.25][nivel.q] * peso, 1],
    ];
    for (const [nome, p, max] of chance) {
      if (rng.chance(Math.min(0.9, p))) pc.national[nome] = rng.int(1, max);
    }
    const lenda = nivel.q === 3 || (jogos >= 60 && (gols >= 30 || !!pc.national[copa]));
    pc.selecao = { jogos, gols, assistencias, lenda: lenda || undefined };
  }

  // Prêmios individuais.
  const premios: [string, number[]][] = [
    ['Bola de Ouro', [0, 0, 0.03, 0.3]],
    ['Melhor jogador do mundo (FIFA)', [0, 0, 0.03, 0.3]],
    ['Chuteira de Ouro', [0, 0, posicao === 'Atacante' ? 0.08 : 0, posicao === 'Atacante' ? 0.3 : 0]],
    ['Artilheiro de campeonato', [0.01, 0.08, 0.3, 0.6].map((x) => (posicao === 'Atacante' || posicao === 'Meia' ? x : x * 0.1))],
    ['Melhor jogador de campeonato', [0.01, 0.06, 0.3, 0.6]],
    ['Revelação do ano', [0.03, 0.12, 0.3, 0.5]],
    ['Seleção do campeonato', [0.05, 0.3, 0.7, 0.9]],
  ];
  for (const [nome, ps] of premios) {
    if (rng.chance(ps[nivel.q])) pc.individual[nome] = rng.int(1, nivel.q >= 2 ? 3 : 1);
  }
  return pc;
}

/** O técnico foi ídolo deste clube como jogador? */
export function idoloComoJogador(coach: { playerCareer?: PlayerCareer }, club: Club): boolean {
  return !!coach.playerCareer?.clubs.some((c) => c.lenda && c.name === club.name && (!c.country || c.country === club.country));
}
