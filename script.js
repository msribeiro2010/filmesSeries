const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// --- NOVO: Elementos e variáveis globais para filtros ---
let currentType = 'movie'; // 'movie' ou 'tv'
let currentGenre = null;

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
  container.innerHTML = '';
  let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=pt-BR&page=1&sort_by=vote_average.desc&vote_count.gte=100`;
  if (genreId) url += `&with_genres=${genreId}`;
  if (type === 'movie') {
    url += `&primary_release_date.gte=2024-01-01`;
  } else {
    url += `&first_air_date.gte=2024-01-01`;
  }
  fetch(url)
    .then(res => res.json())
    .then(data => {
      data.results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-series card-modern';
        card.innerHTML = `
          <div class="image-container">
            <img src="${IMAGE_BASE_URL}${item.poster_path}" alt="${item.title || item.name}" class="card-poster" />
            <button class="trailer-button" title="Ver trailer"><i class="fas fa-play"></i></button>
            <div class="rating-badge"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</div>
          </div>
          <div class="movie-info">
            <h2 class="movie-title">${item.title || item.name}</h2>
            <span class="release-year">${(item.release_date || item.first_air_date || '').slice(0,4)}</span>
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
        container.appendChild(card);
      });
    })
    .catch(err => console.error('Erro ao buscar filmes/séries:', err));
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
  currentType = type;
  currentGenre = null;
  document.getElementById('genre-filter').value = '';
  fetchGenres(type);
  fetchPopular(type);
}

// --- NOVO: Função para lidar com mudança de gênero ---
function handleGenreChange(genreId) {
  currentGenre = genreId || null;
  fetchPopular(currentType, currentGenre);
}

// Preserve tema
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);