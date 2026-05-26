# AI Content Summarizer

## Setup

### 1. Clone the repo and install dependencies
cd backend && npm install
cd ../frontend && npm install

### 2. Configure environment
cp .env.example .env
Add your Groq API key to .env

Frontend API base URL defaults to an empty string in development, and the request paths already include `/api`. Vite proxies those requests to the backend. If you need a different backend address, create `frontend/.env` and set `VITE_API_BASE_URL`.

### 3. Get a Groq API key
Go to https://console.groq.com
Sign up and create an API key
Set `GROQ_API_KEY` in `.env`

### 4. Run the app
Terminal 1: cd backend && npm run dev
Terminal 2: cd frontend && npm run dev
Open http://localhost:5173 or the port Vite prints if 5173 is busy

If you want the frontend and backend on the same domain in production, build the frontend and let Express serve `frontend/dist`.

### Environment variables
- `GROQ_API_KEY` - required
- `GROQ_API_URL` - optional, defaults to Groq chat completions endpoint
- `GROQ_MODEL` - optional, defaults to `llama-3.1-8b-instant`
- `VITE_API_BASE_URL` - optional frontend backend URL override, defaults to empty

## Known Limitations
- PDF files that are scanned images cannot be parsed
- URL extraction may fail on paywalled sites
- Input is truncated at 80,000 characters
- Rate limited to 10 requests per minute
- Streaming requires a stable internet connection

## Deploy on Vercel

Use the repository root as the Vercel project root.

1. Import the GitHub repository into Vercel.
	- Keep the root directory as `./`.
	- Choose the Node preset.

2. Set environment variables in Vercel.
	- `GROQ_API_KEY` is required.
	- `GROQ_API_URL` is optional.
	- `GROQ_MODEL` is optional.
	- `ALLOWED_ORIGIN` should be your Vercel deployment URL if you want a strict CORS allowlist.
	- Add `CHROMA_API_KEY`, `CHROMA_TENANT`, and `CHROMA_DATABASE` only if you want persistence.

3. Deploy.
	- Vercel uses the root [package.json](../package.json) and [vercel.json](../vercel.json).
	- The frontend is built from `summarizer-app/frontend` into `summarizer-app/frontend/dist`.
	- The API is served from `/api/*` via the root [api/[...path].js](../api/%5B...path%5D.js).

4. Verify the deployment.
	- Open the Vercel URL.
	- Confirm `/api/health` returns JSON.
	- Try a summary and a comparison request from the UI.

## Deployment Notes
- The app is now a single Vite frontend plus a Node backend.
## Deploy on Vercel (root-first)

This repo is configured to deploy as a single project on Vercel: the Vite frontend is built from `summarizer-app/frontend` and the Node backend is exposed via serverless functions under `/api/*`.

Quick checklist (what Vercel should see):
- Root: repository root (keep `./` selected when importing).
- Preset: Node (do NOT select Python/Streamlit).
- Build command: `npm run build` (root `package.json` defines it).
- Output directory: `summarizer-app/frontend/dist` (also set in `vercel.json`).

Environment variables (add in Project Settings → Environment Variables):
- `GROQ_API_KEY` — required
- `GROQ_MODEL` — optional (override model)
- `GROQ_API_URL` — optional (custom Groq endpoint)
- `ALLOWED_ORIGIN` — optional (set to your Vercel URL to restrict CORS)
- `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE` — optional (only if you use ChromaDB persistence)

Deploy steps (summary):
1. Push your repo to GitHub.
2. In Vercel, import the repository and choose the repository root (`./`).
3. Confirm the build command is `npm run build` and the output directory is `summarizer-app/frontend/dist`.
4. Add the environment variables listed above.
5. Deploy and verify `/api/health` and the UI.

Local development commands

Install dependencies at repo root (hoisted workspace):

```
npm install
```

Run backend and frontend locally (two terminals):

```
# Terminal 1 - backend
npm --prefix summarizer-app/backend run dev

# Terminal 2 - frontend
npm --prefix summarizer-app/frontend run dev
```

Run production build locally (root) and run a local check of the API entrypoint:

```
# Build frontend and copy SPA fallback
npm run build

# Quick sanity check for API wrapper (node must be installed)
node -e "require('./api/[...path]'); console.log('api loaded')"
```

Notes and caveats
- Vercel serverless functions may impose execution time limits on long-lived SSE. The Node backend is currently designed to stream SSE responses — if you hit platform limits, you may need to host the backend on a service that supports long-lived connections (Render, Fly, Railway, or a small VPS) and keep the frontend on Vercel.
- The Streamlit-based deployment path has been removed from this repo to avoid Vercel auto-detection as Python.
5. Deploy on a platform that supports a build step.
	- Build command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
	- Start command: `cd backend && npm start`

6. Test the deployment.
	- Open the root URL in a browser.
	- Confirm `/api/health` returns JSON.
	- Submit a summary request from the UI.
