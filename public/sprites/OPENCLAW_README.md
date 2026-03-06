# Sprite Sourcing Instructions for OpenClaw

## Overview
The Pets Plus portal displays pre-made pixel art sprites for kids to choose from.
All sprites must be **16x16 PNG files with transparent backgrounds**.

---

## Step 1 — Download the source packs

### Pack 1: Tiny Creatures (CC0 — no attribution needed)
URL: https://opengameart.org/content/tiny-creatures
- Click Download
- Extract the ZIP
- You'll find a sprite sheet with all creatures laid out in a grid

### Pack 2: DawnLike 16x16 Tileset (CC BY 4.0 — credit required in README)
URL: https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181
- Click Download
- Extract the ZIP
- Weapons are in `Weapons/` folder
- Items/potions in `Objects/` folder
- Blocks/tiles in `Tiles/` folder

---

## Step 2 — Extract individual 16x16 sprites

Use any of these free tools to slice the sprite sheets:

- **LibreSprite** (free, open source) — File → Import Sprite Sheet → set tile size to 16x16
- **GIMP** — Filters → Script-Fu → Console, use slice script
- **Aseprite** (paid but best) — File → Import Sprite Sheet

For each sprite:
1. Select the 16x16 tile
2. Export as PNG with transparent background
3. Name it exactly as listed in `sprites.json`
4. Place in the correct folder under `portal/public/sprites/[category]/`

---

## Step 3 — File naming

Name files exactly as listed in `sprites.json`. Example for tiny_crawling:
```
portal/public/sprites/tiny_crawling/spider.png
portal/public/sprites/tiny_crawling/scorpion.png
portal/public/sprites/tiny_crawling/beetle.png
... etc
```

---

## Step 4 — Quality check per sprite

Each sprite should:
- Be exactly 16x16 pixels
- Have a transparent background (not white)
- Be clearly recognisable at that size
- Look good when scaled up to 64x64 in the portal UI

---

## Step 5 — Attribution

Because DawnLike is CC BY 4.0, add this to the repo README under a Credits section:

```
## Credits
Weapon, item, and block sprites from DawnLike 16x16 Universal Rogue-like Tileset
by DawnBringer and Dragonkin — https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181
License: CC BY 4.0
```

Creature sprites from Tiny Creatures (CC0) require no attribution but it's nice to include:
```
Creature sprites from Tiny Creatures pack — https://opengameart.org/content/tiny-creatures
License: CC0
```

---

## Fallback

If a specific creature from the list isn't in the Tiny Creatures pack, use:
- **16x16 Dungeon Tileset** (CC0): https://opengameart.org/content/16x16-dungeon-tileset
- **1-Bit Pack** (CC0): https://opengameart.org/content/1-bit-pack

Both are CC0 and have wide variety.
