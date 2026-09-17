# Flixstar

A from-scratch movie & TV discovery website inspired by the structure of modern streaming catalogs. It uses TMDB for metadata and images. It does **not** scrape or embed unauthorized movie/TV streams.

## Stack
- React + Vite frontend
- Node + Express API
- TMDB metadata/images
- Responsive desktop/mobile UI

## Run locally
1. Install Node.js 20+.
2. In `server/`, copy `.env.example` to `.env` and add your TMDB API key.
3. From the project root: `npm install`
4. Run: `npm run dev`
5. Open `http://localhost:5173`

## Production
Build the client with `npm run build`. Serve `client/dist` with your preferred host and run the Express API separately, or configure Vite to proxy `/api` to your API domain.

## Next build targets
- Full genre pages and filters
- Dedicated movie/TV pagination
- Watchlist and accounts
- Continue watching
- Licensed playback integration
- SEO metadata and sitemap
- PWA/mobile install support
- Admin dashboard
