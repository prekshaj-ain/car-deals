import app from "./app.js";
import { connectDB } from "./db/index.js";
import { PORT } from "./config/server.config.js";

const setupServer = () => {
  app.listen(PORT || 8080, () => {
    console.log(`Server is listening on port : ${PORT || 8080}`);
  });
};

connectDB()
  .then(() => {
    setupServer();
  })
  .catch((err) => {
    console.log("Mongo db connect error: ", err);
  });
