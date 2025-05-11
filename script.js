const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// --- NOVO: Elementos e variáveis globais para filtros ---
let currentType = 'movie'; // 'movie' ou 'tv'
let currentGenre = null;
let isReleaseMode = false; // Controla se estamos no modo de lançamentos

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
  
  // --- NOVO: Botão de lançamentos ---
  document.getElementById('type-releases').addEventListener('click', handleReleasesMode);

  // --- NOVO: Filtro de gênero ---
  document.getElementById('genre-filter').addEventListener('change', (e) => handleGenreChange(e.target.value));

  // Carregar gêneros e filmes populares iniciais
  fetchGenres('movie');
  fetchPopular('movie');

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
  
  // Desativar botão de lançamentos
  document.getElementById('type-releases').classList.remove('active');
  
  currentType = type;
  currentGenre = null;
  isReleaseMode = false;
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
  
  if (isReleaseMode) {
    fetchReleases(currentType, currentGenre);
  } else {
    fetchPopular(currentType, currentGenre);
  }
}

// --- NOVO: Função para lidar com modo de lançamentos ---
function handleReleasesMode() {
  // Atualizar botões
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById('type-releases').classList.add('active');
  
  isReleaseMode = true;
  
  // Atualizar título da seção
  const sectionTitle = document.querySelector('.section-title');
  if (sectionTitle) {
    sectionTitle.textContent = 'Lançamentos Recentes';
  }
  
  fetchReleases(currentType, currentGenre);
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

// Preserve tema
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);