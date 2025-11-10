// Mapeamento de UFs e suas variações de escrita
const STATE_VARIATIONS: Record<string, string[]> = {
  'AC': ['acre', 'ac'],
  'AL': ['alagoas', 'al'],
  'AP': ['amapá', 'amapa', 'ap'],
  'AM': ['amazonas', 'am'],
  'BA': ['bahia', 'ba'],
  'CE': ['ceará', 'ceara', 'ce'],
  'DF': ['distrito federal', 'brasília', 'brasilia', 'df'],
  'ES': ['espírito santo', 'espirito santo', 'es'],
  'GO': ['goiás', 'goias', 'go'],
  'MA': ['maranhão', 'maranhao', 'ma'],
  'MT': ['mato grosso', 'mt'],
  'MS': ['mato grosso do sul', 'ms'],
  'MG': ['minas gerais', 'mg'],
  'PA': ['pará', 'para', 'pa'],
  'PB': ['paraíba', 'paraiba', 'pb'],
  'PR': ['paraná', 'parana', 'pr'],
  'PE': ['pernambuco', 'pe'],
  'PI': ['piauí', 'piaui', 'pi'],
  'RJ': ['rio de janeiro', 'rj'],
  'RN': ['rio grande do norte', 'rn'],
  'RS': ['rio grande do sul', 'rs'],
  'RO': ['rondônia', 'rondonia', 'ro'],
  'RR': ['roraima', 'rr'],
  'SC': ['santa catarina', 'sc'],
  'SP': ['são paulo', 'sao paulo', 'sp'],
  'SE': ['sergipe', 'se'],
  'TO': ['tocantins', 'to'],
};

// Lista de principais cidades por estado (200+ cidades)
const CITIES_BY_STATE: Record<string, string[]> = {
  'SP': [
    'São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto', 'Guarulhos',
    'São José dos Campos', 'Sorocaba', 'Santo André', 'São Bernardo do Campo',
    'Osasco', 'Piracicaba', 'Bauru', 'São José do Rio Preto', 'Mauá',
    'Jundiaí', 'Campos do Jordão', 'Diadema', 'Carapicuíba', 'Itaquaquecetuba',
    'Franca', 'Guarujá', 'Taubaté', 'Limeira', 'Suzano', 'Taboão da Serra',
    'Sumaré', 'Americana', 'Araraquara', 'Indaiatuba', 'Cotia', 'Marília'
  ],
  'RJ': [
    'Rio de Janeiro', 'Niterói', 'São Gonçalo', 'Duque de Caxias',
    'Nova Iguaçu', 'Belford Roxo', 'Campos dos Goytacazes', 'Petrópolis',
    'Volta Redonda', 'Magé', 'Itaboraí', 'Macaé', 'Cabo Frio', 'Angra dos Reis',
    'Nova Friburgo', 'Barra Mansa', 'Teresópolis', 'Resende', 'Araruama'
  ],
  'MG': [
    'Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim',
    'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares',
    'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Ibirité',
    'Poços de Caldas', 'Patos de Minas', 'Teófilo Otoni', 'Ouro Preto'
  ],
  'BA': [
    'Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari',
    'Itabuna', 'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié',
    'Teixeira de Freitas', 'Alagoinhas', 'Barreiras', 'Porto Seguro',
    'Simões Filho', 'Paulo Afonso', 'Santo Antônio de Jesus'
  ],
  'PR': [
    'Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel',
    'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava',
    'Paranaguá', 'Araucária', 'Toledo', 'Apucarana', 'Pinhais', 'Campo Largo'
  ],
  'RS': [
    'Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria',
    'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande',
    'Alvorada', 'Passo Fundo', 'Sapucaia do Sul', 'Uruguaiana', 'Santa Cruz do Sul'
  ],
  'SC': [
    'Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma',
    'Chapecó', 'Itajaí', 'Jaraguá do Sul', 'Lages', 'Palhoça', 'Balneário Camboriú',
    'Brusque', 'Tubarão', 'São Bento do Sul', 'Caçador', 'Camboriú'
  ],
  'PE': [
    'Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina',
    'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns',
    'Vitória de Santo Antão', 'Igarassu', 'Abreu e Lima'
  ],
  'CE': [
    'Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral',
    'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá', 'Canindé'
  ],
  'PA': [
    'Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas',
    'Itaituba', 'Cametá', 'Bragança', 'Abaetetuba', 'Marituba'
  ],
  'GO': [
    'Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia',
    'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa'
  ],
  'AM': [
    'Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé',
    'Tabatinga', 'Maués', 'Humaitá'
  ],
  'ES': [
    'Vila Velha', 'Serra', 'Cariacica', 'Vitória', 'Cachoeiro de Itapemirim',
    'Linhares', 'São Mateus', 'Colatina', 'Guarapari', 'Aracruz'
  ],
  'MA': [
    'São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias',
    'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal'
  ],
  'PB': [
    'João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux',
    'Sousa', 'Cajazeiras', 'Guarabira', 'Mamanguape'
  ],
  'RN': [
    'Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba',
    'Ceará-Mirim', 'Caicó', 'Assu', 'Currais Novos'
  ],
  'MT': [
    'Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra',
    'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Barra do Garças'
  ],
  'MS': [
    'Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã',
    'Sidrolândia', 'Nova Andradina', 'Aquidauana', 'Paranaíba'
  ],
  'AL': [
    'Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo', 'Penedo',
    'União dos Palmares', 'São Miguel dos Campos', 'Santana do Ipanema'
  ],
  'SE': [
    'Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana',
    'São Cristóvão', 'Estância', 'Tobias Barreto', 'Simão Dias'
  ],
  'PI': [
    'Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior',
    'Barras', 'União', 'Altos'
  ],
  'RO': [
    'Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Cacoal', 'Vilhena',
    'Jaru', 'Rolim de Moura', 'Guajará-Mirim'
  ],
  'AC': [
    'Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá',
    'Feijó', 'Brasiléia'
  ],
  'TO': [
    'Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins',
    'Colinas do Tocantins', 'Guaraí'
  ],
  'AP': [
    'Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão'
  ],
  'RR': [
    'Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí'
  ],
  'DF': [
    'Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina',
    'Águas Claras', 'Guará', 'Sobradinho', 'Gama'
  ],
};

// Mapeamento de regiões brasileiras
export const REGIONS_MAP: Record<string, string[]> = {
  'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC']
};

export function getRegionFromState(state: string): string | null {
  for (const [region, states] of Object.entries(REGIONS_MAP)) {
    if (states.includes(state)) return region;
  }
  return null;
}

export interface LocationInfo {
  cities: string[];
  states: string[];
  regions: string[];
}

export function extractLocationFromAddress(address: string | null): LocationInfo {
  if (!address) return { cities: [], states: [], regions: [] };
  
  const addressLower = address.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  const cities: string[] = [];
  const states: string[] = [];
  
  // Detectar estados
  Object.entries(STATE_VARIATIONS).forEach(([uf, variations]) => {
    if (variations.some(v => {
      const normalized = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return addressLower.includes(normalized);
    })) {
      states.push(uf);
    }
  });
  
  // Detectar cidades
  Object.entries(CITIES_BY_STATE).forEach(([state, cityList]) => {
    cityList.forEach(city => {
      const cityNormalized = city
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      if (addressLower.includes(cityNormalized)) {
        cities.push(city);
      }
    });
  });
  
  // Extrair regiões dos estados detectados
  const regions: string[] = [];
  states.forEach(state => {
    const region = getRegionFromState(state);
    if (region && !regions.includes(region)) {
      regions.push(region);
    }
  });
  
  return { cities, states, regions };
}

export function normalizeCity(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getCitiesFromClients(clients: any[]): string[] {
  const citiesSet = new Set<string>();
  
  clients.forEach(client => {
    const location = extractLocationFromAddress(client.address);
    location.cities.forEach(city => citiesSet.add(city));
  });
  
  return Array.from(citiesSet);
}

export function getStatesFromClients(clients: any[]): string[] {
  const statesSet = new Set<string>();
  
  clients.forEach(client => {
    const location = extractLocationFromAddress(client.address);
    location.states.forEach(state => statesSet.add(state));
  });
  
  return Array.from(statesSet);
}

export function getRegionsFromClients(clients: any[]): string[] {
  const regionsSet = new Set<string>();
  
  clients.forEach(client => {
    const location = extractLocationFromAddress(client.address);
    location.regions.forEach(region => regionsSet.add(region));
  });
  
  return Array.from(regionsSet);
}
