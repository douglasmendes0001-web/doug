// Clubes sul-americanos (fora do Brasil). Altitude em metros da cidade-sede:
// é ela que alimenta o algoritmo de ar rarefeito.

export type ClubSeedAlt = [name: string, short: string, city: string, altitude: number, c1?: string, c2?: string];

// Argentina — Liga Profesional 2026: 30 clubes em duas zonas de 15.
export const ARG_LPF: ClubSeedAlt[] = [
  ['River Plate', 'RIV', 'Buenos Aires', 25, '#ffffff', '#d0021b'],
  ['Boca Juniors', 'BOC', 'Buenos Aires', 25, '#1f3f99', '#f2c200'],
  ['Racing Club', 'RAC', 'Avellaneda', 25, '#7ab8e8', '#ffffff'],
  ['Estudiantes', 'EST', 'La Plata', 25, '#d0021b', '#ffffff'],
  ['Vélez Sarsfield', 'VEL', 'Buenos Aires', 25, '#ffffff', '#1f3f99'],
  ['Independiente', 'IND', 'Avellaneda', 25, '#d0021b', '#ffffff'],
  ['San Lorenzo', 'SLO', 'Buenos Aires', 25, '#1f3f99', '#d0021b'],
  ['Talleres', 'TAL', 'Córdoba', 390, '#1f3f99', '#ffffff'],
  ['Rosario Central', 'ROS', 'Rosario', 30, '#1f3f99', '#f2c200'],
  ['Argentinos Juniors', 'ARJ', 'Buenos Aires', 25, '#d0021b', '#ffffff'],
  ['Lanús', 'LAN', 'Lanús', 25, '#8a1538', '#ffffff'],
  ["Newell's Old Boys", 'NOB', 'Rosario', 30, '#d0021b', '#111111'],
  ['Huracán', 'HUR', 'Buenos Aires', 25, '#ffffff', '#d0021b'],
  ['Belgrano', 'BEL', 'Córdoba', 390, '#7ab8e8', '#ffffff'],
  ['Defensa y Justicia', 'DYJ', 'Florencio Varela', 25, '#f2c200', '#1b7a3d'],
  ['Tigre', 'TIG', 'Victoria', 10, '#1f3f99', '#d0021b'],
  ['Platense', 'PLA', 'Vicente López', 25, '#8b5a2b', '#ffffff'],
  ['Unión', 'UNI', 'Santa Fe', 20, '#d0021b', '#ffffff'],
  ['Gimnasia LP', 'GLP', 'La Plata', 25, '#1f3f99', '#ffffff'],
  ['Instituto', 'INS', 'Córdoba', 390, '#d0021b', '#ffffff'],
  ['Banfield', 'BAN', 'Banfield', 25, '#1b7a3d', '#ffffff'],
  ['Atlético Tucumán', 'ATU', 'Tucumán', 450, '#7ab8e8', '#ffffff'],
  ['Independiente Rivadavia', 'IRI', 'Mendoza', 750, '#1f3f99', '#ffffff'],
  ['Central Córdoba', 'CCO', 'Santiago del Estero', 190, '#111111', '#ffffff'],
  ['Barracas Central', 'BCE', 'Buenos Aires', 25, '#d0021b', '#ffffff'],
  ['Sarmiento', 'SAR', 'Junín', 80, '#1b7a3d', '#ffffff'],
  ['Deportivo Riestra', 'RIE', 'Buenos Aires', 25, '#111111', '#ffffff'],
  ['Aldosivi', 'ALD', 'Mar del Plata', 20, '#1b7a3d', '#f2c200'],
  ['Gimnasia Mendoza', 'GME', 'Mendoza', 750, '#111111', '#ffffff'],
  ['Estudiantes Río Cuarto', 'ERC', 'Río Cuarto', 440, '#2a8fd6', '#ffffff'],
];

export const ARG_NACIONAL: ClubSeedAlt[] = [
  ['Godoy Cruz', 'GOD', 'Mendoza', 750], ['San Martín SJ', 'SMJ', 'San Juan', 650], ['Colón', 'COL', 'Santa Fe', 20],
  ['Arsenal', 'ARS', 'Sarandí', 25], ['Quilmes', 'QUI', 'Quilmes', 25], ['Chacarita', 'CHA', 'San Martín', 25],
  ['Ferro Carril Oeste', 'FCO', 'Buenos Aires', 25], ['San Martín Tucumán', 'SMT', 'Tucumán', 450], ['Atlanta', 'ATL', 'Buenos Aires', 25],
  ['All Boys', 'ALB', 'Buenos Aires', 25], ['Almagro', 'ALM', 'José Ingenieros', 25], ['Deportivo Morón', 'MOR', 'Morón', 25],
  ['Temperley', 'TEM', 'Temperley', 25], ['Patronato', 'PAT', 'Paraná', 70], ['Atlético Rafaela', 'RAF', 'Rafaela', 100],
  ['Gimnasia Jujuy', 'GJU', 'San Salvador de Jujuy', 1260], ['Gimnasia y Tiro', 'GYT', 'Salta', 1150], ['Chaco For Ever', 'CFE', 'Resistencia', 50],
  ['Agropecuario', 'AGR', 'Carlos Casares', 90], ['Deportivo Maipú', 'MAI', 'Maipú', 800], ['Mitre', 'MIT', 'Santiago del Estero', 190],
  ['Tristán Suárez', 'TSU', 'Tristán Suárez', 25], ['Racing de Córdoba', 'RCO', 'Córdoba', 390], ['Deportivo Madryn', 'DMA', 'Puerto Madryn', 10],
  ['Güemes', 'GUE', 'Santiago del Estero', 190], ['Alvarado', 'ALV', 'Mar del Plata', 20], ['Brown de Adrogué', 'BRO', 'Adrogué', 25],
  ['Los Andes', 'LAN', 'Lomas de Zamora', 25], ['Defensores de Belgrano', 'DBE', 'Buenos Aires', 25], ['Estudiantes BA', 'EBA', 'Caseros', 25],
  ['Nueva Chicago', 'NCH', 'Buenos Aires', 25], ['San Telmo', 'STE', 'Isla Maciel', 25], ['Central Norte', 'CNO', 'Salta', 1150],
  ['Ciudad de Bolívar', 'CBO', 'Bolívar', 100], ['Colegiales', 'CLG', 'Munro', 25], ['Talleres RE', 'TRE', 'Remedios de Escalada', 25],
];

// Chile — Liga de Primera 2026 (16 clubes, 2 rebaixados) e Liga de Ascenso.
export const CHI_PRIMERA: ClubSeedAlt[] = [
  ['Colo-Colo', 'CCO', 'Santiago', 570, '#ffffff', '#111111'],
  ['Universidad de Chile', 'UCH', 'Santiago', 570, '#1f3f99', '#d0021b'],
  ['Universidad Católica', 'UCA', 'Santiago', 570, '#ffffff', '#1f3f99'],
  ['Palestino', 'PAL', 'Santiago', 570, '#1b7a3d', '#d0021b'],
  ['Huachipato', 'HUA', 'Talcahuano', 10], ['Cobresal', 'COB', 'El Salvador', 2300], ["O'Higgins", 'OHI', 'Rancagua', 500],
  ['Audax Italiano', 'AUD', 'Santiago', 570], ['Everton', 'EVE', 'Viña del Mar', 20], ['Coquimbo Unido', 'COQ', 'Coquimbo', 30],
  ['Ñublense', 'NUB', 'Chillán', 120], ['Unión La Calera', 'ULC', 'La Calera', 200], ['Deportes La Serena', 'LSE', 'La Serena', 30],
  ['Deportes Limache', 'LIM', 'Limache', 100], ['Universidad de Concepción', 'UDC', 'Concepción', 10], ['Deportes Concepción', 'DCO', 'Concepción', 10],
];

export const CHI_ASCENSO: ClubSeedAlt[] = [
  ['Unión Española', 'UES', 'Santiago', 570], ['Deportes Iquique', 'IQU', 'Iquique', 10], ['Cobreloa', 'CLO', 'Calama', 2260],
  ['Santiago Wanderers', 'SWA', 'Valparaíso', 10], ['Deportes Temuco', 'TEM', 'Temuco', 110], ['Rangers', 'RAN', 'Talca', 100],
  ['Magallanes', 'MAG', 'Santiago', 570], ['San Luis', 'SLU', 'Quillota', 130], ['Deportes Antofagasta', 'ANT', 'Antofagasta', 10],
  ['Deportes Copiapó', 'COP', 'Copiapó', 390], ['Santiago Morning', 'SMO', 'Santiago', 570], ['Curicó Unido', 'CUR', 'Curicó', 230],
  ['Deportes Recoleta', 'REC', 'Santiago', 570], ['San Marcos de Arica', 'SMA', 'Arica', 10], ['Unión San Felipe', 'USF', 'San Felipe', 650],
  ['Deportes Santa Cruz', 'DSC', 'Santa Cruz', 150],
];

// Colômbia — Liga BetPlay (20 clubes; descenso por média de 3 anos).
export const COL_PRIMERA: ClubSeedAlt[] = [
  ['Atlético Nacional', 'NAC', 'Medellín', 1495, '#1b7a3d', '#ffffff'],
  ['Millonarios', 'MIL', 'Bogotá', 2640, '#1f3f99', '#ffffff'],
  ['América de Cali', 'AME', 'Cali', 1000, '#d0021b', '#ffffff'],
  ['Junior', 'JUN', 'Barranquilla', 20, '#d0021b', '#ffffff'],
  ['Independiente Santa Fe', 'SFE', 'Bogotá', 2640, '#d0021b', '#ffffff'],
  ['Deportivo Cali', 'CAL', 'Cali', 1000, '#1b7a3d', '#ffffff'],
  ['Independiente Medellín', 'DIM', 'Medellín', 1495], ['Deportes Tolima', 'TOL', 'Ibagué', 1285], ['Once Caldas', 'ONC', 'Manizales', 2160],
  ['Atlético Bucaramanga', 'BUC', 'Bucaramanga', 960], ['Deportivo Pasto', 'PAS', 'Pasto', 2527], ['Águilas Doradas', 'AGU', 'Rionegro', 2125],
  ['Alianza FC', 'ALI', 'Valledupar', 170], ['Fortaleza CEIF', 'FOR', 'Bogotá', 2640], ['Internacional de Bogotá', 'IBO', 'Bogotá', 2640],
  ['Llaneros', 'LLA', 'Villavicencio', 470], ['Boyacá Chicó', 'BCH', 'Tunja', 2820], ['Deportivo Pereira', 'PER', 'Pereira', 1410],
  ['Cúcuta Deportivo', 'CUC', 'Cúcuta', 320], ['Jaguares de Córdoba', 'JAG', 'Montería', 20],
];

export const COL_ASCENSO: ClubSeedAlt[] = [
  ['Envigado', 'ENV', 'Envigado', 1675], ['Real Cartagena', 'RCA', 'Cartagena', 5], ['Unión Magdalena', 'UMA', 'Santa Marta', 5],
  ['Atlético Huila', 'HUI', 'Neiva', 440], ['Patriotas', 'PAT', 'Tunja', 2820], ['Orsomarso', 'ORS', 'Palmira', 1000],
  ['Real Santander', 'RSA', 'Floridablanca', 960], ['Leones', 'LEO', 'Itagüí', 1550], ['Barranquilla FC', 'BAQ', 'Barranquilla', 20],
  ['Tigres', 'TIG', 'Bogotá', 2640], ['Bogotá FC', 'BFC', 'Bogotá', 2640], ['Deportes Quindío', 'QUI', 'Armenia', 1480],
  ['Inter Palmira', 'IPA', 'Palmira', 1000], ['Atlético FC', 'AFC', 'Cali', 1000], ['Real Soacha', 'RSO', 'Soacha', 2560],
  ['Deportivo Rionegro', 'DRI', 'Rionegro', 2125],
];

// Equador — LigaPro Serie A 2026 (16 clubes, hexagonal pelo título).
export const ECU_SERIE_A: ClubSeedAlt[] = [
  ['LDU Quito', 'LDU', 'Quito', 2850, '#ffffff', '#1f3f99'],
  ['Independiente del Valle', 'IDV', 'Sangolquí', 2500, '#111111', '#1f3f99'],
  ['Barcelona SC', 'BSC', 'Guayaquil', 5, '#f2c200', '#111111'],
  ['Emelec', 'EME', 'Guayaquil', 5, '#1f3f99', '#ffffff'],
  ['Aucas', 'AUC', 'Quito', 2850], ['Universidad Católica', 'UCA', 'Quito', 2850], ['El Nacional', 'ENA', 'Quito', 2850],
  ['Deportivo Cuenca', 'CUE', 'Cuenca', 2550], ['Delfín', 'DEL', 'Manta', 10], ['Orense', 'ORE', 'Machala', 10],
  ['Macará', 'MAC', 'Ambato', 2580], ['Mushuc Runa', 'MUS', 'Ambato', 2580], ['Técnico Universitario', 'TEC', 'Ambato', 2580],
  ['Libertad', 'LIB', 'Loja', 2060], ['Manta FC', 'MAN', 'Manta', 10], ['Leones del Norte', 'LEN', 'Ibarra', 2225],
];

export const ECU_SERIE_B: ClubSeedAlt[] = [
  ['Deportivo Quito', 'DQU', 'Quito', 2850], ['Guayaquil City', 'GCI', 'Guayaquil', 5], ['Imbabura', 'IMB', 'Ibarra', 2225],
  ['Cumbayá', 'CUM', 'Quito', 2850], ['Gualaceo', 'GUA', 'Gualaceo', 2230], ['9 de Octubre', 'NOC', 'Guayaquil', 5],
  ['LDU Portoviejo', 'LDP', 'Portoviejo', 50], ['Chacaritas', 'CHC', 'Pelileo', 2600], ['Vargas Torres', 'VTO', 'Esmeraldas', 10],
  ['América de Quito', 'AMQ', 'Quito', 2850],
];

// Bolívia — División Profesional 2026 (16 clubes). Altitudes extremas.
export const BOL_PRIMERA: ClubSeedAlt[] = [
  ['Bolívar', 'BOL', 'La Paz', 3640, '#7ab8e8', '#ffffff'],
  ['The Strongest', 'STR', 'La Paz', 3640, '#f2c200', '#111111'],
  ['Always Ready', 'ARE', 'El Alto', 4090, '#ffffff', '#d0021b'],
  ['Blooming', 'BLO', 'Santa Cruz de la Sierra', 416, '#7ab8e8', '#ffffff'],
  ['Oriente Petrolero', 'ORI', 'Santa Cruz de la Sierra', 416, '#1b7a3d', '#ffffff'],
  ['Aurora', 'AUR', 'Cochabamba', 2558], ['Guabirá', 'GUA', 'Montero', 300], ['Nacional Potosí', 'NPO', 'Potosí', 3960],
  ['Independiente Petrolero', 'IPE', 'Sucre', 2810], ['Real Tomayapo', 'RTO', 'Tarija', 1854], ['FC Universitario', 'UNV', 'Vinto', 2560],
  ['San Antonio Bulo Bulo', 'SAB', 'Bulo Bulo', 300], ['ABB', 'ABB', 'La Paz', 3640], ['GV San José', 'GVS', 'Oruro', 3735],
  ['Jorge Wilstermann', 'WIL', 'Cochabamba', 2558], ['Real Oruro', 'ROR', 'Oruro', 3735],
];

export const BOL_ASCENSO: ClubSeedAlt[] = [
  ['Royal Pari', 'RPA', 'Santa Cruz de la Sierra', 416], ['Universitario de Sucre', 'USU', 'Sucre', 2810], ['Real Santa Cruz', 'RSC', 'Santa Cruz de la Sierra', 416],
  ['Destroyers', 'DES', 'Santa Cruz de la Sierra', 416], ['Atlético Palmaflor', 'PAF', 'Quillacollo', 2550], ['Libertad Gran Mamoré', 'LGM', 'Trinidad', 155],
  ['Municipal Tiquipaya', 'TIQ', 'Tiquipaya', 2640], ['Universitario de Vinto', 'UVI', 'Vinto', 2560], ['Deportivo Kala', 'KAL', 'Uncía', 3800],
  ['Petrolero de Yacuiba', 'PYA', 'Yacuiba', 620],
];

// Outros países da CONMEBOL (só disputam torneios continentais no jogo).
export const OUTROS_CONMEBOL: Record<'PAR' | 'PER' | 'URU' | 'VEN', ClubSeedAlt[]> = {
  PAR: [
    ['Olimpia', 'OLI', 'Assunção', 140], ['Cerro Porteño', 'CER', 'Assunção', 140], ['Libertad', 'LIB', 'Assunção', 140],
    ['Guaraní', 'GUA', 'Assunção', 140], ['Nacional', 'NAC', 'Assunção', 140], ['Sportivo Luqueño', 'LUQ', 'Luque', 140],
    ['Sportivo Ameliano', 'AME', 'Assunção', 140], ['2 de Mayo', 'DMA', 'Pedro Juan Caballero', 650],
  ],
  PER: [
    ['Universitario', 'UNI', 'Lima', 150], ['Alianza Lima', 'ALI', 'Lima', 150], ['Sporting Cristal', 'SCR', 'Lima', 150],
    ['Melgar', 'MEL', 'Arequipa', 2335], ['Cienciano', 'CIE', 'Cusco', 3399], ['Cusco FC', 'CUS', 'Cusco', 3399],
    ['Alianza Atlético', 'AAT', 'Sullana', 60], ['Sport Huancayo', 'HUA', 'Huancayo', 3259],
  ],
  URU: [
    ['Peñarol', 'PEN', 'Montevidéu', 40], ['Nacional', 'NAC', 'Montevidéu', 40], ['Liverpool', 'LIV', 'Montevidéu', 40],
    ['Defensor Sporting', 'DEF', 'Montevidéu', 40], ['Danubio', 'DAN', 'Montevidéu', 40], ['Racing', 'RAC', 'Montevidéu', 40],
    ['Boston River', 'BRI', 'Montevidéu', 40], ['Cerro Largo', 'CLA', 'Melo', 100],
  ],
  VEN: [
    ['Caracas', 'CAR', 'Caracas', 900], ['Deportivo Táchira', 'TAC', 'San Cristóbal', 825], ['Carabobo', 'CBO', 'Valencia', 480],
    ['Monagas', 'MON', 'Maturín', 70], ['Academia Puerto Cabello', 'APC', 'Puerto Cabello', 5], ['Universidad Central', 'UCV', 'Caracas', 900],
    ['Deportivo La Guaira', 'LGU', 'Caracas', 900], ['Metropolitanos', 'MET', 'Caracas', 900],
  ],
};
