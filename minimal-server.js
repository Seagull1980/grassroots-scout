const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ok: true});
});

app.listen(3002, () => {
  console.log('Server on 3002');
});