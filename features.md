# JZ Films - Key Technical Features

## Core API Integration - `src/api.ts`
- **`request()`** - Generic HTTP client with Bearer token auth for TMDB API
- **`searchMovies()`** - Real-time movie search with query parameters
- **`getSimilarMovies()` & `getRecommendedMovies()`** - Powers intelligent recommendation engine

## State Management & Persistence - `src/app.ts`

## Recommendation Algorithm - `src/main.ts:loadRecommendations()`
- **Hybrid approach** - Combines TMDB similar/recommended APIs with popular/top-rated fallbacks
- **Personalization logic** - Uses last 3 watched movies as recommendation seeds
- **Deduplication** - Set-based filtering prevents showing already-watched content
- **Cold start handling** - New users get curated popular+top-rated movie mix

################################################################################################
## MVC Architecture 

### Model
- ** `src/app.ts`
- **`encodeWatchedMovies()` & `decodeWatchedMovies()`** - Base64 URL encoding for shareable movie lists
- **LRU Cache Implementation** - `addRecentlyViewed()` maintains 5-item cache with automatic eviction
- **localStorage Management** - Persistent user data across sessions without backend dependency
- **Data normalization** - Consistent movie object structure throughout app lifecycle

### Controller Functions (Handle logic, user interactions, state management):
- ** (`src/main.ts`)
- **`showModal(movie)`** - Controls modal display and "Add to Watched" interaction flow
- **`showReviewDialog(movie)`** - Manages star rating interactions and review submission logic
- **`showExpandedWatchedMovie(movieDetails, watchedMovie)`** - Coordinates detailed movie view with user data
- **`showAllWatchedMovies()`** - Manages page state transitions and navigation to full movie grid
- **`shareWatchedMovies()`** - Handles sharing workflow and clipboard operations
- **`showSharedMovieModal(movie)`** - Controls shared list movie interactions
- **`loadRecommendations()`** - Orchestrates recommendation algorithm and data fetching

### View Functions (DOM rendering and HTML generation):
- ** (`src/main.ts`)
- **`renderResults(movies, isRecommendations)`** - **MIXED** - Renders movie grid HTML but includes click handlers
- **`renderWatched()`** - **MIXED** - Generates watched movies sidebar HTML with embedded event handlers
- **`renderRecentlyViewed()`** - **MIXED** - Creates recent movies display with click interactions
- **`renderSharedMovieGrid(movies)`** - **MIXED** - Builds shared movie grid with embedded event logic


############################################################################################################


## Event Handlers (Controller Functions):

  - form.addEventListener("submit", async (e) => {...}) at main.ts:16 - Handles search form
   submissions
  - resultsDiv.addEventListener("click", async (e) => {...}) at main.ts:58 - Handles movie
  card clicks
  - myMoviesLink.addEventListener('click', (e) => {...}) at main.ts:808 - Handles "My
  Movies" navigation

############################################################################################################

## Future Optimizations
- **Event delegation** - Single listeners on parent containers vs individual card handlers
- **Lazy modal loading** - Content generated only when needed
- **Efficient array operations** - Slice/filter operations minimize memory usage
- **Image optimization** - TMDB CDN integration with multiple poster sizes (w92, w200, w300, w500)
