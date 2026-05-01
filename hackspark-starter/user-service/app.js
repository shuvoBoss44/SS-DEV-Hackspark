require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();





app.listen(process.env.USER_SERVICE_PORT, () => {
    console.log(`User Service is running on port ${process.env.USER_SERVICE_PORT}`);
});
