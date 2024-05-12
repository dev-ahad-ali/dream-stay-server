const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//config
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://dream-stay-indev.web.app',
      'https://dream-stay-indev.firebaseapp.com',
    ],
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rocppxe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const roomCollection = client.db('dream-stay').collection('rooms');
    const bookingCollection = client.db('dream-stay').collection('booking');

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });

    // get all rooms data with price filter
    app.get('/rooms', async (req, res) => {
      const minPrice = parseInt(req.query.minRange);
      const maxPrice = parseInt(req.query.maxRange);

      const query = {
        price: {
          $gte: minPrice,
          $lte: maxPrice,
        },
      };

      if (maxPrice > 0 || minPrice > 0) {
        const result = await roomCollection.find(query).toArray();
        return res.send(result);
      }

      const result = await roomCollection.find().toArray();
      res.send(result);
    });

    // get single room data
    app.get('/rooms/:_id', async (req, res) => {
      const id = req.params._id;
      const query = { _id: new ObjectId(id) };
      const result = await roomCollection.findOne(query);

      res.send(result);
    });

    // post booking data
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Dream Stay Server Is Running');
});

app.listen(port, () => {
  console.log(`Dream Stay Server Is Running at ${port}`);
});
