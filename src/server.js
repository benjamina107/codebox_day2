require('dotenv').config({ quiet: true });
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const meRouter = require('./routes/me');
const rootRouter = require('./routes/root');
const usersRouter = require('./routes/users');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use('/', rootRouter);
app.use('/api/health', healthRouter);
app.use('/api/users', usersRouter);
app.use('/api/me', meRouter);

app.use(errorHandler);

const server = app.listen(port, (error) => {
  if (error) return;
  console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exit(1);
});
