const serverless = require('serverless-http');
const { createApp } = require('../backend/app');

const app = createApp({ serveFrontendBuild: false });

module.exports = serverless(app);