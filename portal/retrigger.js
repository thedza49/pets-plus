const { runPipeline } = require('./routes/pipeline');
const fs = require('fs-extra');
const path = require('path');

const submissionId = '1772518918622-freed';
const submissionDir = path.join(__dirname, 'submissions', submissionId);

async function trigger() {
  const submission = await fs.readJson(path.join(submissionDir, 'submission.json'));
  await runPipeline(submissionId, submissionDir, submission);
}

trigger().catch(console.error);
