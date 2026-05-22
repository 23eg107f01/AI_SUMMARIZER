require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const summarizeRoute = require('./routes/summarize');
const compareRoute = require('./routes/compare');
const extractUrlRoute = require('./routes/extractUrl');
const parseFileRoute = require('./routes/parseFile');
const rateLimit = require('./middleware/rateLimit');
const { connectChroma, getChromaClient } = require('./db/chroma');

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigin = process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : true;
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(rateLimit);

app.get(['/health', '/api/health'], async (req, res) => {
  const client = getChromaClient();
  if (!client) {
    return res.json({ ok: true, chromaConnected: false });
  }

  try {
    await client.heartbeat();
    return res.json({ ok: true, chromaConnected: true });
  } catch (err) {
    return res.json({ ok: true, chromaConnected: false, error: err.message });
  }
});

app.use(summarizeRoute);
app.use(compareRoute);
app.use(extractUrlRoute);
app.use(parseFileRoute);

if (process.env.NODE_ENV === 'production' && hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
}

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File must be 5MB or smaller.' });
  }

  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

async function startServer() {
  const hasChromaConfig = process.env.CHROMA_API_KEY && process.env.CHROMA_TENANT && process.env.CHROMA_DATABASE;

  if (hasChromaConfig) {
    try {
      await connectChroma();
      console.log('ChromaDB connection established.');
    } catch (error) {
      console.warn('Failed to connect to ChromaDB:', error.message || error);
      console.warn('Starting backend without ChromaDB so the app remains available.');
    }
  } else {
    console.log('CHROMA_API_KEY, CHROMA_TENANT, or CHROMA_DATABASE not set; starting without ChromaDB connection.');
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();