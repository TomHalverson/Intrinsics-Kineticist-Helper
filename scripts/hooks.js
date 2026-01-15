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
  // Add global helper function for debugging
  window.inspectKineticistActor = function(actorName) {
    const actor = game.actors.getName(actorName) || canvas.tokens.controlled[0]?.actor;
    if (!actor) {
      console.error("No actor found. Either pass an actor name or select a token.");
      return;
    }

    console.log("\n=== KINETICIST ACTOR INSPECTOR ===");
    console.log("Actor:", actor.name);
    console.log("\n--- STRIKES (actor.system.actions) ---");
    const strikes = actor.system?.actions || [];
    console.log("Total strikes:", strikes.length);
    strikes.forEach((strike, i) => {
      console.log(`\nStrike ${i}:`, {
        label: strike.label,
        slug: strike.slug,
        item: strike.item?.name,
        itemSlug: strike.item?.slug,
        totalModifier: strike.totalModifier,
        variants: strike.variants,
        ready: strike.ready,
        visible: strike.visible,
        fullStrike: strike
      });
    });

    console.log("\n--- ELEMENTAL BLAST FLAGS ---");
    const blastFlags = actor.flags?.pf2e?.kineticist?.elementalBlast || {};
    console.log("Flags:", JSON.stringify(blastFlags, null, 2));
    console.log("Flags object:", blastFlags);

    console.log("\n--- KINETIC AURA EFFECT ---");
    const auraEffects = actor.itemTypes.effect?.filter(e =>
      e.slug?.includes("kinetic-aura") || e.name?.toLowerCase().includes("kinetic aura")
    );
    console.log("Aura effects count:", auraEffects?.length);
    auraEffects?.forEach((effect, i) => {
      console.log(`  Effect ${i}:`, effect.name, "| slug:", effect.slug);
    });

    console.log("\n--- ELEMENTAL BLAST ITEM DETAILS ---");
    const ebItem = actor.items.find(item =>
      item.slug === "elemental-blast" || item.name.toLowerCase() === "elemental blast"
    );
    if (ebItem) {
      console.log("Name:", ebItem.name);
      console.log("Type:", ebItem.type);
      console.log("Slug:", ebItem.slug);
      console.log("System data keys:", Object.keys(ebItem.system || {}));
      console.log("Full item:", ebItem);
    } else {
      console.log("No elemental blast item found");
    }

    console.log("\n--- ALL ACTOR PROPERTIES (filtered for 'blast', 'strike', 'action') ---");
    const relevantProps = Object.keys(actor).filter(k =>
      k.toLowerCase().includes('blast') ||
      k.toLowerCase().includes('strike') ||
      k.toLowerCase().includes('action')
    );
    console.log("Actor properties:", relevantProps);
    relevantProps.forEach(prop => {
      console.log(`  ${prop}:`, actor[prop]);
    });

    console.log("\n--- CHARACTER SHEET HTML STRIKES ---");
    const sheet = actor.sheet;
    if (sheet && sheet.rendered) {
      const html = sheet.element;
      if (html) {
        const strikeElements = html.find('.strikes-list .item[data-item-id], .strikes-list .action[data-action-index]');
        console.log(`Found ${strikeElements.length} strike elements in HTML`);
        strikeElements.each(function(i) {
          const $elem = $(this);
          const name = $elem.find('.item-name, .action-name').text().trim() || $elem.attr('data-name') || 'Unknown';
          const itemId = $elem.attr('data-item-id');
          const actionIndex = $elem.attr('data-action-index');
          const slug = $elem.attr('data-slug');
          console.log(`  HTML Strike ${i}:`, name, "| itemId:", itemId, "| actionIndex:", actionIndex, "| slug:", slug);
        });
      } else {
        console.log("Sheet element not available");
      }
    } else {
      console.log("Sheet not rendered");
    }

    console.log("\n=== END INSPECTOR ===\n");
    console.log("To run again: inspectKineticistActor('Character Name')");
    console.log("Or with selected token: inspectKineticistActor()");
  };

  console.log("PF2e Kineticist Assistant | Helper function loaded: inspectKineticistActor()");
  console.log("Usage: inspectKineticistActor('Character Name') or select a token and run inspectKineticistActor()");

  // Add helper function to inspect macro bindings
  window.inspectMacroBindings = function(actorName) {
    const actor = game.actors.getName(actorName) || canvas.tokens.controlled[0]?.actor;
    if (!actor) {
      console.error("No actor found. Either pass an actor name or select a token.");
      return;
    }

    console.log("\n=== MACRO BINDINGS INSPECTOR ===");
    console.log("Actor:", actor.name);

    const animations = actor.getFlag("intrinsics-kineticist-helper", "animations") || {};
    console.log("\nStored animations flag:", animations);
    console.log("\nBound macros:");

    if (Object.keys(animations).length === 0) {
      console.log("  No macros bound");
    } else {
      for (const [itemId, macroId] of Object.entries(animations)) {
        const macro = game.macros.get(macroId);
        console.log(`  ${itemId}: ${macroId} -> ${macro?.name || 'MACRO NOT FOUND'}`);
      }
    }

    console.log("\n=== END INSPECTOR ===\n");
  };

  console.log("PF2e Kineticist Assistant | Helper function loaded: inspectMacroBindings()");
  console.log("Usage: inspectMacroBindings('Character Name') or select a token and run inspectMacroBindings()");

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

  // DEBUG: Hook to capture elemental blast strike data when it's rolled
  Hooks.on("pf2e.preRollStrike", (statistic, context) => {
    if (statistic.label && statistic.label.toLowerCase().includes("elemental blast")) {
      console.log("=== PF2e Kineticist Assistant | ELEMENTAL BLAST STRIKE DEBUG ===");
      console.log("Strike Label:", statistic.label);
      console.log("Full Statistic Object:", statistic);
      console.log("Context:", context);
      console.log("Total Modifier:", statistic.totalModifier || statistic.mod || "N/A");
      console.log("Modifiers:", statistic.modifiers);
      console.log("Actor:", statistic.actor);
      console.log("==============================================================");
    }
  });

  // DEBUG: Capture when items are used
  Hooks.on("pf2e.preUseItem", (item, context) => {
    if (item.name && item.name.toLowerCase().includes("elemental blast")) {
      console.log("=== PF2e Kineticist Assistant | ELEMENTAL BLAST ITEM USE DEBUG ===");
      console.log("Item Name:", item.name);
      console.log("Full Item:", item);
      console.log("Context:", context);
      console.log("Item Type:", item.type);
      console.log("Item System:", item.system);
      console.log("==================================================================");
    }
  });

  // DEBUG: Track when Kinetic Aura is toggled to see what changes
  Hooks.on("createItem", (item, _options, _userId) => {
    if (!item.parent || item.parent.type !== "character") return;

    const actor = item.parent;
    if (!isKineticist(actor)) return;

    // Check if this is Kinetic Aura being activated (effect item)
    if (item.type === "effect" &&
        (item.slug?.includes("kinetic-aura") ||
         item.name?.toLowerCase().includes("kinetic aura"))) {

      console.log("=== PF2e Kineticist Assistant | KINETIC AURA ACTIVATED ===");
      console.log("Actor:", actor.name);
      console.log("Effect Item:", item.name);
      console.log("Effect Slug:", item.slug);

      // Use setTimeout to let the system finish processing the effect
      // Check at multiple intervals to see when strikes appear
      setTimeout(() => {
        console.log("--- KINETIC AURA: Checking actor state 100ms after activation ---");
        logActorBlastState(actor, "100ms AFTER KINETIC AURA ACTIVATION");
      }, 100);

      setTimeout(() => {
        console.log("--- KINETIC AURA: Checking actor state 500ms after activation ---");
        logActorBlastState(actor, "500ms AFTER KINETIC AURA ACTIVATION");
      }, 500);

      setTimeout(() => {
        console.log("--- KINETIC AURA: Checking actor state 1000ms after activation ---");
        logActorBlastState(actor, "1000ms AFTER KINETIC AURA ACTIVATION");
      }, 1000);

      setTimeout(() => {
        console.log("--- KINETIC AURA: Checking actor state 2000ms after activation ---");
        logActorBlastState(actor, "2000ms AFTER KINETIC AURA ACTIVATION");
      }, 2000);

      console.log("==========================================================");
    }
  });

  Hooks.on("deleteItem", (item, _options, _userId) => {
    if (!item.parent || item.parent.type !== "character") return;

    const actor = item.parent;
    if (!isKineticist(actor)) return;

    // Check if this is Kinetic Aura being deactivated
    if (item.type === "effect" &&
        (item.slug?.includes("kinetic-aura") ||
         item.name?.toLowerCase().includes("kinetic aura"))) {

      console.log("=== PF2e Kineticist Assistant | KINETIC AURA DEACTIVATED ===");
      console.log("Actor:", actor.name);
      console.log("Effect Item:", item.name);
      console.log("Effect Slug:", item.slug);

      // Use setTimeout to let the system finish processing the effect removal
      setTimeout(() => {
        console.log("--- KINETIC AURA: Checking actor state AFTER deactivation ---");
        logActorBlastState(actor, "AFTER KINETIC AURA DEACTIVATION");
      }, 500);

      console.log("============================================================");
    }
  });

  // DEBUG: Track when actor is updated (might catch derived data updates)
  Hooks.on("updateActor", (actor, changes, _options, _userId) => {
    if (!isKineticist(actor)) return;

    // Check if this update might be related to kinetic aura
    if (changes.system || changes.flags) {
      const hasKineticAura = actor.itemTypes.effect?.some(e =>
        e.slug?.includes("kinetic-aura") ||
        e.name?.toLowerCase().includes("kinetic aura")
      );

      // Only log if kinetic aura is active (we're interested in what changes when it's on)
      if (hasKineticAura) {
        console.log("=== PF2e Kineticist Assistant | ACTOR UPDATED (Kinetic Aura Active) ===");
        console.log("Actor:", actor.name);
        console.log("Changes:", changes);
        console.log("Has system changes:", !!changes.system);
        console.log("Has flag changes:", !!changes.flags);

        if (changes.flags?.pf2e?.kineticist) {
          console.log("Kineticist flag changes detected:", changes.flags.pf2e.kineticist);
        }

        console.log("======================================================================");
      }
    }
  });

  // Hook to refresh the UI when actor data changes (e.g., when Kinetic Aura activates)
  Hooks.on("updateActor", async (actor, changes, _options, _userId) => {
    if (!isKineticist(actor)) return;

    // Re-render the character sheet when system or flags change
    // This will trigger our renderCharacterSheetPF2e hook and update the UI
    if (changes.system || changes.flags?.pf2e) {
      const sheet = actor.sheet;
      if (sheet && sheet.rendered) {
        // Small delay to let the system finish updating
        setTimeout(() => {
          sheet.render(false); // false = don't force re-render if not needed
        }, 100);
      }
    }
  });

  // DEBUG: Hook into PF2e-specific actor preparation (if available)
  Hooks.on("pf2e.prepareActor", (actor) => {
    if (!isKineticist(actor)) return;

    console.log("=== PF2e Kineticist Assistant | ACTOR PREPARED ===");
    console.log("Actor:", actor.name);
    logActorBlastState(actor, "DURING prepareActor");
    console.log("===================================================");
  });
}

/**
 * Helper function to log comprehensive actor blast state
 */
function logActorBlastState(actor, context = "") {
  console.log(`\n========== ACTOR BLAST STATE ${context} ==========`);
  console.log("Actor:", actor.name);

  // Check for Kinetic Aura
  const kineticAuraEffects = actor.itemTypes.effect?.filter(e =>
    e.slug?.includes("kinetic-aura") ||
    e.name?.toLowerCase().includes("kinetic aura")
  );
  console.log("Kinetic Aura Effects:", kineticAuraEffects?.length || 0, kineticAuraEffects);

  // Check elemental blast flags
  const blastFlags = actor.flags?.pf2e?.kineticist?.elementalBlast || {};
  console.log("Elemental Blast Flags:", blastFlags);

  // Check for elemental blast item
  const blastItem = actor.items.find(item =>
    item.slug === "elemental-blast" ||
    item.name.toLowerCase() === "elemental blast"
  );
  console.log("Elemental Blast Item:", {
    found: !!blastItem,
    name: blastItem?.name,
    slug: blastItem?.slug,
    type: blastItem?.type
  });

  // Check all strikes/actions
  const strikes = actor.system?.actions || [];
  console.log("Total Strikes on Actor:", strikes.length);

  // Filter to elemental blast strikes
  const ebStrikes = strikes.filter(s =>
    s.item?.slug === "elemental-blast" ||
    s.label?.toLowerCase().includes("elemental blast") ||
    s.slug?.toLowerCase().includes("elemental-blast")
  );

  console.log("Elemental Blast Strikes Found:", ebStrikes.length);
  ebStrikes.forEach((strike, idx) => {
    console.log(`  Elemental Blast Strike ${idx + 1}:`, {
      label: strike.label,
      slug: strike.slug,
      itemName: strike.item?.name,
      itemSlug: strike.item?.slug,
      totalModifier: strike.totalModifier,
      hasVariants: !!strike.variants,
      variantCount: strike.variants?.length,
      ready: strike.ready,
      visible: strike.visible
    });
  });

  // Check statistics
  if (typeof actor.getStatistic === 'function') {
    console.log("Checking for blast statistics...");

    const testStatNames = [
      'elemental-blast',
      'metal-blast',
      'metal-blast-melee',
      'metal-blast-ranged',
      'elemental-blast-metal',
      'elemental-blast-metal-melee',
      'elemental-blast-metal-ranged',
      'fire-blast',
      'fire-blast-melee',
      'fire-blast-ranged',
      'water-blast',
      'water-blast-melee',
      'water-blast-ranged',
      'air-blast',
      'air-blast-melee',
      'air-blast-ranged',
      'earth-blast',
      'earth-blast-melee',
      'earth-blast-ranged',
      'wood-blast',
      'wood-blast-melee',
      'wood-blast-ranged'
    ];

    const foundStats = [];
    for (const name of testStatNames) {
      const stat = actor.getStatistic(name);
      if (stat) {
        foundStats.push({
          name,
          mod: stat.mod,
          totalModifier: stat.totalModifier,
          hasRoll: typeof stat.roll === 'function',
          hasVariants: !!stat.variants,
          variantCount: stat.variants?.length
        });
      }
    }

    console.log("Blast Statistics Found:", foundStats.length);
    foundStats.forEach(stat => {
      console.log("  Statistic:", stat);
    });
  }

  // Check for any blast-related properties on actor
  const actorBlastKeys = Object.keys(actor).filter(k =>
    k.toLowerCase().includes('blast')
  );
  console.log("Actor properties containing 'blast':", actorBlastKeys);

  const systemBlastKeys = Object.keys(actor.system || {}).filter(k =>
    k.toLowerCase().includes('blast')
  );
  console.log("Actor.system properties containing 'blast':", systemBlastKeys);

  console.log("=".repeat(50) + "\n");
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

  // Wait a tick for DOM to update, then attach event listeners
  setTimeout(() => {
    attachEventListeners(html, actor, impulses, blasts);
  }, 0);
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
  // Check if kinetic aura is active
  const hasKineticAura = actor.itemTypes.effect?.some(e =>
    e.slug?.includes("kinetic-aura") || e.name?.toLowerCase().includes("kinetic aura")
  );

  if (blasts.length === 0) {
    const message = hasKineticAura
      ? (localize("ui.noBlasts") || "No elemental blasts found")
      : "Use Channel Elements to activate Kinetic Aura and enable Elemental Blast";

    return `
      <div class="kineticist-section elemental-blasts">
        <label><strong>${localize("ui.elementalBlasts") || "Elemental Blasts"}</strong></label>
        <div style="opacity: 0.6; font-style: italic; margin-top: 8px;">
          ${message}
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

    // Use the modern Foundry API for enrichHTML
    const textEditor = foundry.applications?.ux?.TextEditor?.implementation || TextEditor;
    const enrichedDesc = await textEditor.enrichHTML(blast.description, {
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

  // Use the modern Foundry API for enrichHTML
  const textEditor = foundry.applications?.ux?.TextEditor?.implementation || TextEditor;

  for (const impulse of impulses) {
    const macroId = getAnimationMacro(actor, impulse.id);
    const hasMacro = !!macroId;

    const enrichedDesc = await textEditor.enrichHTML(impulse.description, {
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

      // Get the blast data from the blasts array
      const blast = blasts.find(b => b.id === itemId);
      if (!blast) {
        ui.notifications.error("Could not find blast data");
        return;
      }

      // Check if there's an animation macro
      const macroUuid = getAnimationMacro(actor, itemId);
      console.log(`Blast clicked - itemId: ${itemId}, macroUuid: ${macroUuid}`);
      if (macroUuid) {
        const macro = await fromUuid(macroUuid);
        console.log(`Found macro:`, macro?.name);
        if (macro) {
          console.log(`Executing macro: ${macro.name}`);
          await macro.execute();
        }
      } else {
        console.log(`No macro bound to this blast`);
      }

      // Use the PF2e ElementalBlast class
      try {
        if (!game.pf2e?.ElementalBlast) {
          ui.notifications.error("PF2e ElementalBlast class not found");
          return;
        }

        const elementalBlast = new game.pf2e.ElementalBlast(actor);

        // Use default settings - PF2e will show a dialog for options
        await elementalBlast.attack({
          element: blast.element,
          damageType: blast.damageTypes[0], // Use first available
          melee: false, // Default to ranged, user can change in dialog
          mapIncreases: 0, // No MAP penalty
          event: event
        });
      } catch (error) {
        console.error("Error using elemental blast:", error);
        ui.notifications.error("Failed to use Elemental Blast");
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
        const macroUuid = getAnimationMacro(actor, itemId);
        console.log(`Impulse clicked - itemId: ${itemId}, macroUuid: ${macroUuid}`);
        if (macroUuid) {
          const macro = await fromUuid(macroUuid);
          console.log(`Found macro:`, macro?.name);
          if (macro) {
            console.log(`Executing macro: ${macro.name}`);
            await macro.execute();
          }
        } else {
          console.log(`No macro bound to this impulse`);
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
