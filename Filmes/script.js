document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "f5cc2dc1b4fcf4fd0192c0bd2ad8d2a8";
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
  const currentDate = new Date();
  let currentPage = 1;
  const itemsPerPage = 4;
  let popularMoviesData = [];
  let upcomingMoviesData = [];
  let popularSeriesData = [];
  let airingTodaySeriesData = [];
  let currentIndex = 0;
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

  function createCard(item, type, genres) {
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

    const typeLabel = document.createElement("p");
    typeLabel.textContent = `Tipo: ${type}`;
    card.appendChild(typeLabel);

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
    availability.textContent = `Disponível em: ${
      type === "Filme" ? "Cinema" : "Streaming"
    }`;
    card.appendChild(availability);

    const rating = document.createElement("p");
    rating.textContent = `Avaliação: ${item.vote_average}`;
    rating.classList.add(item.vote_average < 6 ? "rating-low" : "rating-high");
    card.appendChild(rating);

    const overview = document.createElement("p");
    overview.textContent = `Sinopse: ${item.overview}`;
    card.appendChild(overview);

    return card;
  }

  async function fetchMoviesAndSeries() {
    if (loading) return;
    loading = true;

    try {
      const [
        popularMoviesResponse,
        upcomingMoviesResponse,
        popularSeriesResponse,
        airingTodaySeriesResponse,
        genresResponse,
      ] = await Promise.all([
        fetch(
          `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
        ),
        fetch(
          `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
        ),
        fetch(
          `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
        ),
        fetch(
          `${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=pt-BR&page=${currentPage}`
        ),
        fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-BR`),
      ]);

      if (
        !popularMoviesResponse.ok ||
        !upcomingMoviesResponse.ok ||
        !popularSeriesResponse.ok ||
        !airingTodaySeriesResponse.ok ||
        !genresResponse.ok
      ) {
        throw new Error("Falha ao buscar dados");
      }

      const popularMoviesDataResponse = await popularMoviesResponse.json();
      const upcomingMoviesDataResponse = await upcomingMoviesResponse.json();
      const popularSeriesDataResponse = await popularSeriesResponse.json();
      const airingTodaySeriesDataResponse =
        await airingTodaySeriesResponse.json();
      const genresDataResponse = await genresResponse.json();

      const allGenres = genresDataResponse.genres;

      const upcomingMoviesFiltered = upcomingMoviesDataResponse.results.filter(
        (movie) => new Date(movie.release_date) >= currentDate
      );
      const airingTodaySeriesFiltered =
        airingTodaySeriesDataResponse.results.filter(
          (series) => new Date(series.first_air_date) >= currentDate
        );

      popularMoviesData = [
        ...popularMoviesData,
        ...popularMoviesDataResponse.results,
      ];
      upcomingMoviesData = [...upcomingMoviesData, ...upcomingMoviesFiltered];
      popularSeriesData = [
        ...popularSeriesData,
        ...popularSeriesDataResponse.results,
      ];
      airingTodaySeriesData = [
        ...airingTodaySeriesData,
        ...airingTodaySeriesFiltered,
      ];

      displayItems(allGenres);
      currentPage++;
    } catch (error) {
      console.error("Erro ao buscar filmes e séries:", error);
    } finally {
      loading = false;
    }
  }

  function displayItems(genres) {
    const container = document.getElementById("movies-series");
    let itemsDisplayed = 0;

    while (
      itemsDisplayed < itemsPerPage &&
      (currentIndex < popularMoviesData.length ||
        currentIndex < upcomingMoviesData.length ||
        currentIndex < popularSeriesData.length ||
        currentIndex < airingTodaySeriesData.length)
    ) {
      if (currentIndex < popularMoviesData.length) {
        const card = createCard(
          popularMoviesData[currentIndex],
          "Filme",
          genres
        );
        container.appendChild(card);
        currentIndex++;
        itemsDisplayed++;
      }
      if (
        itemsDisplayed < itemsPerPage &&
        currentIndex < upcomingMoviesData.length
      ) {
        const card = createCard(
          upcomingMoviesData[currentIndex],
          "Filme (Próxima Estreia)",
          genres
        );
        container.appendChild(card);
        currentIndex++;
        itemsDisplayed++;
      }
      if (
        itemsDisplayed < itemsPerPage &&
        currentIndex < popularSeriesData.length
      ) {
        const card = createCard(
          popularSeriesData[currentIndex],
          "Série",
          genres
        );
        container.appendChild(card);
        currentIndex++;
        itemsDisplayed++;
      }
      if (
        itemsDisplayed < itemsPerPage &&
        currentIndex < airingTodaySeriesData.length
      ) {
        const card = createCard(
          airingTodaySeriesData[currentIndex],
          "Série (Próxima Estreia)",
          genres
        );
        container.appendChild(card);
        currentIndex++;
        itemsDisplayed++;
      }
    }
  }

  document
    .getElementById("load-more")
    .addEventListener("click", fetchMoviesAndSeries);

  fetchMoviesAndSeries();
});
