const WATCHED_KEY = "watched";
const WATCHED_MOVIES_KEY = "watchedMovies";
const USER_NAME_KEY = "userName";
const RECENTLY_VIEWED_KEY = "recentlyViewed";

let watched: number[] = JSON.parse(localStorage.getItem(WATCHED_KEY) || "[]");
let watchedMovies: any[] = JSON.parse(localStorage.getItem(WATCHED_MOVIES_KEY) || "[]");
let recentlyViewed: any[] = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");

export function getWatched() {
  return watched;
}

export function addWatched(movieId: number) {
  if (!watched.includes(movieId)) {
    watched.push(movieId);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
  }
}

export function getWatchedMovies() {
  return watchedMovies;
}

export function addWatchedMovie(movie: any) {
  const exists = watchedMovies.find(m => m.id === movie.id);
  if (!exists) {
    watchedMovies.push({
      id: movie.id,
      title: movie.title,
      release_date: movie.release_date,
      poster_path: movie.poster_path,
      rating: movie.rating || 0,
      comment: movie.comment || ''
    });
    localStorage.setItem(WATCHED_MOVIES_KEY, JSON.stringify(watchedMovies));
  } else {
    // Update existing movie with new rating/comment
    exists.rating = movie.rating || exists.rating || 0;
    exists.comment = movie.comment || exists.comment || '';
    localStorage.setItem(WATCHED_MOVIES_KEY, JSON.stringify(watchedMovies));
  }
}

export function encodeWatchedMovies(name: string, movies: any[]): string {
  const data = {
    n: name,
    m: movies.map(movie => ({
      i: movie.id,
      t: movie.title,
      y: movie.release_date ? movie.release_date.split('-')[0] : '',
      p: movie.poster_path,
      r: movie.rating || 0,
      c: movie.comment || ''
    }))
  };
  return btoa(JSON.stringify(data)).replace(/[+/=]/g, c =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

export function decodeWatchedMovies(encoded: string): { name: string; movies: any[] } | null {
  try {
    const normalized = encoded.replace(/[-_]/g, c => c === '-' ? '+' : '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const data = JSON.parse(atob(padded));

    return {
      name: data.n,
      movies: data.m.map((m: any) => ({
        id: m.i,
        title: m.t,
        release_date: m.y ? `${m.y}-01-01` : '',
        poster_path: m.p,
        rating: m.r || 0,
        comment: m.c || ''
      }))
    };
  } catch {
    return null;
  }
}

export function setSharedMovies(movies: any[]) {
  watchedMovies = movies;
}

export function removeWatched(movieId: number) {
  watched = watched.filter(id => id !== movieId);
  localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
}

export function removeWatchedMovie(movieId: number) {
  watchedMovies = watchedMovies.filter(movie => movie.id !== movieId);
  localStorage.setItem(WATCHED_MOVIES_KEY, JSON.stringify(watchedMovies));
}

export function getUserName(): string | null {
  return localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name: string) {
  localStorage.setItem(USER_NAME_KEY, name);
}

export function addRecentlyViewed(movie: any) {
  // Remove if already exists
  recentlyViewed = recentlyViewed.filter(m => m.id !== movie.id);

  // Add to front
  recentlyViewed.unshift({
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date,
    poster_path: movie.poster_path
  });

  // Keep only last 5
  recentlyViewed = recentlyViewed.slice(0, 5);

  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed));
}

export function getRecentlyViewed(): any[] {
  return recentlyViewed;
}