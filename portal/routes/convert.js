// ─────────────────────────────────────────────────────────────
// Route: POST /convert
// Receives a drawing photo uploaded from the portal form.
// Converts it to a 16x16 pixel art PNG using Sharp.
// Returns the converted image as a base64 string so the kid
// can preview it in the browser before approving.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const multer  = require('multer');
const sharp   = require('sharp');
const path    = require('path');
const fs      = require('fs-extra');

const router = express.Router();

// Store uploaded photos temporarily
const upload = multer({
  dest: path.join(__dirname, '../../submissions/tmp/'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — photos from iPad can be large
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  }
});

router.post('/', upload.single('drawing'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    // ── Step 1: Resize to 16x16 ───────────────────────────────
    // "nearest" algorithm keeps pixel art looking crisp
    // rather than blurring like a normal resize would
    const pixelBuffer = await sharp(req.file.path)
      .resize(16, 16, {
        fit: 'fill',
        kernel: sharp.kernel.nearest
      })
      .png()
      .toBuffer();

    // ── Step 2: Scale up for preview (16x16 → 256x256) ────────
    // The actual texture stays 16x16 but we show the kid a bigger
    // version so they can actually see what it looks like
    const previewBuffer = await sharp(pixelBuffer)
      .resize(256, 256, {
        fit: 'fill',
        kernel: sharp.kernel.nearest  // keeps it blocky, not blurry
      })
      .png()
      .toBuffer();

    // ── Step 3: Clean up the temp file ────────────────────────
    await fs.remove(req.file.path);

    // ── Step 4: Return both to the browser ────────────────────
    // pixelArt  = the real 16x16 PNG (saved when kid approves)
    // preview   = the 256x256 display version (shown in browser)
    res.json({
      success: true,
      preview: `data:image/png;base64,${previewBuffer.toString('base64')}`,
      pixelArt: `data:image/png;base64,${pixelBuffer.toString('base64')}`
    });

  } catch (err) {
    console.error('Conversion error:', err);
    // Clean up temp file on error
    if (req.file) await fs.remove(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Could not convert image. Try a clearer photo.' });
  }
});

module.exports = router;
