require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();





app.listen(process.env.GATEWAY_PORT, () => {
    console.log(`API Gateway is running on port ${process.env.GATEWAY_PORT}`);
});
