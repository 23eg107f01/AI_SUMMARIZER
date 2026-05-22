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

## Deployment Notes
- Deploy the frontend folder to Vercel as a Vite app.
- Deploy the backend folder to any Node.js host that supports long-lived SSE responses.
- Set `ALLOWED_ORIGIN` in production to your deployed frontend URL.
