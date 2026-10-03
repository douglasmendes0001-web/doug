import { describe, expect, it } from 'vitest';
import { HABILIDADES_POR_POS } from '../src/engine/data/habilidades';
import { EDITOR_SEED, addPlayer, editClub, editPlayer, removePlayer, toggleAbility } from '../src/engine/editor';
import { abilityCount } from '../src/engine/players';
import { newGame } from '../src/engine/season';
import { createWorld } from '../src/engine/world';

describe('modo editor', () => {
  it('cria jogador com 15 anos e edita força, estrelas, estilo e habilidades', () => {
    const w = createWorld(EDITOR_SEED);
    const clubId = 1;
    const p = addPlayer(w, clubId, 'ATA');
    expect(p.age).toBe(15);
    expect(w.clubs[clubId].playerIds).toContain(p.id);
    expect(w.players[p.id]).toBe(p);

    // Estrelas seguem a força: pedir 7★ leva a força para a faixa (105+).
    editPlayer(w, p.id, { force: 99, stars: 7, style: 'ata_pivo', name: 'Craque do Editor' });
    expect(p.force).toBe(105);
    expect(p.stars).toBe(7);
    editPlayer(w, p.id, { force: 99 });
    expect(p.stars).toBe(6);
    editPlayer(w, p.id, { stars: 7 });
    expect(p.style).toBe('ata_pivo');
    expect(p.abilities.length).toBe(abilityCount(7));

    // Diminuir estrelas corta habilidades excedentes.
    editPlayer(w, p.id, { stars: 2 });
    expect(p.abilities.length).toBe(4);
    // Limite de habilidades e posição validados.
    const livre = HABILIDADES_POR_POS.ATA.find((h) => !p.abilities.includes(h.id))!;
    expect(toggleAbility(w, p.id, livre.id)).toMatch(/no máximo 4/);
    expect(toggleAbility(w, p.id, HABILIDADES_POR_POS.G[0].id)).toMatch(/outra posição/);
    toggleAbility(w, p.id, p.abilities[0]);
    expect(p.abilities.length).toBe(3);

    // Trocar de posição troca estilo e habilidades.
    editPlayer(w, p.id, { pos: 'G' });
    expect(p.style === 'paredao' || p.style === 'libero').toBe(true);
    for (const id of p.abilities) expect(HABILIDADES_POR_POS.G.some((h) => h.id === id)).toBe(true);
  });

  it('edições do clube e exclusões valem numa nova carreira', () => {
    const w = createWorld(EDITOR_SEED);
    editClub(w, 0, { name: 'Clube Editado FC', ct: 5 });
    const removido = w.clubs[0].playerIds[0];
    expect(removePlayer(w, removido)).toBeNull();
    const s = newGame({ seed: 1, coach: { name: 'T', age: 40, nat: 'ARG', exPlayer: false, career: null, titulosCarreira: false }, clubId: 0, settings: { halfSeconds: 15, mundialAnual: false } }, structuredClone(w));
    expect(s.clubs[0].name).toBe('Clube Editado FC');
    expect(s.clubs[0].playerIds).not.toContain(removido);
    expect(s.coach.nat).toBe('ARG');
  });
});
