require("dotenv").config();
const dns = require("node:dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
const connectDB = async () => {

    try {

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

    } catch (error) {

        console.error("MongoDB connection error:", error.message);

    }
};

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const userRoutes = require("./routes/users");
const offeringRoutes = require("./routes/offerings");
const studentRoutes = require("./routes/students");
const registrationRoutes = require("./routes/registrations");

const app = express();
const PORT = 3000;

connectDB();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.redirect("http://localhost:5173");
});

app.use("/api/students", studentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/users", userRoutes);
app.use("/api/offerings", offeringRoutes);
app.use("/api/registrations", registrationRoutes);

    app.use((req, res) => {
        res.status(404).json({ error: "Route not found" });
    });

    app.listen(PORT, () => {
        console.log(`Running on http://localhost:${PORT}`);
    });