import { describe, expect, it } from 'vitest';
import { aguentaJogoInteiro, evoluirSemana, idadeLimiteFolego, minutosDeFolego, syncStars, weeklyDevelopment } from '../src/engine/development';
import { MatchSim } from '../src/engine/match';
import { createPlayer, starsForForce } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { newGame, prepareMatch, userFixtureAtSlot, advanceToNextUserMatch } from '../src/engine/season';
import type { Player } from '../src/engine/types';

const coach = { name: 'Teste', age: 40, exPlayer: false, career: null, titulosCarreira: false };
const jogador = (force: number, age: number): Player => {
  const p = createPlayer(new Rng(force * 31 + age), 0, 0, 'BRA', 'MEI', force, { age });
  p.force = force;
  p.stars = starsForForce(force);
  return p;
};

describe('estrelas por faixa de força', () => {
  it('5★ de 60 a 89, 6★ de 90 a 104, 7★ de 105 em diante; força baixa nunca tem 6 ou 7', () => {
    expect(starsForForce(59)).toBe(4);
    expect(starsForForce(60)).toBe(5);
    expect(starsForForce(89)).toBe(5);
    expect(starsForForce(90)).toBe(6);
    expect(starsForForce(104)).toBe(6);
    expect(starsForForce(105)).toBe(7);
    expect(starsForForce(130)).toBe(7);
    for (let f = 1; f < 90; f++) expect(starsForForce(f)).toBeLessThanOrEqual(5);
  });
});

describe('fôlego', () => {
  it('até 28 anos todos aguentam; depois só 5★ até 35, 6★ até 40 e 7★ até 53', () => {
    expect(aguentaJogoInteiro(jogador(40, 28))).toBe(true);
    expect(aguentaJogoInteiro(jogador(40, 29))).toBe(false);
    expect(idadeLimiteFolego(jogador(70, 30))).toBe(35);
    expect(aguentaJogoInteiro(jogador(70, 35))).toBe(true);
    expect(aguentaJogoInteiro(jogador(70, 36))).toBe(false);
    expect(aguentaJogoInteiro(jogador(95, 40))).toBe(true);
    expect(aguentaJogoInteiro(jogador(95, 41))).toBe(false);
    expect(aguentaJogoInteiro(jogador(110, 53))).toBe(true);
    expect(minutosDeFolego(jogador(40, 22))).toBeGreaterThan(90);
    expect(minutosDeFolego(jogador(40, 33))).toBeLessThan(80);
  });

  it('na partida, o jovem termina com energia e o veterano sem fôlego fica exausto', () => {
    const s = newGame({ seed: 12, coach, clubId: 1, settings: { halfSeconds: 15, mundialAnual: false } });
    advanceToNextUserMatch(s);
    const fx = userFixtureAtSlot(s)!;
    const prep = prepareMatch(s, fx, new Rng(1));
    const sim = new MatchSim(prep.ctx);
    const campo = sim.sides[0].onField.filter((f) => f.pos !== 'G');
    const jovem = campo[0].p;
    const velho = campo[1].p;
    jovem.age = 21; jovem.force = 50; jovem.stars = 4; jovem.energy = 100;
    velho.age = 34; velho.force = 50; velho.stars = 4; velho.energy = 100;
    for (let m = 0; m < 95 && !sim.finished; m++) sim.step();
    expect(jovem.energy).toBeGreaterThan(35);
    expect(velho.energy).toBeLessThan(32);
  });
});

describe('evolução semanal', () => {
  it('jovens evoluem mais rápido; quem joga cresce mais que quem fica no banco; veteranos caem', () => {
    const semanas = (p: Player, jogou: boolean) => { for (let i = 0; i < 40; i++) evoluirSemana(p, { ct: 3, jogou, relacionado: true }); return p.force; };
    const j1 = jogador(40, 17); j1.potential = 75;
    const j2 = jogador(40, 17); j2.potential = 75;
    const a1 = jogador(40, 26); a1.potential = 75;
    const g1 = semanas(j1, true) - 40;
    const g2 = semanas(j2, false) - 40;
    const g3 = semanas(a1, true) - 40;
    expect(g1).toBeGreaterThan(g2 * 1.8);
    expect(g1).toBeGreaterThan(g3 * 2.5);
    expect(g1).toBeGreaterThan(4);
    expect(g1).toBeLessThan(14);
    const vet = jogador(70, 35); vet.potential = 70;
    expect(semanas(vet, true)).toBeLessThan(70);
  });

  it('ao cruzar uma faixa o jogador ganha estrela e o técnico recebe os parabéns', () => {
    const s = newGame({ seed: 13, coach, clubId: 1, settings: { halfSeconds: 15, mundialAnual: false } });
    const p = s.players[s.clubs[1].playerIds[0]];
    p.age = 18; p.force = 59.98; p.potential = 80; p.stars = 4;
    s.lineup.starters = [p.id, ...s.lineup.starters.filter((x) => x !== p.id)].slice(0, 11);
    p.seasonGames = (p.devGames ?? 0) + 1;
    weeklyDevelopment(s, new Rng(3));
    expect(p.stars).toBe(5);
    expect(s.messages.some((m) => m.title === `Parabéns, ${p.name}!`)).toBe(true);
    p.force = 59; // folga de 1,5 ponto: ainda não perde a estrela
    expect(syncStars(new Rng(1), p)).toBe(0);
    p.force = 58;
    expect(syncStars(new Rng(1), p)).toBe(-1);
  });
});
