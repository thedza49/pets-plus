const { runPipeline } = require('./routes/pipeline');
const fs = require('fs-extra');
const path = require('path');

async function retrigger(submissionId) {
  console.log(`\n🔄 Retriggering: ${submissionId}`);
  const submissionDir = path.join(__dirname, 'submissions', submissionId);
  const submission = await fs.readJson(path.join(submissionDir, 'submission.json'));
  await runPipeline(submissionId, submissionDir, submission);
}

async function run() {
  await retrigger('1773515714793-ice');
  await retrigger('1773515885051-zeus’s-light');
}

run().catch(console.error);
