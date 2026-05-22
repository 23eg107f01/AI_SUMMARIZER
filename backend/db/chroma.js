const chromadb = require('chromadb');

let client;
let clientPromise;
let summaryCollectionPromise;

const SUMMARY_COLLECTION_NAME = process.env.CHROMA_SUMMARY_COLLECTION || 'ai_summarizer_summaries';

function getChromaConfig() {
  const apiKey = process.env.CHROMA_API_KEY || '';
  const tenant = process.env.CHROMA_TENANT || '';
  const database = process.env.CHROMA_DATABASE || '';

  return {
    apiKey,
    tenant,
    database,
    host: process.env.CHROMA_HOST || 'api.trychroma.com',
    port: Number(process.env.CHROMA_PORT || 443),
    ssl: process.env.CHROMA_SSL ? process.env.CHROMA_SSL !== 'false' : true,
  };
}

function hasChromaConfig() {
  const { apiKey, tenant, database } = getChromaConfig();
  return Boolean(apiKey && tenant && database);
}

async function connectChroma() {
  if (!hasChromaConfig()) {
    return null;
  }

  if (clientPromise) {
    return clientPromise;
  }

  const config = getChromaConfig();
  client = new chromadb.CloudClient({
    apiKey: config.apiKey,
    host: config.host,
    port: config.port,
    tenant: config.tenant,
    database: config.database,
    fetchOptions: {},
  });

  clientPromise = client.heartbeat().then(() => client).catch((error) => {
    console.warn('Initial ChromaDB connect failed:', error && error.message ? error.message : error);
    client = undefined;
    clientPromise = undefined;
    throw error;
  });

  return clientPromise;
}

function getChromaClient() {
  return client;
}

async function getSummaryCollection() {
  await connectChroma();

  if (summaryCollectionPromise) {
    return summaryCollectionPromise;
  }

  summaryCollectionPromise = client.getOrCreateCollection({
    name: SUMMARY_COLLECTION_NAME,
  });

  return summaryCollectionPromise;
}

async function storeSummaryRecord({ id, document, metadata }) {
  const collection = await getSummaryCollection();

  await collection.upsert({
    ids: [id],
    documents: [document],
    metadatas: [metadata],
  });
}

async function closeChroma() {
  if (client && typeof client.close === 'function') {
    await client.close();
  }

  client = undefined;
  clientPromise = undefined;
  summaryCollectionPromise = undefined;
}

module.exports = {
  connectChroma,
  getChromaClient,
  getSummaryCollection,
  storeSummaryRecord,
  closeChroma,
};