// ─────────────────────────────────────────────────────────────
// Route: POST /submit
// Receives the completed form submission including the approved
// 16x16 pixel art texture. Saves everything to disk and triggers
// the automation pipeline.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs-extra');
const axios   = require('axios');

const router = express.Router();

// Where to store approved textures temporarily before pipeline picks them up
const upload = multer({
  dest: path.join(__dirname, '../../submissions/tmp/'),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

router.post('/', upload.single('texture'), async (req, res) => {
  try {
    const { name, type, creatureName, ...formData } = req.body;

    // ── Validate required fields ──────────────────────────────
    if (!name || !type || !creatureName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No texture file uploaded' });
    }

    // ── Build submission object ───────────────────────────────
    const timestamp   = Date.now();
    const submissionId = `${timestamp}-${creatureName.toLowerCase().replace(/\s+/g, '-')}`;

    const submission = {
      id: submissionId,
      submittedAt: new Date().toISOString(),
      submittedBy: name,
      type,            // "creature" | "weapon" | "block" | "item"
      name: creatureName,
      formData,        // all the form answers specific to this type
      textureFile: `${submissionId}.png`
    };

    // ── Save submission to disk ───────────────────────────────
    const SUBMISSIONS_DIR = process.env.SUBMISSIONS_DIR ||
      path.join(__dirname, '../../submissions');

    const submissionDir = path.join(SUBMISSIONS_DIR, submissionId);
    await fs.ensureDir(submissionDir);

    // Save the JSON brief
    await fs.writeJson(
      path.join(submissionDir, 'submission.json'),
      submission,
      { spaces: 2 }
    );

    // Save the approved texture PNG
    await fs.move(
      req.file.path,
      path.join(submissionDir, `${submissionId}.png`)
    );

    console.log(`✅ New submission saved: ${submissionId} (${type} by ${name})`);

    // ── Trigger the automation pipeline ──────────────────────
    // The pipeline route handles template engine + GitHub push
    // We call it internally so the kid gets a fast response
    // while the pipeline runs in the background
    triggerPipeline(submissionId, submissionDir, submission);

    // ── Respond to the kid ────────────────────────────────────
    res.json({
      success: true,
      submissionId,
      message: `Your ${type} "${creatureName}" has been submitted! 🎉`
    });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Fires the pipeline in the background — doesn't block the response
async function triggerPipeline(submissionId, submissionDir, submission) {
  try {
    // Import and run the pipeline directly
    const { runPipeline } = require('./pipeline');
    await runPipeline(submissionId, submissionDir, submission);
    console.log(`🚀 Pipeline completed for: ${submissionId}`);
  } catch (err) {
    console.error(`❌ Pipeline failed for ${submissionId}:`, err);
    // Pipeline failure doesn't affect the kid — submission is still saved
    // OpenClaw can re-run failed pipelines by reading from /submissions/
  }
}

module.exports = router;
