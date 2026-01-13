const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 3003;

// Middleware
// app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'test get' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});