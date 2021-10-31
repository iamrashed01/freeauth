const express = require('express');
require('express-async-errors');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// utils
const { errorSend } = require('./utils/responseSender');

const connectDB = require('./db/connectDB');

// create applications
const app = express(); // main application

// middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('welcome to freeauth!');
});

// routes
app.get('/api', (req, res) => {
  res.send('welcome to freeauth!');
});
app.use('/api/auth', require('./routers/auth'));
app.use('/api/profile', require('./routers/user'));

app.use((err, req, res, next) => {
  if (err.message === 'access denied') {
    errorSend(res, 403, err.message);
  } else if (err.message) {
    errorSend(res, 500, err.message);
  }

  next(err);
});

// app listener
const port = process.env.PORT || 5000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Listening server on PORT:${port}`);
  connectDB();
});
