const mongoose = require('mongoose');

module.exports = () => {
  mongoose.connect(process.env.MONGO_URI, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('MongoDB successfully connected to server.');
    })
    .catch(() => {
      // eslint-disable-next-line no-console
      console.log('MongoDB server couldn\'t connect!');
    });
};
