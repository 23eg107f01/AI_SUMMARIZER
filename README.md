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

## Deploy on Streamlit Cloud

1. Deploy the backend first.
	- Use any Node.js host that supports long-lived SSE responses, such as Render, Railway, Fly.io, or a small VPS.
	- Set `GROQ_API_KEY` in the backend environment.
	- Set `ALLOWED_ORIGIN` to your Streamlit app URL after the Streamlit app is deployed.

2. Make sure the backend is reachable from the public internet.
	- Confirm the backend health endpoint works, for example `https://your-backend.example.com/health`.
	- Confirm `/api/summarize` accepts POST requests from the browser.

3. Deploy the Streamlit app.
	- Push this repo to GitHub.
	- In Streamlit Community Cloud, choose the repository and set the app file path to `streamlit_app.py`.
	- Ensure `requirements.txt` is at the repo root so Streamlit installs `streamlit` and `requests`.

4. Configure the backend URL for Streamlit.
	- In Streamlit Cloud secrets, add `BACKEND_URL = "https://your-backend.example.com"`.
	- You can also set `BACKEND_URL` as an environment variable if you are running Streamlit elsewhere.

5. Add backend CORS access.
	- Set `ALLOWED_ORIGIN` on the backend to your Streamlit Cloud app URL.
	- Redeploy the backend after updating the origin.

6. Test the deployed app.
	- Open the Streamlit URL.
	- Paste text, choose the summary options, and click Summarize.
	- If the request fails, verify the backend URL and the backend logs first.

## Deployment Notes
- The Streamlit app is only the frontend shell; the summarization logic still runs in the backend.
- The backend must stay online for the Streamlit app to work.

## Deploy Frontend and Backend Together

Use this when you want one public URL for the whole app.

1. Build the frontend.
	- From `frontend`, run `npm install` and `npm run build`.
	- This creates `frontend/dist`.

2. Start the backend as the public app server.
	- Run `cd backend && npm start`.
	- In production, the backend now serves the React build from `frontend/dist`.

3. Use the same domain for the UI and API.
	- Frontend loads from `/`.
	- API routes stay under `/api/*`.
	- Health checks are available at `/health` and `/api/health`.

4. Set production environment variables.
	- `GROQ_API_KEY` is required.
	- `ALLOWED_ORIGIN` can be your public app URL, or you can leave it unset if the frontend and backend are truly the same origin.
	- If you are using ChromaDB, set `CHROMA_API_KEY`, `CHROMA_TENANT`, and `CHROMA_DATABASE`.

5. Deploy on a platform that supports a build step.
	- Build command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
	- Start command: `cd backend && npm start`

6. Test the deployment.
	- Open the root URL in a browser.
	- Confirm `/api/health` returns JSON.
	- Submit a summary request from the UI.
