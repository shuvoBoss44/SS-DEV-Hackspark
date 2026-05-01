require("dotenv").config({ path: "../.env" });
const express = require("express");
const productRoutes = require("./routes/product.routes");

const app = express();

app.use(express.json());


app.use("/rentals", productRoutes);

app.get('/status', (req, res) => res.status(200).json({ service: 'rental-service', status: 'OK' }));

app.listen((process.env.PORT || process.env.RENTAL_SERVICE_PORT || 3000), () => {
    console.log(`Rental Service is running on port ${(process.env.PORT || process.env.RENTAL_SERVICE_PORT || 3000)}`);
});
