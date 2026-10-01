import { describe, expect, it } from 'vitest';
import { autoLineup } from '../src/engine/lineup';
import { MatchSim, type TeamContext } from '../src/engine/match';
import { SQUAD_TEMPLATE, createPlayer } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import type { Club, Clima, CountryCode, Player } from '../src/engine/types';

function makeClub(id: number, country: CountryCode, altitude: number, force: number, rng: Rng): { club: Club; squad: Player[] } {
  const club: Club = {
    id, name: `Clube ${id}`, short: `C${id}`, country, confed: 'CONMEBOL', tier: 1, leagueId: null, colors: ['#000', '#fff'],
    reputation: 60, altitude, stadium: { name: 'X', capacity: 30000 }, ct: 3, money: 0, ticketPrice: 50, playerIds: [], baseForce: force,
  };
  const squad = SQUAD_TEMPLATE.map((pos, i) => {
    const p = createPlayer(rng, id * 100 + i, id, country, pos, force);
    p.force = force; // elencos idênticos em força
    return p;
  });
  return { club, squad };
}

function team(c: { club: Club; squad: Player[] }, exp = 50): TeamContext {
  for (const p of c.squad) { p.energy = 100; p.respeito = 65; p.oportunidade = 60; p.treino = 60; p.suspendedGames = 0; p.injuredSlots = 0; }
  return { club: c.club, squad: c.squad, lineup: autoLineup(c.squad, '4-4-2'), coachExperience: exp, isUser: false };
}

function series(opts: { homeAlt: number; awayAlt: number; clima?: Clima; neutral?: boolean; n?: number; homeExp?: number }) {
  const rng = new Rng(1234);
  const H = makeClub(1, 'BOL', opts.homeAlt, 45, rng);
  const A = makeClub(2, 'BRA', opts.awayAlt, 45, rng);
  let hw = 0, aw = 0, energyAway = 0;
  const n = opts.n ?? 1500;
  for (let i = 0; i < n; i++) {
    const sim = new MatchSim({
      home: team(H, opts.homeExp), away: team(A), venue: H.club, neutral: !!opts.neutral,
      weather: { clima: opts.clima ?? 'normal', temperature: 20 }, crowd: 0.7, rng,
    });
    sim.runToEnd();
    const [h, a] = sim.score;
    if (h > a) hw++; else if (a > h) aw++;
    energyAway += sim.sides[1].onField.reduce((s, f) => s + f.p.energy, 0) / sim.sides[1].onField.length;
  }
  return { homeWinPct: hw / n, awayWinPct: aw / n, awayEnergy: energyAway / n };
}

describe('motor de partida', () => {
  it('mando de campo favorece o dono da casa', () => {
    const r = series({ homeAlt: 50, awayAlt: 50 });
    expect(r.homeWinPct).toBeGreaterThan(r.awayWinPct);
  });

  it('campo neutro equilibra o confronto', () => {
    const r = series({ homeAlt: 50, awayAlt: 50, neutral: true });
    expect(Math.abs(r.homeWinPct - r.awayWinPct)).toBeLessThan(0.07);
  });

  it('altitude de La Paz pesa contra o visitante do nível do mar', () => {
    const plano = series({ homeAlt: 50, awayAlt: 50 });
    const laPaz = series({ homeAlt: 3640, awayAlt: 50 });
    console.log({ plano, laPaz });
    expect(laPaz.homeWinPct).toBeGreaterThan(plano.homeWinPct + 0.05);
    expect(laPaz.awayEnergy).toBeLessThan(plano.awayEnergy - 10);
  });

  it('calor desgasta mais que o frio', () => {
    const calor = series({ homeAlt: 50, awayAlt: 50, clima: 'calor', n: 300 });
    const frio = series({ homeAlt: 50, awayAlt: 50, clima: 'frio', n: 300 });
    expect(calor.awayEnergy).toBeLessThan(frio.awayEnergy);
  });

  it('técnico experiente rende mais que um novato', () => {
    const novato = series({ homeAlt: 50, awayAlt: 50, homeExp: 0, neutral: true });
    const veterano = series({ homeAlt: 50, awayAlt: 50, homeExp: 90, neutral: true });
    expect(veterano.homeWinPct).toBeGreaterThan(novato.homeWinPct);
  });
});

describe('diferenças extremas de força', () => {
  it('Série A contra time de várzea vence com placar plausível', () => {
    const rng = new Rng(99);
    const forte = makeClub(1, 'BRA', 50, 55, rng);
    const fraco = makeClub(2, 'BRA', 50, 8, rng);
    let gols = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const sim = new MatchSim({ home: team(forte), away: team(fraco), venue: forte.club, neutral: false, weather: { clima: 'normal', temperature: 20 }, crowd: 0.7, rng });
      sim.runToEnd();
      gols += sim.score[0];
    }
    console.log('média de gols do forte:', gols / n);
    expect(gols / n).toBeGreaterThan(2);
    expect(gols / n).toBeLessThan(4.5);
  });
});
