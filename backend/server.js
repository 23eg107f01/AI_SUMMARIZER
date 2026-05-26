require('dotenv').config();

const { createApp } = require('./app');
const { connectChroma } = require('./db/chroma');

const app = createApp({ serveFrontendBuild: true });
const port = process.env.PORT || 3001;

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