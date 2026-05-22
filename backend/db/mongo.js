const { MongoClient } = require('mongodb');
const dns = require('dns').promises;
const { URL } = require('url');

let client;
let clientPromise;

function getMongoUri() {
  return process.env.MONGODB_URI || '';
}

function getMongoOptions() {
  return {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
    minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 30000),
  };
}

async function connectMongo() {
  const uri = getMongoUri();

  if (!uri) {
    return null;
  }

  if (clientPromise) {
    return clientPromise;
  }

  client = new MongoClient(uri, getMongoOptions());
  clientPromise = client.connect().then(() => client).catch(async (error) => {
    console.warn('Initial MongoClient connect failed:', (error && error.message) ? error.message : error);
    const msg = (error && error.message) ? error.message : '';

    if (uri.startsWith('mongodb+srv://') && (msg.includes('querySrv') || msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN'))) {
      try {
        // parse userinfo and host from the mongodb+srv URI
        const withoutScheme = uri.replace('mongodb+srv://', 'http://');
        const u = new URL(withoutScheme);
        const username = decodeURIComponent(u.username || '');
        const password = decodeURIComponent(u.password || '');
        const srvHost = u.hostname;
        const originalQuery = u.search ? u.search.slice(1) : '';

        console.log('Attempting manual SRV resolution for', srvHost);
        const records = await dns.resolveSrv(`_mongodb._tcp.${srvHost}`);
        const hosts = records.map(r => `${r.name}:${r.port}`).join(',');
        console.log('SRV records resolved, hosts:', hosts);

        // build a TLS-enabled mongodb:// URI
        const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
        const queryParams = new URLSearchParams(originalQuery);
        if (!queryParams.has('tls') && !queryParams.has('ssl')) {
          queryParams.set('tls', 'true');
        }
        const fallbackUri = `mongodb://${authPart}${hosts}/?${queryParams.toString()}`;

        client = new MongoClient(fallbackUri, getMongoOptions());
        await client.connect();
        clientPromise = Promise.resolve(client);
        console.log('MongoDB connected via fallback URI (hosts only shown)');
        return client;
      } catch (e2) {
        console.warn('Fallback Mongo connection failed:', (e2 && e2.message) ? e2.message : e2);
        client = undefined;
        clientPromise = undefined;
        throw e2;
      }
    }

    client = undefined;
    clientPromise = undefined;
    throw error;
  });

  return clientPromise;
}

function getMongoClient() {
  return client;
}

function getMongoDb(dbName) {
  if (!client) {
    return null;
  }

  return client.db(dbName || process.env.MONGODB_DB_NAME || undefined);
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = undefined;
    clientPromise = undefined;
  }
}

module.exports = {
  connectMongo,
  getMongoClient,
  getMongoDb,
  closeMongo,
};
