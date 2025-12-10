import { MODULE_ID } from "./module.js";
import { openElementSelector } from "./elementDialog.js";
import { openMacroBindingDialog } from "./macroDialog.js";
import { openKineticistDialog } from "./kineticistDialog.js";
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
    openKineticistDialog,
    openElementSelector,
    openMacroBindingDialog,

    // Module ID
    MODULE_ID
  };

  // Also expose main dialog as a shortcut
  game.pf2eKineticistAssistant.dialog = {
    open: openKineticistDialog,
    openElements: openElementSelector,
    openMacroBinding: openMacroBindingDialog
  };

  console.log("PF2e Kineticist Assistant | API registered");
}
