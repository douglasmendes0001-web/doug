// História real dos clubes das Américas até 2025: títulos mundiais (reconhecidos
// pela FIFA ou não), títulos internacionais e campanhas/ídolos lendários. Define
// a projeção do clube fora do país (prestígio), usada por exemplo para atrair
// craques das 5 grandes ligas europeias.
//
// Fontes: FIFA (em 2017 reconheceu os vencedores da Copa Intercontinental
// 1960-2004 como campeões mundiais; em 2014 confirmou a Copa Rio 1951 como
// primeiro torneio mundial de clubes), CONMEBOL, CONCACAF e Wikipédia.

export type Prestigio = 0 | 1 | 2 | 3 | 4;

export const PRESTIGIO_LABEL: Record<Prestigio, string> = {
  0: 'Regional',
  1: 'Nacional',
  2: 'Continental',
  3: 'Intercontinental',
  4: 'Mundial',
};

export interface TituloMundial {
  titulo: string;
  ano: number;
  /** Reconhecido oficialmente pela FIFA como título mundial. */
  fifa: boolean;
}

export interface HistoriaClube {
  mundiais?: TituloMundial[];
  /** Títulos internacionais (continentais e interconfederações). */
  internacionais?: string[];
  /** Campanhas lendárias e ídolos que fizeram história (também na seleção). */
  lenda?: string;
  /** Força um nível (ex.: finalista continental = 2). */
  nivel?: Prestigio;
}

/** Copa Intercontinental 1960-2004: a FIFA reconheceu os vencedores como campeões mundiais em 2017. */
const I = (...anos: number[]): TituloMundial[] => anos.map((ano) => ({ titulo: 'Copa Intercontinental', ano, fifa: true }));
const CWC = (...anos: number[]): TituloMundial[] => anos.map((ano) => ({ titulo: 'Mundial de Clubes FIFA', ano, fifa: true }));

/** Chave: "PAÍS:Nome do clube" (o mesmo nome existe em países diferentes). */
export const HISTORIA: Record<string, HistoriaClube> = {
  // ---------------- Brasil ----------------
  'BRA:Flamengo': {
    mundiais: I(1981),
    internacionais: ['Libertadores (1981, 2019, 2022, 2025)', 'Recopa Sul-Americana (2020)', 'Copa Mercosul (1999)', 'Copa de Ouro (1996)'],
    lenda: 'Zico e a geração de 1981; primeiro brasileiro tetracampeão da Libertadores.',
  },
  'BRA:Palmeiras': {
    mundiais: [{ titulo: 'Copa Rio (FIFA confirmou em 2014 como 1º torneio mundial de clubes; tema polêmico)', ano: 1951, fifa: true }],
    internacionais: ['Libertadores (1999, 2020, 2021)', 'Copa Mercosul (1998)'],
    lenda: 'Academia de Ademir da Guia nos anos 60 e 70.',
  },
  'BRA:São Paulo': {
    mundiais: [...I(1992, 1993), ...CWC(2005), { titulo: 'Pequeña Copa del Mundo', ano: 1955, fifa: false }],
    internacionais: ['Libertadores (1992, 1993, 2005)', 'Sul-Americana (2012)', 'Recopa (1993, 1994)', 'Supercopa (1993)', 'Copa Conmebol (1994)'],
    lenda: 'Telê Santana, Raí e Rogério Ceni.',
  },
  'BRA:Santos': {
    mundiais: I(1962, 1963),
    internacionais: ['Libertadores (1962, 1963, 2011)', 'Recopa (2012)', 'Copa Conmebol (1998)'],
    lenda: 'Pelé, o maior de todos: o Santos excursionou pelo mundo e é conhecido em todos os continentes.',
  },
  'BRA:Corinthians': {
    mundiais: [...CWC(2000, 2012), { titulo: 'Pequeña Copa del Mundo', ano: 1953, fifa: false }],
    internacionais: ['Libertadores (2012)', 'Recopa (2013)'],
    lenda: 'Democracia Corinthiana de Sócrates.',
  },
  'BRA:Grêmio': {
    mundiais: I(1983),
    internacionais: ['Libertadores (1983, 1995, 2017)', 'Recopa (1996, 2018)'],
    lenda: 'Renato Gaúcho, herói do Mundial de 1983.',
  },
  'BRA:Internacional': {
    mundiais: CWC(2006),
    internacionais: ['Libertadores (2006, 2010)', 'Sul-Americana (2008)', 'Recopa (2007, 2011)'],
    lenda: 'Falcão e o Inter invicto de 1979.',
  },
  'BRA:Fluminense': {
    mundiais: [{ titulo: 'Copa Rio (não reconhecida pela FIFA)', ano: 1952, fifa: false }],
    internacionais: ['Libertadores (2023)', 'Recopa (2024)'],
  },
  'BRA:Vasco': {
    mundiais: [{ titulo: 'Torneio Octogonal Rivadavia (reivindicado, não reconhecido pela FIFA)', ano: 1953, fifa: false }],
    internacionais: ['Libertadores (1998)', 'Campeonato Sul-Americano de Campeões (1948)', 'Copa Mercosul (2000)'],
    lenda: 'Expresso da Vitória, base da seleção de 1950; Romário.',
  },
  'BRA:Botafogo': {
    internacionais: ['Libertadores (2024)', 'Copa Conmebol (1993)'],
    lenda: 'Garrincha, Nilton Santos, Didi e Jairzinho: base das Copas de 1958, 1962 e 1970.',
  },
  'BRA:Cruzeiro': {
    internacionais: ['Libertadores (1976, 1997)', 'Supercopa (1991, 1992)', 'Recopa (1998)'],
    lenda: 'Tostão, campeão do mundo em 1970.',
  },
  'BRA:Atlético-MG': {
    internacionais: ['Libertadores (2013)', 'Recopa (2014)', 'Copa Conmebol (1992, 1997)'],
    lenda: 'Reinaldo e o Galo de Ronaldinho Gaúcho.',
  },
  'BRA:Athletico-PR': { internacionais: ['Sul-Americana (2018, 2021)', 'Copa Suruga (2019)'] },
  'BRA:Chapecoense': { internacionais: ['Sul-Americana (2016, concedida após a tragédia de Medellín)'], lenda: 'Comoção mundial e solidariedade de todo o futebol.' },
  'BRA:Bahia': { lenda: 'Primeiro campeão brasileiro (Taça Brasil de 1959, sobre o Santos de Pelé) e primeiro brasileiro na Libertadores.' },
  'BRA:Red Bull Bragantino': { nivel: 2, lenda: 'Finalista da Sul-Americana de 2021.' },
  'BRA:Fortaleza': { nivel: 2, lenda: 'Finalista da Sul-Americana de 2023.' },
  'BRA:Goiás': { nivel: 2, lenda: 'Finalista da Sul-Americana de 2010.' },
  'BRA:São Caetano': { nivel: 2, lenda: 'Finalista da Libertadores de 2002.' },
  'BRA:Guarani': { nivel: 2, lenda: 'Campeão brasileiro de 1978 e semifinalista da Libertadores de 1979.' },
  'BRA:Coritiba': { nivel: 2, lenda: 'Campeão brasileiro de 1985.' },

  // ---------------- Argentina ----------------
  'ARG:Boca Juniors': {
    mundiais: I(1977, 2000, 2003),
    internacionais: ['Libertadores (1977, 1978, 2000, 2001, 2003, 2007)', 'Sul-Americana (2004, 2005)', 'Recopa (1990, 2005, 2006, 2008)', 'Supercopa (1989)'],
    lenda: 'Maradona e Riquelme.',
  },
  'ARG:River Plate': {
    mundiais: I(1986),
    internacionais: ['Libertadores (1986, 1996, 2015, 2018)', 'Sul-Americana (2014)', 'Supercopa (1997)', 'Recopa (2015, 2016, 2019)'],
    lenda: 'La Máquina dos anos 40 e Di Stéfano.',
  },
  'ARG:Independiente': {
    mundiais: I(1973, 1984),
    internacionais: ['Libertadores (1964, 1965, 1972, 1973, 1974, 1975, 1984)', 'Sul-Americana (2010, 2017)', 'Supercopa (1994, 1995)', 'Recopa (1995)'],
    lenda: 'Rei de Copas: maior campeão da Libertadores.',
  },
  'ARG:Racing Club': {
    mundiais: I(1967),
    internacionais: ['Libertadores (1967)', 'Supercopa (1988)', 'Sul-Americana (2024)', 'Recopa (2025)'],
  },
  'ARG:Estudiantes': {
    mundiais: I(1968),
    internacionais: ['Libertadores (1968, 1969, 1970, 2009)'],
    lenda: 'Tricampeão da Libertadores e campeão do mundo sobre o Manchester United.',
  },
  'ARG:Vélez Sarsfield': {
    mundiais: I(1994),
    internacionais: ['Libertadores (1994)', 'Supercopa (1996)', 'Recopa (1996)'],
    lenda: 'Venceu o Milan na Copa Intercontinental de 1994.',
  },
  'ARG:San Lorenzo': { internacionais: ['Libertadores (2014)', 'Sul-Americana (2002)', 'Copa Mercosul (2001)'] },
  'ARG:Argentinos Juniors': { internacionais: ['Libertadores (1985)'], lenda: 'Berço de Maradona.' },
  'ARG:Lanús': { internacionais: ['Copa Conmebol (1996)', 'Sul-Americana (2013, 2025)'] },
  'ARG:Talleres': { internacionais: ['Copa Conmebol (1999)'] },
  'ARG:Rosario Central': { internacionais: ['Copa Conmebol (1995)'], lenda: 'Clube de formação de Di María; Messi é torcedor declarado.' },
  'ARG:Defensa y Justicia': { internacionais: ['Sul-Americana (2020)', 'Recopa (2021)'] },
  'ARG:Arsenal': { internacionais: ['Sul-Americana (2007)'] },
  'ARG:Tigre': { nivel: 2, lenda: 'Finalista da Sul-Americana de 2012.' },
  'ARG:Colón': { nivel: 2, lenda: 'Finalista da Sul-Americana de 2019.' },
  'ARG:Huracán': { nivel: 2, lenda: 'O Huracán de Menotti (1973).' },
  'ARG:Newell\'s Old Boys': { nivel: 2, lenda: 'Finalista da Libertadores (1988, 1992); clube formador de Messi.' },

  // ---------------- Uruguai, Paraguai, Peru, Venezuela ----------------
  'URU:Peñarol': {
    mundiais: I(1961, 1966, 1982),
    internacionais: ['Libertadores (1960, 1961, 1966, 1982, 1987)'],
  },
  'URU:Nacional': {
    mundiais: I(1971, 1980, 1988),
    internacionais: ['Libertadores (1971, 1980, 1988)', 'Recopa (1989)'],
  },
  'PAR:Olimpia': {
    mundiais: I(1979),
    internacionais: ['Libertadores (1979, 1990, 2002)', 'Supercopa (1990)', 'Recopa (1991, 2003)'],
  },
  'PAR:Cerro Porteño': { nivel: 2, lenda: 'Várias semifinais de Libertadores.' },
  'PAR:Libertad': { nivel: 2, lenda: 'Semifinalista da Libertadores (2006).' },
  'PER:Cienciano': { internacionais: ['Sul-Americana (2003)', 'Recopa (2004)'] },
  'PER:Universitario': { nivel: 2, lenda: 'Finalista da Libertadores (1972).' },
  'PER:Sporting Cristal': { nivel: 2, lenda: 'Finalista da Libertadores (1997).' },
  'PER:Alianza Lima': { nivel: 2, lenda: 'Ídolos como Teófilo Cubillas, gênio da Copa de 1970.' },

  // ---------------- Chile, Colômbia, Equador, Bolívia ----------------
  'CHI:Colo-Colo': { internacionais: ['Libertadores (1991)', 'Recopa (1992)', 'Interamericana (1992)'] },
  'CHI:Universidad de Chile': { internacionais: ['Sul-Americana (2011)'], lenda: 'O "Ballet Azul" dos anos 60, base do Chile de 1962.' },
  'CHI:Universidad Católica': { internacionais: ['Interamericana (1994)'], lenda: 'Finalista da Libertadores (1993).' },
  'CHI:Cobreloa': { nivel: 2, lenda: 'Finalista da Libertadores (1981, 1982).' },
  'COL:Atlético Nacional': { internacionais: ['Libertadores (1989, 2016)', 'Recopa (2017)', 'Copa Merconorte (1998, 2000)', 'Interamericana (1989, 1990)'] },
  'COL:Once Caldas': { internacionais: ['Libertadores (2004)'] },
  'COL:Independiente Santa Fe': { internacionais: ['Sul-Americana (2015)', 'Copa Suruga (2016)'] },
  'COL:Millonarios': {
    mundiais: [{ titulo: 'Pequeña Copa del Mundo (não reconhecida pela FIFA)', ano: 1953, fifa: false }],
    lenda: 'O "Ballet Azul" de Di Stéfano e Pedernera (El Dorado).',
  },
  'COL:América de Cali': { lenda: 'Quatro finais de Libertadores (1985, 1986, 1987, 1996).' },
  'COL:Deportivo Cali': { nivel: 2, lenda: 'Finalista da Libertadores (1978, 1999).' },
  'ECU:LDU Quito': {
    internacionais: ['Libertadores (2008)', 'Sul-Americana (2009)', 'Recopa (2009, 2010)', 'Copa Suruga (2010)'],
    lenda: 'Vice-campeão do Mundial de Clubes de 2008 contra o Manchester United.',
  },
  'ECU:Independiente del Valle': { internacionais: ['Sul-Americana (2019, 2022)', 'Recopa (2023)'], lenda: 'Finalista da Libertadores (2016).' },
  'ECU:Barcelona SC': { nivel: 2, lenda: 'Finalista da Libertadores (1990, 1998).' },
  'ECU:Emelec': { nivel: 2 },
  'BOL:Bolívar': { nivel: 2, lenda: 'Semifinalista da Libertadores (2014), forte na altitude de La Paz.' },
  'BOL:Jorge Wilstermann': { nivel: 2, lenda: 'Quartas de final da Libertadores (2017).' },

  // ---------------- América do Norte ----------------
  'MEX:América': {
    internacionais: ['Concacaf (1977, 1987, 1990, 1992, 2006, 2015, 2016)', 'Interamericana (1977, 1990)'],
    lenda: 'Maior campeão do México; semifinais de Libertadores.',
  },
  'MEX:Cruz Azul': { internacionais: ['Concacaf (1969, 1970, 1971, 1996, 1997, 2014, 2025)'], lenda: 'Finalista da Libertadores (2001).' },
  'MEX:Pachuca': {
    internacionais: ['Concacaf (2002, 2007, 2008, 2010, 2017, 2024)', 'Sul-Americana (2006)', 'Dérbi das Américas FIFA (2024)'],
    lenda: 'Único mexicano campeão da Sul-Americana; vice da Copa Intercontinental FIFA 2024.',
  },
  'MEX:Monterrey': { internacionais: ['Concacaf (2011, 2012, 2013, 2019, 2021)'], lenda: 'Terceiro lugar no Mundial de Clubes (2012, 2019).' },
  'MEX:Tigres UANL': { internacionais: ['Concacaf (2020)'], lenda: 'Vice-campeão do Mundial de Clubes 2020.' },
  'MEX:Pumas UNAM': { internacionais: ['Concacaf (1980, 1982, 1989)', 'Interamericana (1980)'], lenda: 'Hugo Sánchez.' },
  'MEX:Toluca': { internacionais: ['Concacaf (1968, 2003)'] },
  'MEX:Guadalajara': { internacionais: ['Concacaf (1962, 2018)'], lenda: 'Finalista da Libertadores (2010), só com mexicanos.' },
  'MEX:León': { internacionais: ['Concacaf (2023)'] },
  'MEX:Atlante': { internacionais: ['Concacaf (1983, 2009)'] },
  'MEX:Necaxa': { internacionais: ['Concacaf (1999)'], lenda: 'Terceiro lugar no primeiro Mundial de Clubes FIFA (2000).' },
  'MEX:Puebla': { internacionais: ['Concacaf (1991)'] },
  'MEX:Santos Laguna': { nivel: 2, lenda: 'Finalista da Concacaf (2012, 2013).' },
  'MEX:Tijuana': { nivel: 2, lenda: 'Quartas de final da Libertadores (2013).' },
  'USA:Inter Miami': { internacionais: ['Leagues Cup (2023)'], lenda: 'Lionel Messi; campeão da MLS Cup 2025.' },
  'USA:Seattle Sounders': { internacionais: ['Concacaf (2022)', 'Leagues Cup (2025)'] },
  'USA:LA Galaxy': { internacionais: ['Concacaf (2000)'], lenda: 'David Beckham e Landon Donovan.' },
  'USA:D.C. United': { internacionais: ['Concacaf (1998)', 'Interamericana (1998)'] },
  'USA:Columbus Crew': { internacionais: ['Leagues Cup (2024)'] },
  'USA:LAFC': { nivel: 2, lenda: 'Finalista da Concacaf (2020, 2023).' },
  'USA:Real Salt Lake': { nivel: 2, lenda: 'Finalista da Concacaf (2011).' },
  'CAN:Toronto FC': { nivel: 2, lenda: 'Finalista da Concacaf (2018).' },
  'CAN:Vancouver Whitecaps': { nivel: 2, lenda: 'Finalista da Concacaf e da MLS Cup (2025).' },
  'CAN:CF Montréal': { nivel: 2, lenda: 'Finalista da Concacaf (2015).' },
  'CRC:Saprissa': { internacionais: ['Concacaf (1993, 1995, 2005)'], lenda: 'Terceiro lugar no Mundial de Clubes (2005).' },
  'CRC:Alajuelense': { internacionais: ['Concacaf (1986, 2004)'] },
  'HON:Olimpia': { internacionais: ['Concacaf (1972, 1988)'] },
  'GUA:Comunicaciones': { internacionais: ['Concacaf (1978)'] },
  'GUA:Municipal': { internacionais: ['Concacaf (1974)'] },
  'SLV:Alianza': { internacionais: ['Concacaf (1967)'] },
  'CRC:Herediano': { nivel: 2 },
  'HON:Motagua': { nivel: 2 },
};

/** Nível de prestígio histórico (sem contar os títulos conquistados na carreira). */
export function nivelHistorico(h: HistoriaClube | undefined): Prestigio | undefined {
  if (!h) return undefined;
  if (h.mundiais?.length) return 4;
  if (h.internacionais?.length || (h.lenda && h.nivel === undefined)) return 3;
  return h.nivel;
}
