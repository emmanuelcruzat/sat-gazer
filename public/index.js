let map;
let tileLayer;
let markers = [];
let userLat = 0;
let userLng = 0;

const TILE_URLS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

function initMap() {
  map = L.map("map", { worldCopyJump: true }).setView([20, 0], 2);
  tileLayer = L.tileLayer(TILE_URLS[currentTheme()], {
    attribution: TILE_ATTR,
    subdomains: "abcd",
    maxZoom: 19,
  });
  tileLayer.addTo(map);

  window.addEventListener("satgazer-theme-change", (e) => {
    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(TILE_URLS[e.detail], {
      attribution: TILE_ATTR,
      subdomains: "abcd",
      maxZoom: 19,
    });
    tileLayer.addTo(map);
  });
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

function addSatMarker(sat) {
  const m = L.circleMarker([sat.satlat, sat.satlng], {
    radius: 5,
    fillColor: "#29b6f6",
    color: "#29b6f6",
    weight: 1,
    opacity: 0.9,
    fillOpacity: 0.65,
  })
    .bindPopup(
      `<strong>${sat.satname}</strong><br>` +
        `NORAD: ${sat.satid}<br>` +
        `Alt: ${sat.satalt.toFixed(1)} km<br>` +
        `<a href="/satellite/${sat.satid}">View details →</a>`
    )
    .addTo(map);
  markers.push(m);
}

async function fetchSatellites() {
  const tbody = document.getElementById("sat-tbody");
  const satCount = document.getElementById("sat-count");
  const category = document.getElementById("category-select").value;
  const radius = document.getElementById("radius-input").value;

  tbody.innerHTML = `<tr><td colspan="6" class="cell-loading"><div class="spinner"></div>Loading satellites...</td></tr>`;
  satCount.textContent = "";
  clearMarkers();

  try {
    const res = await fetch(
      `/api/above?lat=${userLat}&lng=${userLng}&alt=0&radius=${radius}&category=${category}`
    );
    const data = await res.json();

    if (data.error) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-error">API error: ${data.error}</td></tr>`;
      return;
    }

    const sats = data.above || [];
    satCount.textContent = `(${sats.length})`;

    if (sats.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-empty">No satellites found above your location with current filters.</td></tr>`;
      return;
    }

    sats.forEach(addSatMarker);

    tbody.innerHTML = sats
      .map(
        (s) =>
          `<tr class="clickable" onclick="location.href='/satellite/${s.satid}'">
            <td>${s.satname}</td>
            <td>${s.satid}</td>
            <td>${s.satlat.toFixed(2)}°</td>
            <td>${s.satlng.toFixed(2)}°</td>
            <td>${s.satalt.toFixed(1)}</td>
            <td>${s.launchDate || "—"}</td>
          </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="cell-error">Failed to load satellites. Check your N2YO API key.</td></tr>`;
  }
}

async function init() {
  initMap();
  const locText = document.getElementById("location-text");

  const onLocation = (lat, lng, label) => {
    userLat = lat;
    userLng = lng;
    locText.textContent = label;
    if (lat !== 0 || lng !== 0) {
      map.setView([lat, lng], 5);
      L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: "#f87171",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .bindPopup("Your location")
        .addTo(map);
    }
    fetchSatellites();
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocation(
          lat,
          lng,
          `Your location: ${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`
        );
      },
      () => {
        onLocation(0, 0, "Location unavailable — showing global view (0°, 0°)");
      },
      { timeout: 8000 }
    );
  } else {
    onLocation(0, 0, "Geolocation not supported — showing global view");
  }

  document
    .getElementById("refresh-btn")
    .addEventListener("click", fetchSatellites);
  document
    .getElementById("category-select")
    .addEventListener("change", fetchSatellites);
}

document.addEventListener("DOMContentLoaded", init);
