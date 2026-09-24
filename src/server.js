const express = require('express');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Codebox!');
});

const server = app.listen(port, (error) => {
  if (error) return;
  console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exit(1);
});
