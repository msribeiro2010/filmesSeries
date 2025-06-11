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
        // Lançamentos futuros (2025+)
        if (type === 'movie') {
          url = `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=1`;
          // Filtrar apenas 2025+
          const response = await fetch(url);
          const data = await response.json();
          results = (data.results || []).filter(item => {
            const releaseDate = item.release_date;
            return releaseDate && new Date(releaseDate).getFullYear() >= 2025;
          });
        } else {
          // Para séries, usar discover com data futura
          url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&first_air_date.gte=2025-01-01&sort_by=popularity.desc`;
          const response = await fetch(url);
          const data = await response.json();
          results = data.results || [];
        }
        break;

      case 'in_theaters':
        // Em cartaz (apenas filmes)
        if (type === 'movie') {
          url = `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=pt-BR&page=1`;
        } else {
          // Para séries, usar "on the air"
          url = `${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=pt-BR&page=1`;
        }
        const response = await fetch(url);
        const data = await response.json();
        results = data.results || [];
        break;

      default: // popular
        // Usar discover para filtrar por ano (2024+) e popularidade
        url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc&vote_count.gte=50&vote_average.gte=6.0`;

        // Filtrar por ano 2024 em diante
        if (type === 'movie') {
          url += `&primary_release_date.gte=2024-01-01`;
        } else {
          url += `&first_air_date.gte=2024-01-01`;
        }

        const popularResponse = await fetch(url);
        const popularData = await popularResponse.json();
        results = popularData.results || [];

        // Se poucos resultados, carregar mais páginas
        if (results.length < 15 && popularData.total_pages > 1) {
          const page2Response = await fetch(url + '&page=2');
          const page2Data = await page2Response.json();
          results = [...results, ...(page2Data.results || [])];
        }
        break;
    }

    // Adicionar filtro de gênero se selecionado
    if (genreId && results.length > 0) {
      results = results.filter(item =>
        item.genre_ids && item.genre_ids.includes(parseInt(genreId))
      );
    }

    // Se não houver resultados, buscar fallback
    if (results.length === 0) {
      console.log('Nenhum resultado encontrado, buscando fallback...');
      const fallbackUrl = `${BASE_URL}/${type}/popular?api_key=${API_KEY}&language=pt-BR&page=1`;
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      results = fallbackData.results || [];
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
  
  if (items.length === 0) {
    showNoResults();
    return;
  }
  
  items.forEach(item => {
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
        <span class="card-year">${year}</span>
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
      filterText = 'Lançamentos 2025+';
      break;
    case 'in_theaters':
      filterText = type === 'movie' ? 'Em Cartaz' : 'No Ar';
      break;
    default:
      filterText = 'Populares (2024+)';
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
      <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
      <p>Nenhum resultado encontrado</p>
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
          <span>${year}</span>
          <span style="display: flex; align-items: center; gap: 0.25rem;">
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
