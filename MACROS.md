# Kineticist Assistant Macros

This file contains macro scripts that you can create in Foundry to use with the Kineticist Assistant.

## How to Create These Macros

1. Open Foundry VTT
2. Click the "Macros" button in the bottom toolbar
3. Click "Create Macro"
4. Copy and paste the script below
5. Give it the name specified
6. Set the type to "Script"
7. Drag it to your hotbar for quick access

## Available Macros

### 1. Kineticist Menu

**Name:** `Kineticist Menu`
**Type:** Script
**Icon:** `icons/magic/fire/flame-burning-hand-purple.webp` (or any icon you prefer)

**Script:**
```javascript
// Opens the main Kineticist ability selection menu
if (game.pf2eKineticistAssistant) {
  game.pf2eKineticistAssistant.dialog.open();
} else {
  ui.notifications.error("Kineticist Assistant module is not active!");
}
```

**Description:** Opens a dialog showing all your Kineticist impulses and elemental blasts. Use this to quickly select and activate abilities, or bind animation macros to them.

---

### 2. Select Elements

**Name:** `Kineticist: Select Elements`
**Type:** Script
**Icon:** `icons/magic/symbols/runes-star-pentagon-orange.webp`

**Script:**
```javascript
// Opens the elemental gate selection dialog
const token = canvas.tokens.controlled[0];

if (!token) {
  ui.notifications.warn("Please select your token first!");
  return;
}

if (game.pf2eKineticistAssistant) {
  game.pf2eKineticistAssistant.dialog.openElements(token.actor);
} else {
  ui.notifications.error("Kineticist Assistant module is not active!");
}
```

**Description:** Opens a dialog to select which elemental gates your Kineticist has access to. Useful if auto-detection doesn't work or if your gates change.

---

### 3. Quick Blast (Example)

**Name:** `Quick Fire Blast`
**Type:** Script
**Icon:** `icons/magic/fire/projectile-fireball-orange-yellow.webp`

**Script:**
```javascript
// Quickly use your Fire Blast with animation
const token = canvas.tokens.controlled[0];

if (!token) {
  ui.notifications.warn("Please select your token first!");
  return;
}

const actor = token.actor;

// Find the fire blast ability
const blasts = game.pf2eKineticistAssistant.api.getElementalBlasts(actor);
const fireBlast = blasts.find(b => b.element === "fire");

if (!fireBlast) {
  ui.notifications.error("Fire Blast not found!");
  return;
}

// Get the item
const item = await fromUuid(fireBlast.uuid);

// Check for animation macro
const macroId = game.pf2eKineticistAssistant.api.getAnimationMacro(actor, fireBlast.id);
if (macroId) {
  const macro = game.macros.get(macroId);
  if (macro) await macro.execute();
}

// Use the blast
await item.toMessage();
```

**Description:** A quick-use macro for your Fire Blast. You can duplicate this for other elements by changing "fire" to "air", "earth", "metal", "water", or "wood".

---

## Animation Macro Examples

These are example macros you can bind to your abilities using the "Bind Animation" button.

### Example: Fire Blast Animation (Requires Sequencer & JB2A)

**Name:** `Anim: Fire Blast`
**Type:** Script

**Script:**
```javascript
if (!game.modules.get("sequencer")?.active) {
  return; // Silently fail if Sequencer isn't active
}

const token = canvas.tokens.controlled[0];
const targets = Array.from(game.user.targets);

if (token && targets.length > 0) {
  for (const target of targets) {
    new Sequence()
      .effect()
      .file("jb2a.fire_bolt.orange")
      .atLocation(token)
      .stretchTo(target)
      .scale(0.8)
      .play();
  }
}
```

---

### Example: Water Blast Animation

**Name:** `Anim: Water Blast`
**Type:** Script

**Script:**
```javascript
if (!game.modules.get("sequencer")?.active) {
  return;
}

const token = canvas.tokens.controlled[0];
const targets = Array.from(game.user.targets);

if (token && targets.length > 0) {
  for (const target of targets) {
    new Sequence()
      .effect()
      .file("jb2a.water_bolt.blue")
      .atLocation(token)
      .stretchTo(target)
      .scale(0.8)
      .play();
  }
}
```

---

### Example: Earth Impulse Animation

**Name:** `Anim: Stone Barrage`
**Type:** Script

**Script:**
```javascript
if (!game.modules.get("sequencer")?.active) {
  return;
}

const token = canvas.tokens.controlled[0];
const targets = Array.from(game.user.targets);

if (token && targets.length > 0) {
  for (const target of targets) {
    new Sequence()
      .effect()
      .file("jb2a.boulder.toss.01")
      .atLocation(token)
      .stretchTo(target)
      .play();
  }
}
```

---

## Tips

1. **Animation Assets**: The examples above require JB2A (Jules & Ben's Animated Assets). You can find free versions on Foundry's module browser.

2. **Customization**: You can customize the animations by:
   - Changing the `.file()` path to different animation files
   - Adjusting `.scale()` to make effects bigger or smaller
   - Adding `.sound()` for sound effects
   - Adding multiple `.effect()` calls for complex animations

3. **Token Targeting**: Most animations work best when you have both:
   - Your character's token selected
   - Target token(s) selected with the target tool

4. **Multiple Targets**: The examples above loop through all targeted tokens, so area effects work automatically.

5. **Silent Failure**: Animation macros use `if (!game.modules.get("sequencer")?.active) return;` at the start, so they won't show errors if animation modules aren't installed.
