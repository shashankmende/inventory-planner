const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRouter = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
