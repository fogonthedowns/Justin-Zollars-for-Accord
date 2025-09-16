# JZ Films

A very simple movie discovery app with personal tracking and sharing capabilities.

## Depled to AWS S3 with Cloudfront:

- deployed with two simple commands:

   1. aws s3 sync ./ s3://jz.io/ --acl public-read --exclude ".git/*"
   2. aws cloudfront create-invalidation --distribution-id E9KIROWWL1OJ2 --paths "/*"

## Design Decisions
- **Very simple single page app**
  - done in 2 hours

- **Local Storage Keys**:
  - `watched` - array of movie IDs (numbers)
  - `watchedMovies` - full movie objects with ratings/comments
  - `userName` - string for sharing
  - `recentlyViewed` - 5-item LRU cache of movie objects

- **LRU Cache**: Recently viewed movies use a 5-item LRU cache because users care about what they just looked at, not everything they've ever clicked.

- **Share Algorithm**: Base64 encode movie data with shortened keys (`i` for id, `t` for title, etc.) to keep URLs manageable. URL-safe characters only.

- **Never Show a Blank Screen**:
  - New users see popular + top-rated movies mixed together
  - Existing users get recommendations from their last 3 watched movies
  - Search results fall back to recommendations when cleared

- **TMDB APIs Hit**:
  - `/search/movie` - text search
  - `/movie/{id}` - movie details
  - `/movie/{id}/similar` - similar movies for recommendations
  - `/movie/{id}/recommendations` - TMDB's recommended movies
  - `/movie/popular` - popular movies for new users
  - `/movie/top_rated` - top rated movies for variety

- **Recommendations**: Pull similar + recommended from TMDB for each of the user's last 3 watched films (top 3 from each endpoint), dedupe against watched list, backfill with popular/top-rated if needed. Gives variety without being random.


## Tradeoffs

- **API Key Exposure**: TMDB key visible in client code (read-only, but still exposed)
- **No Real Persistence**: localStorage only - data lost if browser cache cleared, no backup/restore
- **Fast Development**: Moved quickly, likely cross-browser compatibility issues and edge case bugs
- **No Caching Layer**: No Redis/memcache - excessive API calls to TMDB, could hit rate limits
- **Client-Side Only**: No SSR, SEO unfriendly, slower initial loads
- **No Error Handling**: No retry logic, offline detection, or graceful API failure handling
- **No Search Optimization**: No debouncing - hits API on every keystroke
- **URL Length**: Share URLs get very long with many movies and reviews
- **No Testing**: No unit tests, integration tests, or automated QA
- **No Internationalization**: Hard-coded English strings, no multi-language support
