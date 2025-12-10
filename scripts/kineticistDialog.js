import { MODULE_ID } from "./module.js";
import { ELEMENTS } from "./const.js";
import {
  getImpulses,
  getElementalBlasts,
  localize,
  getYourToken,
  getAnimationMacro
} from "./misc.js";
import { openMacroBindingDialog } from "./macroDialog.js";

/**
 * Opens the main Kineticist ability selection dialog
 */
export async function openKineticistDialog(options = {}) {
  const token = getYourToken();

  if (!token) {
    ui.notifications.error("Please select a token");
    return;
  }

  const actor = token.actor;
  const impulses = getImpulses(actor);
  const blasts = getElementalBlasts(actor);
  const allAbilities = [...blasts, ...impulses];

  if (allAbilities.length === 0) {
    ui.notifications.error("No Kineticist abilities found");
    return;
  }

  const rollData = actor.getRollData();
  let abilityData = await Promise.all(
    allAbilities.map(async (ability) => {
      const enriched_desc = (
        await TextEditor.enrichHTML(ability.description, { rollData })
      ).replaceAll('"', '&quot;');

      return {
        ...ability,
        enriched_desc,
        isBlast: !ability.actionCost || ability.type === "weapon",
        category: impulses.includes(ability) ? "impulse" : "blast"
      };
    })
  );

  await pickAbilityDialog({ abilities: abilityData, actor, token, options });
}

function formatTraits(traits) {
  if (!traits || traits.length === 0) return '';

  return traits
    .map(trait => {
      const label = CONFIG.PF2E?.actionTraits?.[trait] ||
                    CONFIG.PF2E?.featTraits?.[trait] ||
                    CONFIG.PF2E?.spellTraits?.[trait] ||
                    trait.charAt(0).toUpperCase() + trait.slice(1);
      return `<span style="font-size: 0.7em; padding: 2px 5px; background: rgba(0,0,0,0.4); border-radius: 2px; color: #ccc; margin-right: 3px; display: inline-block;">${label}</span>`;
    })
    .join('');
}

function getActionCostIcon(actionCost) {
  if (!actionCost) return "";

  const numActions = typeof actionCost === "number" ? actionCost :
                     actionCost === "1" ? 1 :
                     actionCost === "2" ? 2 :
                     actionCost === "3" ? 3 : 0;

  if (numActions === 1) return '<span class="action-glyph">1</span>';
  if (numActions === 2) return '<span class="action-glyph">2</span>';
  if (numActions === 3) return '<span class="action-glyph">3</span>';

  return "";
}

async function pickAbilityDialog({ abilities, actor, token, options }) {
  // Build a table-based layout with radio buttons
  let tableRows = '';

  for (let ability of abilities) {
    const traitsHtml = formatTraits(ability.traits);
    const actionCost = getActionCostIcon(ability.actionCost);
    const macroId = getAnimationMacro(actor, ability.id);
    const hasMacro = !!macroId;

    // Determine border color based on category
    const elemData = ELEMENTS[ability.element];
    const borderColor = ability.category === "blast" && elemData ? elemData.color : '#9c27b0';

    tableRows += `
      <tr class="ability-select-row" data-ability-id="${ability.id}" data-tooltip="${ability.enriched_desc}" data-tooltip-direction="LEFT">
        <td style="width: 40px; text-align: center; padding: 5px;">
          <input type="radio" name="ability-selection" value="${ability.id}" style="margin: 0; cursor: pointer;">
        </td>
        <td style="width: 50px; text-align: center; padding: 5px;">
          <div style="position: relative;">
            <img src="${ability.img}" style="width: 36px; height: 36px; border-radius: 3px; border: 2px solid ${borderColor}; display: block; margin: 0 auto;">
            ${hasMacro ? '<i class="fas fa-film" style="position:absolute;top:-4px;right:-4px;color:gold;font-size:10px;text-shadow:1px 1px 2px black;"></i>' : ''}
          </div>
        </td>
        <td style="padding: 5px 10px;">
          <div style="font-weight: 600; margin-bottom: 3px;">
            ${ability.name} ${actionCost}
            ${ability.category === "blast" ? '<span style="font-size: 0.7em; color: #ff9800; margin-left: 4px;">[BLAST]</span>' : ''}
          </div>
          <div style="line-height: 1.4;">${traitsHtml}</div>
        </td>
        <td style="width: 30px; text-align: center;">
          <i class="fas fa-check-circle ability-check-icon" style="color: rgb(156, 39, 176); font-size: 1.2em; opacity: 0;"></i>
        </td>
      </tr>
    `;
  }

  let content = `
    <style>
      .ability-select-table {
        width: 100%;
        border-collapse: collapse;
      }
      .ability-select-row {
        cursor: pointer;
        background: rgba(255, 255, 255, 0.03);
        border: 2px solid transparent;
        transition: all 0.15s ease;
      }
      .ability-select-row:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(156, 39, 176, 0.5);
      }
      .ability-select-row.selected {
        background: rgba(156, 39, 176, 0.25) !important;
        border-color: rgb(156, 39, 176) !important;
      }
      .ability-select-row.selected .ability-check-icon {
        opacity: 1 !important;
      }
      .ability-table-container {
        max-height: 420px;
        overflow-y: auto;
        border: 1px solid #555;
        border-radius: 4px;
      }
      .ability-table-container::-webkit-scrollbar {
        width: 8px;
      }
      .ability-table-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
      }
      .ability-table-container::-webkit-scrollbar-thumb {
        background: rgba(156, 39, 176, 0.6);
        border-radius: 4px;
      }
      .action-glyph {
        font-family: "Pathfinder2eActions";
        font-size: 1.2em;
        color: #9c27b0;
      }
    </style>
    <div class="ability-table-container">
      <table class="ability-select-table">
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  let selectedAbilityId = null;

  return new Promise((resolve) => {
    const buttons = [
      {
        action: "use",
        label: localize("keywords.useAbility") || "Use Ability",
        callback: async () => {
          if (!selectedAbilityId) {
            ui.notifications.warn("Please select an ability first");
            return;
          }
          await useAbility(selectedAbilityId, { actor, token, abilities });
          resolve(selectedAbilityId);
        },
        icon: "fa-solid fa-hand-sparkles",
      },
      {
        action: "bindMacro",
        label: localize("keywords.bindMacro") || "Bind Animation",
        callback: async () => {
          if (!selectedAbilityId) {
            ui.notifications.warn("Please select an ability first");
            return;
          }
          const ability = abilities.find(a => a.id === selectedAbilityId);
          await openMacroBindingDialog(actor, ability.id, ability.uuid);
          resolve(selectedAbilityId);
        },
        icon: "fa-solid fa-film",
      },
      {
        action: "cancel",
        label: localize("buttons.cancel") || "Cancel",
        icon: "fa-solid fa-xmark",
      }
    ];

    foundry.applications.api.DialogV2.wait({
      window: {
        title: localize("dialog.kineticist.title") || "Kineticist Abilities",
        icon: "fas fa-atom",
      },
      content,
      buttons,
      render: (_event, app) => {
        const html = app.element;

        // Handle radio button changes
        html.querySelectorAll('input[name="ability-selection"]').forEach(radio => {
          radio.addEventListener('change', function() {
            if (this.checked) {
              // Remove selected class from all rows
              html.querySelectorAll('.ability-select-row').forEach(r => r.classList.remove('selected'));
              // Add selected class to parent row
              const row = this.closest('.ability-select-row');
              row.classList.add('selected');
              selectedAbilityId = this.value;
            }
          });
        });

        // Handle row clicks to also select the radio
        html.querySelectorAll('.ability-select-row').forEach(row => {
          row.addEventListener('click', function(e) {
            // Don't interfere if clicking the radio directly
            if (e.target.type === 'radio') return;

            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
          });

          // Handle right-click for quick macro binding
          row.addEventListener('contextmenu', async function(event) {
            event.preventDefault();
            const abilityId = this.dataset.abilityId;
            const ability = abilities.find(a => a.id === abilityId);
            await openMacroBindingDialog(actor, ability.id, ability.uuid);
            ui.notifications.info(`Opening macro binding for ${ability.name}`);
          });
        });
      },
      position: { width: 600, height: 650 },
    });
  });
}

/**
 * Use a Kineticist ability
 */
async function useAbility(abilityId, { actor, token, abilities }) {
  const ability = abilities.find(a => a.id === abilityId);
  if (!ability) {
    ui.notifications.error("Ability not found");
    return;
  }

  const item = await fromUuid(ability.uuid);
  if (!item) {
    ui.notifications.error("Could not find ability item");
    return;
  }

  // Check if there's an animation macro
  const macroId = getAnimationMacro(actor, abilityId);
  if (macroId) {
    const macro = game.macros.get(macroId);
    if (macro) {
      ui.notifications.info(`Executing animation for ${ability.name}...`);
      await macro.execute();
    }
  }

  // Use the item
  ui.notifications.info(`Using ${ability.name}...`);
  await item.toMessage();
}
