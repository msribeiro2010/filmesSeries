const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// --- NOVO: Elementos e variáveis globais para filtros ---
let currentType = 'movie'; // 'movie' ou 'tv'
let currentGenre = null;
let currentMode = 'default'; // 'default', 'releases', 'premieres', 'upcoming'

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.hamburger');
  const nav = document.querySelector('.main-nav');
  const overlay = document.querySelector('.nav-overlay');

  // Menu mobile toggle
  function toggleMenu() {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('show');
    overlay.classList.toggle('active');
    document.body.style.overflow = !expanded ? 'hidden' : '';
  }
  btn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);

  // Accordion functionality
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const panel = document.getElementById(header.getAttribute('aria-controls'));
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  });

  // Tema claro/escuro
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    document.querySelector('.theme-toggle i').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', next);
  });

  // --- NOVO: Filtros de tipo (filme/série) ---
  document.getElementById('type-movie').addEventListener('click', () => handleTypeChange('movie'));
  document.getElementById('type-tv').addEventListener('click', () => handleTypeChange('tv'));
  
  // --- NOVO: Botões de categorias especiais ---
  document.getElementById('type-releases').addEventListener('click', () => handleSpecialMode('releases'));
  document.getElementById('type-premieres').addEventListener('click', () => handleSpecialMode('premieres'));
  document.getElementById('type-upcoming').addEventListener('click', () => handleSpecialMode('upcoming'));

  // --- NOVO: Filtro de gênero ---
  document.getElementById('genre-filter').addEventListener('change', (e) => handleGenreChange(e.target.value));

  // Carregar gêneros e filmes populares iniciais
  fetchGenres('movie');
  fetchPopular('movie');

  // Iniciar agendamento de atualização diária das estreias
  scheduleDailyRefresh();

  // Garantir que o modal feche corretamente
  const modal = document.getElementById('details-modal');
  if (modal) {
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (overlay) overlay.onclick = closeModal;
  }
});

// --- NOVO: Função para buscar gêneros ---
function fetchGenres(type = 'movie') {
  const genreSelect = document.getElementById('genre-filter');
  if (!genreSelect) return;
  genreSelect.innerHTML = '<option value="">Todos os Gêneros</option>';
  fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`)
    .then(res => res.json())
    .then(data => {
      data.genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre.id;
        option.textContent = genre.name;
        genreSelect.appendChild(option);
      });
    })
    .catch(err => console.error('Erro ao buscar gêneros:', err));
}

// --- NOVO: Função para buscar filmes ou séries populares com filtro de gênero e ordenação por melhores avaliados ---
function fetchPopular(type = 'movie', genreId = null) {
  const container = document.getElementById('movies-series');
  
  // Adicionar indicador de carregamento
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando ${type === 'movie' ? 'filmes' : 'séries'}...</p>
    </div>
  `;
  
  // Preparar URL com filtros
  let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=vote_average.desc&vote_count.gte=100`;
  if (genreId) url += `&with_genres=${genreId}`;
  if (type === 'movie') {
    url += `&primary_release_date.gte=2024-01-01`;
  } else {
    url += `&first_air_date.gte=2024-01-01`;
  }
  
  // Buscar gêneros para exibir o principal em cada card
  let genresPromise = fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`)
    .then(res => res.json())
    .then(data => data.genres || []);
  
  // Buscar títulos
  let titlesPromise = fetch(url)
    .then(res => res.json())
    .then(data => data.results || []);
  
  // Processar ambas as promessas
  Promise.all([titlesPromise, genresPromise])
    .then(([titles, genres]) => {
      // Limpar container
      container.innerHTML = '';
      
      // Criar fragmento para melhor performance
      const fragment = document.createDocumentFragment();
      
      // Verificar se há resultados
      if (titles.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <i class="fas fa-search"></i>
          <p>Nenhum ${type === 'movie' ? 'filme' : 'série'} encontrado com os filtros atuais.</p>
        `;
        fragment.appendChild(noResults);
      } else {
        // Processar cada título
        titles.forEach(item => {
          // Encontrar gênero principal
          let mainGenre = '';
          if (item.genre_ids && item.genre_ids.length > 0) {
            const genreObj = genres.find(g => g.id === item.genre_ids[0]);
            mainGenre = genreObj ? genreObj.name : '';
          }
          
          // Criar card com classe para animação
          const card = document.createElement('div');
          card.className = 'movie-series card-modern card-fade-in';
          
          // Verificar se há poster
          const posterPath = item.poster_path 
            ? `${IMAGE_BASE_URL}${item.poster_path}` 
            : 'https://via.placeholder.com/500x750?text=Sem+Imagem';
          
          card.innerHTML = `
            <div class="image-container">
              <img src="${posterPath}" alt="${item.title || item.name}" class="card-poster" 
                   onerror="this.src='https://via.placeholder.com/500x750?text=Erro+ao+Carregar';" />
              <button class="trailer-button" title="Ver trailer"><i class="fas fa-play"></i></button>
              <div class="rating-badge"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</div>
            </div>
            <div class="movie-info">
              <h2 class="movie-title">${item.title || item.name}</h2>
              <div class="movie-details">
                <span class="release-year">${(item.release_date || item.first_air_date || '').slice(0,4)}</span>
                ${mainGenre ? `<span class="genre-tag">${mainGenre}</span>` : ''}
              </div>
            </div>
          `;
          
          // Clicar no card abre detalhes, clicar no botão de trailer abre modal focando no trailer
          card.addEventListener('click', (e) => {
            if (e.target.closest('.trailer-button')) {
              openDetailsModal(type, item.id, true); // true = focar trailer
            } else {
              openDetailsModal(type, item.id, false);
            }
          });
          
          // Adicionar ao fragmento
          fragment.appendChild(card);
          
          // Adicionar efeito de entrada com delay progressivo
          setTimeout(() => {
            card.classList.add('show');
          }, 50 * fragment.childElementCount);
        });
      }
      
      // Adicionar fragmento ao container
      container.appendChild(fragment);
    })
    .catch(err => {
      console.error('Erro ao buscar filmes/séries:', err);
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.</p>
        </div>
      `;
    });
}

// --- NOVO: Função para buscar detalhes, trailer e plataformas de streaming e abrir modal ---
function openDetailsModal(type, id, focusTrailer = false) {
  Promise.all([
    fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=pt-BR`).then(res => res.json()),
    fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=pt-BR`).then(res => res.json()),
    fetch(`${BASE_URL}/${type}/${id}/watch/providers?api_key=${API_KEY}`).then(res => res.json())
  ]).then(([details, videos, providers]) => {
    const trailer = (videos.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
    let streaming = [];
    if (providers.results && providers.results.BR && providers.results.BR.flatrate) {
      streaming = providers.results.BR.flatrate.map(p => ({
        name: p.provider_name,
        logo: p.logo_path
      }));
    }
    showModal({
      title: details.title || details.name,
      overview: details.overview,
      poster: details.poster_path,
      rating: details.vote_average,
      release: details.release_date || details.first_air_date,
      trailerKey: trailer ? trailer.key : null,
      streaming,
      focusTrailer
    });
  }).catch(err => console.error('Erro ao buscar detalhes:', err));
}

// --- NOVO: Função para exibir modal (agora inclui streaming) ---
function showModal({ title, overview, poster, rating, release, trailerKey, streaming, focusTrailer }) {
  let modal = document.getElementById('details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'details-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button class="modal-close" aria-label="Fechar">&times;</button>
        <div class="modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = closeModal;
    modal.querySelector('.modal-overlay').onclick = closeModal;
  }
  const body = modal.querySelector('.modal-body');
  body.innerHTML = `
    <img src="${IMAGE_BASE_URL}${poster}" alt="${title}" class="modal-poster" />
    <div class="modal-info">
      <h2>${title}</h2>
      <p><strong>Nota:</strong> ${rating ? rating.toFixed(1) : 'N/A'}</p>
      <p><strong>Lançamento:</strong> ${release || 'N/A'}</p>
      <p>${overview || 'Sem sinopse disponível.'}</p>
      ${streaming && streaming.length > 0 ? `
        <div class="modal-streaming">
          <strong>Disponível em streaming:</strong>
          <div class="streaming-logos">
            ${streaming.map(s => `<span title="${s.name}"><img src="${IMAGE_BASE_URL}${s.logo}" alt="${s.name}" style="height:32px; margin-right:8px; vertical-align:middle;"/></span>`).join('')}
          </div>
        </div>
      ` : '<p><em>Não disponível em streaming no Brasil.</em></p>'}
      ${trailerKey ? `<div class="modal-trailer"><iframe id="modal-trailer-iframe" width="100%" height="315" src="https://www.youtube.com/embed/${trailerKey}" frameborder="0" allowfullscreen></iframe></div>` : '<p>Trailer não disponível.</p>'}
    </div>
  `;
  modal.style.display = 'flex';
  setTimeout(() => { modal.classList.add('show'); }, 10);
  // Se for para focar no trailer, rolar até o iframe
  if (focusTrailer && trailerKey) {
    setTimeout(() => {
      const iframe = document.getElementById('modal-trailer-iframe');
      if (iframe) iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }
}

// --- NOVO: Função para fechar modal ---
function closeModal() {
  const modal = document.getElementById('details-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
}

// --- NOVO: Função para lidar com mudança de tipo (filme/série) ---
function handleTypeChange(type) {
  // Atualizar botões de tipo
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `type-${type}`);
  });
  
  // Desativar todos os botões de categorias especiais
  document.querySelectorAll('.release-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  currentType = type;
  currentGenre = null;
  currentMode = 'default';
  document.getElementById('genre-filter').value = '';
  
  // Atualizar título da seção
  const sectionTitle = document.querySelector('.section-title');
  if (sectionTitle) {
    sectionTitle.textContent = type === 'movie' ? 'Filmes Populares' : 'Séries Populares';
  }
  
  fetchGenres(type);
  fetchPopular(type);
}

// --- NOVO: Função para lidar com mudança de gênero ---
function handleGenreChange(genreId) {
  currentGenre = genreId || null;
  
  switch(currentMode) {
    case 'releases':
      fetchReleases(currentType, currentGenre);
      break;
    case 'premieres':
      fetchPremieres(currentType, currentGenre);
      break;
    case 'upcoming':
      fetchUpcoming(currentType, currentGenre);
      break;
    default:
      fetchPopular(currentType, currentGenre);
  }
}

// --- NOVO: Função para lidar com modos especiais (lançamentos, estreias, em breve) ---
function handleSpecialMode(mode) {
  // Desativar botões de tipo
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Desativar todos os botões de categorias especiais
  document.querySelectorAll('.release-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Ativar o botão correspondente ao modo
  document.getElementById(`type-${mode}`).classList.add('active');
  
  currentMode = mode;
  
  // Atualizar título da seção
  const sectionTitle = document.querySelector('.section-title');
  if (sectionTitle) {
    switch(mode) {
      case 'releases':
        sectionTitle.textContent = 'Lançamentos Recentes';
        break;
      case 'premieres':
        sectionTitle.textContent = 'Melhores avaliados da semana';
        break;
      case 'upcoming':
        sectionTitle.textContent = 'Em Breve nos Cinemas';
        break;
    }
  }
  
  // Chamar a função correspondente
  switch(mode) {
    case 'releases':
      fetchReleases(currentType, currentGenre);
      break;
    case 'premieres':
      fetchPremieres(currentType, currentGenre);
      break;
    case 'upcoming':
      fetchUpcoming(currentType, currentGenre);
      break;
  }
}

// --- NOVO: Função para buscar lançamentos recentes ---
function fetchReleases(type = 'movie', genreId = null) {
  const container = document.getElementById('movies-series');
  
  // Adicionar indicador de carregamento
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando lançamentos...</p>
    </div>
  `;
  
  // Obter data atual e data de 2 meses atrás para lançamentos recentes
  const today = new Date();
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(today.getMonth() - 2);
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  };
  
  // Preparar URL com filtros para lançamentos recentes
  let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=release_date.desc`;
  
  if (type === 'movie') {
    url += `&primary_release_date.gte=${formatDate(twoMonthsAgo)}&primary_release_date.lte=${formatDate(today)}`;
  } else {
    url += `&first_air_date.gte=${formatDate(twoMonthsAgo)}&first_air_date.lte=${formatDate(today)}`;
  }
  
  if (genreId) url += `&with_genres=${genreId}`;
  
  // Buscar gêneros para exibir o principal em cada card
  let genresPromise = fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`)
    .then(res => res.json())
    .then(data => data.genres || []);
  
  // Buscar títulos
  let titlesPromise = fetch(url)
    .then(res => res.json())
    .then(data => data.results || []);
  
  // Processar ambas as promessas
  Promise.all([titlesPromise, genresPromise])
    .then(([titles, genres]) => {
      // Limpar container
      container.innerHTML = '';
      
      // Criar fragmento para melhor performance
      const fragment = document.createDocumentFragment();
      
      // Verificar se há resultados
      if (titles.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <i class="fas fa-search"></i>
          <p>Nenhum lançamento encontrado com os filtros atuais.</p>
        `;
        fragment.appendChild(noResults);
      } else {
        // Processar cada título
        titles.forEach(item => {
          // Encontrar gênero principal
          let mainGenre = '';
          if (item.genre_ids && item.genre_ids.length > 0) {
            const genreObj = genres.find(g => g.id === item.genre_ids[0]);
            mainGenre = genreObj ? genreObj.name : '';
          }
          
          // Criar card com classe para animação
          const card = document.createElement('div');
          card.className = 'movie-series card-modern card-fade-in';
          
          // Verificar se há poster
          const posterPath = item.poster_path 
            ? `${IMAGE_BASE_URL}${item.poster_path}` 
            : 'https://via.placeholder.com/500x750?text=Sem+Imagem';
          
          // Formatação da data de lançamento
          const releaseDate = item.release_date || item.first_air_date || '';
          const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('pt-BR') : 'Data desconhecida';
          
          card.innerHTML = `
            <div class="image-container">
              <img src="${posterPath}" alt="${item.title || item.name}" class="card-poster" 
                   onerror="this.src='https://via.placeholder.com/500x750?text=Erro+ao+Carregar';" />
              <button class="trailer-button" title="Ver trailer"><i class="fas fa-play"></i></button>
              <div class="rating-badge"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</div>
              <div class="release-badge"><i class="fas fa-calendar-alt"></i> ${formattedDate}</div>
            </div>
            <div class="movie-info">
              <h2 class="movie-title">${item.title || item.name}</h2>
              <div class="movie-details">
                <span class="release-year">${releaseDate.slice(0,4)}</span>
                ${mainGenre ? `<span class="genre-tag">${mainGenre}</span>` : ''}
              </div>
            </div>
          `;
          
          // Clicar no card abre detalhes, clicar no botão de trailer abre modal focando no trailer
          card.addEventListener('click', (e) => {
            if (e.target.closest('.trailer-button')) {
              openDetailsModal(type, item.id, true); // true = focar trailer
            } else {
              openDetailsModal(type, item.id, false);
            }
          });
          
          // Adicionar ao fragmento
          fragment.appendChild(card);
          
          // Adicionar efeito de entrada com delay progressivo
          setTimeout(() => {
            card.classList.add('show');
          }, 50 * fragment.childElementCount);
        });
      }
      
      // Adicionar fragmento ao container
      container.appendChild(fragment);
    })
    .catch(err => {
      console.error('Erro ao buscar lançamentos:', err);
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ocorreu um erro ao carregar os lançamentos. Tente novamente mais tarde.</p>
        </div>
      `;
    });
}

// --- NOVO: Função para buscar estreias da semana ---
function fetchPremieres(type = 'movie', genreId = null) {
  const container = document.getElementById('movies-series');

  // Adicionar indicador de carregamento
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando melhores avaliados da semana...</p>
    </div>
  `;

  // Obter datas da semana atual
  const today = new Date();
  const weekStart = new Date(today);
  const weekEnd = new Date(today);
  const currentDay = today.getDay();
  weekStart.setDate(today.getDate() - currentDay);
  weekEnd.setDate(weekStart.getDate() + 6);
  const formatDate = (date) => date.toISOString().split('T')[0];

  // Buscar múltiplas páginas
  const totalPages = 10;
  const fetches = [];
  for (let page = 1; page <= totalPages; page++) {
    let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=pt-BR&page=${page}&sort_by=vote_average.desc&vote_count.gte=1`;
    if (type === 'movie') {
      url += `&primary_release_date.gte=${formatDate(weekStart)}&primary_release_date.lte=${formatDate(weekEnd)}`;
    } else {
      url += `&first_air_date.gte=${formatDate(weekStart)}&first_air_date.lte=${formatDate(weekEnd)}`;
    }
    if (genreId) url += `&with_genres=${genreId}`;
    fetches.push(fetch(url).then(res => res.json()).then(data => data.results || []));
  }

  // Buscar gêneros para exibir o principal em cada card
  let genresPromise = fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`)
    .then(res => res.json())
    .then(data => data.genres || []);

  // Função para embaralhar array de forma determinística por dia
  function shuffleByDay(array) {
    const seed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    function seededRandom() {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    }
    // Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Processar todas as promessas
  Promise.all([Promise.all(fetches), genresPromise])
    .then(([[...pages], genres]) => {
      // Juntar todos os resultados e remover duplicados por ID
      const allTitles = [].concat(...pages);
      const uniqueTitles = [];
      const seenIds = new Set();
      for (const item of allTitles) {
        if (!seenIds.has(item.id) && item.vote_average >= 6.0) {
          uniqueTitles.push(item);
          seenIds.add(item.id);
        }
      }
      // Embaralhar de forma determinística por dia
      shuffleByDay(uniqueTitles);

      // Limpar container
      container.innerHTML = '';

      // Atualizar título da seção
      const sectionTitle = document.querySelector('.section-title');
      if (sectionTitle) {
        sectionTitle.textContent = 'Melhores avaliados da semana';
      }

      // Criar fragmento para melhor performance
      const fragment = document.createDocumentFragment();

      // Verificar se há resultados
      if (uniqueTitles.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <i class="fas fa-search"></i>
          <p>Nenhum título bem avaliado encontrado para esta semana com os filtros atuais.</p>
        `;
        fragment.appendChild(noResults);
      } else {
        // Processar cada título
        uniqueTitles.forEach((item, idx) => {
          // Encontrar gênero principal
          let mainGenre = '';
          if (item.genre_ids && item.genre_ids.length > 0) {
            const genreObj = genres.find(g => g.id === item.genre_ids[0]);
            mainGenre = genreObj ? genreObj.name : '';
          }

          // Criar card com classe para animação
          const card = document.createElement('div');
          card.className = 'movie-series card-modern card-fade-in';

          // Verificar se há poster
          const posterPath = item.poster_path 
            ? `${IMAGE_BASE_URL}${item.poster_path}` 
            : 'https://via.placeholder.com/500x750?text=Sem+Imagem';

          // Formatação da data de lançamento
          const releaseDate = item.release_date || item.first_air_date || '';
          const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('pt-BR') : 'Data desconhecida';

          card.innerHTML = `
            <div class="image-container">
              <img src="${posterPath}" alt="${item.title || item.name}" class="card-poster" 
                   onerror="this.src='https://via.placeholder.com/500x750?text=Erro+ao+Carregar';" />
              <button class="trailer-button" title="Ver trailer"><i class="fas fa-play"></i></button>
              <div class="rating-badge"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</div>
              <div class="release-badge premiere-badge"><i class="fas fa-ticket-alt"></i> Estreia: ${formattedDate}</div>
            </div>
            <div class="movie-info">
              <h2 class="movie-title">${item.title || item.name}</h2>
              <div class="movie-details">
                <span class="release-year">${releaseDate.slice(0,4)}</span>
                ${mainGenre ? `<span class="genre-tag">${mainGenre}</span>` : ''}
              </div>
            </div>
          `;

          // Clicar no card abre detalhes, clicar no botão de trailer abre modal focando no trailer
          card.addEventListener('click', (e) => {
            if (e.target.closest('.trailer-button')) {
              openDetailsModal(type, item.id, true); // true = focar trailer
            } else {
              openDetailsModal(type, item.id, false);
            }
          });

          // Adicionar ao fragmento
          fragment.appendChild(card);

          // Adicionar efeito de entrada com delay progressivo
          setTimeout(() => {
            card.classList.add('show');
          }, 50 * idx);
        });
      }

      // Adicionar fragmento ao container
      container.appendChild(fragment);
    })
    .catch(err => {
      console.error('Erro ao buscar melhores avaliados da semana:', err);
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ocorreu um erro ao carregar os melhores avaliados da semana. Tente novamente mais tarde.</p>
        </div>
      `;
    });
}

// --- NOVO: Função para buscar lançamentos futuros ---
function fetchUpcoming(type = 'movie', genreId = null) {
  const container = document.getElementById('movies-series');
  
  // Adicionar indicador de carregamento
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando próximos lançamentos...</p>
    </div>
  `;
  
  // Obter datas para próximos lançamentos (próximos 3 meses)
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setMonth(today.getMonth() + 3); // Próximos 3 meses
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  };
  
  // Preparar URL com filtros para lançamentos futuros
  // Para séries, usamos a API diferente pois 'upcoming' só existe para filmes
  let url;
  
  if (type === 'movie') {
    // Para filmes, podemos usar a API de upcoming
    url = `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=1&region=BR`;
    if (genreId) url += `&with_genres=${genreId}`;
  } else {
    // Para séries, usamos discover com datas futuras
    url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=popularity.desc`;
    url += `&first_air_date.gte=${formatDate(today)}&first_air_date.lte=${formatDate(futureDate)}`;
    if (genreId) url += `&with_genres=${genreId}`;
  }
  
  // Buscar gêneros para exibir o principal em cada card
  let genresPromise = fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`)
    .then(res => res.json())
    .then(data => data.genres || []);
  
  // Buscar títulos
  let titlesPromise = fetch(url)
    .then(res => res.json())
    .then(data => data.results || []);
  
  // Processar ambas as promessas
  Promise.all([titlesPromise, genresPromise])
    .then(([titles, genres]) => {
      // Limpar container
      container.innerHTML = '';
      
      // Criar fragmento para melhor performance
      const fragment = document.createDocumentFragment();
      
      // Verificar se há resultados
      if (titles.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <i class="fas fa-search"></i>
          <p>Nenhum lançamento futuro encontrado com os filtros atuais.</p>
        `;
        fragment.appendChild(noResults);
      } else {
        // Processar cada título
        titles.forEach(item => {
          // Verificar se a data de lançamento é futura
          const releaseDate = item.release_date || item.first_air_date || '';
          const releaseTime = releaseDate ? new Date(releaseDate).getTime() : 0;
          const currentTime = new Date().getTime();
          
          // Só mostrar se for um lançamento futuro
          if (releaseTime > currentTime) {
            // Encontrar gênero principal
            let mainGenre = '';
            if (item.genre_ids && item.genre_ids.length > 0) {
              const genreObj = genres.find(g => g.id === item.genre_ids[0]);
              mainGenre = genreObj ? genreObj.name : '';
            }
            
            // Criar card com classe para animação
            const card = document.createElement('div');
            card.className = 'movie-series card-modern card-fade-in';
            
            // Verificar se há poster
            const posterPath = item.poster_path 
              ? `${IMAGE_BASE_URL}${item.poster_path}` 
              : 'https://via.placeholder.com/500x750?text=Sem+Imagem';
            
            // Formatação da data de lançamento
            const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('pt-BR') : 'Data desconhecida';
            
            // Calcular dias restantes
            const daysRemaining = releaseTime > 0 ? Math.ceil((releaseTime - currentTime) / (1000 * 60 * 60 * 24)) : null;
            const daysText = daysRemaining === 1 ? '1 dia' : `${daysRemaining} dias`;
            
            card.innerHTML = `
              <div class="image-container">
                <img src="${posterPath}" alt="${item.title || item.name}" class="card-poster" 
                     onerror="this.src='https://via.placeholder.com/500x750?text=Erro+ao+Carregar';" />
                <button class="trailer-button" title="Ver trailer"><i class="fas fa-play"></i></button>
                <div class="rating-badge"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</div>
                <div class="release-badge upcoming-badge"><i class="fas fa-calendar-alt"></i> Em ${daysText}</div>
              </div>
              <div class="movie-info">
                <h2 class="movie-title">${item.title || item.name}</h2>
                <div class="movie-details">
                  <span class="release-date">${formattedDate}</span>
                  ${mainGenre ? `<span class="genre-tag">${mainGenre}</span>` : ''}
                </div>
              </div>
            `;
            
            // Clicar no card abre detalhes, clicar no botão de trailer abre modal focando no trailer
            card.addEventListener('click', (e) => {
              if (e.target.closest('.trailer-button')) {
                openDetailsModal(type, item.id, true); // true = focar trailer
              } else {
                openDetailsModal(type, item.id, false);
              }
            });
            
            // Adicionar ao fragmento
            fragment.appendChild(card);
            
            // Adicionar efeito de entrada com delay progressivo
            setTimeout(() => {
              card.classList.add('show');
            }, 50 * fragment.childElementCount);
          }
        });
      }
      
      // Adicionar fragmento ao container
      container.appendChild(fragment);
      
      // Se não houver resultados após a filtragem
      if (fragment.childElementCount === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <i class="fas fa-search"></i>
          <p>Nenhum lançamento futuro encontrado com os filtros atuais.</p>
        `;
        container.appendChild(noResults);
      }
    })
    .catch(err => {
      console.error('Erro ao buscar lançamentos futuros:', err);
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ocorreu um erro ao carregar os lançamentos futuros. Tente novamente mais tarde.</p>
        </div>
      `;
    });
}

// --- NOVO: Agendamento diário de atualização das estreias ---
function scheduleDailyRefresh() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const delay = nextMidnight.getTime() - now.getTime();

  setTimeout(() => {
    fetchPremieres(currentType, currentGenre);
    setInterval(() => {
      fetchPremieres(currentType, currentGenre);
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

// Preserve tema
const saved = localStorage.getItem('theme');
if (saved) {
  document.documentElement.setAttribute('data-theme', saved);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = saved === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}
