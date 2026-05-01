require("dotenv").config({ path: "../.env" });
const express = require("express");

const app = express();





app.listen(process.env.AGENTIC_SERVICE_PORT, () => {
    console.log(`Agentic Service is running on port ${process.env.AGENTIC_SERVICE_PORT}`);
});
