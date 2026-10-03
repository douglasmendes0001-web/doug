// Criação do "mundo" do jogo: clubes de todas as ligas, clubes externos para
// torneios internacionais e os elencos completos.

import { CENTRO_CARIBE, CPL, LIGA_MX, MLS_LESTE, MLS_OESTE, type ClubeNA } from './data/americaNorte';
import { baseTicketPrice, clubRevenue, revenueFloorFor, roundMoney } from './economy';
import { CIDADES_UF, SERIE_A, SERIE_B, SERIE_C, SERIE_D, type ClubSeed } from './data/brasil';
import { EUROPA, MUNDO, SUFIXOS_MUNDO, type CitySeed } from './data/europa';
import { LIGAS, leagueById } from './data/ligas';
import { PAISES } from './data/paises';
import {
  ARG_LPF, ARG_NACIONAL, BOL_ASCENSO, BOL_PRIMERA, CHI_ASCENSO, CHI_PRIMERA, COL_ASCENSO, COL_PRIMERA,
  ECU_SERIE_A, ECU_SERIE_B, OUTROS_CONMEBOL, type ClubSeedAlt,
} from './data/sulamerica';
import { SQUAD_TEMPLATE, createPlayer } from './players';
import { Rng, clamp } from './rng';
import type { Club, CountryCode, Player } from './types';

const PALETA = ['#c4161c', '#1f3f99', '#1b7a3d', '#111111', '#f2c200', '#8a1538', '#2a8fd6', '#e8731a', '#6a2c91', '#ffffff'];

const ALTITUDE_UF: Record<string, number> = { DF: 1170, GO: 750, MG: 850, PR: 900, SP: 700, MS: 450, MT: 200 };

interface ClubDraft {
  name: string;
  short: string;
  country: CountryCode;
  state?: string;
  city?: string;
  tier: number;
  leagueId: string | null;
  altitude: number;
  colors?: [string, string];
  /** 0 = mais forte da lista, 1 = mais fraco. */
  rankFrac: number;
  forceRange: [number, number];
  eco: number;
  conference?: 'Leste' | 'Oeste';
}

export interface World {
  clubs: Club[];
  players: Player[];
}

export function createWorld(seed: number): World {
  const rng = new Rng(seed);
  const drafts: ClubDraft[] = [];

  const addList = <T>(list: T[], fn: (item: T, rankFrac: number, i: number) => ClubDraft) => {
    list.forEach((item, i) => drafts.push(fn(item, list.length > 1 ? i / (list.length - 1) : 0, i)));
  };

  // ---- Brasil ----
  const br = (leagueId: string) => (s: ClubSeed, rankFrac: number): ClubDraft => {
    const l = leagueById(leagueId);
    return {
      name: s[0], short: s[1], country: 'BRA', state: s[2], tier: l.tier, leagueId, altitude: ALTITUDE_UF[s[2]] ?? 50,
      colors: s[3] ? [s[3], s[4] ?? '#ffffff'] : undefined, rankFrac, forceRange: l.force, eco: l.eco,
    };
  };
  addList(SERIE_A, br('BRA1'));
  addList(SERIE_B, br('BRA2'));
  addList(SERIE_C, br('BRA3'));
  addList(SERIE_D, br('BRA4'));
  addEstadualFillers(drafts, rng);

  // ---- América do Sul ----
  const sa = (leagueId: string) => (s: ClubSeedAlt, rankFrac: number): ClubDraft => {
    const l = leagueById(leagueId);
    return {
      name: s[0], short: s[1], country: l.country, city: s[2], tier: l.tier, leagueId, altitude: s[3],
      colors: s[4] ? [s[4], s[5] ?? '#ffffff'] : undefined, rankFrac, forceRange: l.force, eco: l.eco,
    };
  };
  addList(ARG_LPF, sa('ARG1'));
  addList(ARG_NACIONAL, sa('ARG2'));
  addList(CHI_PRIMERA, sa('CHI1'));
  addList(CHI_ASCENSO, sa('CHI2'));
  addList(COL_PRIMERA, sa('COL1'));
  addList(COL_ASCENSO, sa('COL2'));
  addList(ECU_SERIE_A, sa('ECU1'));
  addList(ECU_SERIE_B, sa('ECU2'));
  addList(BOL_PRIMERA, sa('BOL1'));
  addList(BOL_ASCENSO, sa('BOL2'));

  for (const [country, list] of Object.entries(OUTROS_CONMEBOL) as [CountryCode, ClubSeedAlt[]][]) {
    addList(list, (s, rankFrac) => ({
      name: s[0], short: s[1], country, city: s[2], tier: 0, leagueId: null, altitude: s[3], rankFrac,
      forceRange: country === 'URU' || country === 'PAR' ? [30, 48] : [24, 44], eco: 0.2,
    }));
  }

  // ---- Europa (genérica) ----
  for (const e of EUROPA) {
    const used = new Set<string>();
    const makeName = (city: string, i: number) => {
      for (let k = 0; k < e.suffixes.length; k++) {
        const name = `${city} ${e.suffixes[(i + k) % e.suffixes.length]}`;
        if (!used.has(name)) {
          used.add(name);
          return name;
        }
      }
      return `${city} ${i}`;
    };
    const eu = (leagueId: string, offset: number) => (c: CitySeed, rankFrac: number, i: number): ClubDraft => {
      const l = leagueById(leagueId);
      const [city, altitude] = typeof c === 'string' ? [c, 50] : c;
      return {
        name: makeName(city, i + offset), short: city.slice(0, 3).toUpperCase(), country: e.country, city, tier: l.tier,
        leagueId, altitude, rankFrac, forceRange: l.force, eco: l.eco,
      };
    };
    addList(e.top, eu(`${e.country}1`, 0));
    addList(e.second, eu(`${e.country}2`, 3));
  }

  // ---- América do Norte, Central e Caribe ----
  drafts.push(...northAmericaDrafts());

  // ---- Outras confederações (Mundial de Clubes) ----
  const forcaConfed: Record<string, [number, number]> = { AFC: [38, 62], CAF: [32, 52], CONCACAF: [36, 58], OFC: [15, 30] };
  for (const pool of MUNDO) {
    const used = new Set<string>();
    addList(pool.clubs, ([city, country, altitude], rankFrac, i) => {
      let name = `${city} ${SUFIXOS_MUNDO[i % SUFIXOS_MUNDO.length]}`;
      if (used.has(name)) name = `${city} ${SUFIXOS_MUNDO[(i + 3) % SUFIXOS_MUNDO.length]}`;
      used.add(name);
      return {
        name, short: city.slice(0, 3).toUpperCase(), country, city, tier: 0, leagueId: null, altitude, rankFrac,
        forceRange: forcaConfed[pool.confed], eco: 0.5,
      };
    });
  }

  return buildClubsAndPlayers(drafts, rng);
}

/** Clubes reais da MLS, Liga MX, liga canadense, América Central e Caribe. */
function northAmericaDrafts(): ClubDraft[] {
  const out: ClubDraft[] = [];
  const add = (list: ClubeNA[], leagueId: string | null, conference?: 'Leste' | 'Oeste') => {
    const l = leagueId ? leagueById(leagueId) : undefined;
    list.forEach((s, i) => out.push({
      name: s[0], short: s[1], country: s[6] ?? l!.country, city: s[2], tier: l ? l.tier : 0, leagueId, altitude: s[3],
      colors: [s[4], s[5]], rankFrac: list.length > 1 ? i / (list.length - 1) : 0, forceRange: l ? l.force : [22, 38],
      eco: l ? l.eco : 0.1, conference,
    }));
  };
  add(MLS_LESTE, 'USA1', 'Leste');
  add(MLS_OESTE, 'USA1', 'Oeste');
  add(LIGA_MX, 'MEX1');
  add(CPL, 'CAN1');
  add(CENTRO_CARIBE, null);
  return out;
}

/**
 * Saves antigos (até a versão 3): acrescenta os clubes reais da América do
 * Norte ao mundo e desativa os clubes genéricos da Concacaf que existiam só
 * para o Mundial (os jogadores deles ficam livres no mercado).
 */
export function appendNorthAmerica(world: World, seed: number, freeAgentId: number) {
  for (const c of world.clubs) {
    if (c.confed !== 'CONCACAF' || c.leagueId) continue;
    for (const pid of c.playerIds) world.players[pid].clubId = freeAgentId;
    c.playerIds = [];
    c.tier = -1;
  }
  const novo = buildClubsAndPlayers(northAmericaDrafts(), new Rng(seed ^ 0x4e41));
  const offC = world.clubs.length;
  const offP = world.players.length;
  for (const p of novo.players) {
    p.id += offP;
    p.clubId += offC;
    world.players.push(p);
  }
  for (const c of novo.clubs) {
    c.id += offC;
    c.playerIds = c.playerIds.map((id) => id + offP);
    world.clubs.push(c);
  }
}

function addEstadualFillers(drafts: ClubDraft[], rng: Rng) {
  const porUF = new Map<string, number>();
  for (const d of drafts) if (d.state) porUF.set(d.state, (porUF.get(d.state) ?? 0) + 1);
  const grandes = new Set(['RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO']);
  const prefixos = ['EC', 'AA', 'União', 'Atlético', 'Grêmio', 'Independente', 'SE', 'Esporte Clube'];
  for (const uf of Object.keys(CIDADES_UF)) {
    const alvo = uf === 'SP' ? 16 : grandes.has(uf) ? 12 : 8;
    const faltam = alvo - (porUF.get(uf) ?? 0);
    const cidades = rng.shuffle([...CIDADES_UF[uf]]);
    for (let i = 0; i < faltam; i++) {
      const city = cidades[i % cidades.length];
      const name = `${prefixos[(i + uf.charCodeAt(0)) % prefixos.length]} ${city}`;
      drafts.push({
        name, short: city.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 3).toUpperCase(), country: 'BRA', state: uf, city,
        tier: 9, leagueId: null, altitude: ALTITUDE_UF[uf] ?? 50, rankFrac: rng.next(), forceRange: [3, 14], eco: 0.01,
      });
    }
  }
}

function buildClubsAndPlayers(drafts: ClubDraft[], rng: Rng): World {
  const clubs: Club[] = [];
  const players: Player[] = [];
  drafts.forEach((d, id) => {
    const [fmin, fmax] = d.forceRange;
    const jitter = (fmax - fmin) * 0.12;
    const baseForce = clamp(fmax - d.rankFrac * (fmax - fmin) + rng.normal(0, jitter), fmin, fmax);
    const repTier = d.tier === 0 ? 1 : d.tier === 9 ? 5 : d.tier;
    const reputation = Math.round(clamp(95 - 60 * d.rankFrac - (repTier - 1) * 12, 5, 100));
    const ecoCap = Math.min(1, d.eco);
    const capacity = Math.round(((8000 + 57000 * (1 - d.rankFrac)) * (0.3 + 0.7 * ecoCap) * rng.range(0.85, 1.15)) / 500) * 500;
    const confed = PAISES[d.country].confed;
    const colors: [string, string] = d.colors ?? [PALETA[(id * 7) % PALETA.length], PALETA[(id * 3 + 5) % PALETA.length]];
    const club: Club = {
      id, name: d.name, short: d.short, country: d.country, confed, state: d.state, city: d.city, tier: d.tier,
      leagueId: d.leagueId, colors, reputation, altitude: d.altitude,
      stadium: { name: d.country === 'BRA' ? `Estádio do ${d.name}` : `${d.city ?? d.name} Arena`, capacity: Math.max(2000, capacity) },
      ct: clamp(Math.round(1 + 4 * (1 - d.rankFrac) * ecoCap + (d.eco > 1 ? 1 : 0)), 1, 5),
      money: 0, ticketPrice: 0, playerIds: [], baseForce,
      baseLevel: clamp(Math.round(1 + 3 * (1 - d.rankFrac) * ecoCap + (d.eco > 1 ? 1 : 0)), 1, 5),
      youthIds: [], baseInvest: 0, investors: [],
      ...(d.conference ? { conference: d.conference } : {}),
    };
    SQUAD_TEMPLATE.forEach((pos, i) => {
      const p = createPlayer(rng, players.length, id, d.country, pos, baseForce, { reserve: i % 2 === 1 && pos !== 'G' ? i > 12 : i === 2 });
      players.push(p);
      club.playerIds.push(p.id);
    });
    // Caixa inicial: cerca de um quarto da receita anual (orçamento para reforços).
    club.revenueFloor = Math.round(revenueFloorFor(club.playerIds.reduce((s, pid) => s + players[pid].salary, 0) * 12));
    club.ticketPrice = baseTicketPrice(club);
    club.money = roundMoney(clubRevenue(club) * (0.08 + reputation / 1000));
    clubs.push(club);
  });
  return { clubs, players };
}

export function leagueClubs(clubs: Club[], leagueId: string): Club[] {
  return clubs.filter((c) => c.leagueId === leagueId);
}

export function allLeagueIds(): string[] {
  return LIGAS.map((l) => l.id);
}

