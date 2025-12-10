import { MODULE_ID } from "./module.js";
import { ELEMENTS } from "./const.js";
import {
  isKineticist,
  getElementalGates,
  getImpulses,
  getElementalBlasts,
  localize,
  getAnimationMacro
} from "./misc.js";
import { openElementSelector } from "./elementDialog.js";
import { openMacroBindingDialog } from "./macroDialog.js";
import { openKineticistDialog } from "./kineticistDialog.js";

export function setupHooks() {
  // Hook into character sheet rendering
  Hooks.on("renderCharacterSheetPF2e", async (_sheet, html, character) => {
    const actor = _sheet.actor;

    // Only add UI for Kineticists
    if (!character.owner || !isKineticist(actor)) {
      return;
    }

    console.log("PF2e Kineticist Assistant | Rendering UI for", actor.name);
    await renderKineticistUI(actor, html);
  });

  // Hook into chat messages for macro detection
  const KINETICIST_ACTIONS = {
    "Elemental Blast": "blast",
    "Impulse": "impulse",
  };

  Hooks.on("createChatMessage", async function (msg, _status, userid) {
    if (game.user.id !== userid) return;

    const itemName = msg?.item?.name || "";
    const traits = msg?.item?.system?.traits?.value || [];

    // Check if this is a kineticist ability
    if (traits.includes("impulse") || itemName.toLowerCase().includes("elemental blast")) {
      // We could add auto-animation triggering here if desired
    }
  });
}

async function renderKineticistUI(actor, html) {
  // Get or initialize elemental gates
  let selectedGates = actor.getFlag(MODULE_ID, "selectedGates") || [];

  // Auto-detect gates from character
  const detectedGates = getElementalGates(actor);

  // Merge detected with selected (prefer detected)
  if (detectedGates.length > 0) {
    selectedGates = detectedGates;
    await actor.setFlag(MODULE_ID, "selectedGates", selectedGates);
  }

  // Get impulses and blasts
  const impulses = getImpulses(actor);
  const blasts = getElementalBlasts(actor);

  // Build Gates section
  let gatesHtml = buildGatesSection(selectedGates, actor);

  // Build Elemental Blasts section
  let blastsHtml = await buildBlastsSection(blasts, actor);

  // Build Impulses section
  let impulsesHtml = await buildImpulsesSection(impulses, actor);

  // Build buttons
  let buttonsHtml = `
    <div class="kineticist-buttons" style="margin-top:1em; display: flex; gap: 1em; justify-content: flex-end; flex-wrap: wrap;">
      <button type="button" class="open-kineticist-dialog-btn">
        <i class='fa-solid fa-hand-sparkles'></i> ${localize("buttons.openDialog") || "Kineticist Menu"}
      </button>
      <button type="button" class="select-elements-btn">
        <i class='fa-solid fa-atom'></i> ${localize("buttons.selectElements") || "Select Elements"}
      </button>
    </div>
  `;

  // Combine everything
  let fieldsetHtml = `
    <fieldset class="kineticist-fieldset" style="margin-top:1em;">
      <h4>${localize("ui.title") || "Kineticist Management"}</h4>
      ${gatesHtml}
      <hr style="margin: 1em 0;">
      ${blastsHtml}
      <hr style="margin: 1em 0;">
      ${impulsesHtml}
      ${buttonsHtml}
    </fieldset>
  `;

  // Insert into character sheet after strikes list
  const strikesList = html.find(".sheet-body .strikes-list");
  if (strikesList.length > 0) {
    strikesList.after(fieldsetHtml);
  } else {
    // Fallback: insert at end of sheet body
    html.find(".sheet-body").append(fieldsetHtml);
  }

  // Attach event listeners
  attachEventListeners(html, actor, impulses, blasts);
}

function buildGatesSection(gates, actor) {
  if (gates.length === 0) {
    return `
      <div class="kineticist-section elemental-gates">
        <label><strong>${localize("ui.elementalGates") || "Elemental Gates"}</strong></label>
        <div class="gates-row" style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
          <span style="opacity: 0.6; font-style: italic;">${localize("ui.noGatesSelected") || "No elemental gates selected. Click 'Select Elements' below."}</span>
        </div>
      </div>
    `;
  }

  const gateElements = gates.map(element => {
    const elemData = ELEMENTS[element];
    if (!elemData) return "";

    return `
      <div class="gate-element" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <img
          src="${elemData.icon}"
          data-tooltip="${elemData.name} Gate"
          data-tooltip-direction="UP"
          style="width:40px;height:40px;border:2px solid ${elemData.color};border-radius:50%;padding:4px;background:rgba(0,0,0,0.3);"
        >
        <span style="font-size: 0.75em; color: ${elemData.color};">${elemData.name}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="kineticist-section elemental-gates">
      <label><strong>${localize("ui.elementalGates") || "Elemental Gates"}</strong></label>
      <div class="gates-row" style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
        ${gateElements}
      </div>
    </div>
  `;
}

async function buildBlastsSection(blasts, actor) {
  if (blasts.length === 0) {
    return `
      <div class="kineticist-section elemental-blasts">
        <label><strong>${localize("ui.elementalBlasts") || "Elemental Blasts"}</strong></label>
        <div style="opacity: 0.6; font-style: italic; margin-top: 8px;">
          ${localize("ui.noBlasts") || "No elemental blasts found"}
        </div>
      </div>
    `;
  }

  const rollData = actor.getRollData();
  const blastElements = [];

  for (const blast of blasts) {
    const elemData = ELEMENTS[blast.element];
    const macroId = getAnimationMacro(actor, blast.id);
    const hasMacro = !!macroId;

    const enrichedDesc = await TextEditor.enrichHTML(blast.description, {
      rollData,
      async: true,
    });

    blastElements.push(`
      <div class="blast-item" data-item-id="${blast.id}" data-item-uuid="${blast.uuid}">
        <img
          src="${blast.img}"
          data-tooltip="<b>${blast.name}</b><hr>${enrichedDesc.replaceAll('"', '&quot;')}<hr><p><b>Left Click:</b> Use Blast</p><p><b>Right Click:</b> ${hasMacro ? 'Edit' : 'Bind'} Animation Macro</p>"
          data-tooltip-direction="UP"
          class="blast-img"
          style="width:36px;height:36px;border:2px solid ${elemData?.color || '#999'};border-radius:4px;cursor:pointer;position:relative;"
        >
        ${hasMacro ? '<i class="fas fa-film" style="position:absolute;top:-4px;right:-4px;color:gold;font-size:10px;text-shadow:1px 1px 2px black;"></i>' : ''}
      </div>
    `);
  }

  return `
    <div class="kineticist-section elemental-blasts">
      <label><strong>${localize("ui.elementalBlasts") || "Elemental Blasts"}</strong></label>
      <div class="blasts-row" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        ${blastElements.join("")}
      </div>
    </div>
  `;
}

async function buildImpulsesSection(impulses, actor) {
  if (impulses.length === 0) {
    return `
      <div class="kineticist-section impulses">
        <label><strong>${localize("ui.impulses") || "Impulses"}</strong></label>
        <div style="opacity: 0.6; font-style: italic; margin-top: 8px;">
          ${localize("ui.noImpulses") || "No impulses found"}
        </div>
      </div>
    `;
  }

  const rollData = actor.getRollData();
  const impulseElements = [];

  for (const impulse of impulses) {
    const macroId = getAnimationMacro(actor, impulse.id);
    const hasMacro = !!macroId;

    const enrichedDesc = await TextEditor.enrichHTML(impulse.description, {
      rollData,
      async: true,
    });

    const actionCostIcon = getActionCostIcon(impulse.actionCost);

    impulseElements.push(`
      <div class="impulse-item" data-item-id="${impulse.id}" data-item-uuid="${impulse.uuid}">
        <img
          src="${impulse.img}"
          data-tooltip="<b>${impulse.name}</b>${actionCostIcon ? ' ' + actionCostIcon : ''}<hr>${enrichedDesc.replaceAll('"', '&quot;')}<hr><p><b>Left Click:</b> Use Impulse</p><p><b>Right Click:</b> ${hasMacro ? 'Edit' : 'Bind'} Animation Macro</p>"
          data-tooltip-direction="UP"
          class="impulse-img"
          style="width:36px;height:36px;border:2px solid #9c27b0;border-radius:4px;cursor:pointer;position:relative;"
        >
        ${hasMacro ? '<i class="fas fa-film" style="position:absolute;top:-4px;right:-4px;color:gold;font-size:10px;text-shadow:1px 1px 2px black;"></i>' : ''}
      </div>
    `);
  }

  return `
    <div class="kineticist-section impulses">
      <label><strong>${localize("ui.impulses") || "Impulses"}</strong></label>
      <div class="impulses-row" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        ${impulseElements.join("")}
      </div>
    </div>
  `;
}

function getActionCostIcon(actionCost) {
  if (!actionCost) return "";

  const numActions = typeof actionCost === "number" ? actionCost :
                     actionCost === "1" ? 1 :
                     actionCost === "2" ? 2 :
                     actionCost === "3" ? 3 : 0;

  if (numActions === 1) return '<i class="fa-solid fa-1"></i>';
  if (numActions === 2) return '<i class="fa-solid fa-2"></i>';
  if (numActions === 3) return '<i class="fa-solid fa-3"></i>';

  return "";
}

function attachEventListeners(html, actor, impulses, blasts) {
  const fieldset = html.find(".kineticist-fieldset");

  // Open Kineticist Dialog button
  fieldset.find(".open-kineticist-dialog-btn").on("click", async () => {
    await openKineticistDialog();
  });

  // Select elements button
  fieldset.find(".select-elements-btn").on("click", async () => {
    await openElementSelector(actor);
  });

  // Blast item clicks
  fieldset.find(".blast-item").each(function() {
    const $item = $(this);
    const itemUuid = $item.data("item-uuid");
    const itemId = $item.data("item-id");

    // Left click - use the blast
    $item.find(".blast-img").on("click", async (event) => {
      if (event.button !== 0) return; // Only left click

      const item = await fromUuid(itemUuid);
      if (item) {
        // Check if there's an animation macro
        const macroId = getAnimationMacro(actor, itemId);
        if (macroId) {
          const macro = game.macros.get(macroId);
          if (macro) {
            await macro.execute();
          }
        }

        // Use the item
        if (item.system?.actions) {
          await item.toMessage();
        } else if (item.type === "weapon") {
          // For weapon-type blasts, trigger the attack
          await item.toMessage();
        }
      }
    });

    // Right click - bind animation macro
    $item.find(".blast-img").on("contextmenu", async (event) => {
      event.preventDefault();
      await openMacroBindingDialog(actor, itemId, itemUuid);
    });
  });

  // Impulse item clicks
  fieldset.find(".impulse-item").each(function() {
    const $item = $(this);
    const itemUuid = $item.data("item-uuid");
    const itemId = $item.data("item-id");

    // Left click - use the impulse
    $item.find(".impulse-img").on("click", async (event) => {
      if (event.button !== 0) return; // Only left click

      const item = await fromUuid(itemUuid);
      if (item) {
        // Check if there's an animation macro
        const macroId = getAnimationMacro(actor, itemId);
        if (macroId) {
          const macro = game.macros.get(macroId);
          if (macro) {
            await macro.execute();
          }
        }

        // Use the item
        await item.toMessage();
      }
    });

    // Right click - bind animation macro
    $item.find(".impulse-img").on("contextmenu", async (event) => {
      event.preventDefault();
      await openMacroBindingDialog(actor, itemId, itemUuid);
    });
  });
}
