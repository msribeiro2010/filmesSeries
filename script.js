// Constantes da API
const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Estado global
let currentFilter = "all";
let currentSort = "combined"; // Novo valor padrão
let currentPage = 1;
let loading = false;
let allItems = [];
let movieGenres = {};
let tvGenres = {};

// IDs dos gêneros a excluir e priorizar
const EXCLUDED_GENRES = [16, 10751, 10762]; // Animation, Family, Kids
const PREFERRED_GENRES = [18, 12, 53, 878, 9648, 28, 80, 99, 10752, 36]; // Drama, Aventura, Suspense, Sci-Fi, Mistério, Ação, Crime, Biografia, Guerra, História

// Adicionar Intersection Observer para lazy loading
const observerOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
};

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        }
    });
}, observerOptions);

// Função principal de inicialização
async function init() {
    try {
        // Carrega os gêneros
        const movieGenresData = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`)
            .then(res => res.json());
        const tvGenresData = await fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=pt-BR`)
            .then(res => res.json());

        movieGenresData.genres.forEach(genre => {
            movieGenres[genre.id] = genre.name;
        });

        tvGenresData.genres.forEach(genre => {
            tvGenres[genre.id] = genre.name;
        });

        // Configura os event listeners
        setupEventListeners();
        
        // Inicializa o tema
        initializeTheme();

        // Inicializa os eventos do menu
        initializeMenuEvents();

        // Carrega os itens iniciais
        await fetchItems();

        console.log("Inicialização concluída");
    } catch (error) {
        console.error("Erro na inicialização:", error);
    }
}

// Configura os event listeners
function setupEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-buttons button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = button.id.replace('filter-', '');
            setFilter(filter);
            
            // Atualiza visualmente todos os botões de filtro
            document.querySelectorAll('.filter-buttons button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });

    // Adiciona funcionalidade do menu hamburger
    const hamburger = document.querySelector('.hamburger');
    const navContent = document.querySelector('.nav-content');
    
    if (hamburger && navContent) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navContent.classList.toggle('active');
        });

        // Fecha o menu ao clicar fora dele
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navContent.contains(e.target)) {
                hamburger.classList.remove('active');
                navContent.classList.remove('active');
            }
        });

        // Fecha o menu ao clicar em um item do menu
        navContent.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navContent.classList.remove('active');
            });
        });
    }

    // Ordenação
    document.querySelectorAll('.sort-buttons button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const sort = button.id.replace('sort-', '');
            setSort(sort);
            
            // Atualiza visualmente todos os botões de ordenação
            document.querySelectorAll('.sort-buttons button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });

    // Scroll infinito
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000 && !loading) {
            fetchItems();
        }
    });

    // Botão de carregar mais
    const loadMoreButton = document.getElementById('load-more');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
            if (!loading) {
                fetchItems();
            }
        });
    }

    // Menu móvel
    const body = document.body;
    const overlay = document.querySelector('.nav-overlay') || createOverlay();

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        body.appendChild(overlay);
        return overlay;
    }

    function closeMenu() {
        hamburger.classList.remove('active');
        navContent.classList.remove('active');
        overlay.classList.remove('active');
        body.style.overflow = '';
    }

    hamburger.addEventListener('click', function(e) {
        e.preventDefault();
        hamburger.classList.toggle('active');
        navContent.classList.toggle('active');
        overlay.classList.toggle('active');
        body.style.overflow = body.style.overflow === 'hidden' ? '' : 'hidden';
    });

    overlay.addEventListener('click', closeMenu);

    // Fechar menu ao clicar em um botão, mas manter a funcionalidade do filtro/ordenação
    navContent.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Accordion menu functionality
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', function() {
            const expanded = this.getAttribute('aria-expanded') === 'true';
            // Fecha todos os painéis
            document.querySelectorAll('.accordion-header').forEach(h => h.setAttribute('aria-expanded', 'false'));
            document.querySelectorAll('.accordion-panel').forEach(panel => panel.setAttribute('hidden', ''));
            // Abre o painel clicado se estava fechado
            if (!expanded) {
                this.setAttribute('aria-expanded', 'true');
                const panel = document.getElementById(this.getAttribute('aria-controls'));
                if (panel) panel.removeAttribute('hidden');
            }
        });
    });
    // Abre o primeiro painel por padrão
    document.querySelectorAll('.accordion-header')[0]?.setAttribute('aria-expanded', 'true');
    document.querySelectorAll('.accordion-panel')[0]?.removeAttribute('hidden');
    // Fecha o segundo por padrão
    document.querySelectorAll('.accordion-header')[1]?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.accordion-panel')[1]?.setAttribute('hidden', '');
}

// Função para buscar filmes e séries
async function fetchItems() {
    if (loading) return;
    
    loading = true;
    console.log("Buscando itens...", { currentFilter, currentSort, currentPage });

    try {
        const mainContainer = document.getElementById("movies-series");
        if (!mainContainer) {
            console.error("Container não encontrado");
            return;
        }

        // Remove os itens anteriores na primeira página
        if (currentPage === 1) {
            mainContainer.innerHTML = "";
            allItems = [];
            
            // Adiciona skeleton loaders
            for (let i = 0; i < 8; i++) {
                const skeleton = document.createElement('div');
                skeleton.classList.add('movie-series', 'skeleton');
                skeleton.innerHTML = `
                    <div class="image-container">
                        <div class="skeleton-img"></div>
                    </div>
                    <div class="movie-info">
                        <div class="movie-header">
                            <div class="title-skeleton"></div>
                        </div>
                        <div class="metadata-skeleton"></div>
                    </div>
                `;
                mainContainer.appendChild(skeleton);
            }
        }

        let newItems = [];
        const currentYear = '2024-01-01'; // Define o ano mínimo como 2024
        
        // Configuração base para a API
        const baseParams = new URLSearchParams({
            api_key: API_KEY,
            language: 'pt-BR',
            'vote_count.gte': '50',
            page: currentPage.toString(),
            region: 'BR'
        });

        // Lógica para diferentes tipos de ordenação e filtros
        if (currentSort === 'upcoming') {
            // Lógica específica para lançamentos futuros
            if (currentFilter === 'movie' || currentFilter === 'all') {
                baseParams.append('primary_release_date.gte', currentYear);
                const movieResponse = await fetch(`${BASE_URL}/movie/upcoming?${baseParams.toString()}`);
                const movieData = await movieResponse.json();
                newItems.push(...movieData.results.map(item => ({ ...item, media_type: 'movie' })));
            }
            
            if (currentFilter === 'tv' || currentFilter === 'all') {
                baseParams.append('first_air_date.gte', currentYear);
                const tvResponse = await fetch(`${BASE_URL}/discover/tv?${baseParams.toString()}`);
                const tvData = await tvResponse.json();
                newItems.push(...tvData.results.map(item => ({ ...item, media_type: 'tv' })));
            }
        } else {
            // Configuração dos parâmetros de ordenação
            baseParams.append('sort_by', 'vote_average.desc');
            baseParams.append('vote_average.gte', '7');

            // Busca baseada no tipo de mídia
            if (currentFilter === 'movie' || currentFilter === 'all') {
                const movieParams = new URLSearchParams(baseParams);
                movieParams.append('primary_release_date.gte', currentYear);
                
                const movieResponse = await fetch(`${BASE_URL}/discover/movie?${movieParams.toString()}`);
                const movieData = await movieResponse.json();
                let filteredMovies = movieData.results
                    .filter(movie => {
                        const releaseDate = new Date(movie.release_date);
                        // Excluir filmes infantis/animados
                        if (movie.genre_ids && movie.genre_ids.some(id => EXCLUDED_GENRES.includes(id))) {
                            return false;
                        }
                        return releaseDate.getFullYear() >= 2024;
                    })
                    .map(item => ({ ...item, media_type: 'movie' }));
                newItems.push(...filteredMovies);
            }
            
            if (currentFilter === 'tv' || currentFilter === 'all') {
                const tvParams = new URLSearchParams(baseParams);
                tvParams.append('first_air_date.gte', currentYear);
                
                const tvResponse = await fetch(`${BASE_URL}/discover/tv?${tvParams.toString()}`);
                const tvData = await tvResponse.json();
                let filteredTV = tvData.results
                    .filter(tv => {
                        const firstAirDate = new Date(tv.first_air_date);
                        // Excluir animações/infantis
                        if (tv.genre_ids && tv.genre_ids.some(id => EXCLUDED_GENRES.includes(id))) {
                            return false;
                        }
                        return firstAirDate.getFullYear() >= 2024;
                    })
                    .map(item => ({ ...item, media_type: 'tv' }));
                newItems.push(...filteredTV);
            }
        }

        // Priorizar gêneros preferidos apenas para rating
        if (currentSort === 'rating') {
            const preferred = newItems.filter(item => item.genre_ids && item.genre_ids.some(id => PREFERRED_GENRES.includes(id)));
            const others = newItems.filter(item => !item.genre_ids || !item.genre_ids.some(id => PREFERRED_GENRES.includes(id)));
            preferred.sort((a, b) => b.vote_average - a.vote_average);
            others.sort((a, b) => b.vote_average - a.vote_average);
            newItems = [...preferred, ...others];
        } else if (newItems.length > 0) {
            // Para todos os outros filtros, ordenar por nota decrescente
            newItems.sort((a, b) => b.vote_average - a.vote_average);
        }

        console.log(`Encontrados ${newItems.length} itens de 2024`);

        // Remove os skeleton loaders
        const skeletons = mainContainer.querySelectorAll('.skeleton');
        skeletons.forEach(skeleton => skeleton.remove());

        // Cria e adiciona os cards
        for (const item of newItems) {
            const card = await createCard(item, item.media_type);
            if (card) {
                mainContainer.appendChild(card);
            }
        }

        // Incrementa a página se houver mais itens
        if (newItems.length > 0) {
            currentPage++;
        }

    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    } finally {
        loading = false;
        const spinner = document.getElementById("spinner");
        if (spinner) spinner.style.display = "none";
    }
}

// Função para ordenar os itens
function sortItems(items, sortType) {
    // Todos os filtros agora ordenam por nota decrescente
    return items.sort((a, b) => b.vote_average - a.vote_average);
}

// Função para buscar informações de streaming
async function fetchStreamingInfo(mediaType, id) {
    try {
        const response = await fetch(
            `${BASE_URL}/${mediaType}/${id}/watch/providers?api_key=${API_KEY}`
        );
        const data = await response.json();
        return data.results?.BR || null; // Retorna os provedores do Brasil
    } catch (error) {
        console.error("Erro ao buscar informações de streaming:", error);
        return null;
    }
}

// Função para criar a seção de streaming
async function createStreamingSection(item, mediaType) {
    try {
        const streamingInfo = await fetchStreamingInfo(mediaType, item.id);
        if (!streamingInfo) return null;

        // IDs e nomes das plataformas prioritárias
        const priorityProviders = {
            8: { name: 'Netflix', icon: 'netflix' },
            9: { name: 'Amazon Prime', icon: 'amazon' },
            337: { name: 'Disney+', icon: 'disney' },
            384: { name: 'Max', icon: 'max' },
            619: { name: 'Globoplay', icon: 'globo' },
            531: { name: 'Paramount+', icon: 'paramount' },
            350: { name: 'Apple TV+', icon: 'apple' },
            // Cinema será tratado separadamente
        };

        const container = document.createElement('div');
        container.classList.add('streaming-container');

        let hasProviders = false;

        // Verifica se está em cartaz no cinema
        if (mediaType === 'movie') {
            const now = new Date();
            const releaseDate = new Date(item.release_date);
            const daysSinceRelease = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceRelease >= -30 && daysSinceRelease <= 60) { // 30 dias antes até 60 dias após lançamento
                hasProviders = true;
                const cinemaProvider = document.createElement('div');
                cinemaProvider.classList.add('provider-item', 'cinema-badge');
                cinemaProvider.innerHTML = `
                    <i class="fas fa-film"></i>
                    <span>Em Cartaz nos Cinemas</span>
                `;
                container.appendChild(cinemaProvider);
            }
        }

        // Filtra e ordena as plataformas de streaming
        if (streamingInfo.flatrate) {
            const availableProviders = streamingInfo.flatrate
                .filter(provider => priorityProviders[provider.provider_id])
                .sort((a, b) => {
                    // Ordena baseado na ordem das plataformas prioritárias
                    const providerOrder = Object.keys(priorityProviders);
                    return providerOrder.indexOf(a.provider_id.toString()) - 
                           providerOrder.indexOf(b.provider_id.toString());
                });

            if (availableProviders.length > 0) {
                hasProviders = true;
                const providersTitle = document.createElement('div');
                providersTitle.className = 'platforms-title';
                providersTitle.textContent = 'Disponível em:';
                container.appendChild(providersTitle);

                const providersContainer = document.createElement('div');
                providersContainer.className = 'providers-container';

                availableProviders.forEach(provider => {
                    const providerInfo = priorityProviders[provider.provider_id];
                    const providerItem = document.createElement('div');
                    providerItem.className = 'provider-item';
                    providerItem.innerHTML = `
                        <img 
                            src="${IMAGE_BASE_URL}${provider.logo_path}" 
                            alt="${providerInfo.name}"
                            class="provider-logo"
                            title="${providerInfo.name}"
                            data-tooltip="${providerInfo.name}"
                        />
                    `;
                    providersContainer.appendChild(providerItem);
                });

                container.appendChild(providersContainer);
            }
        }

        return hasProviders ? container : null;
    } catch (error) {
        console.error('Erro ao criar seção de streaming:', error);
        return null;
    }
}

// Função para criar o card
async function createCard(item, mediaType) {
    try {
        // Container principal do card
        const card = document.createElement("div");
        card.classList.add("movie-series");
        card.dataset.id = item.id;
        card.dataset.mediaType = mediaType;

        // Container da imagem
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-container");
        
        // Imagem do poster
        const img = document.createElement("img");
        img.loading = "lazy";
        img.dataset.src = item.poster_path 
            ? `${IMAGE_BASE_URL}${item.poster_path}`
            : 'placeholder.jpg';
        img.src = 'placeholder-small.jpg'; // Imagem de baixa resolução
        imageObserver.observe(img);
        img.alt = item.title || item.name;
        imageContainer.appendChild(img);

        // Trailer
        const trailerKey = await fetchTrailer(mediaType, item.id);
        if (trailerKey) {
            const trailerButton = document.createElement("button");
            trailerButton.classList.add("trailer-button");
            trailerButton.setAttribute('aria-label', 'Assistir Trailer');
            trailerButton.innerHTML = '<i class="fas fa-play"></i>';
            trailerButton.onclick = (e) => {
                e.stopPropagation();
                openTrailerModal(trailerKey);
            };
            imageContainer.appendChild(trailerButton);
        }

        // Container das informações
        const info = document.createElement("div");
        info.classList.add("movie-info");

        // Seção do título e metadados
        const titleSection = document.createElement("div");
        titleSection.classList.add("movie-title-section");

        // Título + ano
        const titleRow = document.createElement("div");
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.gap = '0.5rem';
        const title = document.createElement("h2");
        title.classList.add("movie-title");
        title.textContent = item.title || item.name;
        titleRow.appendChild(title);
        // Ano
        const year = (item.release_date || item.first_air_date) ? new Date(item.release_date || item.first_air_date).getFullYear() : '';
        if (year) {
            const yearSpan = document.createElement('span');
            yearSpan.className = 'release-year';
            yearSpan.textContent = year;
            titleRow.appendChild(yearSpan);
        }
        titleSection.appendChild(titleRow);

        // Seção de metadados (badge de nota)
        const metadata = document.createElement("div");
        metadata.classList.add("movie-metadata");
        // Badge de nota
        const ratingValue = (item.vote_average).toFixed(1);
        const ratingBadge = document.createElement('div');
        ratingBadge.className = 'rating-badge';
        ratingBadge.innerHTML = `<i class='fas fa-star'></i> ${ratingValue}`;
        metadata.appendChild(ratingBadge);
        // Votos
        const voteCount = document.createElement('span');
        voteCount.className = 'vote-count';
        voteCount.style.color = '#fff8';
        voteCount.style.fontSize = '0.92em';
        voteCount.textContent = `(${item.vote_count.toLocaleString('pt-BR')} votos)`;
        metadata.appendChild(voteCount);
        titleSection.appendChild(metadata);

        // Gêneros
        const genresContainer = document.createElement("div");
        genresContainer.classList.add("genres-container");
        if (item.genre_ids && item.genre_ids.length > 0) {
            const genres = await getGenres(item.genre_ids, mediaType);
            genres.slice(0, 3).forEach(genre => {
                const genreTag = document.createElement("span");
                genreTag.classList.add("genre-tag");
                genreTag.textContent = genre;
                genresContainer.appendChild(genreTag);
            });
        }

        // Sinopse curta
        if (item.overview) {
            const synopsis = document.createElement('div');
            synopsis.className = 'movie-synopsis';
            synopsis.textContent = item.overview;
            info.appendChild(synopsis);
        }

        // Streaming
        const streamingSection = await createStreamingSection(item, mediaType);

        // Montagem final do card
        info.appendChild(titleSection);
        info.appendChild(genresContainer);
        // Sinopse já foi adicionada acima
        if (streamingSection) {
            info.appendChild(streamingSection);
        }

        card.appendChild(imageContainer);
        card.appendChild(info);

        // Adiciona evento de clique para abrir modal de detalhes
        card.addEventListener('click', async (e) => {
            if (!e.target.closest('.trailer-button')) {
                try {
                    const response = await fetch(
                        `${BASE_URL}/${mediaType}/${item.id}?api_key=${API_KEY}&language=pt-BR`
                    );
                    const itemDetails = await response.json();
                    createDetailsModal(itemDetails, mediaType);
                } catch (error) {
                    console.error('Erro ao carregar detalhes:', error);
                }
            }
        });

        return card;
    } catch (error) {
        console.error("Erro ao criar card:", error);
        return null;
    }
}

// Função para obter os gêneros
async function getGenres(genreIds, mediaType) {
    if (!genreIds) return [];
    const genres = mediaType === 'movie' ? movieGenres : tvGenres;
    return genreIds
      .map(id => genres[id])
      .filter(name => name);
}

// Função para definir o filtro atual
function setFilter(filter) {
    if (currentFilter === filter) return; // Evita recarregar se o filtro for o mesmo
    
    currentFilter = filter;
    currentPage = 1;
    allItems = [];
    
    // Atualiza visualmente os botões
    document.querySelectorAll(".filter-buttons button").forEach(btn => {
        btn.classList.remove("active");
    });
    
    const activeButton = document.getElementById(`filter-${filter}`);
    if (activeButton) {
        activeButton.classList.add("active");
    }
    
    // Limpa o container e mostra loading state
    const mainContainer = document.getElementById("movies-series");
    if (mainContainer) {
        mainContainer.innerHTML = "";
        // Adiciona skeleton loaders aqui se necessário
    }
    
    fetchItems();
}

// Função para definir a ordenação atual
function setSort(sort) {
    if (currentSort === sort) return; // Evita recarregar se a ordenação for a mesma
    
    currentSort = sort;
    currentPage = 1;
    allItems = [];
    
    // Atualiza visualmente os botões
    document.querySelectorAll('.sort-buttons button').forEach(button => {
        button.classList.remove("active");
    });
    
    const activeButton = document.getElementById(`sort-${sort}`);
    if (activeButton) {
        activeButton.classList.add("active");
    }
    
    // Limpa o container e recarrega os itens
    const mainContainer = document.getElementById("movies-series");
    if (mainContainer) {
        mainContainer.innerHTML = "";
        fetchItems();
    }
}

// Função para buscar lançamentos futuros
async function fetchUpcoming() {
    const currentDate = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    try {
        const [upcomingMovies, upcomingTV] = await Promise.all([
            fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&region=BR`)
                .then(res => res.json())
                .then(data => data.results
                    .filter(movie => movie.release_date > currentDate)
                    .map(item => ({ ...item, media_type: 'movie' }))),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&first_air_date.gte=${currentDate}&first_air_date.lte=${nextYear.toISOString().split('T')[0]}`)
                .then(res => res.json())
                .then(data => data.results
                    .filter(tv => tv.first_air_date > currentDate)
                    .map(item => ({ ...item, media_type: 'tv' })))
        ]);

        // Combina e ordena por data de lançamento
        const allUpcoming = [...upcomingMovies, ...upcomingTV]
            .sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });

        console.log(`Encontrados ${allUpcoming.length} lançamentos futuros`);
        return allUpcoming;
    } catch (error) {
        console.error("Erro ao buscar lançamentos futuros:", error);
        return [];
    }
}

// Função para formatar data
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Adicione esta nova função para inicializar o tema
function initializeTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    
    function toggleTheme() {
        const body = document.documentElement;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeIcon = document.querySelector('.theme-toggle i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    themeToggle.addEventListener('click', toggleTheme);

    // Verifica se há uma preferência salva
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeIcon = document.querySelector('.theme-toggle i');
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Função para buscar trailer
async function fetchTrailer(mediaType, id) {
    try {
        const url = `${BASE_URL}/${mediaType}/${id}/videos?api_key=${API_KEY}&language=pt-BR`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Tenta encontrar um trailer em português primeiro
        let trailer = data.results.find(video => 
            video.type.toLowerCase() === 'trailer' && 
            video.site.toLowerCase() === 'youtube' &&
            video.iso_639_1 === 'pt'
        );
        
        // Se não encontrar em português, busca em inglês
        if (!trailer) {
            // Busca trailers em inglês
            const enUrl = `${BASE_URL}/${mediaType}/${id}/videos?api_key=${API_KEY}&language=en-US`;
            const enResponse = await fetch(enUrl);
            const enData = await enResponse.json();
            
            trailer = enData.results.find(video => 
                video.type.toLowerCase() === 'trailer' && 
                video.site.toLowerCase() === 'youtube'
            );
        }
        
        return trailer;
    } catch (error) {
        console.error('Erro ao buscar trailer:', error);
        return null;
    }
}

// Função para criar o botão do trailer
function createTrailerButton() {
    const button = document.createElement('button');
    button.className = 'trailer-button';
    button.innerHTML = '<i class="fas fa-play"></i>';
    button.title = 'Assistir Trailer';
    return button;
}

// Função para abrir o modal do trailer
function openTrailerModal(videoKey) {
    const modal = document.getElementById('trailer-modal');
    const trailerContainer = document.getElementById('trailer-container');
    
    // Cria o iframe do YouTube
    trailerContainer.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed/${videoKey}?autoplay=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        ></iframe>
    `;
    
    modal.style.display = 'block';
    
    // Fecha o modal quando clicar no X
    const closeBtn = document.querySelector('.close-modal');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        trailerContainer.innerHTML = ''; // Remove o iframe
    };
    
    // Fecha o modal quando clicar fora dele
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            trailerContainer.innerHTML = ''; // Remove o iframe
        }
    };
}

// Função para inicializar os eventos do menu
function initializeMenuEvents() {
    const hamburger = document.querySelector('.hamburger');
    const navContent = document.querySelector('.nav-content');
    const menuButtons = navContent.querySelectorAll('button');

    // Toggle do menu
    hamburger?.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navContent.classList.toggle('active');
    });

    // Fecha o menu ao clicar em um botão (mobile)
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                hamburger?.classList.remove('active');
                navContent.classList.remove('active');
            }
        });
    });

    // Fecha o menu ao redimensionar a tela para desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            hamburger?.classList.remove('active');
            navContent.classList.remove('active');
        }
    });

    // Fecha o menu ao rolar a página (mobile)
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 768) {
            const currentScroll = window.pageYOffset;
            if (currentScroll > lastScroll && currentScroll > 50) {
                hamburger?.classList.remove('active');
                navContent.classList.remove('active');
            }
            lastScroll = currentScroll;
        }
    });
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);

function createMovieSeriesCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-series';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    const img = document.createElement('img');
    img.src = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'placeholder.jpg';
    img.alt = item.title || item.name;
    
    const trailerButton = document.createElement('button');
    trailerButton.className = 'trailer-button';
    trailerButton.setAttribute('aria-label', 'Ver trailer');

    const movieInfo = document.createElement('div');
    movieInfo.className = 'movie-info';

    // Header com título e metadados
    const movieHeader = document.createElement('div');
    movieHeader.className = 'movie-header';

    const title = document.createElement('h2');
    title.className = 'movie-title';
    title.textContent = item.title || item.name;

    const movieMetadata = document.createElement('div');
    movieMetadata.className = 'movie-metadata';

    // Rating
    const rating = document.createElement('div');
    rating.className = 'rating';
    rating.innerHTML = `
        <i class="fas fa-star"></i>
        <span class="rating-value">${item.vote_average.toFixed(1)}</span>
        <span class="vote-count">(${item.vote_count})</span>
    `;

    // País
    const country = document.createElement('div');
    country.className = 'country';
    country.innerHTML = `
        <i class="fas fa-globe"></i>
        <span class="country-name">${item.origin_country || 'N/A'}</span>
    `;

    // Data de lançamento
    const dateContainer = document.createElement('div');
    dateContainer.className = 'date-container';
    const releaseDate = document.createElement('div');
    releaseDate.className = 'release-date';
    const date = new Date(item.release_date || item.first_air_date);
    releaseDate.innerHTML = `
        <i class="fas fa-calendar"></i>
        <span class="date-value">${date.toLocaleDateString('pt-BR')}</span>
    `;

    // Gêneros
    const genresContainer = document.createElement('div');
    genresContainer.className = 'genres-container';
    item.genres.forEach(genre => {
        const genreTag = document.createElement('span');
        genreTag.className = 'genre-tag';
        genreTag.textContent = genre;
        genresContainer.appendChild(genreTag);
    });

    // Plataformas
    const platformsSection = document.createElement('div');
    platformsSection.className = 'platforms-section';
    
    const platformsTitle = document.createElement('div');
    platformsTitle.className = 'platforms-title';
    platformsTitle.textContent = 'Disponível em:';

    const platformsList = document.createElement('div');
    platformsList.className = 'platforms-list';
    
    if (item.platforms && item.platforms.length > 0) {
        item.platforms.forEach(platform => {
            const platformItem = document.createElement('div');
            platformItem.className = 'platform-item';
            platformItem.innerHTML = `
                <i class="fas fa-play-circle"></i>
                ${platform}
            `;
            platformsList.appendChild(platformItem);
        });
    } else {
        const noPlatforms = document.createElement('div');
        noPlatforms.className = 'no-platforms';
        noPlatforms.textContent = 'Informação não disponível';
        platformsList.appendChild(noPlatforms);
    }

    // Montagem da estrutura
    imageContainer.appendChild(img);
    imageContainer.appendChild(trailerButton);

    movieHeader.appendChild(title);
    movieMetadata.appendChild(rating);
    movieMetadata.appendChild(country);
    movieHeader.appendChild(movieMetadata);

    dateContainer.appendChild(releaseDate);

    platformsSection.appendChild(platformsTitle);
    platformsSection.appendChild(platformsList);

    movieInfo.appendChild(movieHeader);
    movieInfo.appendChild(dateContainer);
    movieInfo.appendChild(genresContainer);
    movieInfo.appendChild(platformsSection);

    card.appendChild(imageContainer);
    card.appendChild(movieInfo);

    return card;
}

// Adicione sanitização para os dados recebidos da API antes de inserir no DOM
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Use ao inserir conteúdo dinâmico
movieTitle.innerHTML = sanitizeHTML(title);

// Limpe dados sensíveis do localStorage quando necessário
function clearStorageOnLogout() {
    localStorage.removeItem('theme');
    // ... outros dados que precisem ser limpos
}

// Adicione validação para qualquer input do usuário
function validateInput(input) {
    return input.replace(/[<>]/g, '');
}

// Função para criar o modal de detalhes
function createDetailsModal(item, mediaType) {
    const modal = document.createElement('div');
    modal.className = 'details-modal';
    
    const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;
    const formattedDate = new Date(releaseDate).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const rating = (item.vote_average * 10).toFixed(0);
    const ratingClass = rating >= 70 ? 'high' : rating >= 50 ? 'medium' : 'low';

    modal.innerHTML = `
        <div class="details-modal-content">
            <button class="close-details" aria-label="Fechar detalhes">
                <i class="fas fa-times"></i>
            </button>
            <div class="details-header">
                <img src="${IMAGE_BASE_URL}${item.poster_path}" 
                     alt="${item.title || item.name}" 
                     class="details-poster">
                <div class="details-info">
                    <h2 class="details-title">${item.title || item.name}</h2>
                    <div class="details-metadata">
                        <div class="rating rating-${ratingClass}">
                            <i class="fas fa-star"></i>
                            <span>${rating}%</span>
                            <span class="vote-count">(${item.vote_count} votos)</span>
                        </div>
                        <div class="release-date">
                            <i class="fas fa-calendar"></i>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h3 class="details-section-title">Sinopse</h3>
                <p>${item.overview || 'Sinopse não disponível.'}</p>
            </div>

            <div class="details-section">
                <h3 class="details-section-title">Gêneros</h3>
                <div class="details-genres">
                    ${item.genres.map(genre => 
                        `<span class="genre-tag">${genre.name}</span>`
                    ).join('')}
                </div>
            </div>

            <div class="details-platforms">
                <h3 class="details-section-title">Onde Assistir</h3>
                <div class="platforms-list" id="platforms-${item.id}">
                    Carregando plataformas...
                </div>
            </div>
        </div>
    `;

    // Adiciona eventos de fechamento
    const closeButton = modal.querySelector('.close-details');
    
    // Função de fechamento
    const closeModal = () => {
        modal.classList.add('modal-closing');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto'; // Restaura o scroll
        }, 300);
    };

    // Evento de clique no botão fechar
    closeButton.addEventListener('click', closeModal);

    // Evento de clique fora do modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Evento de tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Previne scroll do body quando o modal está aberto
    document.body.style.overflow = 'hidden';

    document.body.appendChild(modal);
    requestAnimationFrame(() => {
        modal.classList.add('modal-open');
    });
}

// Adicionar evento de clique nos cards
document.querySelectorAll('.movie-series').forEach(card => {
    card.addEventListener('click', async (e) => {
        if (!e.target.closest('.trailer-button')) {
            const itemId = card.dataset.id;
            const mediaType = card.dataset.mediaType;
            
            try {
                const response = await fetch(`${API_BASE_URL}/${mediaType}/${itemId}?api_key=${API_KEY}&language=pt-BR`);
                const itemDetails = await response.json();
                createDetailsModal(itemDetails, mediaType);
            } catch (error) {
                console.error('Erro ao carregar detalhes:', error);
            }
        }
    });
});

// Scroll suave para o botão 'Voltar ao Início'
document.getElementById('back-to-top')?.addEventListener('click', function(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Melhorias no menu mobile
const hamburger = document.getElementById('hamburger');
const navContent = document.querySelector('.nav-content');
const navOverlay = document.querySelector('.nav-overlay');
const body = document.body;

function closeMenu() {
    hamburger?.classList.remove('active');
    navContent?.classList.remove('active');
    navOverlay?.classList.remove('active');
    body.style.overflow = '';
}

function openMenu() {
    hamburger?.classList.add('active');
    navContent?.classList.add('active');
    navOverlay?.classList.add('active');
    body.style.overflow = 'hidden';
    // Foco no primeiro botão do menu
    setTimeout(() => {
        const firstBtn = navContent?.querySelector('button');
        firstBtn?.focus();
    }, 100);
}

hamburger?.addEventListener('click', function(e) {
    e.preventDefault();
    if (navContent?.classList.contains('active')) {
        closeMenu();
    } else {
        openMenu();
    }
});

navOverlay?.addEventListener('click', closeMenu);

// Fecha o menu ao clicar em qualquer botão do menu
navContent?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', closeMenu);
});

// Fecha o menu ao pressionar ESC
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMenu();
    }
});
