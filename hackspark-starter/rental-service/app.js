require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();





app.listen(process.env.RENTAL_SERVICE_PORT, () => {
    console.log(`Rental Service is running on port ${process.env.RENTAL_SERVICE_PORT}`);
});