require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();

const analyticsRoutes = require('./routes/analytics.routes');

app.use('/analytics', analyticsRoutes);

app.get('/status', (req, res) => {
    res.status(200).json({ service: 'analytics-service', status: 'OK' });
});

app.listen((process.env.PORT || process.env.ANALYTICS_SERVICE_PORT || 3000), () => {
    console.log(`Analytics Service is running on port ${(process.env.PORT || process.env.ANALYTICS_SERVICE_PORT || 3000)}`);
});
