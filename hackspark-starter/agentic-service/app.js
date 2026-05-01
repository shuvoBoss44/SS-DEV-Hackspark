require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();
app.use(express.json());

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));


const chatRoutes = require('./routes/chat.routes');
// The README strictly requires POST /chat
app.use('/chat', chatRoutes);

// Health check for Docker/Gateway
app.get('/status', (req, res) => {
    res.json({ service: 'agentic-service', status: 'OK' });
});

app.listen(process.env.AGENTIC_SERVICE_PORT || 8004, () => {
    console.log(`Agentic Service is running on port ${process.env.AGENTIC_SERVICE_PORT || 8004}`);
});
