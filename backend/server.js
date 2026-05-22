require('dotenv').config();

const express = require('express');
const cors = require('cors');
const summarizeRoute = require('./routes/summarize');
const compareRoute = require('./routes/compare');
const extractUrlRoute = require('./routes/extractUrl');
const parseFileRoute = require('./routes/parseFile');
const rateLimit = require('./middleware/rateLimit');

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigin = process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : true;

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(rateLimit);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use(summarizeRoute);
app.use(compareRoute);
app.use(extractUrlRoute);
app.use(parseFileRoute);

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File must be 5MB or smaller.' });
  }

  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});