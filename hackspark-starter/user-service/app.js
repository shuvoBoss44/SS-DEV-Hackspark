const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config({ path: "../.env" });

const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(express.json()); // Parse JSON bodies

// P1 Health Check
app.get('/status', (req, res) => {
  res.json({ service: 'user-service', status: 'OK' });
});

// Mount Routes
app.use('/users', userRoutes);

// Connect to MongoDB Atlas
const PORT = process.env.PORT || 8001;
const MONGO_ATLAS_URI = process.env.MONGO_ATLAS_URI;

mongoose.connect(MONGO_ATLAS_URI)
  .then(() => {
    console.log('User Service connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`User Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });