# Pets Plus Minecraft Add-on

## Overview
Pets Plus is a custom Minecraft add-on that introduces a variety of new creatures, items, and mechanics to the game. This project includes a submission portal for creating and processing new creature sprites.

## Version 4.0.0 (Claude-fixed)
This version includes major bug fixes and improvements:
- **Spawning Fixes:** Resolved issues with invisible creatures by correcting render controllers and JSON structures.
- **Improved Models:** Fixed body shapes for slithering creatures like snakes.
- **Texture Pipeline:** Corrected the sprite/texture copying process to ensure all creatures display properly in-game.

## Project Structure
- `behavior_pack/`: Minecraft behavior definitions (entities, items, spawn rules).
- `resource_pack/`: Minecraft visual assets (textures, models, animations).
- `public/`: Assets and UI for the submission portal.
- `routes/`: Portal backend logic for sprite processing and pipeline management.
- `templates/`: Base JSON templates for generating new Minecraft content.

## Setup & Deployment
1. **Local Server:** Run `npm start` to launch the portal.
2. **GitHub Integration:** New creature submissions automatically trigger a GitHub Actions build, generating a fresh `.mcaddon` release.

## Developer Notes
- **Environment:** Designed for Raspberry Pi 4.
- **Build Automation:** Uses GitHub Actions to compile and release add-on files.
