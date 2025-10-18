require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRouter = require('./routes/api');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static front-end (change '../src' to your public folder if different)
app.use(express.static(path.join(__dirname, '../src')));

// mount API routes under /api
app.use('/api', apiRouter);

// explicit root route to index.html (SPA fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

// simple health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));