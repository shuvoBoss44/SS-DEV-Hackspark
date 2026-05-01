require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();





app.listen(process.env.ANALYTICS_SERVICE_PORT, () => {
    console.log(`Analytics Service is running on port ${process.env.ANALYTICS_SERVICE_PORT}`);
});
