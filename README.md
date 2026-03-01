# 🐾 Pets Plus

> A living, extensible Minecraft Bedrock add-on with tameable companion animals — built by a kid, for a kid.

---

## What is this?

Pets Plus adds tameable companion animals to Minecraft Bedrock. The first animal is a **Rat** that you find in caves, tame with bread, and send out to collect items for you.

But the real idea is bigger than one animal. Pets Plus is a **framework** — every new creature, weapon, block, or item gets added through the **Creature Creator portal**, a kid-friendly web app that turns a paper drawing into a working Minecraft add-on automatically.

---

## How to install on iPad

1. Go to [Releases](../../releases) and download the latest `pets_plus_vX.X.X.mcaddon`
2. AirDrop it to your iPad
3. Minecraft opens automatically and imports the pack
4. Create a new world → Add-Ons → enable **Pets Plus Behavior Pack** and **Pets Plus Resource Pack**
5. Go caving and find your rat 🐀

---

## The Rat

| Thing | Detail |
|-------|--------|
| Found in | Caves (underground, below Y:50, dark areas) |
| Tamed with | 🍞 Bread (33% chance per attempt) |
| Modes | Follow / Stay / Scavenge |
| Toggle with | 🌿 Rat Treat |
| Recall with | 🎵 Flute |
| Collects | Wood, stone, coal, iron ore |

**Tips:**
- Wild rats are skittish — sneak (crouch) before approaching
- They spawn in groups of 1–3
- When scavenging, they return to you automatically when full

---

## Project Structure

```
pets_plus/
├── behavior_pack/       # Entity AI, items, spawn rules
├── resource_pack/       # Textures, models, sounds, language
├── templates/           # Templates for new content (creature, weapon, block, item)
├── portal/              # Raspberry Pi web app — the Creature Creator
├── .github/workflows/   # Auto-packaging and GitHub Release pipeline
└── submissions/         # Created at runtime — stores portal submissions (gitignored)
```

---

## Adding New Content

New creatures, weapons, blocks, and items are submitted through the **Creature Creator portal** running on a Raspberry Pi at home. Kids:

1. Fill out a simple form (3–5 questions)
2. Draw the item on paper, take a photo
3. Approve the pixel art conversion
4. Hit submit

The portal automatically generates the pack files, commits to this repo, and publishes a new release. No coding required for new content.

---

## Development Notes

See [`pets_plus_scope.md`](./pets_plus_scope.md) for the full project scope, architecture decisions, and Raspberry Pi setup instructions.

---

## Roadmap

- [x] Stage 1 — Rat companion (follow, stay, scavenge)
- [ ] Stage 2 — Inventory tracking + return when full
- [ ] Stage 2 — Flute recall scripting
- [ ] Stage 3 — Active mining (block detection + break)
- [ ] Stage 4 — Custom 3D model + sounds
- [ ] Portal — Creature Creator web app
- [ ] Portal — Pixel art conversion flow
- [ ] Pipeline — Template engine
- [ ] Pipeline — GitHub Actions auto-release
