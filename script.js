document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = "f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8";
    const BASE_URL = "https://api.themoviedb.org/3";
    const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
    let currentPage = 1;
    let loading = false;
    let allItems = [];
    let filteredItems = [];
    let allGenres = [];
    let currentFilter = "all";
  
    // Função para obter os gêneros pelo ID
    function getGenreNames(genreIds) {
      return genreIds
        .map((id) => {
          const genre = allGenres.find((g) => g.id === id);
          return genre ? genre.name : "Desconhecido";
        })
        .join(", ");
    }
  
    // Função para formatar a data no formato dd/mm/yyyy
    function formatDate(dateString) {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  
    // Função para buscar provedores de streaming
    async function fetchProviders(itemId, type) {
      const response = await fetch(`${BASE_URL}/${type}/${itemId}/watch/providers?api_key=${API_KEY}&language=pt-BR`);
      const data = await response.json();
      const results = data.results.BR || {}; // Provedores disponíveis no Brasil
  
      if (results.flatrate && results.flatrate.length > 0) {
        // Se houver provedores de streaming, exibe os nomes
        return results.flatrate.map((provider) => provider.provider_name).join(", ");
      } else {
        // Se não houver provedores de streaming, exibe "Cinema"
        return "Cinema";
      }
    }
  
    // Função para criar o card de filmes/séries
    async function createCard(item) {
      const card = document.createElement("div");
      card.classList.add("movie-series");
  
      const title = document.createElement("h2");
      title.textContent = item.title || item.name;
      card.appendChild(title);
  
      const poster = document.createElement("img");
      poster.setAttribute("loading", "lazy");
      poster.src = `${IMAGE_BASE_URL}${item.poster_path}`;
      poster.alt = `Poster de ${item.title || item.name}`;
      card.appendChild(poster);
  
      const genreLabel = document.createElement("p");
      genreLabel.textContent = `Gêneros: ${getGenreNames(item.genre_ids)}`;
      card.appendChild(genreLabel);
  
      const releaseDate = document.createElement("p");
      releaseDate.textContent = `Data de Estreia: ${formatDate(item.release_date || item.first_air_date)}`;
      card.appendChild(releaseDate);
  
      // Buscar e exibir provedores de streaming
      const platformLabel = document.createElement("p");
      platformLabel.textContent = "Carregando plataformas...";
      card.appendChild(platformLabel);
  
      const platforms = await fetchProviders(item.id, item.media_type || "movie");
      platformLabel.textContent = `Disponível em: ${platforms}`;
  
      document.getElementById("movies-series").appendChild(card);
    }
  
    // Função para buscar gêneros
    async function fetchGenres() {
      const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`);
      const data = await response.json();
      allGenres = data.genres;
    }
  
    // Função para buscar filmes/séries
    async function fetchItems() {
      if (loading) return;
      loading = true;
  
      try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`);
        const data = await response.json();
        allItems = [...allItems, ...data.results];
        filteredItems = allItems.filter(item => currentFilter === "all" || item.type === currentFilter);
        for (const item of filteredItems) {
          await createCard(item);
        }
        currentPage++;
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        loading = false;
      }
    }
  
    document.getElementById("load-more").addEventListener("click", () => {
      fetchItems();
    });
  
    // Primeira busca de gêneros e de itens
    fetchGenres().then(fetchItems);
  });
  