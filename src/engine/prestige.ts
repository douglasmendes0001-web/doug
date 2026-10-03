// Prestígio internacional do clube: a história real (títulos mundiais e
// internacionais, campanhas e ídolos lendários) mais o que foi conquistado na
// carreira. Clubes sem projeção internacional não atraem os craques (5★+) das
// cinco grandes ligas europeias.

import { HISTORIA, PRESTIGIO_LABEL, nivelHistorico, type HistoriaClube, type Prestigio } from './data/historia';
import type { Club, CountryCode, GameState, Player } from './types';

export { PRESTIGIO_LABEL, type Prestigio };

/** As cinco grandes ligas europeias. */
export const BIG5: CountryCode[] = ['ENG', 'ESP', 'GER', 'ITA', 'FRA'];

/** Prestígio mínimo para contratar um 5★+ das 5 grandes ligas. */
export const PRESTIGIO_MINIMO_CRAQUE: Prestigio = 3;

const MUNDIAIS = new Set(['MUN']);
const INTERNACIONAIS = new Set(['LIB', 'SUD', 'UCL', 'UEL', 'UECL', 'CCC', 'LCUP']);

export function historiaDe(club: Club): HistoriaClube | undefined {
  return HISTORIA[`${club.country}:${club.name}`];
}

/** Prestígio dos clubes sem ficha histórica (europeus genéricos, ligas menores). */
function nivelBase(club: Club): Prestigio {
  if (club.confed === 'UEFA' && club.tier === 1) {
    if (BIG5.includes(club.country)) return club.reputation >= 80 ? 4 : club.reputation >= 55 ? 3 : 2;
    return club.reputation >= 85 ? 3 : 2;
  }
  if (club.tier === 0) return club.confed === 'AFC' || club.confed === 'CAF' ? 2 : 1;
  if (club.tier === 1) return club.reputation >= 85 ? 2 : 1;
  return club.tier >= 3 ? 0 : 1;
}

/** Títulos internacionais/mundiais ganhos durante a carreira (todos os clubes). */
export function titulosNaCarreira(state: GameState, clubId: number): { mundiais: number; internacionais: number } {
  let mundiais = 0;
  let internacionais = 0;
  const conta = (compId: string) => {
    if (MUNDIAIS.has(compId)) mundiais++;
    else if (INTERNACIONAIS.has(compId)) internacionais++;
  };
  for (const h of state.history) for (const [id, champ] of Object.entries(h.champions)) if (champ === clubId) conta(id);
  for (const c of state.competitions) if (c.finished && c.champion === clubId && !state.history.some((h) => h.year === c.season)) conta(c.def.id);
  return { mundiais, internacionais };
}

/** Prestígio só pela história real (antes da carreira). */
export function prestigioHistorico(club: Club): Prestigio {
  const hist = nivelHistorico(historiaDe(club));
  return (hist === undefined ? nivelBase(club) : Math.max(hist, nivelBase(club))) as Prestigio;
}

export function clubPrestige(state: GameState, club: Club): Prestigio {
  let nivel = prestigioHistorico(club);
  const t = titulosNaCarreira(state, club.id);
  if (t.mundiais > 0) nivel = 4;
  else if (t.internacionais > 0) nivel = Math.max(nivel, 3) as Prestigio;
  return nivel;
}

/** Craque das 5 grandes ligas (5★ ou mais, num clube da elite de ENG/ESP/GER/ITA/FRA). */
export function craqueBig5(state: GameState, p: Player): boolean {
  const club = state.clubs[p.clubId];
  return !!club && p.stars >= 5 && club.tier === 1 && BIG5.includes(club.country);
}

/** Motivo da recusa (ou null se o clube comprador tem projeção suficiente). */
export function recusaPorPrestigio(state: GameState, buyer: Club, p: Player): string | null {
  if (!craqueBig5(state, p)) return null;
  const nivel = clubPrestige(state, buyer);
  if (nivel >= PRESTIGIO_MINIMO_CRAQUE) return null;
  return `${p.name} (${p.stars}★) não troca a elite europeia por um clube sem projeção internacional. ` +
    `O ${buyer.name} tem reputação ${PRESTIGIO_LABEL[nivel].toLowerCase()}; é preciso ser ${PRESTIGIO_LABEL[3].toLowerCase()} ou ${PRESTIGIO_LABEL[4].toLowerCase()} ` +
    '(títulos internacionais ou mundiais, campanhas lendárias ou ídolos que marcaram época).';
}
