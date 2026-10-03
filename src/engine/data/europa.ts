// Ligas europeias GENÉRICAS: os nomes são formados por cidade + apelido
// inventado, para não usar marcas reais. As divisões e quantidades de clubes
// seguem os formatos atuais (temporada 2025-26).

import type { CountryCode } from '../types';

export type CitySeed = string | [city: string, altitude: number];

export interface EuropeanCountrySeed {
  country: CountryCode;
  top: CitySeed[];
  second: CitySeed[];
  suffixes: string[];
}

export const EUROPA: EuropeanCountrySeed[] = [
  {
    country: 'ENG',
    top: ['London', 'London', 'London', 'London', 'Manchester', 'Manchester', 'Liverpool', 'Liverpool', 'Newcastle', 'Birmingham',
      'Leeds', 'Brighton', 'Nottingham', 'Southampton', 'Leicester', 'Bournemouth', 'Sunderland', 'Wolverhampton', 'Burnley', 'Ipswich'],
    second: ['Sheffield', 'Sheffield', 'Bristol', 'Bristol', 'Norwich', 'Coventry', 'Derby', 'Middlesbrough', 'Hull', 'Stoke', 'Plymouth',
      'Preston', 'Blackburn', 'Swansea', 'Cardiff', 'Portsmouth', 'Reading', 'Oxford', 'Luton', 'Watford', 'Cambridge', 'York', 'Bolton', 'Wigan'],
    suffixes: ['Lions', 'Hawks', 'Ravens', 'Falcons', 'Knights', 'Stags', 'Griffins', 'Pilots', 'Comets', 'Titans'],
  },
  {
    country: 'ESP',
    top: [['Madrid', 650], ['Madrid', 650], ['Madrid', 650], 'Barcelona', 'Barcelona', 'Sevilla', 'Sevilla', 'Valencia', 'Valencia', 'Bilbao',
      'San Sebastián', 'Vigo', ['Pamplona', 450], ['Vitoria', 525], 'Girona', 'Villarreal', ['Getafe', 620], 'Palma', 'Oviedo', 'Elche'],
    second: ['Zaragoza', 'La Coruña', 'Gijón', 'Santander', ['Valladolid', 690], 'Almería', ['Granada', 740], 'Cádiz', 'Málaga', 'Las Palmas',
      'Tenerife', 'Huesca', ['Leganés', 660], 'Eibar', ['Albacete', 690], 'Córdoba', 'Castellón', ['Burgos', 860], 'Miranda', 'Ferrol', 'Cartagena', 'Alicante'],
    suffixes: ['Leones', 'Toros', 'Halcones', 'Águilas', 'Corsarios', 'Linces', 'Lobos', 'Centauros', 'Cóndores', 'Titanes'],
  },
  {
    country: 'GER',
    top: [['München', 520], 'Dortmund', 'Leverkusen', 'Leipzig', 'Frankfurt', 'Stuttgart', 'Berlin', 'Berlin', 'Hamburg', 'Hamburg',
      'Bremen', 'Wolfsburg', 'Freiburg', 'Mönchengladbach', 'Mainz', 'Köln', 'Sinsheim', ['Augsburg', 490]],
    second: ['Hannover', 'Düsseldorf', 'Gelsenkirchen', 'Nürnberg', 'Kaiserslautern', 'Karlsruhe', 'Bochum', 'Darmstadt', 'Paderborn',
      'Bielefeld', 'Kiel', 'Magdeburg', 'Fürth', 'Braunschweig', 'Elversberg', 'Münster', 'Dresden', 'Regensburg'],
    suffixes: ['Adler', 'Falken', 'Bären', 'Ritter', 'Hirsche', 'Greifen', 'Löwen', 'Wölfe', 'Titanen', 'Kometen'],
  },
  {
    country: 'ITA',
    top: ['Milano', 'Milano', 'Roma', 'Roma', 'Torino', 'Torino', 'Napoli', 'Bergamo', 'Firenze', 'Bologna', 'Genova', 'Genova',
      'Udine', 'Verona', 'Lecce', 'Cagliari', 'Como', 'Parma', 'Sassuolo', 'Pisa'],
    second: ['Palermo', 'Bari', 'Venezia', 'Empoli', 'Monza', 'Frosinone', 'Salerno', 'Catanzaro', 'Cesena', 'Modena', 'Reggio Emilia',
      'Padova', 'Brescia', 'La Spezia', 'Avellino', 'Pescara', 'Mantova', 'Carrara', 'Vicenza', 'Cremona'],
    suffixes: ['Leoni', 'Falchi', 'Aquile', 'Lupi', 'Grifoni', 'Cavalieri', 'Tori', 'Corsari', 'Titani', 'Comete'],
  },
  {
    country: 'FRA',
    top: ['Paris', 'Paris', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 'Lens', 'Rennes', 'Strasbourg', 'Nantes', 'Toulouse',
      'Brest', 'Auxerre', 'Angers', 'Le Havre', 'Lorient', 'Metz'],
    second: ['Saint-Étienne', 'Bordeaux', 'Montpellier', 'Reims', 'Caen', 'Guingamp', 'Grenoble', ['Clermont', 400], 'Amiens', 'Troyes',
      ['Annecy', 450], 'Bastia', 'Laval', ['Rodez', 570], 'Dunkerque', 'Pau', 'Nancy', 'Sochaux'],
    suffixes: ['Lions', 'Faucons', 'Aigles', 'Loups', 'Chevaliers', 'Corsaires', 'Lynx', 'Dragons', 'Titans', 'Comètes'],
  },
  {
    country: 'POR',
    top: ['Lisboa', 'Lisboa', 'Lisboa', 'Porto', 'Braga', 'Guimarães', 'Famalicão', 'Vila do Conde', 'Estoril', 'Arouca', 'Barcelos',
      'Moreira de Cónegos', 'Funchal', 'Alverca', 'Tondela', 'Vila das Aves', 'Ponta Delgada', 'Amadora'],
    second: ['Coimbra', 'Faro', 'Setúbal', 'Leiria', ['Viseu', 480], 'Chaves', 'Penafiel', 'Feira', 'Portimão', 'Torres Vedras', 'Felgueiras',
      'Vizela', 'Oliveira de Azeméis', 'Paços de Ferreira', 'Mafra', 'Matosinhos', ['Covilhã', 700], 'Lousada'],
    suffixes: ['Falcões', 'Lobos', 'Corsários', 'Linces', 'Cavaleiros', 'Touros', 'Grifos', 'Navegantes', 'Titãs', 'Cometas'],
  },
  {
    country: 'NED',
    top: ['Amsterdam', 'Eindhoven', 'Rotterdam', 'Rotterdam', 'Rotterdam', 'Enschede', 'Alkmaar', 'Utrecht', 'Heerenveen', 'Groningen',
      'Nijmegen', 'Zwolle', 'Sittard', 'Breda', 'Volendam', 'Almelo', 'Deventer', 'Velsen'],
    second: ['Arnhem', 'Den Haag', 'Tilburg', 'Waalwijk', 'Emmen', 'Leeuwarden', 'Maastricht', 'Venlo', 'Den Bosch', 'Helmond', 'Dordrecht',
      'Oss', 'Eindhoven', 'Almere', 'Haarlem', 'Amersfoort', 'Doetinchem', 'Kerkrade', 'Apeldoorn', 'Hilversum'],
    suffixes: ['Leeuwen', 'Valken', 'Adelaars', 'Wolven', 'Ridders', 'Stieren', 'Griffioenen', 'Zeevaarders', 'Titanen', 'Kometen'],
  },
  {
    country: 'SCO',
    top: ['Glasgow', 'Glasgow', 'Edinburgh', 'Edinburgh', 'Aberdeen', 'Dundee', 'Dundee', 'Motherwell', 'Kilmarnock', 'Livingston', 'Falkirk', 'Paisley'],
    second: ['Perth', 'Inverness', 'Dunfermline', 'Ayr', 'Greenock', 'Airdrie', 'Arbroath', 'Kirkcaldy', 'Dingwall', 'Stirling'],
    suffixes: ['Highlanders', 'Clansmen', 'Stags', 'Eagles', 'Falcons', 'Lions', 'Wolves', 'Knights', 'Titans', 'Comets'],
  },
  {
    country: 'TUR',
    top: ['İstanbul', 'İstanbul', 'İstanbul', 'İstanbul', 'İstanbul', 'Trabzon', 'İzmir', 'Samsun', ['Konya', 1016], 'Gaziantep', 'Alanya',
      'Rize', 'Kocaeli', ['Ankara', 938], ['Sivas', 1285], ['Kayseri', 1054], 'Antalya', ['Erzurum', 1900]],
    second: ['Bursa', 'Adana', 'Adana', ['Eskişehir', 790], ['Malatya', 980], 'Hatay', 'Denizli', 'Manisa', 'Bodrum', 'Sakarya', ['Çorum', 800],
      ['Iğdır', 850], 'İstanbul', 'Bandırma', 'İstanbul', ['Diyarbakır', 675], ['Van', 1725], ['Ankara', 938], ['Bolu', 725], 'Mersin'],
    suffixes: ['Kurtlar', 'Şahinler', 'Atmacalar', 'Boğalar', 'Şövalyeler', 'Yıldızlar', 'Kaplanlar', 'Ejderler', 'Titanlar', 'Akıncılar'],
  },
  {
    country: 'GRE',
    top: ['Athina', 'Athina', 'Peiraias', 'Thessaloniki', 'Thessaloniki', 'Athina', 'Volos', 'Irakleio', 'Larisa', ['Tripoli', 660],
      'Livadeia', 'Agrinio', 'Athina', ['Ioannina', 480]],
    second: ['Patra', 'Kalamata', 'Xanthi', 'Chania', 'Kavala', 'Serres', 'Veria', 'Lamia', 'Kerkyra', 'Rodos', 'Drama', ['Kozani', 710],
      'Karditsa', 'Trikala', 'Chalkida', 'Katerini'],
    suffixes: ['Leontes', 'Aetoi', 'Lykoi', 'Gerakia', 'Tavroi', 'Ippotes', 'Delfinia', 'Titanes', 'Kentavroi', 'Asteres'],
  },
];

/** Clubes de outras confederações — só aparecem no Mundial de Clubes. */
export const MUNDO: { confed: 'AFC' | 'CAF' | 'OFC'; clubs: [city: string, country: CountryCode, altitude: number][] }[] = [
  {
    confed: 'AFC',
    clubs: [['Riyadh', 'KSA', 610], ['Riyadh', 'KSA', 610], ['Jeddah', 'KSA', 10], ['Tokyo', 'JPN', 40], ['Yokohama', 'JPN', 10],
      ['Seoul', 'KOR', 40], ['Ulsan', 'KOR', 10], ['Doha', 'QAT', 10], ['Abu Dhabi', 'UAE', 10], ['Al Ain', 'UAE', 290]],
  },
  {
    confed: 'CAF',
    clubs: [['Cairo', 'EGY', 25], ['Cairo', 'EGY', 25], ['Casablanca', 'MAR', 30], ['Casablanca', 'MAR', 30], ['Tunis', 'TUN', 10],
      ['Pretoria', 'RSA', 1340], ['Johannesburg', 'RSA', 1750], ['Alger', 'ALG', 20], ['Lagos', 'NGA', 40]],
  },
  {
    confed: 'OFC',
    clubs: [['Auckland', 'NZL', 30], ['Wellington', 'NZL', 20]],
  },
];

export const SUFIXOS_MUNDO = ['Falcons', 'Stars', 'Lions', 'Eagles', 'Tigers', 'Sharks', 'Kings', 'Warriors', 'Pharaohs', 'Dragons'];
