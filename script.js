// ===== CONFIGURAÇÕES DA API =====
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// ===== ESTADO DA APLICAÇÃO =====
const state = {
  currentType: 'movie',
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
  await loadGenres(state.currentType);
  await loadContent(state.currentType, '', state.currentFilter);
}

// ===== FUNÇÕES DE CARREGAMENTO =====
async function loadGenres(type) {
  try {
    const response = await fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`);
    const data = await response.json();
    
    state.genres = data.genres || [];
    populateGenreFilter();
  } catch (error) {
    console.error('Erro ao carregar gêneros:', error);
  }
}

async function loadContent(type, genreId = '', filter = 'popular') {
  if (state.isLoading) return;

  setLoading(true);
  updateSectionTitle(type, genreId, filter);

  try {
    let url = '';
    let results = [];

    switch (filter) {
      case 'upcoming':
        // Lançamentos futuros (2025 em diante)

        if (type === 'movie') {
          // Para filmes: usar discover para ter mais controle sobre as datas
          url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=release_date.asc&primary_release_date.gte=2025-01-01&vote_count.gte=10`;

          console.log('URL filmes futuros:', url);
          const response = await fetch(url);
          const data = await response.json();

          // Filtrar rigorosamente apenas filmes de 2025+
          results = (data.results || []).filter(item => {
            const releaseDate = item.release_date;
            if (!releaseDate) return false;

            const year = new Date(releaseDate).getFullYear();
            const isFuture = year >= 2025;

            console.log(`Filme: "${item.title}" - Data: ${releaseDate} (${year}) - Futuro: ${isFuture}`);
            return isFuture;
          });

          // Se poucos resultados, buscar também de upcoming oficial
          if (results.length < 10) {
            const upcomingUrl = `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=1`;
            const upcomingResponse = await fetch(upcomingUrl);
            const upcomingData = await upcomingResponse.json();

            const futureUpcoming = (upcomingData.results || []).filter(item => {
              const releaseDate = item.release_date;
              return releaseDate && new Date(releaseDate).getFullYear() >= 2025;
            });

            results = [...results, ...futureUpcoming];
          }

        } else {
          // Para séries: buscar séries que estrearão em 2025+
          url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=first_air_date.asc&first_air_date.gte=2025-01-01&vote_count.gte=5`;

          console.log('URL séries futuras:', url);
          const response = await fetch(url);
          const data = await response.json();

          results = (data.results || []).filter(item => {
            const airDate = item.first_air_date;
            if (!airDate) return false;

            const year = new Date(airDate).getFullYear();
            const isFuture = year >= 2025;

            console.log(`Série: "${item.name}" - Data: ${airDate} (${year}) - Futuro: ${isFuture}`);
            return isFuture;
          });
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
        console.log('🎬 Buscando conteúdo em cartaz/no ar...');

        if (type === 'movie') {
          // Para filmes: buscar filmes em cartaz nos cinemas
          url = `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=pt-BR&page=1`;
          console.log('URL filmes em cartaz:', url);

          const response = await fetch(url);
          const data = await response.json();

          // Filtrar apenas filmes de 2024+ que estão em cartaz
          results = (data.results || []).filter(item => {
            const releaseDate = item.release_date;
            if (!releaseDate) return false;

            const year = new Date(releaseDate).getFullYear();
            const isRecent = year >= 2024;

            console.log(`Filme em cartaz: "${item.title}" - Data: ${releaseDate} (${year}) - 2024+: ${isRecent}`);
            return isRecent;
          });

        } else {
          // Para séries: buscar séries que estão no ar atualmente
          url = `${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=pt-BR&page=1`;
          console.log('URL séries no ar:', url);

          const response = await fetch(url);
          const data = await response.json();

          // Para séries no ar, mostrar todas (podem ser de qualquer ano mas estão ativas)
          results = data.results || [];

          // Opcional: filtrar apenas séries que tiveram episódios recentes
          results = results.filter(item => {
            console.log(`Série no ar: "${item.name}" - Primeira exibição: ${item.first_air_date}`);
            return true; // Manter todas as séries no ar
          });
        }

        console.log(`Encontrados ${results.length} títulos em cartaz/no ar`);
        break;

      default: // popular
        // Mais populares de 2024 em diante
        console.log('🔥 Buscando mais populares de 2024+...');

        if (type === 'movie') {
          // Para filmes: buscar os mais populares de 2024+
          console.log('Buscando filmes mais populares de 2024+...');
          url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&vote_count.gte=100&vote_average.gte=6.5&primary_release_date.gte=2024-01-01`;

          console.log('URL filmes populares:', url);
        } else {
          // Para séries: focar apenas nas que estrearam em 2024+
          console.log('Buscando séries mais populares de 2024+...');

          // Buscar séries que estrearam especificamente em 2024+
          url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&vote_count.gte=50&vote_average.gte=6.5&first_air_date.gte=2024-01-01`;

          console.log('URL séries populares:', url);
          const response = await fetch(url);
          const data = await response.json();

          // Filtrar rigorosamente apenas séries de 2024+
          results = (data.results || []).filter(series => {
            const airDate = series.first_air_date;
            if (!airDate) return false;

            const year = new Date(airDate).getFullYear();
            const is2024Plus = year >= 2024;

            console.log(`Série: "${series.name}" - Data: ${airDate} (${year}) - 2024+: ${is2024Plus} - Popularidade: ${series.popularity}`);
            return is2024Plus;
          });

          // Se poucos resultados, buscar mais páginas
          if (results.length < 15) {
            console.log('Poucos resultados, buscando página 2...');
            const page2Url = url + '&page=2';
            const page2Response = await fetch(page2Url);
            const page2Data = await page2Response.json();

            const page2Results = (page2Data.results || []).filter(series => {
              const airDate = series.first_air_date;
              if (!airDate) return false;
              const year = new Date(airDate).getFullYear();
              return year >= 2024;
            });

            results = [...results, ...page2Results];
          }

          // Remover duplicatas e ordenar por popularidade
          results = results.filter((series, index, self) =>
            index === self.findIndex(s => s.id === series.id)
          ).sort((a, b) => b.popularity - a.popularity);

          console.log(`Encontradas ${results.length} séries populares de 2024+`);
          break;
        }

        // Para filmes, executar a busca com múltiplas estratégias
        if (type === 'movie') {
          // 1. Buscar filmes de 2024+ com alta popularidade
          const popularResponse = await fetch(url);
          const popularData = await popularResponse.json();
          let movies2024 = popularData.results || [];

          // 2. Se poucos resultados, buscar filmes populares gerais e filtrar
          if (movies2024.length < 10) {
            const generalPopularUrl = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=1`;
            const generalResponse = await fetch(generalPopularUrl);
            const generalData = await generalResponse.json();

            // Filtrar apenas filmes de 2024+ com boa avaliação
            const filtered2024Movies = (generalData.results || []).filter(movie => {
              const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
              return year >= 2024 && movie.vote_average >= 7.0 && movie.popularity > 100;
            });

            movies2024 = [...movies2024, ...filtered2024Movies];
          }

          // 3. Carregar mais páginas se ainda precisar
          if (movies2024.length < 15 && popularData.total_pages > 1) {
            const page2Response = await fetch(url + '&page=2');
            const page2Data = await page2Response.json();
            const page2Movies = (page2Data.results || []).filter(movie => {
              return movie.vote_average >= 7.0;
            });
            movies2024 = [...movies2024, ...page2Movies];
          }

          // Remover duplicatas e ordenar por popularidade
          const uniqueMovies = movies2024.filter((movie, index, self) =>
            index === self.findIndex(m => m.id === movie.id)
          );

          results = uniqueMovies
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 20); // Limitar a 20 filmes mais populares

          console.log(`Encontrados ${results.length} filmes populares de 2024+`);
        }
        break;
    }

    // Adicionar filtro de gênero se selecionado
    if (genreId && results.length > 0) {
      results = results.filter(item =>
        item.genre_ids && item.genre_ids.includes(parseInt(genreId))
      );
    }

    // FILTRO FINAL: Garantir que TODOS os resultados sejam de 2024+
    results = results.filter(item => {
      const date = item.release_date || item.first_air_date;
      if (!date) return false;

      const year = new Date(date).getFullYear();
      const isFrom2024Plus = year >= 2024;

      if (!isFrom2024Plus) {
        console.log(`Removendo "${item.title || item.name}" (${year}) - não é de 2024+`);
      }

      return isFrom2024Plus;
    });

    console.log(`Após filtro final: ${results.length} itens de 2024+`);

    // Se não houver resultados de 2024+, buscar especificamente
    if (results.length === 0) {
      console.log('Nenhum resultado de 2024+ encontrado, buscando especificamente...');

      if (type === 'movie') {
        // Para filmes: buscar especificamente 2024 e 2025
        const urls = [
          `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&primary_release_year=2024`,
          `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&primary_release_year=2025`
        ];

        for (const url of urls) {
          const response = await fetch(url);
          const data = await response.json();
          results = [...results, ...(data.results || [])];
        }
      } else {
        // Para séries: buscar especificamente 2024 e 2025
        const urls = [
          `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&first_air_date.gte=2024-01-01&first_air_date.lte=2024-12-31`,
          `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&first_air_date.gte=2025-01-01&first_air_date.lte=2025-12-31`
        ];

        for (const url of urls) {
          const response = await fetch(url);
          const data = await response.json();
          results = [...results, ...(data.results || [])];
        }
      }

      // Remover duplicatas
      results = results.filter((item, index, self) =>
        index === self.findIndex(i => i.id === item.id)
      );

      console.log(`Após busca específica: ${results.length} itens encontrados`);
    }

    // Buscar informações de streaming para cada item
    const resultsWithStreaming = await Promise.all(
      results.slice(0, 20).map(async (item) => {
        try {
          const providersResponse = await fetch(
            `${BASE_URL}/${type}/${item.id}/watch/providers?api_key=${API_KEY}`
          );
          const providersData = await providersResponse.json();
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

  // FILTRO FINAL DE SEGURANÇA: Garantir que apenas conteúdo de 2024+ seja exibido
  const filtered2024Items = items.filter(item => {
    const date = item.release_date || item.first_air_date;
    if (!date) return false;

    const year = new Date(date).getFullYear();
    const isValid = year >= 2024;

    if (!isValid) {
      console.warn(`BLOQUEADO: "${item.title || item.name}" (${year}) - não é de 2024+`);
    }

    return isValid;
  });

  console.log(`Exibindo ${filtered2024Items.length} itens de 2024+ (filtrados de ${items.length} originais)`);

  if (filtered2024Items.length === 0) {
    showNoResults();
    return;
  }

  filtered2024Items.forEach(item => {
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
  const isRecent = year >= 2024;
  const isFuture = year >= 2025;

  // Formatar data completa (mês/ano)
  const formattedDate = formatReleaseDate(date);

  // VERIFICAÇÃO FINAL: Se não for de 2024+, não criar o card
  if (year < 2024) {
    console.warn(`Conteúdo anterior a 2024 bloqueado: "${title}" (${year})`);
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
      ${isFuture ? '<div class="card-future-badge">2025+</div>' : ''}
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
  elements.genreFilter.value = '';

  // Carregar dados
  loadGenres(type);
  loadContent(type, '', state.currentFilter);
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
      filterText = type === 'movie' ? 'Próximos Lançamentos (2025+)' : 'Séries Futuras (2025+)';
      break;
    case 'in_theaters':
      filterText = type === 'movie' ? 'Em Cartaz nos Cinemas' : 'Séries no Ar';
      break;
    default:
      filterText = type === 'movie' ? 'Filmes Populares (2024+)' : 'Séries Populares (2024+)';
  }

  if (genreId) {
    const genre = state.genres.find(g => g.id == genreId);
    const genreName = genre ? genre.name : '';
    title = `${typeText} de ${genreName} - ${filterText}`;
  } else {
    title = `${typeText} ${filterText}`;
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
function openModal(item) {
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

  elements.modalBody.innerHTML = `
    <div style="position: relative; height: 300px; background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${backdropPath}'); background-size: cover; background-position: center; display: flex; align-items: end; padding: 2rem;">
      <div style="color: white;">
        <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">${title}</h2>
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
    </div>
  `;
  
  elements.modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!elements.modal) return;
  
  elements.modal.classList.remove('show');
  document.body.style.overflow = '';
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


