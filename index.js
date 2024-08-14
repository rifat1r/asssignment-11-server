const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());

const uri =
  "mongodb+srv://hotelBooking:guFER2WYYmLV19HU@cluster0.qfdpmw3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const roomsCollection = client
      .db("hotelBooking")
      .collection("roomsCollection2");
    const bookingsCollection = client.db("hotelBooking").collection("bookings");
    const reviewsCollection = client.db("hotelBooking").collection("reviews");

    //auth related
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "none",
        })
        .send({ succeess: true });
    });

    app.get("/rooms", async (req, res) => {
      const result = await roomsCollection.find().toArray();
      res.send(result);
    });

    app.get("/room/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // console.log("posting", booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      // console.log(req.query?.email);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // console.log(`Attempting to delete booking with ID: ${id}`);
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDate = req.body;
      // console.log(`New Check-In Date: ${updatedDate.checkIn}`);
      // console.log("id", id);
      const updatedDoc = {
        $set: {
          checkIn: updatedDate.checkIn,
        },
      };
      // console.log(updatedDoc);
      const result = await bookingsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    //reviews
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      // console.log("review cooming ==>", review);
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      let query = {};
      if (req.query?.id) {
        query = {
          roomId: req.query.id,
        };
      }
      // console.log(query);
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port);
