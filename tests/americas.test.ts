import { describe, expect, it } from 'vitest';
import { migrarSave } from '../src/engine/migrations';
import { clubPrestige, craqueBig5, recusaPorPrestigio } from '../src/engine/prestige';
import { newGame, playSlot } from '../src/engine/season';
import { buyPlayer } from '../src/engine/transfers';
import { FREE_AGENT, type GameState } from '../src/engine/types';
import { createWorld } from '../src/engine/world';

const coach = { name: 'Teste', age: 40, exPlayer: false, career: null, titulosCarreira: false };
const clube = (s: GameState, nome: string) => s.clubs.find((c) => c.name === nome && c.tier >= 0)!;

describe('prestígio histórico', () => {
  const w = createWorld(4);
  const s = newGame({ seed: 4, coach, clubId: w.clubs.find((c) => c.name === 'Mirassol')!.id, settings: { halfSeconds: 15, mundialAnual: false } }, w);

  it('campeões mundiais (FIFA ou não) são "mundial"; campeões internacionais e lendas, "intercontinental"', () => {
    for (const n of ['Flamengo', 'Palmeiras', 'São Paulo', 'Santos', 'Corinthians', 'Grêmio', 'Internacional', 'Fluminense', 'Boca Juniors', 'River Plate', 'Millonarios']) {
      expect(clubPrestige(s, clube(s, n)), n).toBe(4);
    }
    for (const n of ['Botafogo', 'Cruzeiro', 'Atlético-MG', 'Bahia', 'LDU Quito', 'América', 'Cruz Azul', 'Inter Miami', 'Seattle Sounders', 'Saprissa']) {
      expect(clubPrestige(s, clube(s, n)), n).toBe(3);
    }
    expect(clubPrestige(s, clube(s, 'Mirassol'))).toBeLessThan(3);
  });

  it('craque 5★ das 5 grandes ligas só aceita clube intercontinental ou mundial', () => {
    const craque = s.players.find((p) => craqueBig5(s, p))!;
    expect(craque).toBeTruthy();
    expect(recusaPorPrestigio(s, clube(s, 'Mirassol'), craque)).toMatch(/projeção internacional/);
    expect(recusaPorPrestigio(s, clube(s, 'Flamengo'), craque)).toBeNull();
    s.clubs[s.userClubId].money = 2_000_000_000;
    s.slot = 2; // janela aberta
    expect(buyPlayer(s, craque.id, 3)).toMatch(/projeção internacional/);
  });

  it('título continental na carreira dá projeção intercontinental', () => {
    const mir = clube(s, 'Mirassol');
    s.history.push({ year: 2025, champions: { LIB: mir.id } });
    expect(clubPrestige(s, mir)).toBe(3);
  });
});

describe('América do Norte', () => {
  it('MLS, Liga MX, copas, Leagues Cup e Concachampions; campeão da Concacaf vai ao Mundial', () => {
    const s = newGame({ seed: 8, coach, clubId: 0, settings: { halfSeconds: 15, mundialAnual: true } });
    const ccc = s.competitions.find((c) => c.def.id === 'CCC')!;
    expect(ccc.teams).toHaveLength(27);
    for (const id of ['USA1', 'MEX1-CL', 'MEX1-AP', 'CAN1', 'COPA-USA', 'COPA-CAN', 'LCUP']) expect(s.competitions.some((c) => c.def.id === id), id).toBe(true);
    for (let i = 0; i < 104; i++) { playSlot(s); if (s.slot === 0) break; }
    const h = s.history[s.history.length - 1];
    for (const id of ['USA1', 'MEX1-AP', 'CCC', 'LCUP', 'COPA-USA']) expect(h.champions[id], id).toBeDefined();
    expect(s.qualifications?.CCC?.length).toBe(27);
    // O Mundial do ano seguinte inclui o campeão da Concachampions.
    const mun = s.competitions.find((c) => c.def.id === 'MUN')!;
    expect(mun.teams).toContain(h.champions.CCC);
  }, 120000);

  it('save antigo (versão 3) ganha os clubes reais da América do Norte', () => {
    const s = newGame({ seed: 9, coach, clubId: 1, settings: { halfSeconds: 15, mundialAnual: false } });
    // Simula o mundo antigo: sem MLS/Liga MX e com um clube genérico da Concacaf.
    for (const c of s.clubs) {
      if (c.confed !== 'CONCACAF') continue;
      for (const pid of c.playerIds) s.players[pid].clubId = FREE_AGENT;
      Object.assign(c, { playerIds: [], leagueId: null, tier: -1, name: `${c.name} (antigo)` });
    }
    const generico = s.players.slice(0, 3).map((p) => p.id);
    s.clubs.push({ ...s.clubs[0], id: s.clubs.length, name: 'Seattle Falcons', country: 'USA', confed: 'CONCACAF', tier: 0, leagueId: null, playerIds: [] });
    void generico;
    s.version = 3;
    migrarSave(s);
    expect(s.version).toBe(4);
    expect(s.clubs.filter((c) => c.leagueId === 'USA1')).toHaveLength(30);
    expect(s.clubs.filter((c) => c.leagueId === 'MEX1')).toHaveLength(18);
    expect(s.clubs.find((c) => c.name === 'Seattle Falcons')!.tier).toBe(-1);
    for (const c of s.clubs) for (const pid of c.playerIds) expect(s.players[pid].clubId).toBe(c.id);
    expect(s.players.every((p, i) => p.id === i)).toBe(true);
    expect(FREE_AGENT).toBeLessThan(0);
  });
});
