# 🐾 Pets Plus — Creator Portal

Pets Plus is a dynamic Minecraft Bedrock Edition add-on and web-based creation suite. It allows anyone to design new creatures, weapons, blocks, and items through a simple web portal and have them automatically built, versioned, and deployed to Minecraft.

## 🚀 Features

### **1. The Creator Portal**
A kid-friendly web interface for generating Minecraft content:
- **Magic Mirror (OpenGameArt Search):** Real-time pixel art search engine. Simply name your creation, and the portal finds matching high-quality sprites.
- **Smart Crop:** Automatically centers and crops external spritesheets (32x32) to ensure perfect rendering in Minecraft.
- **Form-to-Code:** Turns simple questions ("Where does it live?", "How friendly is it?") into complex Minecraft Behavior JSON.

### **2. Dynamic Add-on Engine**
- **Characteristic Animations:** Automatic assignment of movement styles (Flying, Slithering, Walking) based on body shape.
- **Diverse Categories:** Support for custom Creatures, Weapons, Blocks, and Items.
- **Automated Balancing:** Sets health, speed, and collision boxes based on the chosen creature size.

### **3. Automatic Release Pipeline**
Every submission triggers a full CI/CD cycle:
1. **Packaging:** Zips Behavior and Resource packs into a single `.mcaddon` file.
2. **Versioning:** Automatically increments the version number (currently **v4.0.5+**).
3. **Distribution:** Publishes the new build to [GitHub Releases](https://github.com/thedza49/pets-plus/releases) with an auto-generated inventory list of all current project creations.

## 📥 How to Install & Play

The add-on is distributed via **GitHub Releases** for easy access.

1.  **Download**: Go to the [Releases page](https://github.com/thedza49/pets-plus/releases) and download the latest `.mcaddon` file.
2.  **Import**: AirDrop or open the file on your device to launch Minecraft and import the packs.
3.  **World Setup**:
    *   Activate **Pets Plus BP** and **Pets Plus RP** in your world settings.
    *   **⚠️ Critical**: Enable **Beta APIs** in the Experiments menu.

## 📂 Project Structure
- `behavior_pack/`: Real-time Minecraft logic, entities, and spawn rules.
- `resource_pack/`: Models, textures, and animations.
- `public/`: The frontend code for the Creator Portal.
- `routes/`: Backend logic handling search and the submission pipeline.
- `templates/`: Minecraft JSON blueprints used to generate new content.

---
*Developed by Daniel using OpenClaw.*
