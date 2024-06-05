document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8";
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
  const YOUTUBE_BASE_URL = "https://www.youtube.com/embed/";
  const currentDate = new Date();
  let currentPage = 1;
  const itemsPerPage = 4;
  let displayedItems = new Set();
  let allMovies = [];
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

  function createCard(item, genres, trailerKey) {
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
      item.release_date
    )}`;
    releaseDate.classList.add("release-date");
    card.appendChild(releaseDate);

    const availability = document.createElement("p");
    availability.textContent = `Disponível em: Cinema`;
    card.appendChild(availability);

    const rating = document.createElement("p");
    rating.textContent = `Avaliação: ${item.vote_average}`;
    rating.classList.add(item.vote_average < 6 ? "rating-low" : "rating-high");
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

  async function fetchTrailer(item) {
    const response = await fetch(
      `${BASE_URL}/movie/${item.id}/videos?api_key=${API_KEY}&language=pt-BR`
    );
    const data = await response.json();
    const trailer = data.results.find(
      (video) => video.type === "Trailer" && video.site === "YouTube"
    );
    return trailer ? trailer.key : null;
  }

  async function fetchMovies() {
    if (loading) return;
    loading = true;

    try {
      const [upcomingMoviesResponse, genresResponse] = await Promise.all([
        fetch(
          `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
        ),
        fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`),
      ]);

      if (!upcomingMoviesResponse.ok || !genresResponse.ok) {
        throw new Error("Falha ao buscar dados");
      }

      const upcomingMoviesDataResponse = await upcomingMoviesResponse.json();
      const genresDataResponse = await genresResponse.json();

      const allGenres = genresDataResponse.genres;

      const movies2024 = upcomingMoviesDataResponse.results.filter(
        (movie) =>
          new Date(movie.release_date).getFullYear() === 2024 &&
          new Date(movie.release_date) >= currentDate
      );

      allMovies = [...allMovies, ...movies2024];

      allMovies.sort(
        (a, b) =>
          new Date(b.release_date) - new Date(a.release_date) ||
          b.vote_average - a.vote_average
      );

      displayItems(allGenres);
      currentPage++;
    } catch (error) {
      console.error("Erro ao buscar filmes:", error);
    } finally {
      loading = false;
    }
  }

  async function displayItems(genres) {
    const container = document.getElementById("movies-series");
    const itemsToDisplay = allMovies.slice(0, itemsPerPage);

    for (let item of itemsToDisplay) {
      const trailerKey = await fetchTrailer(item);
      const card = createCard(item, genres, trailerKey);
      if (card) {
        container.appendChild(card);
      }
    }

    allMovies = allMovies.slice(itemsPerPage);
  }

  document.getElementById("load-more").addEventListener("click", fetchMovies);

  fetchMovies();
});
