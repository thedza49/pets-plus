// ─────────────────────────────────────────────────────────────
// Pets Plus — Creature Creator Portal
// Raspberry Pi server that handles kid submissions, converts
// drawings to pixel art, and fires the automation pipeline.
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

const submitRoute   = require('./routes/submit');
const pipelineRoute = require('./routes/pipeline');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the kid-facing form from /public
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────

// POST /submit     — receives the completed form + approved texture
// POST /convert    — receives a drawing photo, returns 16x16 pixel art
// POST /pipeline   — triggers template engine + GitHub push (called by /submit)
app.use('/submit',   submitRoute);
app.use('/pipeline', pipelineRoute);

// Health check — useful for confirming the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Ensure submissions directory exists ───────────────────────
const SUBMISSIONS_DIR = process.env.SUBMISSIONS_DIR || path.join(__dirname, '../submissions');
fs.ensureDirSync(SUBMISSIONS_DIR);
console.log(`📁 Submissions directory: ${SUBMISSIONS_DIR}`);

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🐾 Pets Plus Portal running at http://localhost:${PORT}`);
  console.log(`   On your home network: http://[pi-ip-address]:${PORT}\n`);
});
