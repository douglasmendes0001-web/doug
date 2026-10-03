// Modo editor: alterações livres no banco de dados (clubes e jogadores) que
// serão usadas nas próximas carreiras. Funções puras sobre um `World`.

import { ESTILOS_POR_POS, type EstiloId } from './data/estilos';
import { HABILIDADES } from './data/habilidades';
import { abilityCount, createPlayer, marketValue, monthlySalary, syncAbilities } from './players';
import { Rng, clamp } from './rng';
import type { Club, CountryCode, Pe, Player, Pos } from './types';
import type { World } from './world';

export const EDITOR_SEED = 20260101;
export const IDADE_NOVO_JOGADOR = 15;

function recalcValue(p: Player, country?: CountryCode) {
  p.value = marketValue(p.force, p.age, p.stars, p.potential, country);
  p.salary = monthlySalary(p.value, country);
}

export interface PlayerEdit {
  name?: string;
  nat?: CountryCode;
  age?: number;
  force?: number;
  potential?: number;
  stars?: number;
  style?: EstiloId;
  pos?: Pos;
  foot?: Pe;
}

/** Aplica uma edição validando os limites. Mudar a posição troca estilo e habilidades. */
export function editPlayer(world: World, id: number, e: PlayerEdit, rng = new Rng(id * 977)) {
  const p = world.players[id];
  if (!p) return;
  if (e.name !== undefined) p.name = e.name.trim().slice(0, 28) || p.name;
  if (e.nat !== undefined) p.nat = e.nat;
  if (e.foot !== undefined) p.foot = e.foot;
  if (e.age !== undefined) p.age = clamp(Math.round(e.age), 15, 45);
  if (e.force !== undefined) p.force = clamp(Math.round(e.force), 1, 135);
  if (e.potential !== undefined) p.potential = clamp(Math.round(e.potential), 1, 135);
  p.potential = Math.max(p.potential, p.force);
  if (e.pos !== undefined && e.pos !== p.pos) {
    p.pos = e.pos;
    p.style = ESTILOS_POR_POS[e.pos][0];
    p.abilities = [];
    syncAbilities(rng, p);
  }
  if (e.style !== undefined && ESTILOS_POR_POS[p.pos].includes(e.style)) p.style = e.style;
  if (e.stars !== undefined) {
    p.stars = clamp(Math.round(e.stars), 1, 7);
    p.starCap = Math.max(p.starCap, p.stars);
    p.legend = p.stars >= 6 || undefined;
    const max = abilityCount(p.stars);
    if (p.abilities.length > max) p.abilities = p.abilities.slice(0, max);
    else syncAbilities(rng, p);
  }
  recalcValue(p, world.clubs[p.clubId]?.country);
}

/** Liga/desliga uma habilidade respeitando posição e o limite pelas estrelas. */
export function toggleAbility(world: World, id: number, abilityId: number): string | null {
  const p = world.players[id];
  const h = HABILIDADES[abilityId];
  if (!p || !h) return null;
  if (h.pos !== p.pos) return 'Essa habilidade é de outra posição.';
  if (p.abilities.includes(abilityId)) {
    p.abilities = p.abilities.filter((x) => x !== abilityId);
    return null;
  }
  const max = abilityCount(p.stars);
  if (p.abilities.length >= max) return `Com ${p.stars} estrela(s) o jogador pode ter no máximo ${max} habilidades.`;
  p.abilities.push(abilityId);
  return null;
}

/** Novo jogador criado no editor: começa com 15 anos. */
export function addPlayer(world: World, clubId: number, pos: Pos): Player {
  const club = world.clubs[clubId];
  const rng = new Rng((world.players.length * 7919) ^ clubId);
  const p = createPlayer(rng, world.players.length, clubId, club.country, pos, club.baseForce * 0.6, { age: IDADE_NOVO_JOGADOR, reserve: true });
  p.nat = club.country;
  p.potential = Math.max(p.potential, p.force + 15);
  world.players.push(p);
  club.playerIds.push(p.id);
  return p;
}

export function removePlayer(world: World, id: number): string | null {
  const p = world.players[id];
  if (!p) return null;
  const club = world.clubs[p.clubId];
  if (club && club.playerIds.length <= 16) return 'O clube precisa ter pelo menos 16 jogadores.';
  if (club) club.playerIds = club.playerIds.filter((x) => x !== id);
  p.retired = true;
  return null;
}

export interface ClubEdit {
  name?: string;
  short?: string;
  colors?: [string, string];
  capacity?: number;
  ct?: number;
  baseLevel?: number;
  money?: number;
}

export function editClub(world: World, id: number, e: ClubEdit) {
  const c: Club = world.clubs[id];
  if (!c) return;
  if (e.name !== undefined) c.name = e.name.trim().slice(0, 32) || c.name;
  if (e.short !== undefined) c.short = e.short.trim().toUpperCase().slice(0, 3) || c.short;
  if (e.colors) c.colors = e.colors;
  if (e.capacity !== undefined) c.stadium.capacity = clamp(Math.round(e.capacity), 1000, 150000);
  if (e.ct !== undefined) c.ct = clamp(Math.round(e.ct), 1, 5);
  if (e.baseLevel !== undefined) c.baseLevel = clamp(Math.round(e.baseLevel), 1, 5);
  if (e.money !== undefined) c.money = Math.max(0, Math.round(e.money));
}

/** Força de referência do clube a partir do elenco (usada pela IA e nos sorteios). */
export function recalcClubForce(world: World, id: number) {
  const c = world.clubs[id];
  const top = c.playerIds.map((pid) => world.players[pid].force).sort((a, b) => b - a).slice(0, 16);
  if (top.length) c.baseForce = top.reduce((s, f) => s + f, 0) / top.length;
}
