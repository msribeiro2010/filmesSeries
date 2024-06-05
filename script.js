document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8";
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
  const YOUTUBE_BASE_URL = "https://www.youtube.com/embed/";
  const currentDate = new Date();
  let currentPage = 1;
  const itemsPerPage = 4;
  let displayedItems = new Set();
  let allItems = [];
  let loading = false;

  function formatDate(dateString) {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    return new Date(dateString).toLocaleDateString("pt-BR", options);
  }

  function getGenres(ids, allGenres) {
    const genres = ids.map(
      (id) => allGenres.find((genre) => genre.id === id).name
    );
    return genres.join(", ");
  }

  async function getAvailability(item, type) {
    const response = await fetch(
      `${BASE_URL}/${type}/${item.id}/watch/providers?api_key=${API_KEY}`
    );
    const data = await response.json();
    const providers = data.results.BR || data.results.US || data.results;
    const flatrate = providers.flatrate || [];
    if (flatrate.length > 0) {
      return {
        text: flatrate.map((provider) => provider.provider_name).join(", "),
        isStreaming: true,
      };
    }
    return { text: "Cinema", isStreaming: false };
  }

  async function createCard(item, type, genres, trailerKey) {
    if (displayedItems.has(item.id)) return null;

    const card = document.createElement("div");
    card.classList.add("movie-series");

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
    genreLabel.textContent = `Gêneros: ${getGenres(item.genre_ids, genres)}`;
    card.appendChild(genreLabel);

    const releaseDate = document.createElement("p");
    releaseDate.textContent = `Data de Estreia: ${formatDate(
      item.release_date || item.first_air_date
    )}`;
    releaseDate.classList.add("release-date");
    card.appendChild(releaseDate);

    const availability = document.createElement("p");
    const availabilityData = await getAvailability(item, type);
    availability.textContent = `Disponível em: ${availabilityData.text}`;
    availability.classList.add(
      availabilityData.isStreaming ? "streaming" : "cinema"
    );
    card.appendChild(availability);

    const ratingValue =
      item.vote_average === 0 ? "s/avaliação" : item.vote_average;
    const rating = document.createElement("p");
    rating.textContent = `Avaliação: ${ratingValue}`;
    rating.classList.add(
      item.vote_average < 6 && item.vote_average > 0
        ? "rating-low"
        : "rating-high"
    );
    card.appendChild(rating);

    if (trailerKey) {
      const trailer = document.createElement("iframe");
      trailer.src = `${YOUTUBE_BASE_URL}${trailerKey}`;
      trailer.width = "100%";
      trailer.height = "315";
      trailer.allowFullscreen = true;
      card.appendChild(trailer);
    }

    const overview = document.createElement("p");
    overview.textContent = `Sinopse: ${item.overview}`;
    card.appendChild(overview);

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
      const [upcomingMoviesResponse, popularSeriesResponse, genresResponse] =
        await Promise.all([
          fetch(
            `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
          ),
          fetch(
            `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
          ),
          fetch(
            `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`
          ),
        ]);

      if (
        !upcomingMoviesResponse.ok ||
        !popularSeriesResponse.ok ||
        !genresResponse.ok
      ) {
        throw new Error("Falha ao buscar dados");
      }

      const upcomingMoviesDataResponse = await upcomingMoviesResponse.json();
      const popularSeriesDataResponse = await popularSeriesResponse.json();
      const genresDataResponse = await genresResponse.json();

      const allGenres = genresDataResponse.genres;

      const movies2024 = upcomingMoviesDataResponse.results.filter(
        (movie) => new Date(movie.release_date).getFullYear() === 2024
      );

      const series2024 = popularSeriesDataResponse.results.filter(
        (series) => new Date(series.first_air_date).getFullYear() === 2024
      );

      allItems = [
        ...allItems,
        ...movies2024.map((item) => ({ ...item, type: "Filme" })),
        ...series2024.map((item) => ({ ...item, type: "Série" })),
      ];

      allItems.sort(
        (a, b) =>
          new Date(b.release_date || b.first_air_date) -
            new Date(a.release_date || a.first_air_date) ||
          b.vote_average - a.vote_average
      );

      displayItems(allGenres);
      currentPage++;
    } catch (error) {
      console.error("Erro ao buscar filmes e séries:", error);
    } finally {
      loading = false;
    }
  }

  async function displayItems(genres) {
    const container = document.getElementById("movies-series");
    const itemsToDisplay = allItems.slice(0, itemsPerPage);

    for (let item of itemsToDisplay) {
      const trailerKey = await fetchTrailer(
        item,
        item.type === "Filme" ? "movie" : "tv"
      );
      const card = await createCard(item, item.type, genres, trailerKey);
      if (card) {
        container.appendChild(card);
      }
    }

    allItems = allItems.slice(itemsPerPage);
  }

  document.getElementById("load-more").addEventListener("click", fetchItems);

  fetchItems();
});
