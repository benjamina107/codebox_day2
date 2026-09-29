function errorHandler(error, req, res, next) {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (error.type === "entity.too.large")
    return res.status(413).json({ error: "This save is too large." });
  console.error(error.message);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
