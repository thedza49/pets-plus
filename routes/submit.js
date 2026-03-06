// ─────────────────────────────────────────────────────────────
// Route: POST /submit
// Receives completed form submission as JSON.
// Sprite is a reference to a pre-existing file in
// portal/public/sprites/ rather than an uploaded image.
// No file upload needed — drawing step has been removed.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');

const router = express.Router();

router.post('/', express.json(), async (req, res) => {
  try {
    const { type, creatureName, sprite, answers } = req.body;

    if (!type || !creatureName || !sprite) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ── Build submission object ───────────────────────────────
    const timestamp    = Date.now();
    const submissionId = `${timestamp}-${creatureName.toLowerCase().replace(/\s+/g, '-')}`;

    const submission = {
      id:          submissionId,
      submittedAt: new Date().toISOString(),
      type,
      name:        creatureName,
      sprite,      // { id, file, label } — points to pre-existing sprite PNG
      answers      // all form answers (biome, power, shape, effects, etc.)
    };

    // ── Save submission to disk ───────────────────────────────
    const SUBMISSIONS_DIR = process.env.SUBMISSIONS_DIR ||
      path.join(__dirname, '../submissions');

    const submissionDir = path.join(SUBMISSIONS_DIR, submissionId);
    await fs.ensureDir(submissionDir);

    await fs.writeJson(
      path.join(submissionDir, 'submission.json'),
      submission,
      { spaces: 2 }
    );

    console.log(`✅ Saved: ${submissionId} (${type}: "${creatureName}" / sprite: ${sprite.label})`);

    // ── Trigger pipeline in background ───────────────────────
    triggerPipeline(submissionId, submissionDir, submission);

    res.json({
      success:      true,
      submissionId,
      message:      `Your ${type} "${creatureName}" has been submitted! 🎉`
    });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

async function triggerPipeline(submissionId, submissionDir, submission) {
  try {
    const { runPipeline } = require('./pipeline');
    await runPipeline(submissionId, submissionDir, submission);
    console.log(`🚀 Pipeline complete: ${submissionId}`);
  } catch (err) {
    console.error(`❌ Pipeline failed for ${submissionId}:`, err);
  }
}

module.exports = router;
