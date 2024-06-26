const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
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
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());

// token verify middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) return res.status(401).send({ message: 'unauthorized access' });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' });
      }

      req.user = decoded;
      next();
    });
  }
};

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
    const reviewCollection = client.db('dream-stay').collection('reviews');

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });

    // create jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '30d',
      });

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    // clear token on logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true });
    });

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

    // update room availability
    app.patch('/rooms/:_id', verifyToken, async (req, res) => {
      const id = req.params._id;
      const { booking } = req.body;
      const query = { _id: new ObjectId(id) };

      if (booking) {
        const updateDoc = {
          $set: {
            available: false,
          },
        };
        const result = await roomCollection.updateOne(query, updateDoc);
        res.send(result);
      } else {
        const updateDoc = {
          $set: {
            available: true,
          },
        };
        const result = await roomCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    });

    // post booking data
    app.post('/bookings', verifyToken, async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // get bookings data
    app.get('/bookings/:email', verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = {
        email: email,
      };
      const result = await bookingCollection.find(query).toArray();

      res.send(result);
    });

    // update bookings data
    app.patch('/bookings/:_id', verifyToken, async (req, res) => {
      const id = req.params._id;
      const { dateString } = req.body;
      const updateDoc = {
        $set: {
          date: dateString,
        },
      };
      const query = { _id: new ObjectId(id) };

      const result = await bookingCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // delete booking
    app.delete('/bookings/:_id', verifyToken, async (req, res) => {
      const id = req.params._id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // post review
    app.post('/reviews', verifyToken, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // get reviews
    app.get('/reviews/', async (req, res) => {
      const result = await reviewCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // get reviews for room
    app.get('/reviews/:_id', async (req, res) => {
      const id = req.params._id;
      const query = {
        roomId: id,
      };
      const result = await reviewCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();

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
