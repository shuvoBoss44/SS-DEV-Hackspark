const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config({ path: "../.env" });

// Try loading userRoutes, but wrap in try-catch in case the file doesn't exist yet
let userRoutes;
try {
  userRoutes = require('./routes/userRoutes');
} catch (e) {
  // Mock router if the file hasn't been created yet locally
  userRoutes = express.Router();
}

const app = express();
app.use(express.json()); // Parse JSON bodies

// P1 Health Check
app.get('/status', (req, res) => {
  res.json({ service: 'user-service', status: 'OK' });
});

// Mount Routes
app.use('/users', userRoutes);

// Connect to MongoDB
const PORT = process.env.PORT || process.env.USER_SERVICE_PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('User Service connected to MongoDB');
      app.listen(PORT, () => {
        console.log(`User Service is running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
} else {
  // Fallback if no DB configured yet
  app.listen(PORT, () => {
    console.log(`User Service is running on port ${PORT} (No DB)`);
  });
}