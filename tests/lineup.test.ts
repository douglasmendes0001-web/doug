import { describe, expect, it } from 'vitest';
import { BENCH_SIZE, addToBench, currentSlots, placeInSlot, starterToBench, unlist } from '../src/engine/lineup';
import { newGame, squadOf } from '../src/engine/season';

const coach = { name: 'Teste', age: 40, exPlayer: false, career: null, titulosCarreira: false };

describe('edição da escalação', () => {
  const s = newGame({ seed: 11, coach, clubId: 1, settings: { halfSeconds: 15, mundialAnual: false } });
  const get = (id: number) => s.players[id];
  const l = s.lineup;

  it('reserva entra numa vaga e o titular vai para o lugar dele no banco', () => {
    const slots = currentSlots(l, get);
    const titular = slots[5];
    const reserva = l.bench[2];
    placeInSlot(l, get, 5, reserva);
    expect(currentSlots(l, get)[5]).toBe(reserva);
    expect(l.bench[2]).toBe(titular);
    expect(l.starters).toHaveLength(11);
  });

  it('dois titulares trocam de vaga', () => {
    const slots = currentSlots(l, get);
    const [a, b] = [slots[1], slots[9]];
    placeInSlot(l, get, 1, b);
    const depois = currentSlots(l, get);
    expect(depois[1]).toBe(b);
    expect(depois[9]).toBe(a);
  });

  it('não relacionado entra e quem sai vai para o banco quando há vaga', () => {
    const fora = squadOf(s, 1).find((p) => !l.starters.includes(p.id) && !l.bench.includes(p.id))!;
    unlist(l, l.bench[0]);
    const sai = currentSlots(l, get)[3];
    placeInSlot(l, get, 3, fora.id);
    expect(l.starters).toContain(fora.id);
    expect(l.bench).toContain(sai);
    expect(l.bench.length).toBeLessThanOrEqual(BENCH_SIZE);
  });

  it('titular para o banco e reserva relacionado', () => {
    const id = l.starters[0];
    starterToBench(l, get, id);
    expect(l.starters).not.toContain(id);
    expect(l.bench).toContain(id);
    const fora = squadOf(s, 1).find((p) => !l.starters.includes(p.id) && !l.bench.includes(p.id))!;
    addToBench(l, fora.id, l.bench[0]);
    expect(l.bench).toContain(fora.id);
  });
});
