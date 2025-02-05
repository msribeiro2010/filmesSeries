// Constantes da API
const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Estado global
let currentFilter = 'all';
let currentSort = 'date';
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
        button.addEventListener('click', () => {
            const filter = button.id.replace('filter-', '');
            setFilter(filter);
        });
    });

    // Ordenação
    document.querySelectorAll('.sort-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            const sort = button.id.replace('sort-', '');
            setSort(sort);
        });
    });

    // Scroll infinito
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000 && !loading) {
            fetchItems();
        }
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

        // Remove os skeletons na primeira página
        if (currentPage === 1) {
            mainContainer.innerHTML = "";
            allItems = [];
        }

        let newItems = [];
        
        // Se for lançamentos futuros, usa uma lógica diferente
        if (currentSort === 'upcoming') {
            if (currentPage === 1) { // Só carrega na primeira página
                newItems = await fetchUpcoming();
            }
        } else {
            const requests = [];
            const sortParam = currentSort === 'rating' ? 'vote_average' : 
                            currentSort === 'popularity' ? 'popularity' : 
                            'release_date';
            
            if (currentFilter === "all" || currentFilter === "movie") {
                const movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-BR&sort_by=${sortParam}.desc&page=${currentPage}&vote_count.gte=100`;
                console.log("Buscando filmes:", movieUrl);
                requests.push(
                    fetch(movieUrl)
                        .then(res => res.json())
                        .then(data => data.results.map(item => ({ ...item, media_type: 'movie' })))
                );
            }
            
            if (currentFilter === "all" || currentFilter === "tv") {
                const tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&sort_by=${sortParam}.desc&page=${currentPage}&vote_count.gte=100`;
                console.log("Buscando séries:", tvUrl);
                requests.push(
                    fetch(tvUrl)
                        .then(res => res.json())
                        .then(data => data.results.map(item => ({ ...item, media_type: 'tv' })))
                );
            }

            const results = await Promise.all(requests);
            newItems = results.flat();
        }
        
        console.log("Novos itens encontrados:", newItems.length);
        
        // Filtra os itens com nota maior que 6
        const filteredItems = newItems.filter(item => item.vote_average >= 6);
        allItems = [...allItems, ...filteredItems];
        
        // Ordena os itens
        const sortedItems = sortItems(filteredItems, currentSort);
        
        // Cria e adiciona os cards diretamente
        for (const item of sortedItems) {
            const card = await createCard(item, item.media_type);
            if (card) {
                mainContainer.appendChild(card);
            }
        }

        // Só incrementa a página se não for lançamentos futuros ou se houver mais itens
        if (currentSort !== 'upcoming' || newItems.length > 0) {
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
    const sorted = [...items];
    
    // Função para verificar se é conteúdo americano
    const isUSContent = (item) => {
        return (item.origin_country || []).includes('US') ||
               (item.production_countries || []).some(country => country.iso_3166_1 === 'US');
    };

    switch (sortType) {
        case 'rating':
            return sorted.sort((a, b) => {
                if (isUSContent(a) !== isUSContent(b)) {
                    return isUSContent(a) ? -1 : 1;
                }
                return b.vote_average - a.vote_average;
            });
        
        case 'popularity':
            return sorted.sort((a, b) => {
                if (isUSContent(a) !== isUSContent(b)) {
                    return isUSContent(a) ? -1 : 1;
                }
                return b.popularity - a.popularity;
            });
        
        case 'upcoming':
            return sorted.sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });
        
        default: // date
            return sorted.sort((a, b) => {
                if (isUSContent(a) !== isUSContent(b)) {
                    return isUSContent(a) ? -1 : 1;
                }
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateB - dateA;
            });
    }
}

// Função para criar o container de streaming
async function createStreamingSection(item, mediaType) {
    try {
        const providersResponse = await fetch(`${BASE_URL}/${mediaType}/${item.id}/watch/providers?api_key=${API_KEY}`)
            .then(res => res.json());
        
        if (providersResponse.results && providersResponse.results.BR) {
            const brProviders = providersResponse.results.BR;
            const streamingSection = document.createElement("div");
            streamingSection.classList.add("streaming-section");
            
            // Adiciona título "Disponível em:"
            const streamingTitle = document.createElement("div");
            streamingTitle.classList.add("streaming-title");
            streamingTitle.textContent = "Disponível em:";
            streamingSection.appendChild(streamingTitle);

            // Container para os logos
            const streamingContainer = document.createElement("div");
            streamingContainer.classList.add("streaming-container");
            
            // Função para adicionar plataformas
            const addPlatforms = (platforms, type) => {
                if (platforms && platforms.length > 0) {
                    platforms.forEach(platform => {
                        const platformContainer = document.createElement("div");
                        platformContainer.classList.add("platform-container");
                        
                        const platformImg = document.createElement("img");
                        platformImg.src = `https://image.tmdb.org/t/p/original${platform.logo_path}`;
                        platformImg.alt = platform.provider_name;
                        platformImg.title = platform.provider_name;
                        platformImg.loading = "lazy";
                        
                        const platformName = document.createElement("span");
                        platformName.classList.add("platform-name");
                        platformName.textContent = platform.provider_name;
                        
                        platformContainer.appendChild(platformImg);
                        platformContainer.appendChild(platformName);
                        streamingContainer.appendChild(platformContainer);
                    });
                    return true;
                }
                return false;
            };

            // Adiciona as plataformas por tipo
            const hasStreaming = addPlatforms(brProviders.flatrate, "streaming");
            const hasFree = addPlatforms(brProviders.free, "free");
            
            if (hasStreaming || hasFree) {
                streamingSection.appendChild(streamingContainer);
                return streamingSection;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar provedores:", error);
    }
    return null;
}

// Função para buscar trailer
async function fetchTrailer(mediaType, id) {
    try {
        // Tenta primeiro em português
        let response = await fetch(`${BASE_URL}/${mediaType}/${id}/videos?api_key=${API_KEY}&language=pt-BR`);
        let data = await response.json();
        
        // Se não encontrar em português, busca em inglês
        if (!data.results.length) {
            response = await fetch(`${BASE_URL}/${mediaType}/${id}/videos?api_key=${API_KEY}&language=en-US`);
            data = await response.json();
        }
        
        // Procura primeiro por trailers oficiais
        let trailer = data.results.find(v => 
            v.type === "Trailer" && 
            (v.name.toLowerCase().includes("official") || 
             v.name.toLowerCase().includes("oficial"))
        );
        
        // Se não encontrar trailer oficial, procura qualquer trailer
        if (!trailer) {
            trailer = data.results.find(v => v.type === "Trailer");
        }
        
        // Se ainda não encontrar, usa qualquer vídeo disponível
        if (!trailer && data.results.length > 0) {
            trailer = data.results[0];
        }
        
        return trailer ? trailer.key : null;
    } catch (error) {
        console.error("Erro ao buscar trailer:", error);
        return null;
    }
}

// Função para criar o card
async function createCard(item, mediaType) {
    try {
        console.log("Criando card para:", item.title || item.name);
        
        const card = document.createElement("div");
        card.classList.add("movie-series");
        
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-container");
        
        const img = document.createElement("img");
        img.loading = "lazy";
        if (item.poster_path) {
            img.src = `${IMAGE_BASE_URL}${item.poster_path}`;
        } else {
            img.src = 'placeholder.jpg';
            img.classList.add('no-poster');
        }
        img.alt = item.title || item.name;
        
        img.onerror = function() {
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
        
        const rating = document.createElement("p");
        rating.classList.add("rating");
        rating.textContent = `⭐ ${item.vote_average.toFixed(1)}`;
        
        const date = document.createElement("p");
        date.classList.add("date");
        const releaseDate = new Date(item.release_date || item.first_air_date);
        date.textContent = releaseDate.toLocaleDateString('pt-BR');
        
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
        
        // Adiciona fade-in após o card estar pronto
        setTimeout(() => card.classList.add("fade-in"), 10);
        
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
    
    // Remove a classe active de todos os botões
    document.querySelectorAll(".filter-buttons button").forEach(btn => {
      btn.classList.remove("active");
    });
    
    // Adiciona a classe active ao botão selecionado
    document.getElementById(`filter-${filter}`).classList.add("active");
    
    fetchItems();
}

// Função para definir a ordenação atual
function setSort(sort) {
    currentSort = sort;
    currentPage = 1;
    
    // Remove a classe active de todos os botões
    document.querySelectorAll('.sort-buttons button').forEach(button => {
        button.classList.remove("active");
    });
    
    // Adiciona a classe active ao botão selecionado
    document.getElementById(`sort-${sort}`).classList.add("active");
    
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
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);
    
    try {
        const [upcomingMovies, upcomingTV] = await Promise.all([
            fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&region=BR`)
                .then(res => res.json())
                .then(data => data.results.map(item => ({ ...item, media_type: 'movie' }))),
            fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-BR&first_air_date.gte=${formatDate(currentDate)}&first_air_date.lte=${formatDate(nextMonth)}`)
                .then(res => res.json())
                .then(data => data.results.map(item => ({ ...item, media_type: 'tv' })))
        ]);

        return [...upcomingMovies, ...upcomingTV]
            .filter(item => {
                const releaseDate = new Date(item.release_date || item.first_air_date);
                return releaseDate > currentDate;
            })
            .sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });
    } catch (error) {
        console.error("Erro ao buscar lançamentos futuros:", error);
        return [];
    }
}

// Função para formatar data
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
