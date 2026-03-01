// ─────────────────────────────────────────────────────────────
// Pipeline: Template Engine + GitHub Push
// Takes a completed submission and:
//   1. Loads the correct template for the content type
//   2. Fills in template variables from the submission
//   3. Assembles files in the correct pack folder structure
//   4. Commits and pushes to GitHub
//   5. GitHub Actions handles packaging + release from there
// ─────────────────────────────────────────────────────────────

const express  = require('express');
const fs       = require('fs-extra');
const path     = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const router    = express.Router();

// Path to the repo root (one level up from portal/)
const REPO_ROOT = path.join(__dirname, '../../');

// ── Main pipeline function ────────────────────────────────────
// Called internally by submit.js — not exposed as an HTTP endpoint
async function runPipeline(submissionId, submissionDir, submission) {
  console.log(`\n🔧 Pipeline starting for: ${submissionId}`);

  const { type, name, formData } = submission;

  // ── Step 1: Load the correct template ────────────────────
  const templatePath = path.join(REPO_ROOT, 'templates', `${type}.json`);
  if (!await fs.pathExists(templatePath)) {
    throw new Error(`No template found for type: ${type}`);
  }

  const templateRaw = await fs.readFile(templatePath, 'utf8');

  // ── Step 2: Load mappings ─────────────────────────────────
  const mappings = await fs.readJson(
    path.join(REPO_ROOT, 'templates', 'mappings.json')
  );

  // ── Step 3: Build variable map from submission + mappings ─
  const creatureId = name.toLowerCase().replace(/\s+/g, '_');
  const variables  = buildVariables(creatureId, formData, mappings, type);

  // ── Step 4: Fill template with variables ──────────────────
  let behaviorJson = fillTemplate(templateRaw, variables);

  // ── Step 5: Write files into pack folder structure ────────
  await writePackFiles(creatureId, behaviorJson, submission, submissionDir);

  // ── Step 6: Bump version in manifest.json ─────────────────
  await bumpVersion();

  // ── Step 7: Git commit + push ─────────────────────────────
  await gitPush(submissionId, name, creatureId, type);

  console.log(`✅ Pipeline complete for: ${submissionId}`);
}

// ── Build the variable map ────────────────────────────────────
function buildVariables(creatureId, formData, mappings, type) {
  if (type !== 'creature') {
    // TODO: implement weapon, block, item variable builders
    return { CREATURE_ID: creatureId };
  }

  const biomeData       = mappings.spawn_biome[formData.biome]       || mappings.spawn_biome['Cave'];
  const rarityData      = mappings.rarity[formData.rarity]           || mappings.rarity['Uncommon'];
  const friendlinessData = mappings.friendliness[formData.friendliness] || mappings.friendliness['Runs away'];
  const powerData       = mappings.special_power[formData.power]     || mappings.special_power['Collects items'];
  const sizeData        = mappings.size[formData.size]               || mappings.size['small'];
  const tameItem        = mappings.tame_items[formData.tameItem?.toLowerCase()] || 'minecraft:bread';

  return {
    CREATURE_ID:              creatureId,
    SPAWN_WEIGHT:             rarityData.spawn_weight,
    HERD_MIN:                 rarityData.herd_min,
    HERD_MAX:                 rarityData.herd_max,
    HEIGHT_MIN:               biomeData.height_min,
    HEIGHT_MAX:               biomeData.height_max,
    FLEE_SPEED:               friendlinessData.flee_speed,
    FLEE_DISTANCE:            friendlinessData.flee_distance,
    SPECIAL_POWER_COMPONENT:  JSON.stringify(powerData.component_group, null, 6),
    COLLISION_WIDTH:          sizeData.collision_width,
    COLLISION_HEIGHT:         sizeData.collision_height,
    MOVEMENT_SPEED:           sizeData.movement_speed,
    HEALTH:                   sizeData.health,
    TAME_ITEM:                tameItem,
    TAME_PROBABILITY:         0.33,
    TEXTURE_PATH:             `textures/entity/${creatureId}`
  };
}

// ── Fill template variables ───────────────────────────────────
function fillTemplate(templateRaw, variables) {
  let result = templateRaw;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`"{{${key}}}"`, 'g');     // quoted values
    const regexRaw = new RegExp(`{{${key}}}`, 'g');    // unquoted values
    result = result.replace(regex, JSON.stringify(value));
    result = result.replace(regexRaw, value);
  }
  return result;
}

// ── Write files into the pack structure ──────────────────────
async function writePackFiles(creatureId, behaviorJson, submission, submissionDir) {
  const { name } = submission;

  // Behavior entity JSON
  const entityPath = path.join(REPO_ROOT, 'behavior_pack/entities', `${creatureId}.json`);
  await fs.writeFile(entityPath, behaviorJson);
  console.log(`  📄 Written: behavior_pack/entities/${creatureId}.json`);

  // Spawn rules JSON (simple copy from rat as base, with creature ID swapped)
  const spawnRulesTemplate = await fs.readFile(
    path.join(REPO_ROOT, 'behavior_pack/spawn_rules/rat.json'), 'utf8'
  );
  const spawnRules = spawnRulesTemplate.replace(/pets_plus:rat/g, `pets_plus:${creatureId}`);
  await fs.writeFile(
    path.join(REPO_ROOT, 'behavior_pack/spawn_rules', `${creatureId}.json`),
    spawnRules
  );
  console.log(`  📄 Written: behavior_pack/spawn_rules/${creatureId}.json`);

  // Copy texture to resource pack
  const textureSrc  = path.join(submissionDir, `${submission.id}.png`);
  const textureDest = path.join(REPO_ROOT, 'resource_pack/textures/entity', `${creatureId}.png`);
  await fs.copy(textureSrc, textureDest);
  console.log(`  🖼️  Written: resource_pack/textures/entity/${creatureId}.png`);

  // Add language entry
  const langPath = path.join(REPO_ROOT, 'resource_pack/texts/en_US.lang');
  const langEntry = `entity.pets_plus:${creatureId}.name=${name}\n`;
  await fs.appendFile(langPath, langEntry);
  console.log(`  🔤 Added lang entry for: ${name}`);
}

// ── Bump patch version in manifest.json ──────────────────────
async function bumpVersion() {
  const manifestPath = path.join(REPO_ROOT, 'behavior_pack/manifest.json');
  const manifest = await fs.readJson(manifestPath);
  manifest.header.version[2] += 1; // bump PATCH
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  console.log(`  📦 Version bumped to: ${manifest.header.version.join('.')}`);
}

// ── Git commit and push ───────────────────────────────────────
async function gitPush(submissionId, submitterName, creatureId, type) {
  const message = `feat: add ${type} "${creatureId}" (submitted by ${submitterName})`;
  try {
    await execAsync('git add .', { cwd: REPO_ROOT });
    await execAsync(`git commit -m "${message}"`, { cwd: REPO_ROOT });
    await execAsync('git push origin main', { cwd: REPO_ROOT });
    console.log(`  🚀 Pushed to GitHub: ${message}`);
  } catch (err) {
    console.error('  ❌ Git push failed:', err.message);
    throw err;
  }
}

// Export for use by submit.js
module.exports = router;
module.exports.runPipeline = runPipeline;
