import { setupAPI } from "./api.js";
import { setupHooks } from "./hooks.js";
import { setupSocket } from "./socket.js";

export const MODULE_ID = "pf2e-kineticist-assistant";

Hooks.once("init", async function () {
  console.log("PF2e Kineticist Assistant | Initializing");
});

Hooks.once("socketlib.ready", () => {
  if (!setupSocket())
    console.error(
      "Error: Unable to set up socket lib for PF2e Kineticist Assistant"
    );
});

Hooks.once("ready", async function () {
  console.log("PF2e Kineticist Assistant | Ready");
  setupAPI();
  setupHooks();
});
