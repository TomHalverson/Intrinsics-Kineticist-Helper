import { MODULE_ID } from "./module.js";

let socket;

export function setupSocket() {
  if (!game.modules.get("socketlib")?.active) {
    console.error("PF2e Kineticist Assistant requires the socketlib module");
    return false;
  }

  socket = window.socketlib.registerModule(MODULE_ID);

  // Register socket functions here if needed
  // Example: socket.register("functionName", functionToExecute);

  // Store socket globally for access from other modules
  game.pf2eKineticistAssistant = game.pf2eKineticistAssistant || {};
  game.pf2eKineticistAssistant.socket = socket;

  return true;
}
