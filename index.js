const express = require('express');
const cors = require('cors');

//config
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Dream Stay Server Is Running');
});

app.listen(port, () => {
  console.log(`Dream Stay Server Is Running at ${port}`);
});
