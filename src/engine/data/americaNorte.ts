// Clubes da América do Norte, Central e Caribe (temporada 2026).
// MLS: 30 clubes (27 dos EUA e 3 do Canadá) em duas conferências.
// Liga MX: 18 clubes (o Atlante volta no Apertura 2026 no lugar do Mazatlán).
// Canadian Premier League: 8 clubes. América Central/Caribe: clubes que
// costumam disputar a Concacaf Champions Cup.
// Ordem das listas = força aproximada em 2025 (o primeiro é o mais forte).

import type { CountryCode } from '../types';

export type ClubeNA = [name: string, short: string, city: string, altitude: number, c1: string, c2: string, country?: CountryCode];

export const MLS_LESTE: ClubeNA[] = [
  ['Inter Miami', 'MIA', 'Fort Lauderdale', 5, '#f7b5cd', '#231f20'],
  ['Philadelphia Union', 'PHI', 'Chester', 10, '#071b2c', '#b19b69'],
  ['FC Cincinnati', 'CIN', 'Cincinnati', 150, '#f05323', '#263b80'],
  ['Columbus Crew', 'CLB', 'Columbus', 240, '#fedd00', '#000000'],
  ['Nashville SC', 'NSH', 'Nashville', 150, '#ece83a', '#1f1646'],
  ['Charlotte FC', 'CLT', 'Charlotte', 230, '#1a85c8', '#000000'],
  ['New York City FC', 'NYC', 'Nova York', 10, '#6cace4', '#041e42'],
  ['Orlando City', 'ORL', 'Orlando', 30, '#633492', '#fde192'],
  ['Chicago Fire', 'CHI', 'Chicago', 180, '#c8102e', '#141946'],
  ['New York Red Bulls', 'NYR', 'Harrison', 10, '#ffffff', '#ed1e36'],
  ['Atlanta United', 'ATL', 'Atlanta', 320, '#80000a', '#221f1f'],
  ['D.C. United', 'DCU', 'Washington', 10, '#000000', '#ef3e42'],
  ['New England Revolution', 'NE', 'Foxborough', 80, '#0a2240', '#ce0e2d'],
  ['Toronto FC', 'TOR', 'Toronto', 80, '#b81137', '#455560', 'CAN'],
  ['CF Montréal', 'MTL', 'Montreal', 30, '#0033a0', '#000000', 'CAN'],
];

export const MLS_OESTE: ClubeNA[] = [
  ['Vancouver Whitecaps', 'VAN', 'Vancouver', 10, '#12284c', '#9dc2ea', 'CAN'],
  ['LAFC', 'LAFC', 'Los Angeles', 90, '#000000', '#c39e6d'],
  ['Seattle Sounders', 'SEA', 'Seattle', 50, '#5d9741', '#005595'],
  ['San Diego FC', 'SD', 'San Diego', 20, '#1b1b1b', '#3bb4e5'],
  ['Minnesota United', 'MIN', 'Saint Paul', 250, '#8cd2f4', '#231f20'],
  ['Austin FC', 'ATX', 'Austin', 150, '#00b140', '#000000'],
  ['Portland Timbers', 'POR', 'Portland', 15, '#004812', '#ebe72b'],
  ['Real Salt Lake', 'RSL', 'Sandy', 1370, '#b30838', '#013a81'],
  ['LA Galaxy', 'LA', 'Carson', 20, '#00245d', '#ffd200'],
  ['Colorado Rapids', 'COL', 'Commerce City', 1580, '#862633', '#8cb8e4'],
  ['Houston Dynamo', 'HOU', 'Houston', 15, '#ff6b00', '#101820'],
  ['San Jose Earthquakes', 'SJ', 'San José', 25, '#0067b1', '#000000'],
  ['FC Dallas', 'DAL', 'Frisco', 200, '#e81f3e', '#2a4076'],
  ['Sporting Kansas City', 'SKC', 'Kansas City', 280, '#93b1d7', '#002f65'],
  ['St. Louis City', 'STL', 'St. Louis', 140, '#dd004a', '#0f1131'],
];

export const LIGA_MX: ClubeNA[] = [
  ['Toluca', 'TOL', 'Toluca', 2660, '#da291c', '#ffffff'],
  ['Cruz Azul', 'CAZ', 'Cidade do México', 2240, '#003da5', '#ffffff'],
  ['América', 'AME', 'Cidade do México', 2240, '#ffe600', '#002b5c'],
  ['Tigres UANL', 'TIG', 'Monterrey', 540, '#fdb913', '#00539f'],
  ['Monterrey', 'MTY', 'Monterrey', 540, '#0b2240', '#ffffff'],
  ['Pachuca', 'PAC', 'Pachuca', 2400, '#002b5c', '#ffffff'],
  ['Pumas UNAM', 'PUM', 'Cidade do México', 2240, '#0f2341', '#c9a227'],
  ['Guadalajara', 'GDL', 'Guadalajara', 1560, '#cd1041', '#ffffff'],
  ['León', 'LEO', 'León', 1815, '#006341', '#ffffff'],
  ['Atlas', 'ATS', 'Guadalajara', 1560, '#c8102e', '#000000'],
  ['Necaxa', 'NEC', 'Aguascalientes', 1880, '#d71920', '#ffffff'],
  ['Juárez', 'JUA', 'Ciudad Juárez', 1140, '#e30613', '#7ab800'],
  ['Tijuana', 'TIJ', 'Tijuana', 20, '#c8102e', '#000000'],
  ['Santos Laguna', 'SAN', 'Torreón', 1120, '#00843d', '#ffffff'],
  ['Atlético San Luis', 'ASL', 'San Luis Potosí', 1860, '#d50032', '#002f6c'],
  ['Querétaro', 'QRO', 'Querétaro', 1820, '#1b4f8c', '#000000'],
  ['Puebla', 'PUE', 'Puebla', 2135, '#ffffff', '#0047bb'],
  ['Atlante', 'ATE', 'Cidade do México', 2240, '#0039a6', '#d50032'],
];

export const CPL: ClubeNA[] = [
  ['Forge FC', 'FOR', 'Hamilton', 100, '#f1592a', '#393a3c'],
  ['Atlético Ottawa', 'OTT', 'Ottawa', 70, '#d50032', '#ffffff'],
  ['Cavalry FC', 'CAV', 'Calgary', 1045, '#00573f', '#da291c'],
  ['Pacific FC', 'PAC', 'Langford', 50, '#582c83', '#00b2a9'],
  ['Vancouver FC', 'VFC', 'Langley', 10, '#000000', '#c8102e'],
  ['York United', 'YRK', 'Toronto', 80, '#2f2f2f', '#c69214'],
  ['HFX Wanderers', 'HFX', 'Halifax', 30, '#41b6e6', '#002f6c'],
  ['Valour FC', 'VAL', 'Winnipeg', 240, '#782f40', '#b1975b'],
];

/** América Central e Caribe: só disputam torneios internacionais no jogo. */
export const CENTRO_CARIBE: ClubeNA[] = [
  ['Saprissa', 'SAP', 'San José', 1170, '#6a2c91', '#ffffff', 'CRC'],
  ['Alajuelense', 'ALA', 'Alajuela', 950, '#c4161c', '#111111', 'CRC'],
  ['Herediano', 'HER', 'Heredia', 1150, '#c4161c', '#f2c200', 'CRC'],
  ['Olimpia', 'OLI', 'Tegucigalpa', 990, '#ffffff', '#1f3f99', 'HON'],
  ['Motagua', 'MOT', 'Tegucigalpa', 990, '#1f3f99', '#ffffff', 'HON'],
  ['Comunicaciones', 'COM', 'Cidade da Guatemala', 1500, '#ffffff', '#111111', 'GUA'],
  ['Municipal', 'MUN', 'Cidade da Guatemala', 1500, '#c4161c', '#1f3f99', 'GUA'],
  ['Alianza', 'ALI', 'San Salvador', 660, '#ffffff', '#1f3f99', 'SLV'],
  ['Plaza Amador', 'PLA', 'Cidade do Panamá', 10, '#c4161c', '#ffffff', 'PAN'],
  ['Cavalier', 'CAV', 'Kingston', 10, '#111111', '#ffffff', 'JAM'],
  ['Mount Pleasant', 'MPL', 'Ocho Rios', 10, '#1b7a3d', '#f2c200', 'JAM'],
];

/** Quais países do Caribe (para as vagas da Concacaf). */
export const CARIBE: CountryCode[] = ['JAM'];
