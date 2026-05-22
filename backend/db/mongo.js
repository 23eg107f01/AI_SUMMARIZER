const { MongoClient } = require('mongodb');

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
  clientPromise = client.connect().then(() => client);

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