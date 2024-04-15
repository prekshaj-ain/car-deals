import { MongoClient, ServerApiVersion } from "mongodb";
import { DB_NAME } from "../constants.js";
import { MONGODB_URI } from "../config/server.config.js";

const uri = `${MONGODB_URI}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let dbConnection;
export async function connectDB() {
  try {
    await client.connect();

    // Send a ping to confirm a successful connection (optional but recommended)
    const database = client.db(DB_NAME);
    await database.command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    dbConnection = database;
  } catch (error) {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

export const getDB = () => {
  return dbConnection;
};
