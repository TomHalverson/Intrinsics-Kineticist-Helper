import { MODULE_ID } from "./module.js";
import { openElementSelector } from "./elementDialog.js";
import { openMacroBindingDialog } from "./macroDialog.js";
import {
  isKineticist,
  getElementalGates,
  getImpulses,
  getElementalBlasts,
  getAnimationMacro,
  setAnimationMacro,
  removeAnimationMacro
} from "./misc.js";

export function setupAPI() {
  game.pf2eKineticistAssistant = game.pf2eKineticistAssistant || {};

  game.pf2eKineticistAssistant.api = {
    // Utility functions
    isKineticist,
    getElementalGates,
    getImpulses,
    getElementalBlasts,
    getAnimationMacro,
    setAnimationMacro,
    removeAnimationMacro,

    // Dialog functions
    openElementSelector,
    openMacroBindingDialog,

    // Module ID
    MODULE_ID
  };

  console.log("PF2e Kineticist Assistant | API registered");
}
