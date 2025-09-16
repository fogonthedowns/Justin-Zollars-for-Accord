import { searchMovies, getMovieDetails, getSimilarMovies, getRecommendedMovies, getPopularMovies, getTopRatedMovies } from "./api";
import { addWatched, getWatched, addWatchedMovie, getWatchedMovies, encodeWatchedMovies, decodeWatchedMovies, setSharedMovies, removeWatched, removeWatchedMovie, getUserName, setUserName, addRecentlyViewed, getRecentlyViewed } from "./app";
import "./style.css";

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const input = document.querySelector<HTMLInputElement>("#search-input")!;
const resultsDiv = document.querySelector<HTMLDivElement>("#results")!;
const watchedList = document.querySelector<HTMLUListElement>("#watched-list")!;
const recentlyViewedList = document.querySelector<HTMLUListElement>("#recently-viewed-list")!;
const shareButtonContainer = document.querySelector<HTMLDivElement>("#share-button-container")!;
const modal = document.querySelector<HTMLDivElement>("#modal")!;
const myMoviesLink = document.querySelector<HTMLAnchorElement>("#my-movies-link")!;

let sharedListOwner = "";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: rgba(0, 0, 0, 0.7);" class="loading">Searching for movies...</div>';

  try {
    const data = await searchMovies(query);
    if (data.results.length === 0) {
      resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: rgba(0, 0, 0, 0.7);">No movies found. Try a different search term.</div>';
    } else {
      renderResults(data.results);
    }
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: rgba(255, 107, 107, 0.8);">⚠️ Something went wrong! Please try again.</div>';
  }
});

function renderResults(movies: any[], isRecommendations = false) {
  const movieCards = movies
    .map(
      (m) => `
      <div class="card" data-id="${m.id}">
        <img src="https://image.tmdb.org/t/p/w200${m.poster_path}" alt="${m.title}" />
        <div class="card-content">
          <h3>${m.title}</h3>
          <p>${m.release_date ? m.release_date.split('-')[0] : "N/A"}</p>
        </div>
      </div>
    `
    )
    .join("");

  if (isRecommendations) {
    resultsDiv.innerHTML += movieCards;
  } else {
    resultsDiv.innerHTML = movieCards;
  }
}

resultsDiv.addEventListener("click", async (e) => {
  const card = (e.target as HTMLElement).closest(".card") as HTMLElement | null;
  if (!card) return;

  const id = Number(card.dataset.id);
  const movie = await getMovieDetails(id);
  showModal(movie);
});

function showModal(movie: any) {
  // Track recently viewed
  addRecentlyViewed(movie);
  renderRecentlyViewed();

  if (sharedListOwner) {
    return;
  }

  modal.innerHTML = `
    <div id="modal-content">
      <h2>${movie.title} (${movie.release_date?.split("-")[0] || ""})</h2>
      <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" />
      <p>${movie.overview}</p>
      <button id="add-watched">Add to Watched</button>
      <button id="close-modal">Close</button>
    </div>
  `;
  modal.classList.remove("hidden");

  document
    .querySelector("#close-modal")!
    .addEventListener("click", () => modal.classList.add("hidden"));

  document.querySelector("#add-watched")!.addEventListener("click", () => {
    showReviewDialog(movie);
  });
}

function showReviewDialog(movie: any) {
  modal.innerHTML = `
    <div class="dialog-content">
      <h3>Rate & Review "${movie.title}"</h3>
      <div class="star-rating" id="star-rating">
        ${Array(5).fill(0).map((_, i) => `<span class="star" data-rating="${i + 1}">★</span>`).join('')}
      </div>
      <textarea class="dialog-textarea" id="review-comment" placeholder="What did you think about this movie? (optional)"></textarea>
      <div class="dialog-buttons">
        <button class="dialog-btn dialog-btn-secondary" id="cancel-review">Cancel</button>
        <button class="dialog-btn dialog-btn-primary" id="save-review">Save Review</button>
      </div>
    </div>
  `;

  let selectedRating = 0;
  const stars = modal.querySelectorAll('.star');
  const commentTextarea = modal.querySelector('#review-comment') as HTMLTextAreaElement;

  stars.forEach((star, index) => {
    star.addEventListener('mouseover', () => {
      stars.forEach((s, i) => {
        if (i <= index) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });

    star.addEventListener('click', () => {
      selectedRating = index + 1;
      stars.forEach((s, i) => {
        if (i < selectedRating) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
  });

  modal.addEventListener('mouseleave', () => {
    stars.forEach((s, i) => {
      if (i < selectedRating) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  });

  document.getElementById('cancel-review')!.addEventListener('click', () => {
    modal.classList.add("hidden");
  });

  document.getElementById('save-review')!.addEventListener('click', () => {
    const movieWithReview = {
      ...movie,
      rating: selectedRating,
      comment: commentTextarea.value.trim()
    };

    addWatched(movie.id);
    addWatchedMovie(movieWithReview);
    renderWatched();
    modal.classList.add("hidden");
    showCustomAlert('Movie added to your watched list!', 'success');

    // Refresh recommendations if no search is active
    if (!input.value.trim() && !sharedListOwner) {
      setTimeout(() => loadRecommendations(), 1000);
    }
  });
}

function renderWatched() {
  const allWatchedMovies = getWatchedMovies();

  if (sharedListOwner) {
    renderSharedMovieGrid(allWatchedMovies);
    return;
  }

  if (allWatchedMovies.length === 0) {
    watchedList.innerHTML = '<li style="text-align: center; color: rgba(0, 0, 0, 0.5); padding: 1rem;">No movies watched yet</li>';
    return;
  }

  // Show only the last 2 watched movies
  const recentWatchedMovies = allWatchedMovies.slice(-2);

  const moviesList = recentWatchedMovies
    .map((movie) => `
      <li class="watched-movie-item" data-movie-id="${movie.id}" style="position: relative; cursor: pointer; transition: all 0.2s ease; margin-bottom: 0.5rem;">
        <div style="display: flex; gap: 0.75rem; padding: 0.5rem;">
          <img src="https://image.tmdb.org/t/p/w92${movie.poster_path}"
               style="width: 50px; height: 75px; border-radius: 6px; object-fit: cover; flex-shrink: 0;" />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.3rem; line-height: 1.2; color: black;">${movie.title}</div>
            <div style="font-size: 0.8rem; color: rgba(0, 0, 0, 0.6); margin-bottom: 0.5rem;">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</div>

            ${movie.rating > 0 ? `
              <div style="font-size: 0.85rem; color: #ffd700; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span>${'★'.repeat(movie.rating)}${'☆'.repeat(5 - movie.rating)}</span>
                <span style="color: rgba(0,0,0,0.8); font-size: 0.75rem; font-weight: 600;">${movie.rating}/5</span>
              </div>
            ` : ''}

            ${movie.comment ? `
              <div style="font-size: 0.8rem; color: rgba(0, 0, 0, 0.8); line-height: 1.3; font-style: italic; background: rgba(0,0,0,0.05); padding: 0.4rem 0.6rem; border-radius: 6px; border-left: 2px solid rgb(255, 102, 0);">
                "${movie.comment.length > 60 ? movie.comment.substring(0, 60) + '...' : movie.comment}"
              </div>
            ` : ''}
          </div>
          <button class="delete-movie-btn" style="
            position: absolute;
            right: 0.5rem;
            top: 0.5rem;
            background: rgb(255, 102, 0);
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 12px;
            display: none;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
          ">✕</button>
        </div>
      </li>
    `)
    .join("");

  // Update My Movies link count
  if (allWatchedMovies.length > 0) {
    myMoviesLink.textContent = `My Movies (${allWatchedMovies.length})`;
  } else {
    myMoviesLink.textContent = 'My Movies';
  }

  watchedList.innerHTML = moviesList;

  // Put share button in separate container
  shareButtonContainer.innerHTML = `
    <button id="share-btn" style="
      width: 100%;
      margin-top: 1rem;
      padding: 0.75rem;
      background: white;
      color: black;
      border: none !important;
      outline: none !important;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    ">Share My List</button>
  `;

  const shareBtn = document.getElementById('share-btn');
  shareBtn?.addEventListener('click', shareWatchedMovies);

  // Add hover and click functionality
  document.querySelectorAll('.watched-movie-item').forEach(item => {
    const deleteBtn = item.querySelector('.delete-movie-btn') as HTMLElement;

    item.addEventListener('mouseenter', () => {
      deleteBtn.style.display = 'flex';
    });

    item.addEventListener('mouseleave', () => {
      deleteBtn.style.display = 'none';
    });

    // Click to show expanded details
    item.addEventListener('click', async () => {
      const movieId = Number((item as HTMLElement).dataset.movieId);
      const watchedMovie = allWatchedMovies.find(m => m.id === movieId);
      if (watchedMovie) {
        const movieDetails = await getMovieDetails(movieId);
        showExpandedWatchedMovie(movieDetails, watchedMovie);
      }
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const movieId = Number((item as HTMLElement).dataset.movieId);
      deleteWatchedMovie(movieId);
    });
  });
}

function deleteWatchedMovie(movieId: number) {
  removeWatched(movieId);
  removeWatchedMovie(movieId);
  renderWatched();
  showCustomAlert('Movie removed from your list', 'success');
}

function showAllWatchedMovies() {
  const allWatchedMovies = getWatchedMovies();
  const main = document.querySelector('main')!;

  // Update page title
  const header = document.querySelector('header h1')!;
  header.innerHTML = `
    <button id="back-home" style="
      background: white;
      color: black;
      border: none !important;
      outline: none !important;
      padding: 0.5rem 1rem;
      border-radius: 25px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-right: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      font-weight: 600;
    ">← Back</button>
    All My Watched Movies (${allWatchedMovies.length})
    <button id="share-all-movies" style="
      background: white;
      color: black;
      border: none !important;
      outline: none !important;
      padding: 0.5rem 1rem;
      border-radius: 25px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-left: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    ">Share My List</button>
  `;

  // Hide search form
  const searchForm = document.querySelector('#search-form')! as HTMLElement;
  searchForm.style.display = 'none';

  // Replace main content with all watched movies grid
  main.innerHTML = `
    <div class="shared-movie-grid">
      ${allWatchedMovies.map(movie => `
        <div class="shared-movie-card watched-movie-card" data-movie-id="${movie.id}">
          <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}"
               alt="${movie.title}"
               class="shared-movie-image" />
          <div class="shared-movie-info">
            <h3 class="shared-movie-title">${movie.title}</h3>
            <p class="shared-movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>

            ${movie.rating > 0 ? `
              <div class="shared-movie-rating">
                <span class="shared-movie-stars">${'★'.repeat(movie.rating)}${'☆'.repeat(5 - movie.rating)}</span>
                <span>${movie.rating}/5</span>
              </div>
            ` : ''}

            ${movie.comment ? `
              <div class="shared-movie-comment">
                "${movie.comment}"
              </div>
            ` : ''}

            <button class="delete-watched-btn" style="
              position: absolute;
              top: 10px;
              right: 10px;
              background: rgba(255, 107, 107, 0.9);
              color: white;
              border: none;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              opacity: 0;
            " onmouseenter="this.style.opacity='1'"
               onmouseleave="this.style.opacity='0'">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add click handlers
  document.getElementById('back-home')!.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('share-all-movies')!.addEventListener('click', shareWatchedMovies);

  document.querySelectorAll('.watched-movie-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).classList.contains('delete-watched-btn')) {
        return; // Don't open modal when clicking delete
      }

      const movieId = Number((e.currentTarget as HTMLElement).dataset.movieId);
      const watchedMovie = allWatchedMovies.find(m => m.id === movieId);
      if (watchedMovie) {
        const movieDetails = await getMovieDetails(movieId);
        showExpandedWatchedMovie(movieDetails, watchedMovie);
      }
    });

    // Add delete functionality
    const deleteBtn = card.querySelector('.delete-watched-btn')!;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const movieId = Number((card as HTMLElement).dataset.movieId);
      const movieTitle = allWatchedMovies.find(m => m.id === movieId)?.title;

      if (confirm(`Remove "${movieTitle}" from your watched list?`)) {
        removeWatched(movieId);
        removeWatchedMovie(movieId);
        showCustomAlert('Movie removed from your list', 'success');
        // Refresh the view
        showAllWatchedMovies();
      }
    });

    // Show/hide delete button on hover
    card.addEventListener('mouseenter', () => {
      const btn = card.querySelector('.delete-watched-btn') as HTMLElement;
      btn.style.opacity = '1';
    });

    card.addEventListener('mouseleave', () => {
      const btn = card.querySelector('.delete-watched-btn') as HTMLElement;
      btn.style.opacity = '0';
    });
  });
}

function renderRecentlyViewed() {
  const recentMovies = getRecentlyViewed();

  if (recentMovies.length === 0) {
    recentlyViewedList.innerHTML = '<li style="text-align: center; color: rgba(0, 0, 0, 0.5); font-size: 0.9rem; padding: 1rem;">No recent views</li>';
    return;
  }

  recentlyViewedList.innerHTML = recentMovies
    .map((movie) => `
      <li class="recent-movie-item" data-movie-id="${movie.id}" style="
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        border-radius: 8px;
      ">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <img src="https://image.tmdb.org/t/p/w92${movie.poster_path}"
               style="width: 35px; height: 52px; border-radius: 4px; object-fit: cover; flex-shrink: 0;" />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.85rem; line-height: 1.2; margin-bottom: 0.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${movie.title}
            </div>
            <div style="font-size: 0.75rem; color: rgba(0, 0, 0, 0.6);">
              ${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
            </div>
          </div>
        </div>
      </li>
    `)
    .join("");

  // Add click handlers for recently viewed
  document.querySelectorAll('.recent-movie-item').forEach(item => {
    item.addEventListener('click', async () => {
      const movieId = Number((item as HTMLElement).dataset.movieId);
      const movie = await getMovieDetails(movieId);
      showModal(movie);
    });
  });
}

function showExpandedWatchedMovie(movieDetails: any, watchedMovie: any) {
  modal.innerHTML = `
    <div id="modal-content" style="max-width: 800px; width: 100%;">
      <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
        <img src="https://image.tmdb.org/t/p/w400${movieDetails.poster_path}"
             style="width: 300px; height: 450px; object-fit: cover; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
        <div style="flex: 1;">
          <h2 style="margin: 0 0 1rem 0; font-size: 2.2rem; line-height: 1.2;">${movieDetails.title}</h2>
          <p style="color: rgba(0,0,0,0.8); font-size: 1.1rem; margin-bottom: 1.5rem;">
            ${movieDetails.release_date ? movieDetails.release_date.split('-')[0] : 'N/A'} •
            ${movieDetails.runtime ? `${movieDetails.runtime} min` : ''} •
            ${movieDetails.genres?.map((g: any) => g.name).join(', ') || ''}
          </p>

          ${watchedMovie.rating > 0 ? `
            <div style="margin-bottom: 2rem; text-align: center; background: rgba(0,0,0,0.05); padding: 1.5rem; border-radius: 15px;">
              <div style="color: #ffd700; font-size: 2.5rem; margin-bottom: 0.5rem;">
                ${'★'.repeat(watchedMovie.rating)}${'☆'.repeat(5 - watchedMovie.rating)}
              </div>
              <div style="font-size: 1.2rem; font-weight: 600; color: rgba(0,0,0,0.9);">
                Your Rating: ${watchedMovie.rating}/5
              </div>
            </div>
          ` : ''}

          ${watchedMovie.comment ? `
            <div style="margin-bottom: 2rem;">
              <h3 style="color: rgb(255, 102, 0); margin-bottom: 1rem; font-size: 1.2rem;">Your Review</h3>
              <div style="background: rgba(0,0,0,0.05); border-left: 3px solid rgb(255, 102, 0); padding: 1rem; border-radius: 0 10px 10px 0; font-style: italic; line-height: 1.6; color: rgba(0,0,0,0.9);">
                "${watchedMovie.comment}"
              </div>
            </div>
          ` : ''}

          ${movieDetails.vote_average ? `
            <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
              <div style="background: rgba(255,193,7,0.2); padding: 0.5rem 1rem; border-radius: 25px; display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: #ffc107;">⭐</span>
                <span style="font-weight: 600;">${movieDetails.vote_average.toFixed(1)}/10 TMDb</span>
              </div>
              <span style="color: rgba(0,0,0,0.7); font-size: 0.9rem;">(${movieDetails.vote_count} votes)</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="color: rgb(255, 102, 0); margin-bottom: 1rem;">Overview</h3>
        <p style="line-height: 1.6; color: rgba(0,0,0,0.9);">${movieDetails.overview}</p>
      </div>

      ${movieDetails.production_companies && movieDetails.production_companies.length > 0 ? `
        <div style="margin-bottom: 2rem;">
          <h4 style="color: rgba(0,0,0,0.8); margin-bottom: 0.5rem; font-size: 0.9rem;">Production</h4>
          <p style="color: rgba(0,0,0,0.6); font-size: 0.9rem;">
            ${movieDetails.production_companies.map((c: any) => c.name).join(', ')}
          </p>
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 2rem;">
        <button id="close-expanded-modal" style="
          background: rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.2);
          color: black;
          padding: 0.875rem 2rem;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        ">Close</button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");

  document
    .querySelector("#close-expanded-modal")!
    .addEventListener("click", () => modal.classList.add("hidden"));
}

function renderSharedMovieGrid(movies: any[]) {
  const main = document.querySelector('main')!;

  // Update page title and add back button
  const header = document.querySelector('header h1')!;
  header.innerHTML = `
    <button id="back-home" style="
      background: white;
      color: black;
      border: none !important;
      outline: none !important;
      padding: 0.5rem 1rem;
      border-radius: 25px;
      cursor: pointer;
      font-size: 0.9rem;
      margin-right: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      font-weight: 600;
    ">← Back Home</button>
    🎬 ${sharedListOwner}'s Movies
  `;

  // Hide search form when viewing shared list
  const searchForm = document.querySelector('#search-form')! as HTMLElement;
  searchForm.style.display = 'none';

  // Replace main content with shared movie grid
  main.innerHTML = `
    <div class="shared-movie-grid">
      ${movies.map(movie => `
        <div class="shared-movie-card" data-movie-id="${movie.id}">
          <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}"
               alt="${movie.title}"
               class="shared-movie-image" />
          <div class="shared-movie-info">
            <h3 class="shared-movie-title">${movie.title}</h3>
            <p class="shared-movie-year">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>

            ${movie.rating > 0 ? `
              <div class="shared-movie-rating">
                <span class="shared-movie-stars">${'★'.repeat(movie.rating)}${'☆'.repeat(5 - movie.rating)}</span>
                <span>${movie.rating}/5</span>
              </div>
            ` : ''}

            ${movie.comment ? `
              <div class="shared-movie-comment">
                "${movie.comment}"
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add click handlers
  document.getElementById('back-home')!.addEventListener('click', () => {
    window.location.href = window.location.pathname;
  });

  document.querySelectorAll('.shared-movie-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const movieId = Number((e.currentTarget as HTMLElement).dataset.movieId);
      const movie = await getMovieDetails(movieId);
      showSharedMovieModal(movie);
    });
  });
}

function showSharedMovieModal(movie: any) {
  // Track recently viewed
  addRecentlyViewed(movie);
  renderRecentlyViewed();

  modal.innerHTML = `
    <div id="modal-content">
      <h2>${movie.title} (${movie.release_date?.split("-")[0] || ""})</h2>
      <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" />
      <p>${movie.overview}</p>
      <button id="add-to-my-list">Add to My List</button>
      <button id="close-shared-modal">Close</button>
    </div>
  `;
  modal.classList.remove("hidden");

  document
    .querySelector("#close-shared-modal")!
    .addEventListener("click", () => modal.classList.add("hidden"));

  document.querySelector("#add-to-my-list")!.addEventListener("click", () => {
    // Check if already in list
    const watched = getWatched();
    if (watched.includes(movie.id)) {
      showCustomAlert('Movie is already in your list!', 'warning');
      modal.classList.add("hidden");
      return;
    }

    showReviewDialog(movie);
  });
}

async function shareWatchedMovies() {
  const movies = getWatchedMovies();
  if (movies.length === 0) {
    showCustomAlert('Add some movies to your watched list first!', 'warning');
    return;
  }

  const savedName = getUserName();
  if (savedName) {
    // Use saved name directly
    shareWithName(savedName);
  } else {
    // Ask for name first time only
    showNameDialog();
  }
}

function showNameDialog() {
  const savedName = getUserName();

  if (savedName) {
    // Use saved name directly
    shareWithName(savedName);
    return;
  }

  // Ask for name first time
  modal.innerHTML = `
    <div class="dialog-content">
      <h3>What's your name?</h3>
      <p style="color: rgba(0, 0, 0, 0.7); margin-bottom: 1rem;">We'll remember this for future shares!</p>
      <input type="text" class="dialog-input" id="share-name" placeholder="Enter your name..." />
      <div class="dialog-buttons">
        <button class="dialog-btn dialog-btn-secondary" id="cancel-share">Cancel</button>
        <button class="dialog-btn dialog-btn-primary" id="confirm-share">Save & Share</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");

  const nameInput = document.getElementById('share-name') as HTMLInputElement;
  nameInput.focus();

  document.getElementById('cancel-share')!.addEventListener('click', () => {
    modal.classList.add("hidden");
  });

  document.getElementById('confirm-share')!.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = '#ff6b6b';
      return;
    }

    setUserName(name);
    modal.classList.add("hidden");
    shareWithName(name);
  });

  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('confirm-share')!.click();
    }
  });
}

async function shareWithName(name: string) {
  const movies = getWatchedMovies();
  const encoded = encodeWatchedMovies(name, movies);
  const shareUrl = `${window.location.origin}${window.location.pathname}?list=${encoded}`;

  try {
    await navigator.clipboard.writeText(shareUrl);
    showCustomAlert(`Share link copied to clipboard!`, 'success');
  } catch {
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showCustomAlert(`Share link copied to clipboard!`, 'success');
  }
}


function showCustomAlert(message: string, type: 'success' | 'warning' | 'error' = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'custom-alert';
  alertDiv.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: ${type === 'success' ? 'linear-gradient(45deg, #4ecdc4, #44a08d)' :
                type === 'warning' ? 'linear-gradient(45deg, #f093fb, #f5576c)' :
                'linear-gradient(45deg, #ff6b6b, #ffd93d)'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    z-index: 3000;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  `;
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

// Check for shared list on page load
const urlParams = new URLSearchParams(window.location.search);
const sharedList = urlParams.get('list');

if (sharedList) {
  const decoded = decodeWatchedMovies(sharedList);
  if (decoded) {
    sharedListOwner = decoded.name;
    setSharedMovies(decoded.movies);
  }
}

renderWatched();
renderRecentlyViewed();

// Load initial recommendations if no shared list
if (!sharedList) {
  loadRecommendations();
}

// Add My Movies link functionality
myMoviesLink.addEventListener('click', (e) => {
  e.preventDefault();
  const allWatchedMovies = getWatchedMovies();

  if (allWatchedMovies.length === 0) {
    showCustomAlert('You haven\'t watched any movies yet!', 'warning');
    return;
  }

  showAllWatchedMovies();
});

async function loadRecommendations() {
  const watchedMovies = getWatchedMovies();

  resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: rgba(0, 0, 0, 0.7);" class="loading">Finding movies you might like...</div>';

  try {
    let recommendedMovies: any[] = [];

    if (watchedMovies.length > 0) {
      // Get top 3 recommendations from last 3 watched movies
      const lastWatchedMovies = watchedMovies.slice(-3); // Get last 3 watched movies

      const promises = lastWatchedMovies.map(async (movie) => {
        try {
          const similar = await getSimilarMovies(movie.id);
          const recommended = await getRecommendedMovies(movie.id);

          // Get top 3 from each source
          const topSimilar = (similar.results || []).slice(0, 3);
          const topRecommended = (recommended.results || []).slice(0, 3);

          return [...topSimilar, ...topRecommended];
        } catch {
          return [];
        }
      });

      const allRecommendations = await Promise.all(promises);
      recommendedMovies = allRecommendations.flat();

      // Remove duplicates and movies already watched
      const watchedIds = new Set(watchedMovies.map(m => m.id));
      const uniqueMovies = new Map();

      recommendedMovies.forEach(movie => {
        if (!watchedIds.has(movie.id) && !uniqueMovies.has(movie.id)) {
          uniqueMovies.set(movie.id, movie);
        }
      });

      recommendedMovies = Array.from(uniqueMovies.values()).slice(0, 20);

      // If we have less than 15 movies, add some variety from popular/top-rated
      if (recommendedMovies.length < 15) {
        const popular = await getPopularMovies();
        const topRated = await getTopRatedMovies();

        const varietyMovies = [...(popular.results || []).slice(0, 10), ...(topRated.results || []).slice(0, 10)];
        const watchedSet = new Set([...watchedIds, ...recommendedMovies.map(m => m.id)]);
        const filteredVariety = varietyMovies.filter(movie => !watchedSet.has(movie.id));

        recommendedMovies = [...recommendedMovies, ...filteredVariety].slice(0, 20);
      }
    } else {
      // For new users, show mix of popular and top-rated
      const popular = await getPopularMovies();
      const topRated = await getTopRatedMovies();

      const mixed = [];
      const popResults = popular.results || [];
      const topResults = topRated.results || [];

      // Alternate between popular and top-rated
      for (let i = 0; i < 20 && (i < popResults.length || i < topResults.length); i++) {
        if (i < popResults.length) mixed.push(popResults[i]);
        if (i < topResults.length && mixed.length < 20) mixed.push(topResults[i]);
      }

      recommendedMovies = mixed.slice(0, 20);
    }

    if (recommendedMovies.length === 0) {
      resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: rgba(0, 0, 0, 0.7);">Start by searching for movies to get personalized recommendations!</div>';
    } else {
      const title = watchedMovies.length > 0 ? `Recommended Based on Your Last ${Math.min(watchedMovies.length, 3)} Movies` : 'Popular & Top Rated Movies';
      resultsDiv.innerHTML = '';
      renderResults(recommendedMovies, false);

      // Add subtitle below the movies
      resultsDiv.innerHTML += `
        <div style="text-align: center; margin-top: 2rem; color: rgba(0, 0, 0, 0.6); font-size: 0.9rem; font-weight: 400;">
          ${title}
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: rgba(255, 107, 107, 0.8);">⚠️ Unable to load recommendations. Try searching for movies!</div>';
  }
}
