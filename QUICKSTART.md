# Quick Start Guide - Kineticist Assistant

Get up and running with the Kineticist Assistant in 5 minutes!

## Step 1: Install the Module

1. Download or clone this module to your `Data/modules` folder
2. Make sure **socketlib** module is also installed
3. Enable both modules in your world
4. Restart Foundry

## Step 2: Open Your Kineticist Character

1. Open the character sheet for your Kineticist
2. Look for the new **"Kineticist Management"** section (should appear below your strikes list)
3. If you don't see it, check the console (F12) for errors

## Step 3: Configure Your Elements

The module tries to auto-detect your elemental gates, but if it doesn't work:

1. Click the **"Select Elements"** button on your character sheet
2. Check the boxes for your elemental gates (e.g., Fire and Water)
3. Click **"Save"**
4. Your gates will now display in the Kineticist Management section

## Step 4: Create a Hotbar Macro

For quick access to your abilities:

1. Click the **Macros** button (bottom toolbar)
2. Click **"Create Macro"**
3. Name it: `Kineticist Menu`
4. Set Type: **Script**
5. Paste this code:
   ```javascript
   game.pf2eKineticistAssistant.dialog.open();
   ```
6. Click **Save & Execute** to test it
7. Drag the macro to your hotbar

## Step 5: Use Your Abilities

### Via the Dialog:
1. Click your hotbar macro (or the "Kineticist Menu" button on your sheet)
2. Select an ability from the list
3. Click **"Use Ability"** to activate it

### Via the Character Sheet:
1. Scroll to the Kineticist Management section
2. Click any blast or impulse icon to use it directly

## Step 6: Add Animation (Optional)

If you have Sequencer and JB2A installed:

### Create an Animation Macro:
1. Create a new macro named: `Anim: Fire Blast`
2. Type: **Script**
3. Paste this code:
   ```javascript
   if (!game.modules.get("sequencer")?.active) return;

   const token = canvas.tokens.controlled[0];
   const targets = Array.from(game.user.targets);

   if (token && targets.length > 0) {
     for (const target of targets) {
       new Sequence()
         .effect()
         .file("jb2a.fire_bolt.orange")
         .atLocation(token)
         .stretchTo(target)
         .play();
     }
   }
   ```
4. Click **Save**

### Bind the Animation:
1. Open the Kineticist Menu
2. Select your Fire Blast
3. Click **"Bind Animation"**
4. Choose the `Anim: Fire Blast` macro
5. Click **Save**

### Test It:
1. Select your token
2. Target an enemy
3. Use your Fire Blast
4. Watch the animation play!

## Troubleshooting

### Module Not Showing
- Make sure your character is actually a Kineticist (has the Kineticist class)
- Check that the module is enabled
- Try refreshing the character sheet (close and reopen it)
- Check the browser console (F12) for errors

### No Abilities Found
- Make sure you have impulses or elemental blasts on your character
- Check that the abilities have the "impulse" trait or contain "elemental blast" in their name
- You may need to add custom traits to your abilities

### Animations Not Playing
- Make sure Sequencer and JB2A modules are installed and active
- Check that you've selected your token and targeted an enemy
- Verify the animation file path is correct (different JB2A versions have different paths)

### Dialog Won't Open
- Make sure you've selected your token first
- Check the console for errors
- Verify the module is fully loaded (`game.pf2eKineticistAssistant` should exist)

## Next Steps

- Read [MACROS.md](MACROS.md) for more macro examples
- Customize animations for each element
- Explore the API for advanced scripting
- Share your cool setups with the community!

## Quick Reference

### Macro to Open Menu
```javascript
game.pf2eKineticistAssistant.dialog.open();
```

### Macro to Select Elements
```javascript
const token = canvas.tokens.controlled[0];
if (token) game.pf2eKineticistAssistant.dialog.openElements(token.actor);
```

### Check if Character is Kineticist (Console)
```javascript
game.pf2eKineticistAssistant.api.isKineticist(game.user.character)
```

### Get All Abilities (Console)
```javascript
const actor = game.user.character;
console.log("Impulses:", game.pf2eKineticistAssistant.api.getImpulses(actor));
console.log("Blasts:", game.pf2eKineticistAssistant.api.getElementalBlasts(actor));
```

---

**Need more help?** Check the full [README.md](README.md) or open an issue on GitHub!
