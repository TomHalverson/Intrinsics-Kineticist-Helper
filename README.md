# PF2e Kineticist Assistant

![Foundry v12](https://img.shields.io/badge/Foundry-v12-informational)

A FoundryVTT module for Pathfinder 2e that provides enhanced management and animation support for Kineticist characters.

## Features

### 🌊 Elemental Gate Management
- **Automatic Detection**: The module automatically detects elemental gates from your character sheet
- **Manual Selection**: Alternatively, manually select which elemental gates your Kineticist has access to
- **Visual Display**: Beautiful visual representation of your elemental gates on the character sheet
- Supports all six elements: Air, Earth, Fire, Metal, Water, and Wood

### ⚡ Elemental Blast Tracking
- Automatically identifies elemental blast abilities from your character
- Quick-access buttons directly on your character sheet
- Visual indicators showing which blasts you have available
- Element-specific color coding for easy identification

### 💫 Impulse Management
- Tracks all your Kineticist impulses
- Displays them in an organized section on your character sheet
- Quick activation via left-click
- Shows action cost for each impulse

### 🎬 Animation Macro Binding
- **Bind Animation Macros**: Right-click any impulse or blast to bind an animation macro
- **Automatic Execution**: When you use an ability, its bound macro executes automatically
- **Compatible with Popular Modules**: Works great with Sequencer, Automated Animations, and other animation modules
- **Visual Indicators**: Abilities with bound macros show a golden film icon

## Installation

### Via Manifest URL
1. Open FoundryVTT
2. Go to the "Add-on Modules" tab
3. Click "Install Module"
4. Paste this manifest URL: `[Your manifest URL here]`
5. Click "Install"

### Manual Installation
1. Download the latest release
2. Extract the zip file to your `Data/modules` folder
3. Restart FoundryVTT
4. Enable the module in your world

## Requirements

- **Foundry VTT**: Version 12 or higher (verified on v13)
- **Game System**: Pathfinder 2e (PF2e)
- **Required Modules**:
  - [socketlib](https://github.com/manuelVo/foundryvtt-socketlib) - For socket communication

## Usage

### Basic Setup

1. **Enable the Module**: After installation, enable the module in your world's module settings
2. **Open a Kineticist Character**: The module will automatically detect if a character is a Kineticist
3. **Configure Elements**: If auto-detection doesn't work, click "Select Elements" to manually choose your elemental gates

### Using the Kineticist Menu

There are three ways to access your Kineticist abilities:

1. **Via Character Sheet**: Open your character sheet and click the "Kineticist Menu" button in the Kineticist Management section
2. **Via Macro**: Create a macro with the code `game.pf2eKineticistAssistant.dialog.open()` and drag it to your hotbar
3. **Via API**: Use the console or another macro to call the dialog

### Using the Dialog

1. **Select an Ability**: Click on any impulse or blast in the list
2. **Use Ability**: Click "Use Ability" to activate it (and trigger any bound animation)
3. **Bind Animation**: Click "Bind Animation" to assign an animation macro to the selected ability
4. **Right-Click Shortcut**: Right-click any ability row to quickly open the macro binding dialog

### Character Sheet Integration

The module adds a "Kineticist Management" section to your character sheet with:
- Visual display of your elemental gates
- Quick-access icons for all blasts and impulses
- Buttons to open the main menu and element selector
- Click icons to use abilities directly from the sheet
- Right-click icons to bind animations

### Binding Animation Macros

1. **From Dialog**: Select an ability and click "Bind Animation"
2. **From Sheet**: Right-click any ability icon on the character sheet
3. **Choose a Macro**: Select from your available macros
4. **Test It**: Use the ability - the animation will play automatically!

### Creating Hotbar Macros

For quick access, create these macros and drag them to your hotbar:

**Kineticist Menu Macro:**
```javascript
game.pf2eKineticistAssistant.dialog.open();
```

**Select Elements Macro:**
```javascript
const token = canvas.tokens.controlled[0];
if (token) {
  game.pf2eKineticistAssistant.dialog.openElements(token.actor);
} else {
  ui.notifications.warn("Please select your token first!");
}
```

See [MACROS.md](MACROS.md) for more examples including animation macros and quick-use ability macros.

### Example Animation Macro

Here's a simple example macro you could bind to a Fire Blast:

```javascript
// Example: Fire Blast Animation
if (game.modules.get("sequencer")?.active) {
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
}
```

## Character Sheet Display

The module adds a new "Kineticist Management" section to your character sheet, which includes:

- **Elemental Gates**: Visual representation of your selected elements
- **Elemental Blasts**: Quick-access buttons for your blasts
- **Impulses**: All your available impulses in one place
- **Select Elements Button**: For manual element configuration

## API

The module exposes an API for advanced users and other modules:

### Dialog API (Simplified)

```javascript
// Open the main Kineticist abilities dialog
game.pf2eKineticistAssistant.dialog.open()

// Open element selector dialog
game.pf2eKineticistAssistant.dialog.openElements(actor)

// Open macro binding dialog
game.pf2eKineticistAssistant.dialog.openMacroBinding(actor, itemId, itemUuid)
```

### Full API

```javascript
// Check if an actor is a Kineticist
game.pf2eKineticistAssistant.api.isKineticist(actor)

// Get elemental gates
game.pf2eKineticistAssistant.api.getElementalGates(actor)

// Get impulses
game.pf2eKineticistAssistant.api.getImpulses(actor)

// Get elemental blasts
game.pf2eKineticistAssistant.api.getElementalBlasts(actor)

// Manage animation macros
game.pf2eKineticistAssistant.api.getAnimationMacro(actor, itemId)
game.pf2eKineticistAssistant.api.setAnimationMacro(actor, itemId, macroId)
game.pf2eKineticistAssistant.api.removeAnimationMacro(actor, itemId)

// Open dialogs (direct access)
game.pf2eKineticistAssistant.api.openKineticistDialog()
game.pf2eKineticistAssistant.api.openElementSelector(actor)
game.pf2eKineticistAssistant.api.openMacroBindingDialog(actor, itemId, itemUuid)
```

## Compatibility

This module is designed to work alongside other popular FoundryVTT modules:

- ✅ Sequencer
- ✅ Automated Animations
- ✅ JB2A (Jules&Ben's Animated Assets)
- ✅ Token Magic FX
- ✅ And more!

## Known Issues

- This module is in active development and may have bugs
- Some Kineticist abilities might not be detected automatically depending on how they're implemented in your game
- If auto-detection fails, use the manual element selection feature

## Support

If you encounter any issues or have suggestions:

1. Check the [Issues](https://github.com/TomHalverson/pf2e-kineticist-assistant/issues) page
2. Create a new issue with details about your problem
3. Include your Foundry version, module version, and any error messages

## Changelog

### Version 0.1.0 (Initial Release)
- ✨ Elemental gate detection and management
- ✨ Impulse tracking and display
- ✨ Elemental blast integration
- ✨ Animation macro binding system
- ✨ Character sheet UI integration
- ✨ Full API for external module integration

## Credits

- Inspired by the [PF2e Runesmith Assistant](https://github.com/ChasarooniZ/pf2e-runesmith-assistant)
- Developed by Intrinsic
- Thanks to the FoundryVTT and PF2e communities

## License

This module is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Enjoy playing your Kineticist!** 🌊🔥⚡🪨🌳⚙️
