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

        // Remove os skeleton loaders na primeira página
        if (currentPage === 1) {
            mainContainer.innerHTML = "";
            allItems = [];
            
            // Adiciona skeleton loaders
            for (let i = 0; i < 8; i++) {
                const skeleton = document.createElement('div');
                skeleton.classList.add('movie-series', 'skeleton');
                skeleton.innerHTML = `
                    <div class="movie-info">
                        <h2>&nbsp;</h2>
                        <p>&nbsp;</p>
                        <p>&nbsp;</p>
                    </div>
                `;
                mainContainer.appendChild(skeleton);
            }
        }

        let newItems = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Se for lançamentos futuros, usa uma lógica diferente
        if (currentSort === 'upcoming') {
            if (currentPage === 1) {
                newItems = await fetchUpcoming();
                newItems = newItems.filter(item => {
                    const itemDate = new Date(item.release_date || item.first_air_date);
                    return itemDate.getFullYear() >= 2024;
                }).map(item => ({
                    ...item,
                    daysUntilRelease: Math.ceil(
                        (new Date(item.release_date || item.first_air_date) - currentDate) / 
                        (1000 * 60 * 60 * 24)
                    )
                }));
            }
        } else {
            const requests = [];
            
            // Configuração base para filmes e séries
            const baseParams = new URLSearchParams({
                api_key: API_KEY,
                language: 'pt-BR',
                'vote_count.gte': '50',
                page: currentPage
            });

            // Adiciona filtro de data para mostrar apenas de 2024 em diante
            baseParams.append('primary_release_date.gte', '2024-01-01');
            baseParams.append('first_air_date.gte', '2024-01-01');

            if (currentSort === 'date') {
                baseParams.append('sort_by', 'primary_release_date.desc,first_air_date.desc');
            } else if (currentSort === 'rating') {
                baseParams.append('sort_by', 'vote_average.desc');
                baseParams.append('vote_average.gte', '6');
            } else if (currentSort === 'popularity') {
                baseParams.append('sort_by', 'popularity.desc');
            }
            
            if (currentFilter === "all" || currentFilter === "movie") {
                const movieParams = new URLSearchParams(baseParams);
                const movieUrl = `${BASE_URL}/discover/movie?${movieParams.toString()}`;
                console.log("Buscando filmes:", movieUrl);
                requests.push(
                    fetch(movieUrl)
                        .then(res => res.json())
                        .then(data => data.results
                            .filter(item => {
                                const releaseDate = new Date(item.release_date);
                                return releaseDate.getFullYear() >= 2024;
                            })
                            .map(item => ({ ...item, media_type: 'movie' })))
                );
            }
            
            if (currentFilter === "all" || currentFilter === "tv") {
                const tvParams = new URLSearchParams(baseParams);
                const tvUrl = `${BASE_URL}/discover/tv?${tvParams.toString()}`;
                console.log("Buscando séries:", tvUrl);
                requests.push(
                    fetch(tvUrl)
                        .then(res => res.json())
                        .then(data => data.results
                            .filter(item => {
                                const firstAirDate = new Date(item.first_air_date);
                                return firstAirDate.getFullYear() >= 2024;
                            })
                            .map(item => ({ ...item, media_type: 'tv' })))
                );
            }

            const results = await Promise.all(requests);
            newItems = results.flat();
        }
        
        console.log("Novos itens encontrados:", newItems.length);
        
        // Ordena os itens
        const sortedItems = sortItems(newItems, currentSort);
        allItems = [...allItems, ...sortedItems];
        
        // Cria e adiciona os cards
        for (const item of sortedItems) {
            try {
                console.log("Processando item:", item.title || item.name);
                const card = await createCard(item, item.media_type);
                if (card) {
                    // Remove os skeleton loaders se existirem
                    const skeletons = mainContainer.querySelectorAll('.skeleton');
                    skeletons.forEach(skeleton => skeleton.remove());
                    
                    console.log("Adicionando card ao container para:", item.title || item.name);
                    mainContainer.appendChild(card);
                } else {
                    console.error("Card não foi criado para:", item.title || item.name);
                }
            } catch (error) {
                console.error("Erro ao processar item:", item.title || item.name, error);
            }
        }

        // Só incrementa a página se não for lançamentos futuros
        if (currentSort !== 'upcoming') {
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
    return items.sort((a, b) => {
        if (sortType === 'date' || sortType === 'combined') {
            const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
            const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
            return dateB - dateA; // Ordem decrescente (mais recente primeiro)
        } else if (sortType === 'rating') {
            return b.vote_average - a.vote_average;
        } else if (sortType === 'popularity') {
            return b.popularity - a.popularity;
        } else if (sortType === 'upcoming') {
            return a.daysUntilRelease - b.daysUntilRelease;
        }
        return 0;
    });
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

        // IDs das plataformas que queremos mostrar
        const allowedProviders = {
            8: 'Netflix',
            9: 'Amazon Prime',
            384: 'Max',
            337: 'Disney+',
            // Cinema será mostrado se o filme estiver em cartaz
        };

        const container = document.createElement('div');
        container.classList.add('streaming-container');

        let hasProviders = false;

        // Verifica se está em cartaz no cinema
        if (mediaType === 'movie') {
            const now = new Date();
            const releaseDate = new Date(item.release_date);
            const daysSinceRelease = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceRelease >= 0 && daysSinceRelease <= 60) { // Assume que filmes ficam ~2 meses em cartaz
                hasProviders = true;
                const providersContainer = document.createElement('div');
                providersContainer.classList.add('providers-container');

                const cinemaProvider = document.createElement('div');
                cinemaProvider.classList.add('provider-item');
                cinemaProvider.innerHTML = `
                    <div class="cinema-badge">
                        <i class="fas fa-film"></i>
                        <span>Cinema</span>
                    </div>
                `;
                providersContainer.appendChild(cinemaProvider);
                container.appendChild(providersContainer);
            }
        }

        // Filtra apenas as plataformas permitidas
        if (streamingInfo.flatrate) {
            const filteredProviders = streamingInfo.flatrate.filter(provider => 
                Object.keys(allowedProviders).includes(provider.provider_id.toString())
            );

            if (filteredProviders.length > 0) {
                hasProviders = true;
                const providersContainer = container.querySelector('.providers-container') || 
                    document.createElement('div');
                providersContainer.classList.add('providers-container');

                filteredProviders.forEach(provider => {
                    const providerImg = document.createElement('img');
                    providerImg.src = `${IMAGE_BASE_URL}${provider.logo_path}`;
                    providerImg.alt = allowedProviders[provider.provider_id];
                    providerImg.title = allowedProviders[provider.provider_id];
                    providerImg.classList.add('provider-logo');
                    providersContainer.appendChild(providerImg);
                });

                if (!container.querySelector('.providers-container')) {
                    container.appendChild(providersContainer);
                }
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
        console.log("Iniciando criação do card para:", item.title || item.name);
        
        const card = document.createElement("div");
        card.classList.add("movie-series");
        
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-container");
        
        const img = document.createElement("img");
        img.loading = "lazy";
        if (item.poster_path) {
            img.src = `${IMAGE_BASE_URL}${item.poster_path}`;
            console.log("Imagem do poster:", img.src);
        } else {
            img.src = 'placeholder.jpg';
            img.classList.add('no-poster');
            console.log("Usando imagem placeholder");
        }
        img.alt = item.title || item.name;
        
        img.onerror = function() {
            console.log("Erro ao carregar imagem, usando placeholder");
            this.src = 'placeholder.jpg';
            this.classList.add('no-poster');
        };
        
        imageContainer.appendChild(img);
        
        // Busca e adiciona o trailer
        const trailerKey = await fetchTrailer(mediaType, item.id);
        if (trailerKey) {
            const trailerButton = document.createElement("button");
            trailerButton.classList.add("trailer-button");
            trailerButton.innerHTML = '<i class="fas fa-play"></i> Trailer';
            trailerButton.onclick = (e) => {
                e.preventDefault();
                window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank');
            };
            imageContainer.appendChild(trailerButton);
        }
        
        const info = document.createElement("div");
        info.classList.add("movie-info");
        
        const title = document.createElement("h2");
        title.textContent = item.title || item.name;
        
        // Melhorando a exibição da nota
        const rating = document.createElement("div");
        rating.classList.add("rating");
        const stars = Math.round(item.vote_average * 2) / 2; // Arredonda para 0.5 mais próximo
        rating.innerHTML = `
            <i class="fas fa-star"></i>
            <span>${stars.toFixed(1)}</span>
            <span class="vote-count">(${item.vote_count} votos)</span>
        `;
        
        const date = document.createElement("p");
        date.classList.add("date");
        const releaseDate = new Date(item.release_date || item.first_air_date);
        
        // Se for um lançamento futuro, mostra quantos dias faltam
        if (item.daysUntilRelease) {
            date.classList.add("upcoming-date");
            date.innerHTML = `<i class="fas fa-calendar"></i> ${
                item.daysUntilRelease === 1 
                    ? "Lança amanhã!"
                    : `Faltam ${item.daysUntilRelease} dias`
            }`;
        } else {
            date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${releaseDate.toLocaleDateString('pt-BR')}`;
        }
        
        info.appendChild(title);
        info.appendChild(rating);
        info.appendChild(date);

        // Adiciona os gêneros
        if (item.genre_ids && item.genre_ids.length > 0) {
            const genres = await getGenres(item.genre_ids, mediaType);
            const genreContainer = document.createElement("div");
            genreContainer.classList.add("genre-container");
            
            genres.forEach(genre => {
                const genreTag = document.createElement("span");
                genreTag.classList.add("genre-tag");
                genreTag.textContent = genre;
                genreContainer.appendChild(genreTag);
            });
            
            info.appendChild(genreContainer);
        }
        
        // Adiciona as plataformas de streaming
        const streamingSection = await createStreamingSection(item, mediaType);
        if (streamingSection) {
            info.appendChild(streamingSection);
        }
        
        card.appendChild(imageContainer);
        card.appendChild(info);
        
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
    
    // Limpa o container antes de buscar novos itens
    const mainContainer = document.getElementById("movies-series");
    if (mainContainer) {
        mainContainer.innerHTML = "";
    }
    
    fetchItems();
}

// Função para definir a ordenação atual
function setSort(sort) {
    currentSort = sort;
    currentPage = 1;
    
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
        allItems = [];
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

// Modifica a função createCard para incluir o botão do trailer
async function createCard(item, mediaType) {
    try {
        const card = document.createElement('div');
        card.className = 'movie-series';
        
        // Busca o trailer
        const trailer = await fetchTrailer(mediaType, item.id);
        
        // Cria o botão do trailer se houver trailer disponível
        if (trailer) {
            const trailerButton = createTrailerButton();
            trailerButton.onclick = (e) => {
                e.stopPropagation();
                openTrailerModal(trailer.key);
            };
            card.appendChild(trailerButton);
        }
        
        // Resto do código do card...
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-container");
        
        const img = document.createElement("img");
        img.loading = "lazy";
        if (item.poster_path) {
            img.src = `${IMAGE_BASE_URL}${item.poster_path}`;
            console.log("Imagem do poster:", img.src);
        } else {
            img.src = 'placeholder.jpg';
            img.classList.add('no-poster');
            console.log("Usando imagem placeholder");
        }
        img.alt = item.title || item.name;
        
        img.onerror = function() {
            console.log("Erro ao carregar imagem, usando placeholder");
            this.src = 'placeholder.jpg';
            this.classList.add('no-poster');
        };
        
        imageContainer.appendChild(img);
        
        const info = document.createElement("div");
        info.classList.add("movie-info");
        
        const title = document.createElement("h2");
        title.textContent = item.title || item.name;
        
        // Melhorando a exibição da nota
        const rating = document.createElement("div");
        rating.classList.add("rating");
        const stars = Math.round(item.vote_average * 2) / 2; // Arredonda para 0.5 mais próximo
        rating.innerHTML = `
            <i class="fas fa-star"></i>
            <span>${stars.toFixed(1)}</span>
            <span class="vote-count">(${item.vote_count} votos)</span>
        `;
        
        const date = document.createElement("p");
        date.classList.add("date");
        const releaseDate = new Date(item.release_date || item.first_air_date);
        
        // Se for um lançamento futuro, mostra quantos dias faltam
        if (item.daysUntilRelease) {
            date.classList.add("upcoming-date");
            date.innerHTML = `<i class="fas fa-calendar"></i> ${
                item.daysUntilRelease === 1 
                    ? "Lança amanhã!"
                    : `Faltam ${item.daysUntilRelease} dias`
            }`;
        } else {
            date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${releaseDate.toLocaleDateString('pt-BR')}`;
        }
        
        info.appendChild(title);
        info.appendChild(rating);
        info.appendChild(date);

        // Adiciona os gêneros
        if (item.genre_ids && item.genre_ids.length > 0) {
            const genres = await getGenres(item.genre_ids, mediaType);
            const genreContainer = document.createElement("div");
            genreContainer.classList.add("genre-container");
            
            genres.forEach(genre => {
                const genreTag = document.createElement("span");
                genreTag.classList.add("genre-tag");
                genreTag.textContent = genre;
                genreContainer.appendChild(genreTag);
            });
            
            info.appendChild(genreContainer);
        }
        
        // Adiciona as plataformas de streaming
        const streamingSection = await createStreamingSection(item, mediaType);
        if (streamingSection) {
            info.appendChild(streamingSection);
        }
        
        card.appendChild(imageContainer);
        card.appendChild(info);
        
        return card;
    } catch (error) {
        console.error("Erro ao criar card:", error);
        return null;
    }
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
