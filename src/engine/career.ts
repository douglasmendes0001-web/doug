// Carreira do técnico: história como jogador, passagens por clubes, status de
// ídolo/lenda e as artes de boas-vindas, título e homenagem.

import { COPAS, LIGAS } from './data/ligas';
import { PAISES } from './data/paises';
import { NOMES_ESTADUAIS } from './data/brasil';
import { pushMessage } from './inbox';
import { clamp } from './rng';
import type { ArtEvent, Club, CoachStint, CountryCode, GameState, Honra, PlayerCareer } from './types';

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
  coach.history.push({ clubId, clubName: club.name, fromYear: state.year, seasons: 0, games: 0, wins: 0, titles: [] });
  const honor = honorAt(club, coach.name);
  if (honor) {
    // O retorno de um ídolo: torcida e elenco recebem de braços abertos.
    coach.confTorcida = clamp(coach.confTorcida + (honor === 'lenda' ? 35 : 20), 0, 100);
    coach.confDiretoria = clamp(coach.confDiretoria + (honor === 'lenda' ? 15 : 8), 0, 100);
    for (const id of club.playerIds) state.players[id].respeito = clamp(state.players[id].respeito + (honor === 'lenda' ? 15 : 8), 0, 100);
    pushMessage(state, 'torcida', honor === 'lenda' ? 'A LENDA VOLTOU!' : 'O ídolo está de volta',
      `${coach.name} está de volta ao ${club.name}! A arquibancada nunca esqueceu o que você fez por este clube.`);
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
  return novo;
}
