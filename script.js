// ===== CONFIGURAÇÕES DA API =====
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Lista de proxies CORS para tentar
const CORS_PROXIES = [
  '', // Tentar direto primeiro (pode funcionar em alguns casos)
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

let currentProxyIndex = 0;

// Função para obter a URL base atual
function getBaseURL() {
  const proxy = CORS_PROXIES[currentProxyIndex];
  if (proxy === '') {
    return 'https://api.themoviedb.org/3';
  }
  return proxy + encodeURIComponent('https://api.themoviedb.org/3');
}

// Função para fazer fetch com fallback de proxies
async function fetchWithFallback(endpoint) {
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      currentProxyIndex = i;
      const baseURL = getBaseURL();
      const url = `${baseURL}${endpoint}`;
      
      console.log(`Tentativa ${i + 1}: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      
      // Verificar se é JSON válido
      try {
        const data = JSON.parse(text);
        console.log(`✅ Sucesso com proxy ${i + 1}`);
        return data;
      } catch (jsonError) {
        console.log(`❌ Proxy ${i + 1} retornou HTML/texto inválido`);
        throw new Error('Invalid JSON response');
      }
      
    } catch (error) {
      console.log(`❌ Proxy ${i + 1} falhou:`, error.message);
      
      if (i === CORS_PROXIES.length - 1) {
        throw new Error('Todos os proxies falharam');
      }
    }
  }
}

// Função para obter data atual no formato YYYY-MM-DD
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Função para verificar se uma data é futura
function isFutureDate(dateString) {
  if (!dateString) return false;
  const releaseDate = new Date(dateString);
  const now = new Date();
  return releaseDate >= now;
}

// ===== ESTADO DA APLICAÇÃO =====
const state = {
  currentType: 'tv', // Iniciar com séries por padrão
  currentGenre: '',
  currentFilter: 'popular', // popular, upcoming, in_theaters
  genres: [],
  isLoading: false
};

// ===== ELEMENTOS DOM =====
const elements = {
  contentGrid: null,
  sectionTitle: null,
  loading: null,
  genreFilter: null,
  filterTabs: null,
  themeToggle: null,
  modal: null,
  modalBody: null
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  initializeEventListeners();
  initializeTheme();
  loadInitialData();
});

function initializeElements() {
  elements.contentGrid = document.getElementById('content-grid');
  elements.sectionTitle = document.getElementById('section-title');
  elements.loading = document.getElementById('loading');
  elements.genreFilter = document.getElementById('genre-filter');
  elements.contentFilter = document.getElementById('content-filter');
  elements.filterTabs = document.querySelectorAll('.filter-tab');
  elements.themeToggle = document.querySelector('.theme-toggle');
  elements.modal = document.getElementById('modal');
  elements.modalBody = document.getElementById('modal-body');
}

function initializeEventListeners() {
  // Filtros de tipo (filme/série)
  elements.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => handleTypeChange(tab.dataset.type));
  });

  // Filtro de gênero
  elements.genreFilter?.addEventListener('change', (e) => {
    handleGenreChange(e.target.value);
  });

  // Filtro de conteúdo (popular/upcoming/in_theaters)
  elements.contentFilter?.addEventListener('change', (e) => {
    handleContentFilterChange(e.target.value);
  });

  // Toggle de tema
  elements.themeToggle?.addEventListener('click', toggleTheme);

  // Modal
  elements.modal?.querySelector('.modal-close')?.addEventListener('click', closeModal);
  elements.modal?.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
  
  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function loadInitialData() {
  updateContentFilterOptions(state.currentType);
  await loadGenres(state.currentType);
  await loadContent(state.currentType, '', state.currentFilter);
}

// ===== FUNÇÕES DE CARREGAMENTO =====
async function loadGenres(type) {
  try {
    const data = await fetchWithFallback(`/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`);
    
    state.genres = data.genres || [];
    populateGenreFilter();
  } catch (error) {
    console.error('Erro ao carregar gêneros:', error);
    // Fallback: usar gêneros hardcoded se a API falhar
    state.genres = type === 'movie' ? [
      {id: 28, name: 'Ação'}, {id: 12, name: 'Aventura'}, {id: 16, name: 'Animação'},
      {id: 35, name: 'Comédia'}, {id: 80, name: 'Crime'}, {id: 99, name: 'Documentário'},
      {id: 18, name: 'Drama'}, {id: 10751, name: 'Família'}, {id: 14, name: 'Fantasia'},
      {id: 36, name: 'História'}, {id: 27, name: 'Terror'}, {id: 10402, name: 'Música'},
      {id: 9648, name: 'Mistério'}, {id: 10749, name: 'Romance'}, {id: 878, name: 'Ficção científica'},
      {id: 10770, name: 'Cinema TV'}, {id: 53, name: 'Thriller'}, {id: 10752, name: 'Guerra'},
      {id: 37, name: 'Faroeste'}
    ] : [
      {id: 10759, name: 'Ação & Aventura'}, {id: 16, name: 'Animação'}, {id: 35, name: 'Comédia'},
      {id: 80, name: 'Crime'}, {id: 99, name: 'Documentário'}, {id: 18, name: 'Drama'},
      {id: 10751, name: 'Família'}, {id: 10762, name: 'Kids'}, {id: 9648, name: 'Mistério'},
      {id: 10763, name: 'News'}, {id: 10764, name: 'Reality'}, {id: 10765, name: 'Sci-Fi & Fantasy'},
      {id: 10766, name: 'Soap'}, {id: 10767, name: 'Talk'}, {id: 10768, name: 'War & Politics'},
      {id: 37, name: 'Faroeste'}
    ];
    populateGenreFilter();
  }
}

async function loadContent(type, genreId = '', filter = 'popular') {
  if (state.isLoading) return;

  setLoading(true);
  updateSectionTitle(type, genreId, filter);

  // Definir se deve excluir animações (excluir apenas no carregamento inicial sem gênero específico)
  const shouldExcludeAnimation = genreId === '' && filter === 'popular';

  try {
    let url = '';
    let results = [];

    switch (filter) {
      case 'upcoming':
        // Lançamentos futuros (a partir da data atual)
        const currentDate = getCurrentDate();
        console.log('Buscando lançamentos futuros a partir de:', currentDate);

        if (type === 'movie') {
          // Para filmes: usar discover para ter mais controle sobre as datas
          const endpoint = `/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=release_date.asc&primary_release_date.gte=${currentDate}&vote_count.gte=1`;

          console.log('Buscando filmes futuros...');
          const data = await fetchWithFallback(endpoint);

          // Filtrar rigorosamente apenas filmes futuros
          results = (data.results || []).filter(item => {
            const releaseDate = item.release_date;
            if (!releaseDate) return false;

            const isFuture = isFutureDate(releaseDate);

            console.log(`Filme: "${item.title}" - Data: ${releaseDate} - Futuro: ${isFuture}`);
            return isFuture;
          });

          // Se poucos resultados, buscar também de upcoming oficial
          if (results.length < 10) {
            console.log('Poucos resultados, buscando endpoint upcoming oficial...');
            const upcomingEndpoint = `/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=1`;
            const upcomingData = await fetchWithFallback(upcomingEndpoint);

            const futureUpcoming = (upcomingData.results || []).filter(item => {
              const releaseDate = item.release_date;
              return releaseDate && isFutureDate(releaseDate);
            });

            results = [...results, ...futureUpcoming];
          }

          // Se ainda poucos resultados, buscar páginas adicionais do discover
          if (results.length < 15) {
            console.log('Ainda poucos resultados, buscando página 2 do discover...');
            const page2Endpoint = `/discover/movie?api_key=${API_KEY}&language=pt-BR&page=2&sort_by=release_date.asc&primary_release_date.gte=${currentDate}&vote_count.gte=5`;
            const page2Data = await fetchWithFallback(page2Endpoint);

            const futurePage2 = (page2Data.results || []).filter(item => {
              const releaseDate = item.release_date;
              return releaseDate && isFutureDate(releaseDate);
            });

            results = [...results, ...futurePage2];
          }

          // Se ainda poucos resultados, buscar página 3
          if (results.length < 20) {
            console.log('Ainda poucos resultados, buscando página 3 do discover...');
            const page3Endpoint = `/discover/movie?api_key=${API_KEY}&language=pt-BR&page=3&sort_by=release_date.asc&primary_release_date.gte=${currentDate}&vote_count.gte=1`;
            const page3Data = await fetchWithFallback(page3Endpoint);

            const futurePage3 = (page3Data.results || []).filter(item => {
              const releaseDate = item.release_date;
              return releaseDate && isFutureDate(releaseDate);
            });

            results = [...results, ...futurePage3];
          }

        } else {
          // Para séries: buscar séries que estrearão no futuro (a partir da data atual)
          const endpoint = `/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=first_air_date.asc&first_air_date.gte=${currentDate}&vote_count.gte=5`;

          console.log('Buscando séries futuras...');
          const data = await fetchWithFallback(endpoint);

          // Filtrar rigorosamente apenas séries futuras
          results = (data.results || []).filter(item => {
            const airDate = item.first_air_date;
            if (!airDate) return false;

            const isFuture = isFutureDate(airDate);

            console.log(`Série: "${item.name}" - Data: ${airDate} - Futuro: ${isFuture}`);
            return isFuture;
          });

          // Se poucos resultados, buscar também páginas adicionais
          if (results.length < 10) {
            console.log('Poucos resultados, buscando página 2...');
            const page2Endpoint = `/discover/tv?api_key=${API_KEY}&language=pt-BR&page=2&sort_by=first_air_date.asc&first_air_date.gte=${currentDate}&vote_count.gte=5`;
            const page2Data = await fetchWithFallback(page2Endpoint);

            const futurePage2 = (page2Data.results || []).filter(item => {
              const airDate = item.first_air_date;
              return airDate && isFutureDate(airDate);
            });

            results = [...results, ...futurePage2];
          }

          // Se ainda poucos resultados, buscar página 3
          if (results.length < 15) {
            console.log('Ainda poucos resultados, buscando página 3...');
            const page3Endpoint = `/discover/tv?api_key=${API_KEY}&language=pt-BR&page=3&sort_by=first_air_date.asc&first_air_date.gte=${currentDate}&vote_count.gte=5`;
            const page3Data = await fetchWithFallback(page3Endpoint);

            const futurePage3 = (page3Data.results || []).filter(item => {
              const airDate = item.first_air_date;
              return airDate && isFutureDate(airDate);
            });

            results = [...results, ...futurePage3];
          }
        }

        // Remover duplicatas e ordenar por data de lançamento
        results = results.filter((item, index, self) =>
          index === self.findIndex(i => i.id === item.id)
        ).sort((a, b) => {
          const dateA = new Date(a.release_date || a.first_air_date);
          const dateB = new Date(b.release_date || b.first_air_date);
          return dateA - dateB; // Mais próximos primeiro
        });

        console.log(`Encontrados ${results.length} lançamentos futuros`);
        break;

      case 'in_theaters':
        // Em cartaz nos cinemas / No ar na TV

        if (type === 'movie') {
          // Para filmes: buscar filmes em cartaz nos cinemas
          const endpoint = `/movie/now_playing?api_key=${API_KEY}&language=pt-BR&page=1`;
          console.log('Buscando filmes em cartaz...');

          const data = await fetchWithFallback(endpoint);

                  // Filtrar apenas filmes recentes que estão em cartaz
        results = (data.results || []).filter(item => {
          const releaseDate = item.release_date;
          if (!releaseDate) return false;

          const year = new Date(releaseDate).getFullYear();
          const currentYear = new Date().getFullYear();
          const isRecent = year >= (currentYear - 1); // Filmes do ano passado para frente

          console.log(`Filme em cartaz: "${item.title}" - Data: ${releaseDate} (${year}) - Recente: ${isRecent}`);
            return isRecent;
          });

        } else {
          // Para séries: buscar séries que estão no ar atualmente de 2024 em diante
          const endpoint = `/tv/on_the_air?api_key=${API_KEY}&language=pt-BR&page=1`;
          console.log('Buscando séries no ar de 2024+...');

          const data = await fetchWithFallback(endpoint);

          // Filtrar apenas séries de 2024 em diante
          results = (data.results || []).filter(item => {
            const airDate = item.first_air_date;
            if (!airDate) return false;

            const year = new Date(airDate).getFullYear();
            const is2024Plus = year >= 2024;

            console.log(`Série no ar: "${item.name}" - Primeira exibição: ${airDate} (${year}) - 2024+: ${is2024Plus}`);
            return is2024Plus;
          });

          // Se poucos resultados, buscar páginas adicionais
          if (results.length < 10) {
            console.log('Poucos resultados, buscando página 2...');
            const page2Data = await fetchWithFallback(endpoint + '&page=2');
            const page2Results = (page2Data.results || []).filter(item => {
              const airDate = item.first_air_date;
              if (!airDate) return false;
              const year = new Date(airDate).getFullYear();
              return year >= 2024;
            });
            results = [...results, ...page2Results];
          }

          // Remover duplicatas
          results = results.filter((series, index, self) =>
            index === self.findIndex(s => s.id === series.id)
          );
        }

        console.log(`Encontrados ${results.length} títulos em cartaz/no ar`);
        break;

      default: // popular
        // Mais populares recentes e futuros
        const popularCurrentDate = getCurrentDate();
        const currentYear = new Date().getFullYear();
        const popularStartDate = `${currentYear - 1}-01-01`; // Do ano passado em diante

        let endpoint = ''; // Declarar endpoint fora dos blocos
        
        if (type === 'movie') {
          // Para filmes: buscar os mais populares recentes
          console.log('Buscando filmes mais populares recentes...');
          endpoint = `/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&vote_count.gte=100&vote_average.gte=6.5&primary_release_date.gte=${popularStartDate}`;

          console.log('Endpoint filmes populares:', endpoint);
        } else {
          // Para séries: focar apenas nas que estrearam em 2024+
          console.log('Buscando séries mais populares de 2024+...');

          // Buscar séries de sucesso que estrearam especificamente em 2024+
          console.log('Buscando séries de sucesso de 2024+...');
          
          // Primeira busca: séries com critérios rigorosos de sucesso
          const successEndpoint = `/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=vote_average.desc&vote_count.gte=100&vote_average.gte=7.5&first_air_date.gte=2024-01-01&with_original_language=en|pt|es|fr|de|ja|ko`;
          const successData = await fetchWithFallback(successEndpoint);
          
          // Filtrar séries de sucesso com critérios rigorosos
          results = (successData.results || []).filter(series => {
            const airDate = series.first_air_date;
            if (!airDate) return false;

            const year = new Date(airDate).getFullYear();
            const is2024Plus = year >= 2024;
            const isSuccess = series.vote_average >= 7.5 && series.vote_count >= 100 && series.popularity >= 50;

            console.log(`Série de Sucesso: "${series.name}" - Data: ${airDate} (${year}) - Nota: ${series.vote_average} - Votos: ${series.vote_count} - Pop: ${series.popularity} - Sucesso: ${isSuccess}`);
            return is2024Plus && isSuccess;
          });

          // Complementar com séries trending de 2024+ se poucos resultados
          if (results.length < 15) {
            console.log('Poucos resultados de sucesso, buscando séries trending de 2024+...');
            const trendingEndpoint = `/trending/tv/week?api_key=${API_KEY}&language=pt-BR`;
            const trendingData = await fetchWithFallback(trendingEndpoint);

            const trending2024Plus = (trendingData.results || []).filter(series => {
              const airDate = series.first_air_date;
              if (!airDate) return false;
              const year = new Date(airDate).getFullYear();
              const is2024Plus = year >= 2024;
              console.log(`Série Trending: "${series.name}" - Data: ${airDate} (${year}) - 2024+: ${is2024Plus}`);
              return is2024Plus;
            });

            results = [...results, ...trending2024Plus];
          }
          
          // Se ainda poucos resultados, buscar segunda página de séries de sucesso
          if (results.length < 20) {
            console.log('Ainda poucos resultados, buscando página 2 de séries de sucesso...');
            const page2Endpoint = successEndpoint + '&page=2';
            const page2Data = await fetchWithFallback(page2Endpoint);

            const page2Results = (page2Data.results || []).filter(series => {
              const airDate = series.first_air_date;
              if (!airDate) return false;
              const year = new Date(airDate).getFullYear();
              const isSuccess = series.vote_average >= 7.5 && series.vote_count >= 100;
              return year >= 2024 && isSuccess;
            });

            results = [...results, ...page2Results];
          }

          // Remover duplicatas e ordenar por critério de sucesso (nota + popularidade)
          results = results.filter((series, index, self) =>
            index === self.findIndex(s => s.id === series.id)
          ).sort((a, b) => {
            // Priorizar séries com melhor combinação de nota e popularidade
            const scoreA = (a.vote_average * 0.7) + (Math.log(a.popularity || 1) * 0.3);
            const scoreB = (b.vote_average * 0.7) + (Math.log(b.popularity || 1) * 0.3);
            return scoreB - scoreA;
          });

          console.log(`Encontradas ${results.length} séries de sucesso de 2024+`);
          break;
        }

        // Para filmes, executar a busca com múltiplas estratégias
        if (type === 'movie') {
          // 1. Buscar filmes recentes com alta popularidade
          const popularData = await fetchWithFallback(endpoint);
          let moviesRecent = popularData.results || [];

          // 2. Se poucos resultados, buscar filmes populares gerais e filtrar
          if (moviesRecent.length < 10) {
            const generalPopularEndpoint = `/movie/popular?api_key=${API_KEY}&language=pt-BR&page=1`;
            const generalData = await fetchWithFallback(generalPopularEndpoint);

            // Filtrar apenas filmes recentes com boa avaliação
            const filteredRecentMovies = (generalData.results || []).filter(movie => {
              const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
              return year >= (currentYear - 1) && movie.vote_average >= 7.0 && movie.popularity > 100;
            });

            moviesRecent = [...moviesRecent, ...filteredRecentMovies];
          }

          // 3. Carregar mais páginas se ainda precisar
          if (moviesRecent.length < 15 && popularData.total_pages > 1) {
            const page2Data = await fetchWithFallback(endpoint + '&page=2');
            const page2Movies = (page2Data.results || []).filter(movie => {
              return movie.vote_average >= 7.0;
            });
            moviesRecent = [...moviesRecent, ...page2Movies];
          }

          // Remover duplicatas e ordenar por popularidade
          const uniqueMovies = moviesRecent.filter((movie, index, self) =>
            index === self.findIndex(m => m.id === movie.id)
          );

          results = uniqueMovies
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 20); // Limitar a 20 filmes mais populares

          console.log(`Encontrados ${results.length} filmes populares recentes`);
        }
        break;
    }

    // Adicionar filtro de gênero se selecionado
    if (genreId && results.length > 0) {
      results = results.filter(item =>
        item.genre_ids && item.genre_ids.includes(parseInt(genreId))
      );
    }

    // FILTRO FINAL: Para próximos lançamentos, garantir que sejam futuros
    if (filter === 'upcoming') {
      results = results.filter(item => {
        const date = item.release_date || item.first_air_date;
        if (!date) return false;

        const isFuture = isFutureDate(date);

        if (!isFuture) {
          console.log(`Removendo "${item.title || item.name}" (${date}) - não é futuro`);
        }

        return isFuture;
      });

      console.log(`Após filtro final: ${results.length} itens futuros`);
    } else {
      console.log(`Após filtro final: ${results.length} itens encontrados`);
    }

    // Se não houver resultados, buscar com critérios mais amplos
    if (results.length === 0 && filter === 'upcoming') {
      console.log('Nenhum resultado futuro encontrado, buscando com critérios mais amplos...');
      const futureYear = new Date().getFullYear() + 1;

      if (type === 'movie') {
        // Para filmes: buscar do próximo ano
        const endpoints = [
          `/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&primary_release_year=${futureYear}`,
          `/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&primary_release_year=${futureYear + 1}`
        ];

        for (const endpoint of endpoints) {
          const data = await fetchWithFallback(endpoint);
          results = [...results, ...(data.results || [])];
        }
      } else {
        // Para séries: buscar do próximo ano
        const endpoints = [
          `/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&first_air_date.gte=${futureYear}-01-01&first_air_date.lte=${futureYear}-12-31`,
          `/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&first_air_date.gte=${futureYear + 1}-01-01&first_air_date.lte=${futureYear + 1}-12-31`
        ];

        for (const endpoint of endpoints) {
          const data = await fetchWithFallback(endpoint);
          results = [...results, ...(data.results || [])];
        }
      }

      // Remover duplicatas
      results = results.filter((item, index, self) =>
        index === self.findIndex(i => i.id === item.id)
      );

      console.log(`Após busca específica: ${results.length} itens encontrados`);
    }

    // Filtrar animações se necessário (apenas no carregamento inicial)
    if (shouldExcludeAnimation) {
      const animationGenreId = 16; // ID do gênero Animação
      const beforeFilter = results.length;
      results = results.filter(item => {
        const hasAnimation = item.genre_ids && item.genre_ids.includes(animationGenreId);
        if (hasAnimation) {
          console.log(`Excluindo animação: "${item.title || item.name}"`);
        }
        return !hasAnimation;
      });
      console.log(`Filtro de animação: ${beforeFilter} -> ${results.length} itens`);
    }

    // Buscar informações de streaming para cada item
    const resultsWithStreaming = await Promise.all(
      results.slice(0, 20).map(async (item) => {
        try {
          const providersData = await fetchWithFallback(
            `/${type}/${item.id}/watch/providers?api_key=${API_KEY}`
          );
          item.providers = providersData.results?.BR || null;
          return item;
        } catch (error) {
          console.error('Erro ao buscar provedores:', error);
          item.providers = null;
          return item;
        }
      })
    );

    displayContent(resultsWithStreaming);
  } catch (error) {
    console.error('Erro ao carregar conteúdo:', error);
    showError('Erro ao carregar dados. Tente novamente.');
  } finally {
    setLoading(false);
  }
}

// ===== FUNÇÕES DE INTERFACE =====
function populateGenreFilter() {
  if (!elements.genreFilter) return;
  
  elements.genreFilter.innerHTML = '<option value="">Todos os gêneros</option>';
  
  state.genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre.id;
    option.textContent = genre.name;
    elements.genreFilter.appendChild(option);
  });
}

function displayContent(items) {
  if (!elements.contentGrid) return;

  elements.contentGrid.innerHTML = '';

  // FILTRO FINAL DE SEGURANÇA: Para próximos lançamentos, garantir que sejam futuros
  let finalItems = items;
  
  if (state.currentFilter === 'upcoming') {
    finalItems = items.filter(item => {
      const date = item.release_date || item.first_air_date;
      if (!date) return false;

      const isFuture = isFutureDate(date);

      if (!isFuture) {
        console.warn(`BLOQUEADO: "${item.title || item.name}" (${date}) - não é futuro`);
      }

      return isFuture;
    });
    
    console.log(`Exibindo ${finalItems.length} itens futuros (filtrados de ${items.length} originais)`);
  } else {
    console.log(`Exibindo ${finalItems.length} itens`);
  }

  if (finalItems.length === 0) {
    showNoResults();
    return;
  }

  finalItems.forEach(item => {
    const card = createCard(item);
    elements.contentGrid.appendChild(card);
  });
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.addEventListener('click', () => openModal(item));

  const posterPath = item.poster_path
    ? `${IMAGE_BASE_URL}${item.poster_path}`
    : 'https://via.placeholder.com/500x750/333/fff?text=Sem+Imagem';

  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date;
  const year = date ? new Date(date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const currentYear = new Date().getFullYear();
  const isRecent = year >= currentYear;
  const isFuture = date ? isFutureDate(date) : false;

  // Formatar data completa (mês/ano)
  const formattedDate = formatReleaseDate(date);

  // VERIFICAÇÃO FINAL: Para próximos lançamentos, verificar se é futuro
  if (state.currentFilter === 'upcoming' && !isFutureDate(date)) {
    console.warn(`Conteúdo não-futuro bloqueado: "${title}" (${date})`);
    return document.createElement('div'); // Retorna div vazia
  }

  // Encontrar gênero principal
  const mainGenre = getMainGenre(item.genre_ids);

  // Informações de streaming
  const streamingInfo = getStreamingInfo(item.providers);
  
  card.innerHTML = `
    <div class="card-image">
      <img src="${posterPath}" alt="${title}" class="card-poster" loading="lazy">
      <div class="card-rating">
        <i class="fas fa-star"></i>
        ${rating}
      </div>
      ${isRecent ? '<div class="card-new-badge">NOVO</div>' : ''}
      ${isFuture ? '<div class="card-future-badge">2026+</div>' : ''}
      <div class="card-trailer-btn" onclick="event.stopPropagation(); openModalWithTrailer(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="Assistir Trailer">
        <i class="fas fa-play"></i>
      </div>
      <div class="card-share-btn" onclick="event.stopPropagation(); openShareModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="Compartilhar">
        <i class="fas fa-share-alt"></i>
      </div>
    </div>
    <div class="card-content">
      <h3 class="card-title">${title}</h3>
      <div class="card-meta">
        <span class="card-date ${getDateClass(formattedDate)}">${formattedDate || year}</span>
        ${mainGenre ? `<span class="card-genre">${mainGenre}</span>` : ''}
      </div>
      ${streamingInfo.platforms.length > 0 ? `
        <div class="card-streaming">
          <div class="streaming-platforms">
            ${streamingInfo.platforms.map(platform => `
              <img src="https://image.tmdb.org/t/p/w45${platform.logo_path}"
                   alt="${platform.provider_name}"
                   title="${platform.provider_name}"
                   class="platform-logo">
            `).join('')}
          </div>
          ${streamingInfo.inCinemas ? '<span class="cinema-badge"><i class="fas fa-film"></i> Cinema</span>' : ''}
        </div>
      ` : ''}
    </div>
  `;
  
  return card;
}

function getMainGenre(genreIds) {
  if (!genreIds || genreIds.length === 0) return '';

  const genre = state.genres.find(g => g.id === genreIds[0]);
  return genre ? genre.name : '';
}

function getStreamingInfo(providers) {
  if (!providers) return { hasStreaming: false, platforms: [], inCinemas: false };

  const streaming = providers.flatrate || [];
  const rent = providers.rent || [];
  const buy = providers.buy || [];
  const cinemas = providers.ads || []; // Algumas vezes cinemas aparecem aqui

  const allPlatforms = [...streaming, ...rent, ...buy];
  const uniquePlatforms = allPlatforms.filter((platform, index, self) =>
    index === self.findIndex(p => p.provider_id === platform.provider_id)
  );

  return {
    hasStreaming: streaming.length > 0,
    platforms: uniquePlatforms.slice(0, 3), // Mostrar apenas 3 principais
    inCinemas: cinemas.length > 0 || providers.ads?.length > 0
  };
}

function formatReleaseDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  // Se for lançamento futuro próximo
  if (diffDays >= 0 && diffDays <= 30) {
    if (diffDays === 0) return 'Hoje!';
    if (diffDays === 1) return 'Amanhã!';
    if (diffDays <= 7) return `${diffDays} dias`;
    return `${Math.ceil(diffDays / 7)} sem`;
  }

  // Para datas normais, mostrar mês/ano
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${month}/${year}`;
}

function formatFullDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Se for hoje
  if (diffDays === 0) {
    return 'Lançamento hoje!';
  }

  // Se for amanhã
  if (diffDays === 1) {
    return 'Lança amanhã!';
  }

  // Se for nos próximos 7 dias
  if (diffDays > 0 && diffDays <= 7) {
    return `Lança em ${diffDays} dias`;
  }

  // Se for nos próximos 30 dias
  if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `Lança em ${weeks} semana${weeks > 1 ? 's' : ''}`;
  }

  // Se for no futuro (mais de 30 dias)
  if (diffDays > 30) {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} de ${month} de ${year}`;
  }

  // Se for no passado
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}

function getDateClass(dateText) {
  if (!dateText) return '';

  // Verificar se é uma data futura próxima
  if (dateText.includes('Hoje!') ||
      dateText.includes('Amanhã!') ||
      dateText.includes('dias') ||
      dateText.includes('sem')) {
    return 'date-upcoming';
  }

  return '';
}

// ===== FUNÇÕES DE EVENTOS =====
function handleTypeChange(type) {
  if (state.currentType === type) return;

  state.currentType = type;
  state.currentGenre = '';

  // Atualizar UI
  updateActiveTab(type);
  updateContentFilterOptions(type);
  elements.genreFilter.value = '';

  // Carregar dados
  loadGenres(type);
  loadContent(type, '', state.currentFilter);
}

function updateContentFilterOptions(type) {
  if (!elements.contentFilter) return;
  
  const currentValue = elements.contentFilter.value;
  
  if (type === 'movie') {
    elements.contentFilter.innerHTML = `
      <option value="popular">Filmes de Sucesso</option>
      <option value="upcoming">Lançamentos Futuros</option>
      <option value="in_theaters">Em Cartaz</option>
    `;
  } else {
    elements.contentFilter.innerHTML = `
      <option value="popular">Séries de Sucesso</option>
      <option value="upcoming">Lançamentos</option>
      <option value="in_theaters">No Ar</option>
    `;
  }
  
  // Manter o valor selecionado se ainda existir
  if (elements.contentFilter.querySelector(`option[value="${currentValue}"]`)) {
    elements.contentFilter.value = currentValue;
  }
}

function handleGenreChange(genreId) {
  state.currentGenre = genreId;
  loadContent(state.currentType, genreId, state.currentFilter);
}

function handleContentFilterChange(filter) {
  state.currentFilter = filter;
  state.currentGenre = '';
  elements.genreFilter.value = '';
  loadContent(state.currentType, '', filter);
}

function updateActiveTab(type) {
  elements.filterTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });
}

function updateSectionTitle(type, genreId = '', filter = 'popular') {
  if (!elements.sectionTitle) return;

  let title = '';
  const typeText = type === 'movie' ? 'Filmes' : 'Séries';

  // Definir o texto base do filtro
  let filterText = '';
  switch (filter) {
    case 'upcoming':
      filterText = type === 'movie' ? 'Lançamentos Futuros' : 'Lançamentos';
      break;
    case 'in_theaters':
      filterText = type === 'movie' ? 'Em Cartaz' : 'No Ar';
      break;
    default:
      filterText = type === 'movie' ? 'Filmes de Sucesso' : 'Séries de Sucesso';
  }

  if (genreId) {
    const genre = state.genres.find(g => g.id == genreId);
    const genreName = genre ? genre.name : '';
    title = `${filterText} de ${genreName}`;
  } else {
    title = filterText;
  }

  elements.sectionTitle.textContent = title;
}

function setLoading(loading) {
  state.isLoading = loading;
  
  if (elements.loading) {
    elements.loading.classList.toggle('show', loading);
  }
}

function showNoResults() {
  elements.contentGrid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
      <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
      <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Nenhum conteúdo de 2024+ encontrado</h3>
      <p>Não encontramos filmes ou séries de 2024 em diante para os filtros selecionados.</p>
      <p style="margin-top: 0.5rem; font-size: 0.9rem;">Tente alterar os filtros ou aguarde novos lançamentos.</p>
    </div>
  `;
}

function showError(message) {
  elements.contentGrid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
      <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #e74c3c;"></i>
      <p>${message}</p>
    </div>
  `;
}

// ===== FUNÇÕES DO MODAL =====
async function openModal(item) {
  if (!elements.modal || !elements.modalBody) return;
  
  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date;
  const year = date ? new Date(date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const overview = item.overview || 'Descrição não disponível.';

  // Formatar data completa para o modal
  const fullDate = formatFullDate(date);
  
  const posterPath = item.poster_path 
    ? `${IMAGE_BASE_URL}${item.poster_path}` 
    : 'https://via.placeholder.com/500x750/333/fff?text=Sem+Imagem';
  
  const backdropPath = item.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` 
    : posterPath;
  
  // Buscar informações de streaming
  const streamingInfo = getStreamingInfo(item.providers);
  
  // Buscar trailers
  const trailerInfo = await getTrailerInfo(item.id, state.currentType);

  elements.modalBody.innerHTML = `
    <div style="position: relative; height: 300px; background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${backdropPath}'); background-size: cover; background-position: center; display: flex; align-items: end; padding: 2rem;">
      <div style="color: white; width: 100%;">
        <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">${title}</h2>
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.9rem;">
            <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">
              <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>
              ${fullDate || year}
            </span>
            <span style="display: flex; align-items: center; gap: 0.25rem; background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">
              <i class="fas fa-star" style="color: #ffd700;"></i>
              ${rating}
            </span>
          </div>
          ${trailerInfo.hasTrailer ? `
            <button onclick="showTrailer('${trailerInfo.key}', '${title}')" style="background: #e50914; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 500; transition: background 0.3s;" onmouseover="this.style.background='#b8070f'" onmouseout="this.style.background='#e50914'">
              <i class="fas fa-play"></i>
              Assistir Trailer
            </button>
          ` : ''}
        </div>
      </div>
    </div>
    <div style="padding: 2rem;">
      <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Sinopse</h3>
      <p style="line-height: 1.6; color: var(--text-secondary); margin-bottom: 2rem;">${overview}</p>

      ${streamingInfo.platforms.length > 0 ? `
        <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Onde Assistir</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          ${streamingInfo.platforms.map(platform => `
            <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-secondary); padding: 0.5rem 1rem; border-radius: var(--radius-sm);">
              <img src="https://image.tmdb.org/t/p/w45${platform.logo_path}"
                   alt="${platform.provider_name}"
                   style="width: 24px; height: 24px; border-radius: 4px;">
              <span style="color: var(--text-primary); font-weight: 500;">${platform.provider_name}</span>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: var(--text-secondary); font-style: italic;">Informações de streaming não disponíveis</p>'}

      ${streamingInfo.inCinemas ? `
        <div style="background: linear-gradient(45deg, #e74c3c, #c0392b); color: white; padding: 1rem; border-radius: var(--radius-md); text-align: center; margin-top: 1rem;">
          <i class="fas fa-film" style="margin-right: 0.5rem;"></i>
          <strong>Disponível nos Cinemas</strong>
        </div>
      ` : ''}
      
      <!-- Container para o trailer -->
      <div id="trailer-container" style="display: none; margin-top: 2rem;">
        <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Trailer</h3>
        <div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; background: #000; border-radius: var(--radius-md); overflow: hidden;">
          <iframe id="trailer-iframe" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
        </div>
        <button onclick="hideTrailer()" style="margin-top: 1rem; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          <i class="fas fa-times" style="margin-right: 0.5rem;"></i>
          Fechar Trailer
        </button>
      </div>
    </div>
  `;
  
  elements.modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!elements.modal) return;
  
  // Parar trailer se estiver tocando
  hideTrailer();
  
  elements.modal.classList.remove('show');
  document.body.style.overflow = '';
}

// ===== FUNÇÕES DE TRAILER =====
async function getTrailerInfo(itemId, type) {
  try {
    const endpoint = `/${type}/${itemId}/videos?api_key=${API_KEY}&language=pt-BR`;
    const data = await fetchWithFallback(endpoint);
    
    if (!data.results || data.results.length === 0) {
      // Tentar buscar em inglês se não houver em português
      const englishEndpoint = `/${type}/${itemId}/videos?api_key=${API_KEY}&language=en-US`;
      const englishData = await fetchWithFallback(englishEndpoint);
      
      if (!englishData.results || englishData.results.length === 0) {
        return { hasTrailer: false, key: null };
      }
      
      // Procurar por trailer oficial
      const trailer = englishData.results.find(video => 
        video.type === 'Trailer' && 
        video.site === 'YouTube' && 
        (video.name.toLowerCase().includes('official') || 
         video.name.toLowerCase().includes('trailer'))
      ) || englishData.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      ) || englishData.results[0];
      
      return {
        hasTrailer: !!trailer,
        key: trailer?.key || null
      };
    }
    
    // Procurar por trailer oficial em português
    const trailer = data.results.find(video => 
      video.type === 'Trailer' && 
      video.site === 'YouTube' && 
      (video.name.toLowerCase().includes('oficial') || 
       video.name.toLowerCase().includes('trailer'))
    ) || data.results.find(video => 
      video.type === 'Trailer' && video.site === 'YouTube'
    ) || data.results[0];
    
    return {
      hasTrailer: !!trailer,
      key: trailer?.key || null
    };
  } catch (error) {
    console.error('Erro ao buscar trailer:', error);
    return { hasTrailer: false, key: null };
  }
}

function showTrailer(trailerKey, title) {
  const trailerContainer = document.getElementById('trailer-container');
  const trailerIframe = document.getElementById('trailer-iframe');
  
  if (!trailerContainer || !trailerIframe || !trailerKey) return;
  
  // Configurar iframe do YouTube
  trailerIframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`;
  
  // Mostrar container do trailer
  trailerContainer.style.display = 'block';
  
  // Scroll suave para o trailer
  trailerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  console.log(`Reproduzindo trailer de "${title}" (${trailerKey})`);
}

function hideTrailer() {
  const trailerContainer = document.getElementById('trailer-container');
  const trailerIframe = document.getElementById('trailer-iframe');
  
  if (!trailerContainer || !trailerIframe) return;
  
  // Parar vídeo removendo src
  trailerIframe.src = '';
  
  // Esconder container
  trailerContainer.style.display = 'none';
}

// Função para abrir modal e mostrar trailer automaticamente
async function openModalWithTrailer(item) {
  await openModal(item);
  
  // Buscar trailer e mostrar automaticamente
  const trailerInfo = await getTrailerInfo(item.id, state.currentType);
  
  if (trailerInfo.hasTrailer) {
    setTimeout(() => {
      showTrailer(trailerInfo.key, item.title || item.name);
    }, 500); // Pequeno delay para garantir que o modal foi renderizado
  }
}

// ===== FUNÇÕES DO TEMA =====
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = elements.themeToggle?.querySelector('i');
  if (!icon) return;

  icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}



// ===== FUNÇÕES DE COMPARTILHAMENTO =====
let currentShareItem = null;

// Função para abrir o modal de compartilhamento
function openShareModal(item) {
  currentShareItem = item;
  const shareModal = document.getElementById('share-modal');
  if (shareModal) {
    shareModal.classList.add('show');
    setupShareLinks(item);
  }
}

// Função para fechar o modal de compartilhamento
function closeShareModal() {
  const shareModal = document.getElementById('share-modal');
  if (shareModal) {
    shareModal.classList.remove('show');
  }
  currentShareItem = null;
}

// Função para configurar os links de compartilhamento
function setupShareLinks(item) {
  const title = item.title || item.name;
  const type = item.title ? 'filme' : 'série';
  const year = item.release_date || item.first_air_date ? 
    new Date(item.release_date || item.first_air_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  
  // Criar mensagem de compartilhamento
  const message = `🎬 Recomendo ${type}: "${title}" ${year ? `(${year})` : ''}
⭐ Avaliação: ${rating}/10

Descobri no app Filmes & Séries! 🍿`;

  const encodedMessage = encodeURIComponent(message);
  
  // Configurar links
  const whatsappLink = document.getElementById('share-whatsapp');
  const emailLink = document.getElementById('share-email');
  const smsLink = document.getElementById('share-sms');
  
  if (whatsappLink) {
    whatsappLink.href = `https://wa.me/?text=${encodedMessage}`;
    whatsappLink.target = '_blank';
  }
  
  if (emailLink) {
    const subject = encodeURIComponent(`Recomendação: ${title}`);
    emailLink.href = `mailto:?subject=${subject}&body=${encodedMessage}`;
  }
  
  if (smsLink) {
    smsLink.href = `sms:?body=${encodedMessage}`;
  }
}

// Event listeners para o modal de compartilhamento
document.addEventListener('DOMContentLoaded', () => {
  // Fechar modal de compartilhamento
  const shareModalClose = document.querySelector('.share-modal-close');
  const shareModalOverlay = document.querySelector('.share-modal-overlay');
  
  if (shareModalClose) {
    shareModalClose.addEventListener('click', closeShareModal);
  }
  
  if (shareModalOverlay) {
    shareModalOverlay.addEventListener('click', closeShareModal);
  }
  
  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeShareModal();
    }
  });
  
  // Event listeners para os botões de compartilhamento
  const shareOptions = document.querySelectorAll('.share-option');
  shareOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      // Pequeno delay para permitir que o link seja processado
      setTimeout(() => {
        closeShareModal();
      }, 100);
    });
  });
});