require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;
const N2YO_BASE = "https://api.n2yo.com/rest/v1/satellite";

app.use(express.static("public"));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function apiKey() {
  return `&apiKey=${process.env.N2YO_API_KEY}`;
}

// Satellites currently above a location
app.get("/api/above", async (req, res) => {
  try {
    const { lat = 0, lng = 0, alt = 0, radius = 90, category = 0 } = req.query;
    const response = await axios.get(
      `${N2YO_BASE}/above/${lat}/${lng}/${alt}/${radius}/${category}${apiKey()}`
    );
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching satellites above:", err.message);
    res.status(500).json({ error: "Failed to fetch satellites above" });
  }
});

// Satellite position(s) for live tracking and predicted path
app.get("/api/satellite/:noradId/position", async (req, res) => {
  try {
    const { noradId } = req.params;
    const { lat = 0, lng = 0, alt = 0, seconds = 1 } = req.query;
    const response = await axios.get(
      `${N2YO_BASE}/positions/${noradId}/${lat}/${lng}/${alt}/${seconds}${apiKey()}`
    );
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching satellite position:", err.message);
    res.status(500).json({ error: "Failed to fetch satellite position" });
  }
});

// Upcoming visual passes
app.get("/api/satellite/:noradId/passes", async (req, res) => {
  try {
    const { noradId } = req.params;
    const { lat = 0, lng = 0, alt = 0, days = 10, minVisibility = 300 } = req.query;
    const response = await axios.get(
      `${N2YO_BASE}/visualpasses/${noradId}/${lat}/${lng}/${alt}/${days}/${minVisibility}${apiKey()}`
    );
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching visual passes:", err.message);
    res.status(500).json({ error: "Failed to fetch visual passes" });
  }
});

// TLE data — also provides satellite name
app.get("/api/satellite/:noradId", async (req, res) => {
  try {
    const { noradId } = req.params;
    const response = await axios.get(
      `${N2YO_BASE}/tle/${noradId}${apiKey()}`
    );
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching satellite data:", err.message);
    res.status(500).json({ error: "Failed to fetch satellite data" });
  }
});

// Page routes
app.get("/satellite/:noradId", (req, res) => {
  res.sendFile(__dirname + "/public/satellite.html");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
