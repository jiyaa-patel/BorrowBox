// Vercel entry point. Vercel looks for index.js / app.js / server.js at the project root (or in src/)
// and needs the Express app exported from it. The app itself lives in server/app.js.
require('dotenv').config(); // no-op on Vercel (no .env file there); loads .env if you run `node index.js` locally
const express = require('express'); // eslint-disable-line no-unused-vars -- Vercel detects Express from this import
const app = require('./server/app');

module.exports = app;
