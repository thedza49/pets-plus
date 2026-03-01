// ─────────────────────────────────────────────────────────────
// Pipeline: Template Engine + GitHub Push
// Updated for sprite-based flow — no drawing upload needed.
// The selected sprite file is copied directly into the pack.
// ─────────────────────────────────────────────────────────────

const express      = require('express');
const fs           = require('fs-extra');
const path         = require('path');
const { exec }     = require('child_process');
const { promisify }= require('util');

const execAsync = promisify(exec);
const router    = express.Router();
const REPO_ROOT = path.join(__dirname, '../../');

// ── Main pipeline function ────────────────────────────────────
async function runPipeline(submissionId, submissionDir, submission) {
  console.log(`\n🔧 Pipeline starting: ${submissionId}`);

  const { type, name, formData, spriteId, spriteFile } = submission;
  const creatureId = name.toLowerCase().replace(/\s+/g, '_');

  // ── Step 1: Load template + mappings ─────────────────────
  const templatePath = path.join(REPO_ROOT, 'templates', `${type}.json`);
  if (!await fs.pathExists(templatePath)) {
    throw new Error(`No template found for type: ${type}`);
  }
  const templateRaw = await fs.readFile(templatePath, 'utf8');
  const mappings    = await fs.readJson(path.join(REPO_ROOT, 'templates', 'mappings.json'));

  // ── Step 2: Build variables ───────────────────────────────
  const variables = buildVariables(creatureId, formData, mappings, type, spriteId);

  // ── Step 3: Fill template ─────────────────────────────────
  const behaviorJson = fillTemplate(templateRaw, variables);

  // ── Step 4: Write pack files ──────────────────────────────
  await writePackFiles(creatureId, behaviorJson, spriteFile, name);

  // ── Step 5: Bump version ──────────────────────────────────
  await bumpVersion();

  // ── Step 6: Git push ──────────────────────────────────────
  await gitPush(submissionId, name, creatureId, type);

  console.log(`✅ Pipeline complete: ${submissionId}`);
}

function buildVariables(creatureId, formData, mappings, type, spriteId) {
  if (type !== 'creature') {
    return { CREATURE_ID: creatureId };
  }

  const biome        = mappings.spawn_biome[formData.biome]         || mappings.spawn_biome['Cave'];
  const rarity       = mappings.rarity[formData.rarity]             || mappings.rarity['Uncommon'];
  const friendly     = mappings.friendliness[formData.friendliness] || mappings.friendliness['Runs away'];
  const power        = mappings.special_power[formData.power]       || mappings.special_power['Collects items'];
  const shape        = mappings.body_shapes[formData.shape]         || mappings.body_shapes['small_ground'];
  const tameItem     = mappings.tame_items[(formData.tameItem||'bread').toLowerCase()] || 'minecraft:bread';

  return {
    CREATURE_ID:             creatureId,
    SPAWN_WEIGHT:            rarity.spawn_weight,
    HERD_MIN:                rarity.herd_min,
    HERD_MAX:                rarity.herd_max,
    HEIGHT_MIN:              biome.height_min,
    HEIGHT_MAX:              biome.height_max,
    FLEE_SPEED:              friendly.flee_speed,
    FLEE_DISTANCE:           friendly.flee_distance,
    SPECIAL_POWER_COMPONENT: JSON.stringify(power.component_group, null, 6),
    COLLISION_WIDTH:         shape.collision_width,
    COLLISION_HEIGHT:        shape.collision_height,
    MOVEMENT_SPEED:          shape.movement_speed,
    HEALTH:                  shape.health,
    TAME_ITEM:               tameItem,
    TAME_PROBABILITY:        0.33,
    // Texture path points to the selected sprite copied into entity folder
    TEXTURE_PATH:            `textures/entity/${creatureId}`
  };
}

function fillTemplate(raw, vars) {
  let result = raw;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`"{{${key}}}"`, 'g'), JSON.stringify(value));
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

async function writePackFiles(creatureId, behaviorJson, spriteFile, name) {
  // Behavior entity JSON
  await fs.writeFile(
    path.join(REPO_ROOT, `behavior_pack/entities/${creatureId}.json`),
    behaviorJson
  );
  console.log(`  📄 behavior_pack/entities/${creatureId}.json`);

  // Spawn rules (copy from rat template, swap ID)
  const spawnBase = await fs.readFile(
    path.join(REPO_ROOT, 'behavior_pack/spawn_rules/rat.json'), 'utf8'
  );
  await fs.writeFile(
    path.join(REPO_ROOT, `behavior_pack/spawn_rules/${creatureId}.json`),
    spawnBase.replace(/pets_plus:rat/g, `pets_plus:${creatureId}`)
  );
  console.log(`  📄 behavior_pack/spawn_rules/${creatureId}.json`);

  // Copy the selected sprite as the entity texture
  // spriteFile is like "sprites/small_ground/rat.png"
  const spriteSrc  = path.join(REPO_ROOT, 'resource_pack/textures/entity', spriteFile);
  const spriteDest = path.join(REPO_ROOT, `resource_pack/textures/entity/${creatureId}.png`);
  if (await fs.pathExists(spriteSrc)) {
    await fs.copy(spriteSrc, spriteDest);
    console.log(`  🖼️  texture → ${creatureId}.png (from ${spriteFile})`);
  } else {
    // Fallback to rat texture if sprite not yet downloaded
    await fs.copy(
      path.join(REPO_ROOT, 'resource_pack/textures/entity/rat.png'),
      spriteDest
    );
    console.log(`  ⚠️  Sprite not found, used rat fallback for ${creatureId}`);
  }

  // Language entry
  await fs.appendFile(
    path.join(REPO_ROOT, 'resource_pack/texts/en_US.lang'),
    `entity.pets_plus:${creatureId}.name=${name}\n`
  );
  console.log(`  🔤 lang: ${name}`);
}

async function bumpVersion() {
  const manifestPath = path.join(REPO_ROOT, 'behavior_pack/manifest.json');
  const manifest     = await fs.readJson(manifestPath);
  manifest.header.version[2] += 1;
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  console.log(`  📦 Version → ${manifest.header.version.join('.')}`);
}

async function gitPush(submissionId, name, creatureId, type) {
  const msg = `feat: add ${type} "${creatureId}" submitted via portal`;
  await execAsync('git add .', { cwd: REPO_ROOT });
  await execAsync(`git commit -m "${msg}"`, { cwd: REPO_ROOT });
  await execAsync('git push origin main', { cwd: REPO_ROOT });
  console.log(`  🚀 Pushed: ${msg}`);
}

module.exports = router;
module.exports.runPipeline = runPipeline;
