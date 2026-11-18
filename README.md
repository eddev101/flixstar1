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

## Cross-device sync (accounts)
Lists, Continue Watching, watched titles and settings sync across devices for signed-in users.
Sign-in is passwordless: users enter their email and receive a 6-digit code / magic link.

1. Create a free project at https://supabase.com.
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Authentication → URL Configuration**, set Site URL to `https://flixstar-smoky.vercel.app` and add it to Redirect URLs.
4. (Recommended) In **Authentication → Email Templates → Magic Link**, add `{{ .Token }}` so the email shows the 6-digit code as well as the link.
5. In **Vercel → Project → Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` (Project Settings → API → Project URL)
   - `VITE_SUPABASE_ANON_KEY` (Project Settings → API → anon public key)
6. Redeploy. Without these vars the site works exactly as before (device-only storage).

## IMDb episode ratings
The API route `/api/tv/:id/imdb-ratings` uses the show's IMDb id (from TMDB) to fetch real IMDb ratings.
Set `OMDB_API_KEY` on the API server (free key: https://www.omdbapi.com/apikey.aspx). Without a key it falls back
to a free no-key IMDb source, and finally to TMDB scores.

## Resume playback
Servers that accept a start time in the embed URL (currently Videasy, Vidplus, Vidlink, Vidfast) open at the saved
position. Add more in `RESUME_PARAMS` in `client/src/main.jsx`.
