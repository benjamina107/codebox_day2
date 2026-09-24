function errorHandler(error, req, res, next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.error(error.message);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
