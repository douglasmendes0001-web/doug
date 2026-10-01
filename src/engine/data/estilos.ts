// Estilos de jogo dos jogadores e estilos táticos do técnico.

import type { Pos } from '../types';

export type EstiloId =
  | 'paredao' | 'libero'
  | 'zag_visionario' | 'zag_barreira'
  | 'lat_visionario' | 'lat_barreira'
  | 'vol_cacador' | 'vol_visionario'
  | 'mei_construtor' | 'mei_veloz' | 'arm_namedida' | 'arm_abrecaminho'
  | 'ata_segundo' | 'ata_pivo' | 'ata_nato';

export interface EstiloJogador {
  id: EstiloId;
  nome: string;
  curto: string;
  descricao: string;
}

export const ESTILOS: Record<EstiloId, EstiloJogador> = {
  paredao: { id: 'paredao', nome: 'Goleiro paredão', curto: 'Paredão', descricao: 'Fica embaixo das traves: chance maior de fazer defesas difíceis.' },
  libero: { id: 'libero', nome: 'Goleiro líbero', curto: 'Líbero', descricao: 'Sai da área e corta lançamentos antes que virem chance.' },
  zag_visionario: { id: 'zag_visionario', nome: 'Zagueiro visionário', curto: 'Visionário', descricao: 'Probabilidade de dar um bom passe para o ataque, criando jogadas.' },
  zag_barreira: { id: 'zag_barreira', nome: 'Zagueiro barreira', curto: 'Barreira', descricao: 'Probabilidade de travar o lance e impedir a finalização.' },
  lat_visionario: { id: 'lat_visionario', nome: 'Lateral visionário', curto: 'Visionário', descricao: 'Probabilidade de chegar ao fundo e cruzar para a área.' },
  lat_barreira: { id: 'lat_barreira', nome: 'Lateral barreira', curto: 'Barreira', descricao: 'Probabilidade de defender as jogadas pelo lado do campo.' },
  vol_cacador: { id: 'vol_cacador', nome: 'Volante caçador', curto: 'Caçador', descricao: 'Probabilidade de roubar a bola no meio-campo e matar a jogada.' },
  vol_visionario: { id: 'vol_visionario', nome: 'Volante visionário', curto: 'Visionário', descricao: 'Probabilidade de achar o passe vertical que inicia o ataque.' },
  mei_construtor: { id: 'mei_construtor', nome: 'Meia de ligação construtor', curto: 'Construtor', descricao: 'Probabilidade de construir jogadas de ataque.' },
  mei_veloz: { id: 'mei_veloz', nome: 'Meia de ligação veloz', curto: 'Veloz', descricao: 'Está em todo o meio-campo: aumenta a posse de bola do time.' },
  arm_namedida: { id: 'arm_namedida', nome: 'Armador "Na medida"', curto: 'Na medida', descricao: 'Probabilidade de dar a assistência perfeita para o gol.' },
  arm_abrecaminho: { id: 'arm_abrecaminho', nome: 'Armador "Abre caminho"', curto: 'Abre caminho', descricao: 'Executa dribles: passa pela marcação que travaria o lance.' },
  ata_segundo: { id: 'ata_segundo', nome: 'Segundo atacante', curto: '2º atacante', descricao: 'Volta para armar as jogadas e ajuda o meio-campo.' },
  ata_pivo: { id: 'ata_pivo', nome: 'Pivô', curto: 'Pivô', descricao: 'Se posiciona para receber, segura a bola e passa para quem chega melhor.' },
  ata_nato: { id: 'ata_nato', nome: 'Atacante nato', curto: 'Nato', descricao: 'Abre espaço e é quem mais finaliza e converte.' },
};

export const ESTILOS_POR_POS: Record<Pos, EstiloId[]> = {
  G: ['paredao', 'libero'],
  ZG: ['zag_visionario', 'zag_barreira'],
  LD: ['lat_visionario', 'lat_barreira'],
  LE: ['lat_visionario', 'lat_barreira'],
  VOL: ['vol_cacador', 'vol_visionario'],
  MEI: ['mei_construtor', 'mei_veloz', 'arm_namedida', 'arm_abrecaminho'],
  ATA: ['ata_segundo', 'ata_pivo', 'ata_nato'],
};

// ---------------- Táticas do técnico ----------------

export type TaticaId =
  | 'equilibrado' | 'posse' | 'tiki' | 'contra' | 'pressao' | 'gegen' | 'retranca' | 'catenaccio'
  | 'aereo' | 'pontas' | 'ligacao' | 'total';

export interface Tatica {
  id: TaticaId;
  nome: string;
  descricao: string;
  /** Multiplicador da posse (razão de meio-campo). */
  posse: number;
  /** Multiplicador das chances criadas pelo próprio time. */
  ataque: number;
  /** Multiplicador das chances que o adversário cria. */
  defesa: number;
  /** Desgaste físico. */
  desgaste: number;
  cartoes: number;
  /** Multiplicador da probabilidade de cruzamentos. */
  cruzamentos: number;
  /** Multiplicador da conversão das finalizações. */
  conversao: number;
  /** Estilos de jogador que rendem mais nessa tática. */
  favorece: EstiloId[];
  /** 0 = simples, 1 = exige técnico muito experiente. */
  complexidade: number;
}

const base = { posse: 1, ataque: 1, defesa: 1, desgaste: 1, cartoes: 1, cruzamentos: 1, conversao: 1 };

export const TATICAS: Tatica[] = [
  { ...base, id: 'equilibrado', nome: 'Equilibrado', descricao: 'Sem riscos: ataca e defende na mesma medida.', favorece: [], complexidade: 0 },
  { ...base, id: 'posse', nome: 'Posse de bola', descricao: 'Toque curto e paciência: mais posse e menos chances do rival.', posse: 1.12, ataque: 0.97, defesa: 0.92,
    favorece: ['mei_construtor', 'arm_namedida', 'vol_visionario', 'zag_visionario'], complexidade: 0.45 },
  { ...base, id: 'tiki', nome: 'Tiki-taka', descricao: 'Posse extrema e triangulações. Exige técnico experiente.', posse: 1.2, defesa: 0.9,
    favorece: ['mei_construtor', 'arm_namedida', 'vol_visionario', 'mei_veloz'], complexidade: 0.85 },
  { ...base, id: 'contra', nome: 'Contra-ataque', descricao: 'Cede a bola e mata em velocidade.', posse: 0.88, ataque: 1.18, defesa: 0.95,
    favorece: ['mei_veloz', 'ata_nato', 'arm_abrecaminho', 'lat_visionario'], complexidade: 0.3 },
  { ...base, id: 'pressao', nome: 'Pressão alta', descricao: 'Marca no campo de ataque: rouba bolas, mas cansa e gera cartões.', ataque: 1.05, defesa: 0.9, desgaste: 1.18, cartoes: 1.15,
    favorece: ['vol_cacador', 'ata_segundo', 'mei_veloz'], complexidade: 0.55 },
  { ...base, id: 'gegen', nome: 'Gegenpressing', descricao: 'Pressão imediata após a perda. Muito intenso e complexo.', ataque: 1.1, defesa: 0.86, desgaste: 1.25, cartoes: 1.2,
    favorece: ['vol_cacador', 'ata_segundo', 'mei_veloz', 'ata_nato'], complexidade: 0.8 },
  { ...base, id: 'retranca', nome: 'Retranca', descricao: 'Ferrolho atrás: quase não sofre chances, quase não cria.', ataque: 0.8, defesa: 0.82, desgaste: 0.95,
    favorece: ['zag_barreira', 'lat_barreira', 'vol_cacador', 'paredao'], complexidade: 0.1 },
  { ...base, id: 'catenaccio', nome: 'Catenaccio', descricao: 'Líbero atrás da zaga e saída rápida pelo atacante.', ataque: 0.9, defesa: 0.86,
    favorece: ['zag_barreira', 'libero', 'ata_nato', 'paredao'], complexidade: 0.5 },
  { ...base, id: 'aereo', nome: 'Jogo aéreo', descricao: 'Cruzamentos para o centroavante.', cruzamentos: 1.7, conversao: 0.97,
    favorece: ['ata_pivo', 'lat_visionario'], complexidade: 0.2 },
  { ...base, id: 'pontas', nome: 'Jogo pelas pontas', descricao: 'Amplitude com laterais e meias abertos.', ataque: 1.05, cruzamentos: 1.4,
    favorece: ['lat_visionario', 'mei_veloz', 'arm_abrecaminho'], complexidade: 0.35 },
  { ...base, id: 'ligacao', nome: 'Ligação direta', descricao: 'Bola longa da defesa para o ataque.', posse: 0.92, ataque: 1.08, conversao: 0.95,
    favorece: ['ata_pivo', 'zag_visionario', 'libero'], complexidade: 0.1 },
  { ...base, id: 'total', nome: 'Futebol total', descricao: 'Todos atacam e todos defendem. Lindo quando funciona, perigoso quando não.', posse: 1.08, ataque: 1.12, defesa: 1.05, desgaste: 1.12,
    favorece: ['zag_visionario', 'lat_visionario', 'vol_visionario', 'mei_construtor', 'ata_segundo'], complexidade: 0.9 },
];

export function taticaById(id: TaticaId | undefined): Tatica {
  return TATICAS.find((t) => t.id === id) ?? TATICAS[0];
}

/**
 * Quão bem o técnico consegue executar a tática (0,4 a 1). Técnicos jovens
 * perdem rendimento em táticas complexas.
 */
export function execucaoTatica(t: Tatica, experiencia: number): number {
  return Math.max(0.4, Math.min(1, 1 - Math.max(0, t.complexidade - experiencia / 100 - 0.15) * 1.2));
}

/** Aplica a execução: os efeitos positivos encolhem, os negativos ficam. */
export function modsEfetivos(t: Tatica, execucao: number) {
  const scale = (v: number, goodIfAbove: boolean) => {
    const good = goodIfAbove ? v > 1 : v < 1;
    return good ? 1 + (v - 1) * execucao : v;
  };
  return {
    posse: scale(t.posse, true),
    ataque: scale(t.ataque, true),
    defesa: scale(t.defesa, false),
    desgaste: t.desgaste,
    cartoes: t.cartoes,
    cruzamentos: scale(t.cruzamentos, true),
    conversao: scale(t.conversao, true),
    /** Penalidade geral quando a execução é ruim. */
    rendimento: 1 - 0.05 * (1 - execucao),
  };
}
