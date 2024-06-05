document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8";
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
  const YOUTUBE_BASE_URL = "https://www.youtube.com/embed/";
  let currentPage = 1;
  const itemsPerPage = 4;
  let displayedItems = new Set();
  let allItems = [];
  let filteredItems = [];
  let loading = false;
  let allGenres = [];
  let currentFilter = "all";

  function formatDate(dateString) {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    return new Date(dateString).toLocaleDateString("pt-BR", options);
  }

  function getGenres(ids) {
    const genres = ids.map((id) => {
      const genre = allGenres.find((genre) => genre.id === id);
      return genre ? genre.name : "Desconhecido";
    });
    return genres.join(", ");
  }

  async function getAvailability(item, type) {
    const response = await fetch(
      `${BASE_URL}/${type}/${item.id}/watch/providers?api_key=${API_KEY}`
    );
    const data = await response.json();
    const providers = data.results.BR || data.results.US || data.results;
    const flatrate = providers.flatrate || [];
    const buy = providers.buy || [];
    const rent = providers.rent || [];
    let text = "Cinema";

    if (flatrate.length > 0) {
      text = flatrate.map((provider) => provider.provider_name).join(", ");
    } else if (buy.length > 0 || rent.length > 0) {
      text = "Streaming";
    } else if (providers.tv) {
      text = "Na TV";
    }
    return { text, isStreaming: text !== "Cinema" };
  }

  async function createCard(item, trailerKey, type) {
    if (displayedItems.has(item.id)) return null;

    const card = document.createElement("div");
    card.classList.add("movie-series");

    const typeLabel = document.createElement("h3");
    typeLabel.textContent = type === "movie" ? "FILME" : "SÉRIE";
    card.appendChild(typeLabel);

    const title = document.createElement("h2");
    title.textContent = item.title || item.name;
    card.appendChild(title);

    if (item.poster_path) {
      const poster = document.createElement("img");
      poster.src = `${IMAGE_BASE_URL}${item.poster_path}`;
      poster.alt = `Poster de ${item.title || item.name}`;
      card.appendChild(poster);
    }

    const genreLabel = document.createElement("p");
    genreLabel.textContent = `Gêneros: ${getGenres(item.genre_ids)}`;
    card.appendChild(genreLabel);

    const releaseDate = document.createElement("p");
    releaseDate.textContent = `Data de Estreia: ${formatDate(
      item.release_date || item.first_air_date
    )}`;
    releaseDate.classList.add("release-date");
    card.appendChild(releaseDate);

    /* const availability = document.createElement("p");
    const availabilityData = await getAvailability(item, type);
    availability.textContent = `Disponível: ${availabilityData.text}`;
    availability.classList.add(availabilityData.isStreaming ? "TV" : "cinema");
    card.appendChild(availability); */

    const ratingValue =
      item.vote_average === 0 ? "Não avaliado" : item.vote_average;
    const rating = document.createElement("p");
    rating.textContent = `Avaliação: ${ratingValue}`;
    rating.classList.add(
      item.vote_average < 6 && item.vote_average > 0
        ? "rating-low"
        : "rating-high"
    );
    card.appendChild(rating);

    const overview = document.createElement("p");
    overview.textContent = `Sinopse: ${item.overview}`;
    card.appendChild(overview);

    if (trailerKey) {
      const trailer = document.createElement("iframe");
      trailer.src = `${YOUTUBE_BASE_URL}${trailerKey}`;
      trailer.width = "100%";
      trailer.height = "315";
      trailer.allowFullscreen = true;
      card.appendChild(trailer);
    }

    displayedItems.add(item.id);
    return card;
  }

  async function fetchTrailer(item, type) {
    const response = await fetch(
      `${BASE_URL}/${type}/${item.id}/videos?api_key=${API_KEY}&language=pt-BR`
    );
    const data = await response.json();
    const trailer = data.results.find(
      (video) => video.type === "Trailer" && video.site === "YouTube"
    );
    return trailer ? trailer.key : null;
  }

  async function fetchItems() {
    if (loading) return;
    loading = true;

    try {
      const [popularMoviesResponse, popularSeriesResponse, genresResponse] =
        await Promise.all([
          fetch(
            `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
          ),
          fetch(
            `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
          ),
          fetch(
            `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`
          ),
        ]);

      if (
        !popularMoviesResponse.ok ||
        !popularSeriesResponse.ok ||
        !genresResponse.ok
      ) {
        throw new Error("Falha ao buscar dados");
      }

      const popularMoviesDataResponse = await popularMoviesResponse.json();
      const popularSeriesDataResponse = await popularSeriesResponse.json();
      const genresDataResponse = await genresResponse.json();

      allGenres = genresDataResponse.genres;

      const movies2024 = popularMoviesDataResponse.results.filter(
        (movie) => new Date(movie.release_date).getFullYear() === 2024
      );

      const series2024 = popularSeriesDataResponse.results.filter(
        (series) => new Date(series.first_air_date).getFullYear() === 2024
      );

      allItems = [
        ...allItems,
        ...movies2024.map((item) => ({ ...item, type: "movie" })),
        ...series2024.map((item) => ({ ...item, type: "tv" })),
      ];

      allItems.sort(
        (a, b) =>
          new Date(b.release_date || b.first_air_date) -
            new Date(a.release_date || a.first_air_date) ||
          b.vote_average - a.vote_average
      );

      filteredItems = allItems.filter(
        (item) => item.type === currentFilter || currentFilter === "all"
      );
      displayItems(false); // Pass false to indicate that items should be appended
      currentPage++;
    } catch (error) {
      console.error("Erro ao buscar filmes e séries:", error);
    } finally {
      loading = false;
    }
  }

  function displayItems(clear = true) {
    const container = document.getElementById("movies-series");
    if (clear) {
      container.innerHTML = "";
      displayedItems.clear();
    }

    const itemsToDisplay = filteredItems.slice(0, itemsPerPage);
    itemsToDisplay.forEach(async (item) => {
      const trailerKey = await fetchTrailer(item, item.type);
      const card = await createCard(item, trailerKey, item.type);
      if (card) {
        container.appendChild(card);
      }
    });

    filteredItems = filteredItems.slice(itemsPerPage);

    if (!clear) {
      // Scroll to the bottom of the page
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  function filterItems(type) {
    currentFilter = type;
    if (type === "all") {
      filteredItems = allItems;
    } else {
      filteredItems = allItems.filter((item) => item.type === type);
    }
    currentPage = 1;
    displayItems();
  }

  document.getElementById("filter-all").addEventListener("click", () => {
    filterItems("all");
  });

  document.getElementById("filter-movies").addEventListener("click", () => {
    filterItems("movie");
  });

  document.getElementById("filter-series").addEventListener("click", () => {
    filterItems("tv");
  });

  document.getElementById("load-more").addEventListener("click", () => {
    fetchItems();
  });

  document.getElementById("back-to-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  fetchItems();
});
