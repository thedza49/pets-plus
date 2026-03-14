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
const axios        = require('axios');
const sharp        = require('sharp');

const execAsync = promisify(exec);
const router    = express.Router();
const REPO_ROOT = process.cwd();

// ── Main pipeline function ────────────────────────────────────
async function runPipeline(submissionId, submissionDir, submission) {
  console.log(`\n🔧 Pipeline starting: ${submissionId}`);

  const { type, name, answers, sprite } = submission;
  const formData = answers;
  const spriteId = sprite.id;
  const spriteFile = sprite.file;
  
  const creatureId = name.toLowerCase().replace(/\s+/g, '_');

  // ── Step 1: Load template + mappings ─────────────────────
  const templatePath = path.join(REPO_ROOT, 'templates', `${type}.json`);
  if (!await fs.pathExists(templatePath)) {
    throw new Error(`No template found for type: ${type}`);
  }
  const templateRaw = await fs.readFile(templatePath, 'utf8');
  const mappings    = await fs.readJson(path.join(REPO_ROOT, 'templates', 'mappings.json'));

  // ── Step 2: Build variables ───────────────────────────────
  const variables = buildVariables(creatureId, formData, mappings, type, spriteId, name);

  // ── Step 3: Fill template ─────────────────────────────────
  const behaviorJson = fillTemplate(templateRaw, variables);

  // ── Step 4: Write pack files ──────────────────────────────
  await writePackFiles(creatureId, behaviorJson, sprite, name, variables.MODEL_ID, type, variables);

  // ── Step 5: Bump version ──────────────────────────────────
  await bumpVersion();

  // ── Step 6: Update Changelog ──────────────────────────────
  const changelogHeader = await writeChangelog(creatureId, name, formData, type);

  // ── Step 7: Git push ──────────────────────────────────────
  await gitPush(changelogHeader);

  console.log(`✅ Pipeline complete: ${submissionId}`);
}

async function writeChangelog(creatureId, name, formData, type) {
  const manifestPath = path.join(REPO_ROOT, 'behavior_pack/manifest.json');
  const manifest     = await fs.readJson(manifestPath);
  const version      = manifest.header.version.join('.');
  
  const data = formData || {};
  const biome = data.biome || 'Unknown';
  const power = data.power || 'Unknown';
  
  const title = `v${version} - Added ${type} "${name}"`;
  
  // ── Build Inventory Section ──────────────────────────────
  const entitiesDir = path.join(REPO_ROOT, 'behavior_pack/entities');
  const itemsDir    = path.join(REPO_ROOT, 'behavior_pack/items');
  
  const entities = (await fs.readdir(entitiesDir)).map(f => f.replace('.json', ''));
  const items    = (await fs.readdir(itemsDir)).map(f => f.replace('.json', ''));
  
  let inventoryStr = `### 📋 Current Project Inventory\n`;
  inventoryStr += `*   🐾 **Creatures:** ${entities.map(e => e === creatureId ? `**${e} (NEW)**` : e).join(', ')}\n`;
  inventoryStr += `*   ⚔️ **Items/Weapons:** ${items.map(i => i === creatureId ? `**${i} (NEW)**` : i).join(', ')}\n\n`;

  const entry = `### [${version}] - Added ${type} "${name}"\n- **ID**: \`pets_plus:${creatureId}\`\n- **Biome**: ${biome}\n- **Special Power**: ${power}\n\n${inventoryStr}`;
  
  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
  const currentContent = await fs.readFile(changelogPath, 'utf8');
  
  // Keep the header, insert after it
  const separator = '---\n';
  const index = currentContent.indexOf(separator);
  let newContent;
  if (index !== -1) {
    newContent = currentContent.slice(0, index + separator.length) + 
                 entry + 
                 currentContent.slice(index + separator.length);
  } else {
    newContent = currentContent + '\n' + separator + entry;
  }
  
  await fs.writeFile(changelogPath, newContent);
  console.log(`  📝 Changelog updated: ${title}`);
  return title;
}

function buildVariables(creatureId, formData, mappings, type, spriteId, name) {
  const baseVars = { 
    CREATURE_ID: creatureId,
    NAME: name 
  };

  if (type !== 'creature') {
    return baseVars;
  }

  // Ensure formData exists
  const data = formData || {};

  const biome        = mappings.spawn_biome[data.biome]         || mappings.spawn_biome['Cave'];
  const friendly     = mappings.friendliness[data.friendliness] || mappings.friendliness['Runs away'];
  const power        = mappings.creature_powers[data.power]      || mappings.creature_powers['Collects items'];
  const shape        = mappings.body_shapes[data.shape]         || mappings.body_shapes['small_ground'];
  const tameItem     = mappings.tame_items[(data.tameItem||'bread').toLowerCase()] || 'minecraft:bread';

  return {
    CREATURE_ID:             creatureId,
    SPAWN_WEIGHT:            40, // default weight since rarity is missing in mappings.json
    HERD_MIN:                2,
    HERD_MAX:                4,
    HEIGHT_MIN:              biome.height_min,
    HEIGHT_MAX:              biome.height_max,
    FLEE_SPEED:              friendly.flee_speed,
    FLEE_DISTANCE:           friendly.flee_distance,
    SPECIAL_POWER_COMPONENT: JSON.stringify(power, null, 6), // fixed key
    COLLISION_WIDTH:         shape.width,  // mappings use .width, .height
    COLLISION_HEIGHT:        shape.height,
    MOVEMENT_SPEED:          shape.speed,  // mappings use .speed
    HEALTH:                  shape.health,
    TAME_ITEM:               tameItem,
    TAME_PROBABILITY:        0.33,
    MODEL_ID:                shape.model,
    BIOME_NAME:              data.biome || 'Cave',
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
  // Strip single-line JS comments (// ...) that would make the JSON invalid in Minecraft
  result = result.replace(/^\s*\/\/.*$/gm, '');
  return result;
}

async function writePackFiles(creatureId, behaviorJson, sprite, name, modelId, type, variables) {
  const paths = {
    creature: {
      behavior: `behavior_pack/entities/${creatureId}.json`,
      resource: `resource_pack/entity/${creatureId}.entity.json`
    },
    weapon: {
      behavior: `behavior_pack/items/${creatureId}.json`,
      resource: `resource_pack/items/${creatureId}.json`
    },
    item: {
      behavior: `behavior_pack/items/${creatureId}.json`,
      resource: `resource_pack/items/${creatureId}.json`
    },
    block: {
      behavior: `behavior_pack/blocks/${creatureId}.json`,
      resource: `resource_pack/blocks/${creatureId}.json`
    }
  };

  const currentPaths = paths[type] || paths.creature;

  // ── Step 4.1: Behavior File ─────────────────────────────
  await fs.ensureDir(path.dirname(path.join(REPO_ROOT, currentPaths.behavior)));
  await fs.writeFile(path.join(REPO_ROOT, currentPaths.behavior), behaviorJson);
  console.log(`  📄 ${currentPaths.behavior}`);

  // ── Step 4.2: Resource File (Client-side) ─────────────────
  await fs.ensureDir(path.dirname(path.join(REPO_ROOT, currentPaths.resource)));

  if (type === 'creature') {
    const renderControllerName = `controller.render.pets_plus.${creatureId}`;

    // ── Step 4.2a: Animation Logic ─────────────────────────
    let animations = {};
    let animate = [];

    if (modelId.includes('ground') || modelId.includes('crawling')) {
      animations = { "walk": "animation.pets_plus.ground.walk" };
      animate = [{ "walk": "query.modified_move_speed > 0.1" }];
    } else if (modelId.includes('flying')) {
      animations = { "fly": "animation.pets_plus.flying.fly" };
      animate = ["fly"];
    } else if (modelId.includes('slithering')) {
      animations = { "move": "animation.pets_plus.slithering.move" };
      animate = ["move"];
    }

    const clientEntity = {
      "format_version": "1.10.0",
      "minecraft:client_entity": {
        "description": {
          "identifier": `pets_plus:${creatureId}`,
          "materials": { "default": "entity_alphatest" },
          "geometry": { "default": modelId || "geometry.pets_plus.small_ground" },
          "textures": { "default": `textures/entity/${creatureId}` },
          "animations": animations,
          "scripts": { "animate": animate },
          "render_controllers": [renderControllerName],
          "spawn_egg": { "base_color": "#7CFC00", "overlay_color": "#2D4A1A" }
        }
      }
    };
    await fs.writeJson(path.join(REPO_ROOT, currentPaths.resource), clientEntity, { spaces: 2 });

    // Write a render controller for this creature
    const renderController = {
      "format_version": "1.8.0",
      "render_controllers": {
        [renderControllerName]: {
          "geometry": "Geometry.default",
          "materials": [{ "*": "Material.default" }],
          "textures": ["Texture.default"]
        }
      }
    };
    const rcDir = path.join(REPO_ROOT, 'resource_pack/render_controllers');
    await fs.ensureDir(rcDir);
    await fs.writeJson(path.join(rcDir, `${creatureId}.render_controller.json`), renderController, { spaces: 2 });
    console.log(`  📄 resource_pack/render_controllers/${creatureId}.render_controller.json`);
  } else {
    // For items/blocks, we update item_texture.json or terrain_texture.json later
    // but we can write a placeholder for now
  }
  console.log(`  📄 ${currentPaths.resource}`);

  // ── Step 4.3: Spawn Rules (Creatures Only) ───────────────
  if (type === 'creature') {
    const mappings = await fs.readJson(path.join(REPO_ROOT, 'templates', 'mappings.json'));
    const biomeName = variables.BIOME_NAME || 'Cave';
    const biomeData = mappings.spawn_biome[biomeName] || mappings.spawn_biome['Cave'];

    const spawnRule = {
      "format_version": "1.17.0",
      "minecraft:spawn_rules": {
        "description": {
          "identifier": `pets_plus:${creatureId}`,
          "population_control": "animal"
        },
        "conditions": [
          {
            "minecraft:spawns_on_surface": !biomeData.spawns_underground,
            "minecraft:spawns_underground": !!biomeData.spawns_underground,
            "minecraft:spawns_underwater": !!biomeData.spawns_underwater,
            "minecraft:height_filter": {
              "min": biomeData.height_min,
              "max": biomeData.height_max
            },
            "minecraft:spawns_on_block_filter": biomeData.blocks,
            "minecraft:brightness_filter": {
              "min": biomeData.spawns_underground ? 0 : 7,
              "max": biomeData.spawns_underground ? 7 : 15,
              "adjust_for_weather": true
            },
            "minecraft:difficulty_filter": { "min": "easy", "max": "hard" },
            "minecraft:weight": { "default": variables.SPAWN_WEIGHT || 40 },
            "minecraft:herd": { 
              "min_size": variables.HERD_MIN || 2, 
              "max_size": variables.HERD_MAX || 4 
            }
          }
        ]
      }
    };
    
    await fs.ensureDir(path.join(REPO_ROOT, 'behavior_pack/spawn_rules'));
    await fs.writeJson(path.join(REPO_ROOT, `behavior_pack/spawn_rules/${creatureId}.json`), spawnRule, { spaces: 2 });
    console.log(`  📄 behavior_pack/spawn_rules/${creatureId}.json`);
  }

  // ── Step 4.4: Survival Recipe (Non-creatures) ────────────
  if (type !== 'creature') {
    await writeRecipe(creatureId, type);
  }

  // ── Step 4.5: Texture Mapping ────────────────────────────
  await writeTextureMapping(creatureId, type, sprite);

  // ── Step 4.6: Language Entry ─────────────────────────────
  let langKey;
  if (type === 'creature') langKey = `entity.pets_plus:${creatureId}.name`;
  else if (type === 'block') langKey = `tile.pets_plus:${creatureId}.name`;
  else langKey = `item.pets_plus:${creatureId}.name`;

  await fs.appendFile(
    path.join(REPO_ROOT, 'resource_pack/texts/en_US.lang'),
    `${langKey}=${name}\n`
  );
  console.log(`  🔤 lang: ${name}`);
}

async function writeRecipe(creatureId, type) {
  const recipesDir = path.join(REPO_ROOT, 'behavior_pack/recipes');
  await fs.ensureDir(recipesDir);

  let recipe;
  if (type === 'weapon') {
    recipe = {
      "format_version": "1.12",
      "minecraft:recipe_shaped": {
        "description": { "identifier": `pets_plus:${creatureId}_recipe` },
        "tags": ["crafting_table"],
        "pattern": [" I ", " I ", " S "],
        "key": {
          "I": { "item": "minecraft:iron_ingot" },
          "S": { "item": "minecraft:stick" }
        },
        "result": { "item": `pets_plus:${creatureId}` }
      }
    };
  } else if (type === 'block') {
    recipe = {
      "format_version": "1.12",
      "minecraft:recipe_shaped": {
        "description": { "identifier": `pets_plus:${creatureId}_recipe` },
        "tags": ["crafting_table"],
        "pattern": ["SSS", "SCS", "SSS"],
        "key": {
          "S": { "item": "minecraft:stone" },
          "C": { "item": "minecraft:coal" }
        },
        "result": { "item": `pets_plus:${creatureId}` }
      }
    };
  } else {
    // Default item recipe
    recipe = {
      "format_version": "1.12",
      "minecraft:recipe_shaped": {
        "description": { "identifier": `pets_plus:${creatureId}_recipe` },
        "tags": ["crafting_table"],
        "pattern": [" I ", " P ", "   "],
        "key": {
          "I": { "item": "minecraft:iron_ingot" },
          "P": { "item": "minecraft:paper" }
        },
        "result": { "item": `pets_plus:${creatureId}` }
      }
    };
  }

  await fs.writeJson(path.join(recipesDir, `${creatureId}.json`), recipe, { spaces: 2 });
  console.log(`  📜 recipe → behavior_pack/recipes/${creatureId}.json`);
}

async function writeTextureMapping(creatureId, type, sprite) {
  const textureDir = type === 'creature' ? 'entity' : (type === 'block' ? 'blocks' : 'items');
  const spriteDest = path.join(REPO_ROOT, `resource_pack/textures/${textureDir}/${creatureId}.png`);
  await fs.ensureDir(path.dirname(spriteDest));

  if (sprite.url) {
    // ── External URL: Download and process ─────────────────
    console.log(`  🌐 Downloading external sprite: ${sprite.url}`);
    try {
      const response = await axios.get(sprite.url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      // Process with Sharp: resize to 32x32 and ensure PNG
      // We use SMART CROP to handle "spritesheet" style images
      await sharp(buffer)
        .resize(32, 32, { 
          fit: 'cover',
          position: 'center',
          kernel: 'nearest' 
        })
        .toFile(spriteDest);
      
      console.log(`  🎨 Processed & Saved: ${spriteDest}`);
    } catch (err) {
      console.error(`  ❌ Failed to download/process external sprite: ${err.message}`);
      // Fallback to a local rat if it fails
      await fs.copy(path.join(REPO_ROOT, 'resource_pack/textures/entity/rat.png'), spriteDest);
    }
  } else {
    // ── Local File: Copy directly ──────────────────────────
    const spriteSrc = path.join(REPO_ROOT, 'public', sprite.file);
    if (await fs.pathExists(spriteSrc)) {
      await fs.copy(spriteSrc, spriteDest);
    } else {
      console.warn(`  ⚠️ Local sprite not found: ${spriteSrc}. Falling back.`);
      await fs.copy(path.join(REPO_ROOT, 'resource_pack/textures/entity/rat.png'), spriteDest);
    }
  }

  // Update JSON mappings if not a creature
  if (type === 'block') {
    const terrainPath = path.join(REPO_ROOT, 'resource_pack/textures/terrain_texture.json');
    const terrain = await fs.readJson(terrainPath);
    terrain.texture_data[creatureId] = { "textures": `textures/blocks/${creatureId}` };
    await fs.writeJson(terrainPath, terrain, { spaces: 2 });
  } else if (type !== 'creature') {
    const itemPath = path.join(REPO_ROOT, 'resource_pack/textures/item_texture.json');
    const items = await fs.readJson(itemPath);
    items.texture_data[creatureId] = { "textures": `textures/items/${creatureId}` };
    await fs.writeJson(itemPath, items, { spaces: 2 });
  }
}

async function bumpVersion() {
  const bpPath = path.join(REPO_ROOT, 'behavior_pack/manifest.json');
  const rpPath = path.join(REPO_ROOT, 'resource_pack/manifest.json');
  
  const bp = await fs.readJson(bpPath);
  const rp = await fs.readJson(rpPath);
  
  // Bump patch version
  bp.header.version[2] += 1;
  rp.header.version[2] = bp.header.version[2];
  
  const vString = `(v${bp.header.version.join('.')})`;
  
  // Update names to include version for easy identification
  bp.header.name = `Pets Plus BP ${vString}`;
  rp.header.name = `Pets Plus RP ${vString}`;
  
  // Keep module versions in sync
  bp.modules[0].version = [...bp.header.version];
  rp.modules[0].version = [...rp.header.version];
  
  // Update BP dependency on RP
  if (bp.dependencies && bp.dependencies[0]) {
    bp.dependencies[0].version = [...rp.header.version];
  }

  await fs.writeJson(bpPath, bp, { spaces: 2 });
  await fs.writeJson(rpPath, rp, { spaces: 2 });
  
  console.log(`  📦 Version → ${bp.header.version.join('.')}`);
}

async function gitPush(msg) {
  // Escape double quotes for shell command
  const escapedMsg = msg.replace(/"/g, '\\"');
  await execAsync('git add .', { cwd: REPO_ROOT });
  await execAsync(`git commit -m "${escapedMsg}"`, { cwd: REPO_ROOT });
  await execAsync('git push origin main', { cwd: REPO_ROOT });
  console.log(`  🚀 Pushed: ${msg}`);
}

module.exports = router;
module.exports.runPipeline = runPipeline;
