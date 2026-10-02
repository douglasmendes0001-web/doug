// Formações (esquemas táticos) inspiradas nas disponíveis no EA FC e no
// eFootball, separadas por categoria. Cada esquema tem 11 vagas com posição,
// lado do campo (para pé dominante) e coordenadas para desenhar o campinho.
// x: 0 = lado esquerdo, 100 = lado direito. y: 0 = próprio gol, 100 = ataque.

import type { Pos } from '../types';

export type Lado = 'E' | 'C' | 'D';
export type CategoriaFormacao = 'ofensiva' | 'defensiva' | 'posse' | 'equilibrada' | 'contra-ataque';

export interface SlotFormacao {
  pos: Pos;
  lado: Lado;
  x: number;
  y: number;
}

export interface Esquema {
  id: string;
  nome: string;
  categoria: CategoriaFormacao;
  descricao: string;
  /** 11 vagas; a primeira é sempre o goleiro. */
  slots: SlotFormacao[];
  custom?: boolean;
}

export const CATEGORIA_LABEL: Record<CategoriaFormacao, string> = {
  ofensiva: 'Ofensivas',
  'contra-ataque': 'Contra-ataque',
  posse: 'Posse de bola',
  equilibrada: 'Equilibradas',
  defensiva: 'Defensivas',
};

const s = (pos: Pos, lado: Lado, x: number, y: number): SlotFormacao => ({ pos, lado, x, y });
const GK = s('G', 'C', 50, 5);
const QUATRO = [s('LE', 'E', 12, 28), s('ZG', 'C', 37, 20), s('ZG', 'C', 63, 20), s('LD', 'D', 88, 28)];
const TRES = [s('ZG', 'C', 25, 20), s('ZG', 'C', 50, 18), s('ZG', 'C', 75, 20)];
const CINCO = [s('LE', 'E', 8, 34), s('ZG', 'C', 28, 20), s('ZG', 'C', 50, 18), s('ZG', 'C', 72, 20), s('LD', 'D', 92, 34)];
const ALAS = [s('LE', 'E', 8, 52), s('LD', 'D', 92, 52)];

const f = (id: string, nome: string, categoria: CategoriaFormacao, descricao: string, slots: SlotFormacao[]): Esquema => ({
  id, nome, categoria, descricao, slots: [GK, ...slots],
});

export const FORMACOES_PADRAO: Esquema[] = [
  // ---------- Ofensivas ----------
  f('4-3-3', '4-3-3', 'ofensiva', 'Três atacantes com pontas abertos. Pressiona alto e ataca pelos lados.', [
    ...QUATRO, s('VOL', 'C', 50, 46), s('MEI', 'C', 32, 54), s('MEI', 'C', 68, 54),
    s('ATA', 'E', 15, 80), s('ATA', 'C', 50, 86), s('ATA', 'D', 85, 80)]),
  f('4-2-1-3', '4-2-1-3', 'ofensiva', 'Destaque do FC 25/26 e do eFootball: dois volantes seguram e o tridente ataca.', [
    ...QUATRO, s('VOL', 'C', 37, 42), s('VOL', 'C', 63, 42), s('MEI', 'C', 50, 62),
    s('ATA', 'E', 15, 82), s('ATA', 'C', 50, 87), s('ATA', 'D', 85, 82)]),
  f('4-1-2-3', '4-1-2-3', 'ofensiva', 'Variação do eFootball: um volante protege e dois meias abastecem o trio da frente.', [
    ...QUATRO, s('VOL', 'C', 50, 40), s('MEI', 'C', 33, 58), s('MEI', 'C', 67, 58),
    s('ATA', 'E', 15, 82), s('ATA', 'C', 50, 87), s('ATA', 'D', 85, 82)]),
  f('4-2-4', '4-2-4', 'ofensiva', 'Tudo para frente: quatro atacantes e só dois no meio. Arriscado.', [
    ...QUATRO, s('VOL', 'C', 37, 45), s('MEI', 'C', 63, 48),
    s('ATA', 'E', 12, 80), s('ATA', 'C', 38, 86), s('ATA', 'C', 62, 86), s('ATA', 'D', 88, 80)]),
  f('4-2-2-2', '4-2-2-2 (quadrado)', 'ofensiva', 'O "quadrado mágico": dois volantes, dois meias por dentro e dois atacantes.', [
    ...QUATRO, s('VOL', 'C', 37, 42), s('VOL', 'C', 63, 42), s('MEI', 'E', 25, 66), s('MEI', 'D', 75, 66),
    s('ATA', 'C', 38, 86), s('ATA', 'C', 62, 86)]),
  f('3-4-3', '3-4-3', 'ofensiva', 'Três zagueiros, alas por todo o corredor e tridente no ataque.', [
    ...TRES, ...ALAS, s('VOL', 'C', 37, 45), s('VOL', 'C', 63, 45),
    s('ATA', 'E', 18, 80), s('ATA', 'C', 50, 87), s('ATA', 'D', 82, 80)]),
  f('3-4-1-2', '3-4-1-2', 'ofensiva', 'Meia de ligação atrás de dois atacantes, alas dando largura.', [
    ...TRES, ...ALAS, s('VOL', 'C', 37, 44), s('VOL', 'C', 63, 44), s('MEI', 'C', 50, 65),
    s('ATA', 'C', 38, 86), s('ATA', 'C', 62, 86)]),

  // ---------- Contra-ataque ----------
  f('4-4-2', '4-4-2', 'equilibrada', 'O clássico: duas linhas de quatro e dupla de ataque.', [
    ...QUATRO, s('MEI', 'E', 12, 54), s('VOL', 'C', 37, 48), s('VOL', 'C', 63, 48), s('MEI', 'D', 88, 54),
    s('ATA', 'C', 38, 84), s('ATA', 'C', 62, 84)]),
  f('5-2-3', '5-2-3', 'contra-ataque', 'Fecha com cinco atrás e sai em velocidade com três na frente.', [
    ...CINCO, s('VOL', 'C', 37, 45), s('VOL', 'C', 63, 45),
    s('ATA', 'E', 18, 78), s('ATA', 'C', 50, 85), s('ATA', 'D', 82, 78)]),
  f('5-2-1-2', '5-2-1-2', 'contra-ataque', 'Muito popular no FC 25/26: defesa sólida e transição pelo meia central.', [
    ...CINCO, s('VOL', 'C', 37, 44), s('VOL', 'C', 63, 44), s('MEI', 'C', 50, 63),
    s('ATA', 'C', 38, 84), s('ATA', 'C', 62, 84)]),

  // ---------- Posse de bola ----------
  f('4-2-3-1', '4-2-3-1', 'posse', 'Dois volantes, linha de três meias e um centroavante. Ótimo para controlar o jogo.', [
    ...QUATRO, s('VOL', 'C', 37, 42), s('VOL', 'C', 63, 42),
    s('MEI', 'E', 15, 66), s('MEI', 'C', 50, 66), s('MEI', 'D', 85, 66), s('ATA', 'C', 50, 86)]),
  f('4-3-3-f9', '4-3-3 (falso 9)', 'posse', 'O centroavante recua para tabelar; os pontas atacam o espaço.', [
    ...QUATRO, s('VOL', 'C', 50, 42), s('MEI', 'C', 32, 56), s('MEI', 'C', 68, 56),
    s('ATA', 'E', 15, 80), s('MEI', 'C', 50, 74), s('ATA', 'D', 85, 80)]),
  f('4-1-2-1-2', '4-1-2-1-2 (losango)', 'posse', 'Losango no meio: superioridade central e dois atacantes.', [
    ...QUATRO, s('VOL', 'C', 50, 40), s('MEI', 'C', 30, 55), s('MEI', 'C', 70, 55), s('MEI', 'C', 50, 68),
    s('ATA', 'C', 38, 86), s('ATA', 'C', 62, 86)]),
  f('4-3-2-1', '4-3-2-1 (árvore de natal)', 'posse', 'Três no meio e dois meias por trás do centroavante.', [
    ...QUATRO, s('MEI', 'C', 28, 48), s('VOL', 'C', 50, 44), s('MEI', 'C', 72, 48),
    s('MEI', 'C', 35, 70), s('MEI', 'C', 65, 70), s('ATA', 'C', 50, 87)]),
  f('4-3-1-2', '4-3-1-2', 'posse', 'Trio de meio-campo, um camisa 10 e dois atacantes.', [
    ...QUATRO, s('MEI', 'C', 28, 50), s('VOL', 'C', 50, 44), s('MEI', 'C', 72, 50), s('MEI', 'C', 50, 66),
    s('ATA', 'C', 38, 86), s('ATA', 'C', 62, 86)]),
  f('3-4-2-1', '3-4-2-1', 'posse', 'Três zagueiros, alas e dois meias por dentro atrás do 9.', [
    ...TRES, ...ALAS, s('VOL', 'C', 37, 44), s('VOL', 'C', 63, 44),
    s('MEI', 'C', 35, 70), s('MEI', 'C', 65, 70), s('ATA', 'C', 50, 87)]),
  f('3-2-4-1', '3-2-4-1', 'posse', 'Do eFootball: muitos triângulos de passe e superioridade no meio.', [
    ...TRES, s('VOL', 'C', 37, 40), s('VOL', 'C', 63, 40),
    s('LE', 'E', 10, 64), s('MEI', 'C', 37, 66), s('MEI', 'C', 63, 66), s('LD', 'D', 90, 64), s('ATA', 'C', 50, 87)]),
  f('3-1-4-2', '3-1-4-2', 'posse', 'Um volante na frente da zaga e linha de quatro no meio.', [
    ...TRES, s('VOL', 'C', 50, 38), s('LE', 'E', 10, 58), s('MEI', 'C', 37, 58), s('MEI', 'C', 63, 58), s('LD', 'D', 90, 58),
    s('ATA', 'C', 38, 85), s('ATA', 'C', 62, 85)]),

  // ---------- Equilibradas ----------
  f('4-4-1-1', '4-4-1-1', 'equilibrada', 'Como o 4-4-2, mas com um segundo atacante mais recuado.', [
    ...QUATRO, s('MEI', 'E', 12, 52), s('VOL', 'C', 37, 46), s('VOL', 'C', 63, 46), s('MEI', 'D', 88, 52),
    s('MEI', 'C', 50, 70), s('ATA', 'C', 50, 86)]),
  f('4-1-3-2', '4-1-3-2', 'equilibrada', 'Volante de proteção, três meias e dupla de ataque.', [
    ...QUATRO, s('VOL', 'C', 50, 40), s('MEI', 'E', 18, 60), s('MEI', 'C', 50, 60), s('MEI', 'D', 82, 60),
    s('ATA', 'C', 38, 85), s('ATA', 'C', 62, 85)]),
  f('3-5-2', '3-5-2', 'equilibrada', 'Três zagueiros, alas e um meio-campo povoado.', [
    ...TRES, ...ALAS, s('VOL', 'C', 37, 44), s('VOL', 'C', 63, 44), s('MEI', 'C', 50, 62),
    s('ATA', 'C', 38, 84), s('ATA', 'C', 62, 84)]),

  // ---------- Defensivas ----------
  f('4-1-4-1', '4-1-4-1', 'defensiva', 'Linha de quatro meias protegida por um volante. Compacta.', [
    ...QUATRO, s('VOL', 'C', 50, 36), s('MEI', 'E', 14, 55), s('MEI', 'C', 38, 54), s('MEI', 'C', 62, 54), s('MEI', 'D', 86, 55),
    s('ATA', 'C', 50, 82)]),
  f('4-5-1', '4-5-1', 'defensiva', 'Meio-campo cheio e um atacante isolado.', [
    ...QUATRO, s('VOL', 'C', 37, 40), s('VOL', 'C', 63, 40), s('MEI', 'E', 14, 55), s('MEI', 'C', 50, 56), s('MEI', 'D', 86, 55),
    s('ATA', 'C', 50, 80)]),
  f('5-3-2', '5-3-2', 'defensiva', 'Cinco atrás e três volantes/meias: difícil de ser vazado.', [
    ...CINCO, s('VOL', 'C', 50, 42), s('MEI', 'C', 30, 52), s('MEI', 'C', 70, 52),
    s('ATA', 'C', 38, 82), s('ATA', 'C', 62, 82)]),
  f('5-4-1', '5-4-1', 'defensiva', 'O ferrolho: duas linhas baixas e um atacante para segurar a bola.', [
    ...CINCO, s('MEI', 'E', 15, 50), s('VOL', 'C', 38, 46), s('VOL', 'C', 62, 46), s('MEI', 'D', 85, 50),
    s('ATA', 'C', 50, 78)]),
];

export const MAX_FORMACOES_PERSONALIZADAS = 5;

export function presetById(id: string): Esquema | undefined {
  return FORMACOES_PADRAO.find((x) => x.id === id);
}

/** Esquema de uma escalação: personalizado (copiado na escalação) ou padrão. */
export function esquemaOf(l: { formation: string; esquema?: Esquema }): Esquema {
  return l.esquema ?? presetById(l.formation) ?? FORMACOES_PADRAO.find((x) => x.id === '4-4-2')!;
}

export function formationCounts(e: Esquema): Record<Pos, number> {
  const c: Record<Pos, number> = { G: 0, LD: 0, ZG: 0, LE: 0, VOL: 0, MEI: 0, ATA: 0 };
  for (const sl of e.slots) c[sl.pos]++;
  return c;
}

/** Valida um esquema personalizado. Retorna mensagem de erro ou null. */
export function validateEsquema(e: Esquema): string | null {
  if (e.slots.length !== 11) return 'A formação precisa ter 11 vagas.';
  if (e.slots[0].pos !== 'G' || e.slots.filter((x) => x.pos === 'G').length !== 1) return 'Precisa ter exatamente um goleiro.';
  const c = formationCounts(e);
  const def = c.ZG + c.LD + c.LE;
  if (def < 3) return 'Coloque pelo menos 3 defensores (zagueiros ou laterais).';
  if (c.ATA > 5) return 'No máximo 5 atacantes.';
  if (c.ZG < 1) return 'Coloque pelo menos um zagueiro.';
  return null;
}

/** Nome automático com base nas linhas (ex.: 4-3-3). */
export function lineName(e: Esquema): string {
  const outfield = e.slots.slice(1).map((sl) => sl.y).sort((a, b) => a - b);
  const lines: number[] = [];
  let start = -100;
  for (const y of outfield) {
    if (y - start > 12) {
      lines.push(1);
      start = y;
    } else lines[lines.length - 1]++;
  }
  return lines.join('-');
}

/**
 * Modificadores do esquema no motor: largura gera cruzamentos; meio-campo
 * central povoado aumenta a posse.
 */
export function esquemaMods(e: Esquema): { cruzamentos: number; posse: number } {
  const largura = e.slots.filter((sl) => sl.lado !== 'C' && (sl.pos === 'MEI' || sl.pos === 'ATA' || sl.y >= 45)).length;
  const centro = e.slots.filter((sl) => sl.lado === 'C' && (sl.pos === 'VOL' || sl.pos === 'MEI')).length;
  return { cruzamentos: 1 + 0.07 * (largura - 2), posse: 1 + 0.035 * (centro - 3) };
}
