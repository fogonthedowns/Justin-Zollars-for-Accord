// src/api.ts

const API_URL = "https://api.themoviedb.org/3";
const TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string;

async function request(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${API_URL}${endpoint}`);

  // add query params if any
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TMDb API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Search for movies by text query
export async function searchMovies(query: string) {
  return request("/search/movie", { query });
}

// Get details about a single movie
export async function getMovieDetails(id: number) {
  return request(`/movie/${id}`);
}

// Get similar movies to a given movie
export async function getSimilarMovies(id: number) {
  return request(`/movie/${id}/similar`);
}

// Get recommended movies based on a movie
export async function getRecommendedMovies(id: number) {
  return request(`/movie/${id}/recommendations`);
}

// Get popular movies
export async function getPopularMovies() {
  return request("/movie/popular");
}

// Get top rated movies
export async function getTopRatedMovies() {
  return request("/movie/top_rated");
}
