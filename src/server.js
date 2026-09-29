require("dotenv").config({ quiet: true });
const app = require("./app");
const server = app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () => {
  console.log(
    `Shitty Game is running at http://localhost:${server.address().port}`,
  );
});
server.on("error", (error) => {
  console.error(`Unable to start: ${error.message}`);
  process.exit(1);
});
