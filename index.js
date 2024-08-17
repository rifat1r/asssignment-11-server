const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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

//middleware
const varifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log("token is not valid");
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const roomsCollection = client
      .db("hotelBooking")
      .collection("roomsCollection5");
    const bookingsCollection = client.db("hotelBooking").collection("bookings");
    const reviewsCollection = client.db("hotelBooking").collection("reviews");
    const ratingsCollection = client.db("hotelBooking").collection("ratings");

    //auth related
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.get("/rooms", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("pagenation query", page, size);
      const result = await roomsCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });
    app.get("/api/rooms", async (req, res) => {
      const { min, max } = req.query;

      const result = await roomsCollection
        .find({
          pricePerNight: { $gte: parseInt(min), $lte: parseInt(max) },
        })
        .toArray();
      res.json(result);
    });

    app.get("/roomsCount", async (req, res) => {
      const count = await roomsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/room/:id", async (req, res) => {
      const id = req.params.id;
      console.log("/single room here", id);
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

    app.get("/allBookings", varifyToken, async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });
    app.get("/bookings", varifyToken, async (req, res) => {
      console.log("Cookies:", req.cookies);

      if (req.user?.email !== req.query?.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

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
