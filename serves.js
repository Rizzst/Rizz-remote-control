// ============================================================
// RIZZ RSI MARTI - Remote Control Backend
// Server sederhana: simpan state EA (on/off, exit mode, sesi,
// max DD) di file JSON, sajikan lewat API untuk EA (WebRequest)
// dan untuk halaman kontrol website.
// ============================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "ganti-api-key-ini";
const STATE_FILE = path.join(__dirname, "state.json");

// State default - dipakai kalau state.json belum ada
const DEFAULT_STATE = {
  enabled: true,          // master switch: EA boleh buka basket baru?
  force_close_all: false, // sekali true -> EA close all lalu server reset ke false

  rsi_overbought: 95.0,
  rsi_oversold: 15.0,
  rsi_period: 5,

  layer_distance_pips: 15.0,
  max_layers: 25,

  initial_lot: 0.01,
  martingale_multiplier: 1.10,

  l1_entry_mode: 0,       // 0 = Buy Limit/Sell Limit, 1 = Buy Stop/Sell Stop

  exit_mode: 0,           // 0 = Trailing SL, 1 = TP Fix per Layer
  besl_start_points: 200.0,
  besl_offset_points: 20.0,
  fixed_tp_points: 200.0,

  trading_session: 0,     // 0=24 Jam, 1=London, 2=New York, 3=London+NY
  london_start_hour: 6,
  london_end_hour: 17,
  newyork_start_hour: 14,
  newyork_end_hour: 22,

  max_drawdown: 500000000,

  use_news_filter: true,
  news_min_impact: 0,     // 0=High only, 1=Medium+High, 2=Semua
  news_minutes_before: 45,
  news_minutes_after: 30
};

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function checkApiKey(req, res, next) {
  const key = req.query.key || req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(401).json({ error: "API key salah atau tidak ada" });
  }
  next();
}

// GET /api/state - dibaca EA (WebRequest) dan halaman kontrol
app.get("/api/state", checkApiKey, (req, res) => {
  res.json(loadState());
});

// POST /api/state - update dari halaman kontrol website
// body: sebagian atau semua field dari DEFAULT_STATE di atas
app.post("/api/state", checkApiKey, (req, res) => {
  const current = loadState();
  const allowedKeys = Object.keys(DEFAULT_STATE);
  for (const k of allowedKeys) {
    if (req.body[k] !== undefined) current[k] = req.body[k];
  }
  saveState(current);
  res.json(current);
});

// POST /api/ack-close - EA konfirmasi sudah close all, server reset flag
app.post("/api/ack-close", checkApiKey, (req, res) => {
  const current = loadState();
  current.force_close_all = false;
  saveState(current);
  res.json(current);
});

app.listen(PORT, () => {
  console.log(`RIZZ RSI MARTI remote control server jalan di port ${PORT}`);
  console.log(`API key saat ini: ${API_KEY}`);
});
