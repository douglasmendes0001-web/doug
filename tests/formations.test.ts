import { describe, expect, it } from 'vitest';
import { FORMACOES_PADRAO, esquemaOf, formationCounts, lineName, validateEsquema, type Esquema } from '../src/engine/data/formacoes';
import { assignSlots, autoLineup, sideFit, slotFit } from '../src/engine/lineup';
import { MatchSim, pressureSusceptibility, type TeamContext } from '../src/engine/match';
import { SQUAD_TEMPLATE, createPlayer } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import type { Club, Player } from '../src/engine/types';

function squadOf(force = 50, seed = 3): { club: Club; squad: Player[] } {
  const rng = new Rng(seed);
  const club: Club = {
    id: seed, name: 'X', short: 'X', country: 'BRA', confed: 'CONMEBOL', tier: 1, leagueId: null, colors: ['#000', '#fff'], reputation: 60,
    altitude: 50, stadium: { name: 'X', capacity: 40000 }, ct: 3, money: 0, ticketPrice: 50, playerIds: [], baseForce: force,
    baseLevel: 3, youthIds: [], baseInvest: 0, investors: [],
  };
  const squad = SQUAD_TEMPLATE.map((pos, i) => {
    const p = createPlayer(rng, seed * 100 + i, seed, 'BRA', pos, force);
    p.force = force; p.stars = 2; p.abilities = []; p.energy = 100; p.respeito = 65;
    return p;
  });
  return { club, squad };
}

describe('formações', () => {
  it('há mais de 13 formações válidas, de todas as categorias', () => {
    expect(FORMACOES_PADRAO.length).toBeGreaterThanOrEqual(20);
    for (const f of FORMACOES_PADRAO) expect(validateEsquema(f), f.id).toBeNull();
    const cats = new Set(FORMACOES_PADRAO.map((f) => f.categoria));
    for (const c of ['ofensiva', 'defensiva', 'posse', 'equilibrada', 'contra-ataque']) expect(cats.has(c as never)).toBe(true);
    expect(lineName(esquemaOf({ formation: '4-3-3' }))).toBe('4-3-3');
    expect(lineName(esquemaOf({ formation: '4-2-3-1' }))).toBe('4-2-3-1');
  });

  it('formação personalizada é validada', () => {
    const base = esquemaOf({ formation: '4-4-2' });
    const ruim: Esquema = { ...base, id: 'custom-1', custom: true, slots: base.slots.map((sl, i) => (i > 0 && i < 4 ? { ...sl, pos: 'ATA' as const } : sl)) };
    expect(validateEsquema(ruim)).toMatch(/defensores/);
  });
});

describe('pé dominante', () => {
  it('destro rende menos na lateral esquerda; ambidestro joga dos dois lados', () => {
    const { squad } = squadOf();
    const lat = squad.find((p) => p.pos === 'LD')!;
    const le = esquemaOf({ formation: '4-4-2' }).slots.find((s) => s.pos === 'LE')!;
    lat.foot = 'D';
    expect(sideFit(lat, le)).toBeLessThan(1);
    lat.foot = 'A';
    expect(sideFit(lat, le)).toBe(1);
  });

  it('escalação automática coloca canhoto na esquerda e destro na direita', () => {
    const { squad } = squadOf();
    const [l1, l2] = squad.filter((p) => p.pos === 'LD');
    const [e1, e2] = squad.filter((p) => p.pos === 'LE');
    l1.foot = 'D'; l2.foot = 'D'; e1.foot = 'E'; e2.foot = 'E';
    // Um lateral direito melhor que todos os esquerdos ainda deve ficar na direita.
    l1.force = 70;
    const esq = esquemaOf({ formation: '4-4-2' });
    const lineup = autoLineup(squad, '4-4-2');
    const slots = assignSlots(lineup.starters.map((id) => squad.find((p) => p.id === id)!), esq);
    const iLE = esq.slots.findIndex((s) => s.pos === 'LE');
    const iLD = esq.slots.findIndex((s) => s.pos === 'LD');
    const pLE = squad.find((p) => p.id === slots[iLE])!;
    const pLD = squad.find((p) => p.id === slots[iLD])!;
    expect(pLE.foot === 'E' || pLE.foot === 'A').toBe(true);
    expect(pLD.id).toBe(l1.id);
    expect(slotFit(pLE, esq.slots[iLE])).toBeGreaterThan(0.95);
    expect(formationCounts(esq).ZG).toBe(2);
  });
});

describe('ambiente: torcida, momento e pressão', () => {
  const play = (opts: { crowd: number; homeForm?: number; awayPressure?: number; n?: number }) => {
    const rng = new Rng(77);
    const H = squadOf(50, 1);
    const A = squadOf(50, 2);
    let hw = 0, aw = 0;
    const n = opts.n ?? 1200;
    const team = (c: ReturnType<typeof squadOf>, extra: Partial<TeamContext>): TeamContext => {
      for (const p of c.squad) { p.energy = 100; p.suspendedGames = 0; p.injuredSlots = 0; }
      return { club: c.club, squad: c.squad, lineup: autoLineup(c.squad, '4-4-2'), coachExperience: 50, isUser: false, ...extra };
    };
    for (let i = 0; i < n; i++) {
      const sim = new MatchSim({
        home: team(H, { form: opts.homeForm ?? 0 }), away: team(A, { pressure: opts.awayPressure ?? 0, isUser: opts.awayPressure !== undefined }),
        venue: H.club, neutral: false, weather: { clima: 'normal', temperature: 20 }, crowd: opts.crowd, rng,
      });
      sim.runToEnd();
      const [h, a] = sim.score;
      if (h > a) hw++; else if (a > h) aw++;
    }
    return (hw - aw) / n;
  };

  it('estádio cheio pesa mais que estádio vazio', () => {
    expect(play({ crowd: 1 })).toBeGreaterThan(play({ crowd: 0.1 }));
  });

  it('time em boa fase rende mais', () => {
    expect(play({ crowd: 0.5, homeForm: 1 })).toBeGreaterThan(play({ crowd: 0.5, homeForm: -1 }));
  });

  it('jovens e temperamentais sentem mais a pressão do que líderes veteranos', () => {
    const { squad } = squadOf();
    const jovem = { ...squad[0], age: 19, personality: 'temperamental' as const, stars: 2 };
    const veterano = { ...squad[0], age: 33, personality: 'lider' as const, stars: 2 };
    expect(pressureSusceptibility(jovem)).toBeGreaterThan(pressureSusceptibility(veterano) * 3);
  });
});
