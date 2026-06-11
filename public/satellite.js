let map;
let tileLayer;
let satMarker;
let pathLine;
let noradId;
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

function getNoradId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}

function initMap() {
  map = L.map("map", { worldCopyJump: true }).setView([0, 0], 2);
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

function updateStats(pos) {
  document.getElementById("stat-lat").textContent = pos.satlatitude.toFixed(2);
  document.getElementById("stat-lng").textContent = pos.satlongitude.toFixed(2);
  document.getElementById("stat-alt").textContent = pos.sataltitude.toFixed(0);
  document.getElementById("stat-az").textContent = pos.azimuth.toFixed(1);
  document.getElementById("stat-el").textContent = pos.elevation.toFixed(1);
  document.getElementById("stat-ra").textContent = pos.ra.toFixed(1);

  const badge = document.getElementById("eclipse-badge");
  if (pos.eclipsed) {
    badge.textContent = "In Shadow";
    badge.className = "badge badge-shadow";
  } else {
    badge.textContent = "In Sunlight";
    badge.className = "badge badge-sunlit";
  }
}

// drawPath=true on first load to fetch 300 positions for the predicted path;
// subsequent calls use seconds=1 to save API transactions.
async function fetchPosition(drawPath = false) {
  const seconds = drawPath ? 300 : 1;
  try {
    const res = await fetch(
      `/api/satellite/${noradId}/position?lat=${userLat}&lng=${userLng}&alt=0&seconds=${seconds}`
    );
    const data = await res.json();

    if (!data.positions || data.positions.length === 0) return;

    const pos = data.positions[0];
    updateStats(pos);

    const lat = pos.satlatitude;
    const lng = pos.satlongitude;

    if (!satMarker) {
      satMarker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: "#29b6f6",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);
      map.setView([lat, lng], 3);
    } else {
      satMarker.setLatLng([lat, lng]);
    }

    if (drawPath && data.positions.length > 1) {
      const coords = data.positions.map((p) => [p.satlatitude, p.satlongitude]);
      if (pathLine) map.removeLayer(pathLine);
      pathLine = L.polyline(coords, {
        color: "#29b6f6",
        weight: 1.5,
        opacity: 0.4,
        dashArray: "4 6",
      }).addTo(map);
    }
  } catch (err) {
    console.error("Error fetching position:", err);
  }
}

async function fetchPasses() {
  const tbody = document.getElementById("passes-tbody");
  try {
    const res = await fetch(
      `/api/satellite/${noradId}/passes?lat=${userLat}&lng=${userLng}&alt=0&days=10&minVisibility=300`
    );
    const data = await res.json();

    if (data.error) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-error">API error: ${data.error}</td></tr>`;
      return;
    }

    if (!data.passes || data.passes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-empty">No visual passes found in the next 10 days from your location.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.passes
      .map((p) => {
        const start = new Date(p.startUTC * 1000);
        const duration = Math.round(p.duration / 60);
        const mag =
          p.mag !== null && p.mag !== undefined ? p.mag.toFixed(1) : "—";
        return `<tr>
          <td>${start.toLocaleString()}</td>
          <td>${duration} min</td>
          <td>${p.maxEl.toFixed(1)}°</td>
          <td>${p.startAzCompass} (${p.startAz.toFixed(0)}°)</td>
          <td>${p.endAzCompass} (${p.endAz.toFixed(0)}°)</td>
          <td>${mag}</td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("Error fetching passes:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="cell-error">Failed to load visual passes.</td></tr>`;
  }
}

async function fetchSatName() {
  try {
    const res = await fetch(`/api/satellite/${noradId}`);
    const data = await res.json();
    if (data.info) {
      const name = data.info.satname;
      document.title = `${name} — SatGazer`;
      document.getElementById("sat-name").textContent = name;
      document.getElementById("sat-norad").textContent = `NORAD ID: ${noradId}`;
    }
  } catch (err) {
    document.getElementById("sat-name").textContent = `Satellite #${noradId}`;
    document.getElementById("sat-norad").textContent = `NORAD ID: ${noradId}`;
  }
}

async function onLocationReady() {
  await fetchPosition(true);
  fetchPasses();
  setInterval(() => fetchPosition(false), 10000);
}

async function init() {
  noradId = getNoradId();
  initMap();
  await fetchSatName();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        onLocationReady();
      },
      () => onLocationReady(),
      { timeout: 8000 }
    );
  } else {
    onLocationReady();
  }
}

document.addEventListener("DOMContentLoaded", init);
