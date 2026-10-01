// Nomes de jogadores fictícios por origem. Nenhum jogador real é usado.

import type { CountryCode } from '../types';

type NamePool = { first: string[]; last: string[]; nick?: string[] };

const BR: NamePool = {
  first: ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Guilherme', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Vinícius', 'Gustavo', 'Diego',
    'João', 'Arthur', 'Caio', 'Leonardo', 'Rodrigo', 'Igor', 'Davi', 'Samuel', 'Eduardo', 'Henrique', 'Marcelo', 'Carlos', 'Wesley',
    'Kauã', 'Ryan', 'Luan', 'Renan', 'Danilo', 'Fabrício', 'Anderson', 'Douglas', 'Wellington', 'Everton', 'Alisson', 'Ederson'],
  last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho',
    'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Moura', 'Cardoso', 'Teixeira', 'Freitas', 'Mendes', 'Pinto', 'Batista',
    'Dias', 'Vieira', 'Monteiro', 'Correia', 'Fonseca', 'Miranda', 'Lopes', 'Cunha', 'Moreira', 'Ramos', 'Nunes', 'Campos', 'Andrade'],
  nick: ['Juninho', 'Dudu', 'Biel', 'Pedrinho', 'Kaká', 'Didi', 'Bebeto', 'Tchê', 'Neto', 'Zé Rafael', 'Marquinhos', 'Lucão', 'Rafinha',
    'Paulinho', 'Toninho', 'Fabinho', 'Robinho', 'Luizão', 'Serginho', 'Edu', 'Cacá', 'Nenê', 'Tuta', 'Diguinho', 'Vitinho', 'Gabigol',
    'Thiaguinho', 'Wendel', 'Kayky', 'Savinho', 'Rony', 'Hulkinho', 'Pipico', 'Bruninho', 'Matheuzinho', 'Gui', 'Chiquinho', 'Didiz'],
};

const HISP: NamePool = {
  first: ['Juan', 'Santiago', 'Matías', 'Nicolás', 'Facundo', 'Lucas', 'Agustín', 'Tomás', 'Franco', 'Joaquín', 'Ignacio', 'Diego',
    'Martín', 'Sebastián', 'Gonzalo', 'Rodrigo', 'Andrés', 'Felipe', 'Cristian', 'Brayan', 'Jhon', 'Kevin', 'Luis', 'Carlos', 'Jorge',
    'Emiliano', 'Thiago', 'Valentín', 'Bruno', 'Alexis', 'Marcelo', 'Gustavo', 'Esteban', 'Hernán', 'Wilmar', 'Jefferson', 'Byron'],
  last: ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'Romero', 'Sánchez', 'Álvarez', 'Torres',
    'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Castro', 'Ortiz', 'Morales', 'Rojas',
    'Vargas', 'Cáceres', 'Paredes', 'Quintero', 'Valencia', 'Mosquera', 'Cuesta', 'Arboleda', 'Caicedo', 'Plata', 'Vaca', 'Mamani', 'Quispe'],
};

const ES: NamePool = {
  first: ['Pablo', 'Sergio', 'Álvaro', 'Javier', 'Daniel', 'Adrián', 'Iker', 'Unai', 'Marc', 'Pau', 'Jordi', 'Raúl', 'Mikel', 'Hugo',
    'Alejandro', 'Fernando', 'Rubén', 'Óscar', 'Aitor', 'Gerard', 'Dani', 'Nacho', 'Borja', 'Íñigo'],
  last: ['García', 'Martín', 'Ruiz', 'Navarro', 'Moreno', 'Jiménez', 'Muñoz', 'Romero', 'Alonso', 'Gutiérrez', 'Serrano', 'Ortega',
    'Delgado', 'Castillo', 'Rubio', 'Molina', 'Iglesias', 'Garrido', 'Etxeberria', 'Puig', 'Vidal', 'Soler', 'Marín', 'Cano'],
};

const EN: NamePool = {
  first: ['Harry', 'Jack', 'James', 'Oliver', 'George', 'Charlie', 'Thomas', 'Jacob', 'Callum', 'Connor', 'Kyle', 'Ryan', 'Lewis',
    'Mason', 'Declan', 'Reece', 'Jordan', 'Ben', 'Luke', 'Aaron', 'Jamie', 'Ross', 'Scott', 'Ewan', 'Kieran', 'Liam'],
  last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes',
    'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Clarke', 'Mitchell', 'Fraser', 'Campbell', 'Stewart', 'Murray', 'McLean', 'Reid', 'Barnes'],
};

const DE: NamePool = {
  first: ['Lukas', 'Leon', 'Jonas', 'Felix', 'Niklas', 'Tim', 'Julian', 'Florian', 'Maximilian', 'Kai', 'Jan', 'Moritz', 'Fabian',
    'Tobias', 'Marco', 'Sebastian', 'Kevin', 'Dennis', 'Timo', 'Nico', 'Benedikt', 'Joshua'],
  last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter',
    'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause'],
};

const NL: NamePool = {
  first: ['Daan', 'Sem', 'Bram', 'Luuk', 'Thijs', 'Jesse', 'Ruben', 'Stefan', 'Wout', 'Joris', 'Kenneth', 'Jurriën', 'Teun', 'Milan', 'Sven'],
  last: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder',
    'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'Kok'],
};

const FR: NamePool = {
  first: ['Hugo', 'Lucas', 'Théo', 'Antoine', 'Mathis', 'Enzo', 'Louis', 'Kylian', 'Ousmane', 'Moussa', 'Aurélien', 'Benjamin',
    'Clément', 'Florian', 'Maxime', 'Raphaël', 'Adrien', 'Youssouf', 'Ibrahima', 'Mamadou', 'Jules', 'Rayan'],
  last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent',
    'Lefebvre', 'Michel', 'Garnier', 'Faure', 'Rousseau', 'Diallo', 'Traoré', 'Koné', 'Camara', 'Mbemba'],
};

const IT: NamePool = {
  first: ['Lorenzo', 'Alessandro', 'Matteo', 'Leonardo', 'Francesco', 'Andrea', 'Federico', 'Riccardo', 'Davide', 'Nicolò', 'Gianluca',
    'Simone', 'Marco', 'Stefano', 'Giacomo', 'Alessio', 'Manuel', 'Daniele', 'Fabio', 'Sandro'],
  last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo',
    'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana'],
};

const PT: NamePool = {
  first: ['João', 'Rúben', 'Diogo', 'Tiago', 'Gonçalo', 'Rafael', 'Francisco', 'Bernardo', 'André', 'Nuno', 'Rodrigo', 'Pedro',
    'Vitinha', 'Miguel', 'Ricardo', 'Fábio', 'Hélder', 'Renato', 'Duarte', 'Tomás'],
  last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gonçalves',
    'Gomes', 'Lopes', 'Marques', 'Alves', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho', 'Teixeira', 'Moutinho', 'Neves'],
};

const TR: NamePool = {
  first: ['Mehmet', 'Mustafa', 'Ahmet', 'Emre', 'Burak', 'Arda', 'Kerem', 'Hakan', 'Cengiz', 'Ozan', 'Yusuf', 'Kaan', 'Oğuz', 'Barış',
    'Serdar', 'Can', 'Ferdi', 'Orkun', 'Uğurcan', 'Çağlar'],
  last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç',
    'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek'],
};

const GR: NamePool = {
  first: ['Giorgos', 'Dimitris', 'Kostas', 'Nikos', 'Giannis', 'Christos', 'Vasilis', 'Panagiotis', 'Thanasis', 'Sotiris', 'Andreas',
    'Petros', 'Lazaros', 'Manolis', 'Stelios', 'Fotis'],
  last: ['Papadopoulos', 'Pappas', 'Oikonomou', 'Georgiou', 'Vlachos', 'Angelopoulos', 'Nikolaidis', 'Karagiannis', 'Ioannidis',
    'Dimitriou', 'Konstantinou', 'Makris', 'Christodoulou', 'Tzavellas', 'Samaras', 'Mitroglou'],
};

const AR: NamePool = {
  first: ['Mohamed', 'Ahmed', 'Omar', 'Youssef', 'Ali', 'Khalid', 'Salem', 'Hassan', 'Karim', 'Hamza', 'Fahad', 'Saud', 'Achraf', 'Hakim', 'Riyad'],
  last: ['Al-Dawsari', 'Al-Shehri', 'Al-Faraj', 'Salah', 'Hassan', 'El-Shenawy', 'Ziyech', 'Amrabat', 'Ben Youssef', 'Mahrez', 'Bennacer',
    'Al-Owais', 'Al-Hassan', 'Afif', 'Mabkhout'],
};

const EA: NamePool = {
  first: ['Takumi', 'Kaoru', 'Daichi', 'Wataru', 'Ritsu', 'Hiroki', 'Min-jae', 'Heung-min', 'Kang-in', 'Hwang', 'Seung-ho', 'Yuto', 'Ao', 'Shuto'],
  last: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho'],
};

const AF: NamePool = {
  first: ['Victor', 'Samuel', 'Wilfried', 'Sadio', 'Thomas', 'Percy', 'Themba', 'Kelechi', 'Ademola', 'Emmanuel', 'Bongani', 'Siyabonga', 'Teboho'],
  last: ['Osimhen', 'Iwobi', 'Ndidi', 'Lookman', 'Tau', 'Zungu', 'Mokoena', 'Mbatha', 'Ekong', 'Chukwueze', 'Williams', 'Maseko', 'Dube'],
};

const NA: NamePool = {
  first: ['Christian', 'Weston', 'Tyler', 'Brenden', 'Jesús', 'Hirving', 'Edson', 'Santiago', 'Raúl', 'Alphonso', 'Jonathan', 'Keylor', 'Joel', 'Ricardo'],
  last: ['Pulisic', 'McKennie', 'Adams', 'Aaronson', 'Lozano', 'Álvarez', 'Giménez', 'Jiménez', 'Davies', 'David', 'Navas', 'Campbell', 'Vega', 'Herrera'],
};

const POOLS: Partial<Record<CountryCode, NamePool>> = {
  BRA: BR,
  ARG: HISP, CHI: HISP, COL: HISP, ECU: HISP, BOL: HISP, PAR: HISP, PER: HISP, URU: HISP, VEN: HISP,
  ESP: ES, ENG: EN, SCO: EN, GER: DE, NED: NL, FRA: FR, ITA: IT, POR: PT, TUR: TR, GRE: GR,
  KSA: AR, QAT: AR, UAE: AR, EGY: AR, MAR: AR, TUN: AR, ALG: AR,
  JPN: EA, KOR: EA, RSA: AF, NGA: AF, MEX: NA, USA: NA, CAN: NA, CRC: NA, NZL: EN,
};

export function namePool(country: CountryCode): NamePool {
  return POOLS[country] ?? EN;
}
