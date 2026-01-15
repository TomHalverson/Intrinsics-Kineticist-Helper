import { MODULE_ID } from "./module.js";
import { ELEMENTS } from "./const.js";
import {
  getImpulses,
  getElementalBlasts,
  getElementalGates,
  localize,
  getYourToken,
  getAnimationMacro,
  setAnimationMacro,
  getCustomDescription,
  setCustomDescription
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
  const gates = getElementalGates(actor);
  const impulses = getImpulses(actor);
  const blasts = getElementalBlasts(actor);

  if (gates.length === 0 && impulses.length === 0 && blasts.length === 0) {
    ui.notifications.error("No Kineticist abilities found");
    return;
  }

  await buildKineticistDialog({ gates, impulses, blasts, actor, token, options });
}

/**
 * Detect element from impulse traits or name
 */
function detectImpulseElement(impulse) {
  const traits = impulse.traits || [];
  const name = impulse.name.toLowerCase();

  // Check traits first
  for (const trait of traits) {
    const lowerTrait = trait.toLowerCase();
    if (lowerTrait === "air") return "air";
    if (lowerTrait === "earth") return "earth";
    if (lowerTrait === "fire") return "fire";
    if (lowerTrait === "metal") return "metal";
    if (lowerTrait === "water") return "water";
    if (lowerTrait === "wood") return "wood";
  }

  // Fallback to name detection
  if (name.includes("air")) return "air";
  if (name.includes("earth")) return "earth";
  if (name.includes("fire")) return "fire";
  if (name.includes("metal")) return "metal";
  if (name.includes("water")) return "water";
  if (name.includes("wood")) return "wood";

  return "unknown";
}

function formatTraits(traits, actionCost = null) {
  if (!traits || traits.length === 0) {
    // If no traits but we have action cost, just return the action cost
    if (actionCost) {
      const actionText = getActionCostText(actionCost);
      return actionText ? `<span class="trait-tag">${actionText}</span>` : '';
    }
    return '';
  }

  const traitTags = traits
    .map(trait => {
      // Get the trait label from CONFIG, which contains localization keys
      let label = CONFIG.PF2E?.actionTraits?.[trait] ||
                  CONFIG.PF2E?.featTraits?.[trait] ||
                  CONFIG.PF2E?.spellTraits?.[trait] ||
                  trait;

      // Localize the label if it's a localization key
      if (typeof label === 'string' && label.includes('.')) {
        label = game.i18n.localize(label);
      } else if (typeof label !== 'string') {
        label = trait.charAt(0).toUpperCase() + trait.slice(1);
      }

      return `<span class="trait-tag">${label}</span>`;
    })
    .join('');

  // Add action cost at the end if present
  if (actionCost) {
    const actionText = getActionCostText(actionCost);
    if (actionText) {
      return traitTags + `<span class="trait-tag">${actionText}</span>`;
    }
  }

  return traitTags;
}

function getActionCostText(actionCost) {
  if (!actionCost) return "";

  const numActions = typeof actionCost === "number" ? actionCost :
                     actionCost === "1" ? 1 :
                     actionCost === "2" ? 2 :
                     actionCost === "3" ? 3 : 0;

  if (numActions === 1) return "1 Action";
  if (numActions === 2) return "2 Actions";
  if (numActions === 3) return "3 Actions";

  // Handle special action types
  if (actionCost === "reaction") return "Reaction";
  if (actionCost === "free") return "Free Action";

  return "";
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

async function buildKineticistDialog({ gates, impulses, blasts, actor, token, options }) {
  const rollData = actor.getRollData();

  // Build Elemental Gates section
  let gatesHtml = '';
  if (gates.length > 0) {
    gatesHtml = '<div class="kineticist-section"><h3>Elemental Gates</h3><div class="ability-grid">';
    for (const gate of gates) {
      const elemData = ELEMENTS[gate];
      if (elemData) {
        const macroUuid = getAnimationMacro(actor, `gate-${gate}`);
        const hasMacro = !!macroUuid;

        // Use macro icon if available, otherwise use gate icon
        let displayIcon = elemData.icon;
        if (macroUuid) {
          const macro = await fromUuid(macroUuid);
          if (macro) {
            displayIcon = macro.img;
          }
        }

        gatesHtml += `
          <div class="gate-item">
            <button class="ability-button gate-button" data-element="${gate}" style="border-color: ${elemData.color};">
              <img src="${displayIcon}" alt="${elemData.name}">
              ${hasMacro ? '<i class="fas fa-film macro-indicator"></i>' : ''}
              <div class="ability-name">${elemData.name}</div>
            </button>
            <div class="gate-macro-zone macro-drop-zone" data-gate="${gate}" title="Drag & drop macro here">
              ${hasMacro ? '<i class="fas fa-film"></i>' : '<i class="fas fa-plus"></i>'}
            </div>
          </div>
        `;
      }
    }
    gatesHtml += '</div></div>';
  }

  // Build Elemental Blasts section
  let blastsHtml = '';
  if (blasts.length > 0) {
    blastsHtml = '<div class="kineticist-section"><h3>Elemental Blasts</h3><div class="blasts-container">';
    for (const blast of blasts) {
      const elemData = ELEMENTS[blast.element];
      const borderColor = elemData ? elemData.color : '#9c27b0';
      const macroUuid = getAnimationMacro(actor, blast.id);
      const hasMacro = !!macroUuid;

      // Use macro icon if available, otherwise use blast icon
      let displayIcon = blast.img;
      if (macroUuid) {
        const macro = await fromUuid(macroUuid);
        if (macro) {
          displayIcon = macro.img;
        }
      }

      const enriched_desc = (await foundry.applications.ux.TextEditor.enrichHTML(blast.description, { rollData })).replaceAll('"', '&quot;');

      // Build damage type selector if multiple types available
      let damageTypeSelector = '';
      if (elemData && elemData.damageTypes && elemData.damageTypes.length > 1) {
        damageTypeSelector = `
          <select class="damage-type-select" data-blast-id="${blast.id}">
            ${elemData.damageTypes.map(dt => `<option value="${dt}">${dt.charAt(0).toUpperCase() + dt.slice(1)}</option>`).join('')}
          </select>
        `;
      } else if (elemData && elemData.damageTypes && elemData.damageTypes.length === 1) {
        damageTypeSelector = `<span class="damage-type-label">${elemData.damageTypes[0].charAt(0).toUpperCase() + elemData.damageTypes[0].slice(1)}</span>`;
      }

      // Calculate attack bonuses for MAP
      const attackBonus = blast.attackBonus || 0;
      const attackStr = attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`;
      const map5Bonus = attackBonus - 5;
      const map5Str = map5Bonus >= 0 ? `+${map5Bonus}` : `${map5Bonus}`;
      const map10Bonus = attackBonus - 10;
      const map10Str = map10Bonus >= 0 ? `+${map10Bonus}` : `${map10Bonus}`;

      blastsHtml += `
        <div class="blast-item">
          <div class="blast-header">
            <div class="blast-icon-wrapper" data-tooltip="${enriched_desc}" data-tooltip-direction="UP">
              <img src="${displayIcon}" style="border-color: ${borderColor};">
              ${hasMacro ? '<i class="fas fa-film macro-indicator"></i>' : ''}
            </div>
            <div class="blast-info">
              <div class="blast-title-row">
                <div class="blast-name">${blast.name}</div>
                ${damageTypeSelector}
                <div class="macro-drop-zone" data-blast-id="${blast.id}" title="Drag & drop macro here">
                  ${hasMacro ? '<i class="fas fa-film"></i>' : '<i class="fas fa-plus"></i>'}
                </div>
              </div>

              <!-- Ranged 1-Action Attack Row -->
              <div class="attack-row ranged-row">
                <span class="attack-label">RANGED</span>
                <button class="attack-button" data-blast-id="${blast.id}" data-range="ranged" data-map="0" data-actions="1" title="Ranged 1-action blast">
                  <span class="action-glyph">1</span> ${attackStr}
                </button>
                <button class="attack-button" data-blast-id="${blast.id}" data-range="ranged" data-map="-5" data-actions="1" title="Ranged 1-action blast with MAP -5">
                  ${map5Str} (MAP -5)
                </button>
                <button class="attack-button" data-blast-id="${blast.id}" data-range="ranged" data-map="-10" data-actions="1" title="Ranged 1-action blast with MAP -10">
                  ${map10Str} (MAP -10)
                </button>
                <button class="damage-button" data-blast-id="${blast.id}" data-actions="1" title="Roll 1-action damage">
                  DAMAGE
                </button>
                <button class="critical-button" data-blast-id="${blast.id}" data-actions="1" title="Roll 1-action critical damage">
                  CRITICAL
                </button>
              </div>

              <!-- Ranged 2-Action Attack Row -->
              <div class="attack-row ranged-row two-action-row">
                <span class="attack-label">RANGED</span>
                <button class="attack-button two-action" data-blast-id="${blast.id}" data-range="ranged" data-map="0" data-actions="2" title="Ranged 2-action blast">
                  <span class="action-glyph">2</span> ${attackStr}
                </button>
                <button class="attack-button two-action" data-blast-id="${blast.id}" data-range="ranged" data-map="-5" data-actions="2" title="Ranged 2-action blast with MAP -5">
                  ${map5Str} (MAP -5)
                </button>
                <button class="attack-button two-action" data-blast-id="${blast.id}" data-range="ranged" data-map="-10" data-actions="2" title="Ranged 2-action blast with MAP -10">
                  ${map10Str} (MAP -10)
                </button>
                <button class="damage-button" data-blast-id="${blast.id}" data-actions="2" title="Roll 2-action damage">
                  DAMAGE
                </button>
                <button class="critical-button" data-blast-id="${blast.id}" data-actions="2" title="Roll 2-action critical damage">
                  CRITICAL
                </button>
              </div>

              <!-- Melee 1-Action Attack Row -->
              <div class="attack-row melee-row">
                <span class="attack-label">MELEE</span>
                <button class="attack-button" data-blast-id="${blast.id}" data-range="melee" data-map="0" data-actions="1" title="Melee 1-action blast">
                  <span class="action-glyph">1</span> ${attackStr}
                </button>
                <button class="attack-button" data-blast-id="${blast.id}" data-range="melee" data-map="-5" data-actions="1" title="Melee 1-action blast with MAP -5">
                  ${map5Str} (MAP -5)
                </button>
                <button class="attack-button" data-blast-id="${blast.id}" data-range="melee" data-map="-10" data-actions="1" title="Melee 1-action blast with MAP -10">
                  ${map10Str} (MAP -10)
                </button>
                <button class="damage-button" data-blast-id="${blast.id}" data-actions="1" title="Roll 1-action damage">
                  DAMAGE
                </button>
                <button class="critical-button" data-blast-id="${blast.id}" data-actions="1" title="Roll 1-action critical damage">
                  CRITICAL
                </button>
              </div>

              <!-- Melee 2-Action Attack Row -->
              <div class="attack-row melee-row two-action-row">
                <span class="attack-label">MELEE</span>
                <button class="attack-button two-action" data-blast-id="${blast.id}" data-range="melee" data-map="0" data-actions="2" title="Melee 2-action blast">
                  <span class="action-glyph">2</span> ${attackStr}
                </button>
                <button class="attack-button two-action" data-blast-id="${blast.id}" data-range="melee" data-map="-5" data-actions="2" title="Melee 2-action blast with MAP -5">
                  ${map5Str} (MAP -5)
                </button>
                <button class="attack-button two-action" data-blast-id="${blast.id}" data-range="melee" data-map="-10" data-actions="2" title="Melee 2-action blast with MAP -10">
                  ${map10Str} (MAP -10)
                </button>
                <button class="damage-button" data-blast-id="${blast.id}" data-actions="2" title="Roll 2-action damage">
                  DAMAGE
                </button>
                <button class="critical-button" data-blast-id="${blast.id}" data-actions="2" title="Roll 2-action critical damage">
                  CRITICAL
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    blastsHtml += '</div></div>';
  }

  // Build Impulses section
  let impulsesHtml = '';
  if (impulses.length > 0) {
    impulsesHtml = '<div class="kineticist-section"><h3>Impulses</h3><div class="impulses-container">';
    for (const impulse of impulses) {
      const hasOverflow = impulse.traits.some(t => t.toLowerCase() === "overflow");
      const element = detectImpulseElement(impulse);
      const elemData = ELEMENTS[element];
      const borderColor = elemData ? elemData.color : '#9c27b0';
      const actionCost = getActionCostIcon(impulse.actionCost);
      const macroUuid = getAnimationMacro(actor, impulse.id);
      const hasMacro = !!macroUuid;

      // Use macro icon if available, otherwise use impulse icon
      let displayIcon = impulse.img;
      if (macroUuid) {
        const macro = await fromUuid(macroUuid);
        if (macro) {
          displayIcon = macro.img;
        }
      }

      const enriched_desc = (await foundry.applications.ux.TextEditor.enrichHTML(impulse.description, { rollData })).replaceAll('"', '&quot;');
      const traitsHtml = formatTraits(impulse.traits, impulse.actionCost);
      const customDesc = getCustomDescription(actor, impulse.id);

      impulsesHtml += `
        <div class="impulse-item">
          <div class="impulse-header">
            <div class="impulse-icon-wrapper" data-tooltip="${enriched_desc}" data-tooltip-direction="UP">
              <img src="${displayIcon}" style="border-color: ${borderColor};">
              ${hasMacro ? '<i class="fas fa-film macro-indicator"></i>' : ''}
              ${hasOverflow ? '<span class="overflow-badge">OVERFLOW</span>' : ''}
            </div>
            <div class="impulse-info">
              <div class="impulse-title-row">
                <div class="impulse-name">
                  ${impulse.name} ${actionCost}
                  ${elemData ? `<span class="element-badge" style="background: ${elemData.color};">${elemData.name}</span>` : ''}
                </div>
                <div class="macro-drop-zone" data-impulse-id="${impulse.id}" title="Drag & drop macro here">
                  ${hasMacro ? '<i class="fas fa-film"></i>' : '<i class="fas fa-plus"></i>'}
                </div>
              </div>
              <div class="impulse-traits">${traitsHtml}</div>
              <div class="impulse-custom-desc">
                <input
                  type="text"
                  class="custom-description-input"
                  data-impulse-id="${impulse.id}"
                  placeholder="Add a short description or note..."
                  value="${customDesc.replaceAll('"', '&quot;')}"
                  style="width: 100%; margin-top: 4px; padding: 4px 8px; border: 1px solid #555; background: rgba(0,0,0,0.2); color: inherit; border-radius: 3px; font-size: 0.9em;"
                >
              </div>
            </div>
          </div>
          <div class="impulse-actions">
            <button class="use-impulse-button" data-impulse-id="${impulse.id}" data-impulse-uuid="${impulse.uuid}">
              <i class="fas fa-hand-sparkles"></i> Use Impulse
            </button>
          </div>
        </div>
      `;
    }
    impulsesHtml += '</div></div>';
  }

  const content = `
    <div class="dialog-content kineticist-dialog">
      ${gatesHtml}
      ${blastsHtml}
      ${impulsesHtml}
    </div>
  `;

  // Inject styles separately for v13 compatibility
  const styleId = 'kineticist-dialog-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Base container styles */
      .kineticist-dialog * {
        box-sizing: border-box;
      }

      .kineticist-dialog .kineticist-section {
        margin-bottom: 20px;
      }
      .kineticist-dialog .kineticist-section h3 {
        margin: 0 0 10px 0;
        padding: 5px 10px;
        background: rgba(156, 39, 176, 0.3);
        border-left: 4px solid #9c27b0;
        font-size: 1.1em;
      }
      .kineticist-dialog .ability-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 10px;
      }
      .kineticist-dialog .gate-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
        align-items: center;
      }
      .kineticist-dialog .gate-button {
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid;
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        width: 100%;
        position: relative;
      }
      .kineticist-dialog .gate-button:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      .kineticist-dialog .gate-button img {
        width: 48px;
        height: 48px;
        display: block;
        margin: 0 auto 5px;
        border-radius: 4px;
      }
      .kineticist-dialog .gate-macro-zone {
        width: 100%;
        height: 24px;
      }
      .kineticist-dialog .ability-name {
        font-weight: 600;
        font-size: 0.9em;
      }
      .kineticist-dialog .blasts-container, .kineticist-dialog .impulses-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .kineticist-dialog .blast-item, .kineticist-dialog .impulse-item {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #555;
        border-radius: 6px;
        padding: 10px;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }
      .kineticist-dialog .blast-header, .kineticist-dialog .impulse-header {
        display: flex;
        gap: 10px;
        margin-bottom: 8px;
      }
      .kineticist-dialog .blast-icon-wrapper, .kineticist-dialog .impulse-icon-wrapper {
        position: relative;
        flex-shrink: 0;
      }
      .kineticist-dialog .blast-icon-wrapper img, .kineticist-dialog .impulse-icon-wrapper img {
        width: 48px;
        height: 48px;
        border: 2px solid;
        border-radius: 4px;
        display: block;
      }
      .kineticist-dialog .macro-indicator {
        position: absolute;
        top: -4px;
        right: -4px;
        color: gold;
        font-size: 12px;
        text-shadow: 1px 1px 2px black;
      }
      .kineticist-dialog .overflow-badge {
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        background: #f44336;
        color: white;
        font-size: 8px;
        font-weight: bold;
        padding: 2px 4px;
        border-radius: 3px;
        white-space: nowrap;
      }
      .kineticist-dialog .blast-info, .kineticist-dialog .impulse-info {
        flex-grow: 1;
        min-width: 0;
        overflow: hidden;
      }
      .kineticist-dialog .blast-title-row, .kineticist-dialog .impulse-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .kineticist-dialog .blast-name, .kineticist-dialog .impulse-name {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-grow: 1;
      }
      .kineticist-dialog .element-badge {
        font-size: 0.7em;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        font-weight: bold;
      }
      .kineticist-dialog .damage-type-select, .kineticist-dialog .damage-type-label {
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #666;
        color: white;
        font-size: 0.85em;
      }
      .kineticist-dialog .damage-type-label {
        border: none;
        background: rgba(156, 39, 176, 0.3);
        padding: 4px 10px;
      }
      .kineticist-dialog .macro-drop-zone {
        width: 32px;
        height: 32px;
        border: 2px dashed #ffc107;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: rgba(255, 193, 7, 0.1);
        transition: all 0.2s;
      }
      .kineticist-dialog .macro-drop-zone:hover {
        background: rgba(255, 193, 7, 0.3);
        border-color: #ffd54f;
      }
      .kineticist-dialog .macro-drop-zone.drag-over {
        background: rgba(255, 193, 7, 0.5);
        border-style: solid;
      }
      .kineticist-dialog .macro-drop-zone i {
        color: #ffc107;
      }
      .kineticist-dialog .attack-row {
        display: flex;
        gap: 4px;
        align-items: center;
        margin-bottom: 4px;
      }
      .kineticist-dialog .attack-label {
        font-size: 0.7em;
        font-weight: bold;
        color: #999;
        width: 55px;
        text-align: left;
      }
      .kineticist-dialog .ranged-row .attack-label {
        color: #64b5f6;
      }
      .kineticist-dialog .melee-row .attack-label {
        color: #ef5350;
      }
      .kineticist-dialog .attack-button, .kineticist-dialog .damage-button, .kineticist-dialog .critical-button {
        padding: 4px 8px;
        border: 1px solid #555;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.4);
        color: white;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .kineticist-dialog .attack-button:hover, .kineticist-dialog .damage-button:hover, .kineticist-dialog .critical-button:hover {
        background: rgba(156, 39, 176, 0.4);
        border-color: #9c27b0;
      }
      .kineticist-dialog .attack-button.two-action {
        background: rgba(156, 39, 176, 0.3);
        border-color: #9c27b0;
      }
      .kineticist-dialog .damage-button {
        background: rgba(244, 67, 54, 0.3);
        border-color: #f44336;
      }
      .kineticist-dialog .critical-button {
        background: rgba(255, 152, 0, 0.3);
        border-color: #ff9800;
      }
      .kineticist-dialog .impulse-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .kineticist-dialog .use-impulse-button {
        flex-grow: 1;
        padding: 8px 12px;
        background: linear-gradient(135deg, #9c27b0, #7b1fa2);
        border: none;
        border-radius: 4px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .kineticist-dialog .use-impulse-button:hover {
        background: linear-gradient(135deg, #ab47bc, #8e24aa);
        transform: translateY(-1px);
      }
      .kineticist-dialog .trait-tag {
        font-size: 0.7em;
        padding: 2px 5px;
        background: rgba(0,0,0,0.4);
        border-radius: 2px;
        color: #ccc;
        margin-right: 3px;
        margin-bottom: 3px;
        display: inline-block;
        white-space: nowrap;
      }
      .kineticist-dialog .impulse-traits {
        line-height: 1.6;
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
      }
      .kineticist-dialog .action-glyph {
        font-family: "Pathfinder2eActions";
        font-size: 1.2em;
        color: #9c27b0;
      }
      .kineticist-dialog.dialog-content {
        max-height: 600px;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 10px;
        box-sizing: border-box;
      }
      .kineticist-dialog.dialog-content::-webkit-scrollbar {
        width: 8px;
      }
      .kineticist-dialog.dialog-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
      }
      .kineticist-dialog.dialog-content::-webkit-scrollbar-thumb {
        background: rgba(156, 39, 176, 0.6);
        border-radius: 4px;
      }
      .kineticist-dialog .blast-name, .kineticist-dialog .impulse-name, .kineticist-dialog .ability-name {
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
    `;
    document.head.appendChild(style);
  }

  foundry.applications.api.DialogV2.wait({
    window: {
      title: localize("dialog.kineticist.title") || "Kineticist Abilities",
      icon: "fas fa-atom",
    },
    content,
    buttons: [
      {
        action: "noop", // No operation - this prevents default close behavior
        label: "Close",
        icon: "fa-solid fa-xmark",
        default: true,
        callback: (event, button, dialog) => {
          // Do nothing - dialog will close naturally after callback
        }
      }
    ],
    rejectClose: false,
    modal: false,
    render: (_event, app) => {
      const html = app.element;

      // Handle gate button clicks
      html.querySelectorAll('.gate-button').forEach(btn => {
        btn.addEventListener('click', async function(event) {
          event.preventDefault();
          event.stopPropagation();

          const element = this.dataset.element;

          // Check if there's a macro bound to this gate
          const macroUuid = getAnimationMacro(actor, `gate-${element}`);
          if (macroUuid) {
            const macro = await fromUuid(macroUuid);
            if (macro) {
              ui.notifications.info(`Executing ${element} gate macro...`);
              // Execute macro with proper scope - pass actor and token
              await macro.execute({ actor, token, speaker: { actor: actor.id, token: token.id } });

              // Refresh the dialog after a short delay to allow the gate effect to apply
              setTimeout(async () => {
                app.close();
                await openKineticistDialog();
              }, 500);
              return;
            }
          }

          ui.notifications.info(`Activating ${element} gate...`);

          // Refresh the dialog after a short delay to allow the gate effect to apply
          setTimeout(async () => {
            app.close();
            await openKineticistDialog();
          }, 500);
        });
      });

      // Handle attack button clicks
      html.querySelectorAll('.attack-button').forEach(btn => {
        btn.addEventListener('click', async function(event) {
          event.preventDefault();
          event.stopPropagation();

          const blastId = this.dataset.blastId;
          const range = this.dataset.range; // "ranged" or "melee"
          const map = parseInt(this.dataset.map);
          const actions = parseInt(this.dataset.actions); // 1 or 2 actions
          const damageTypeSelect = html.querySelector(`.damage-type-select[data-blast-id="${blastId}"]`);
          const damageType = damageTypeSelect ? damageTypeSelect.value : null;

          const blast = blasts.find(b => b.id === blastId);
          if (blast) {
            await useBlast(blast, { actor, token, range, map, actions, damageType });
          }
        });
      });

      // Handle damage and critical buttons
      html.querySelectorAll('.damage-button, .critical-button').forEach(btn => {
        btn.addEventListener('click', async function(event) {
          event.preventDefault();
          event.stopPropagation();

          const blastId = this.dataset.blastId;
          const actions = parseInt(this.dataset.actions); // 1 or 2 actions
          const isCrit = this.classList.contains('critical-button');
          const damageTypeSelect = html.querySelector(`.damage-type-select[data-blast-id="${blastId}"]`);
          const damageType = damageTypeSelect ? damageTypeSelect.value : null;

          const blast = blasts.find(b => b.id === blastId);
          if (blast) {
            await rollBlastDamage(blast, { actor, actions, isCrit, damageType });
          }
        });
      });

      // Handle impulse usage
      html.querySelectorAll('.use-impulse-button').forEach(btn => {
        btn.addEventListener('click', async function(event) {
          event.preventDefault();
          event.stopPropagation();

          const impulseId = this.dataset.impulseId;
          const impulseUuid = this.dataset.impulseUuid;

          await useImpulse(impulseId, impulseUuid, { actor, token });
        });
      });

      // Handle macro drag and drop for blasts
      html.querySelectorAll('.macro-drop-zone[data-blast-id]').forEach(zone => {
        const blastId = zone.dataset.blastId;

        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', async (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'Macro') {
              const macro = await fromUuid(data.uuid);
              if (macro) {
                // Store the full UUID to support both world and compendium macros
                await setAnimationMacro(actor, blastId, data.uuid);
                zone.innerHTML = '<i class="fas fa-film"></i>';
                ui.notifications.success(localize("notifications.macroSaved") || "Animation macro bound!");
              }
            }
          } catch (error) {
            console.error("Error binding macro:", error);
          }
        });

        // Click to open macro dialog as fallback
        zone.addEventListener('click', async () => {
          const blast = blasts.find(b => b.id === blastId);
          if (blast) {
            await openMacroBindingDialog(actor, blastId, blast.uuid);
          }
        });
      });

      // Handle macro drag and drop for impulses
      html.querySelectorAll('.macro-drop-zone[data-impulse-id]').forEach(zone => {
        const impulseId = zone.dataset.impulseId;

        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', async (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'Macro') {
              const macro = await fromUuid(data.uuid);
              if (macro) {
                // Store the full UUID to support both world and compendium macros
                await setAnimationMacro(actor, impulseId, data.uuid);
                zone.innerHTML = '<i class="fas fa-film"></i>';
                ui.notifications.success(localize("notifications.macroSaved") || "Animation macro bound!");
              }
            }
          } catch (error) {
            console.error("Error binding macro:", error);
          }
        });

        // Click to open macro dialog as fallback
        zone.addEventListener('click', async () => {
          const impulse = impulses.find(i => i.id === impulseId);
          if (impulse) {
            await openMacroBindingDialog(actor, impulseId, impulse.uuid);
          }
        });
      });

      // Handle macro drag and drop for gates
      html.querySelectorAll('.gate-macro-zone[data-gate]').forEach(zone => {
        const gate = zone.dataset.gate;

        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', async (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'Macro') {
              const macro = await fromUuid(data.uuid);
              if (macro) {
                // Store the full UUID to support both world and compendium macros
                await setAnimationMacro(actor, `gate-${gate}`, data.uuid);
                zone.innerHTML = '<i class="fas fa-film"></i>';
                ui.notifications.success(localize("notifications.macroSaved") || "Gate macro bound!");
              }
            }
          } catch (error) {
            console.error("Error binding gate macro:", error);
          }
        });

        // Click to open macro dialog as fallback
        zone.addEventListener('click', async () => {
          await openMacroBindingDialog(actor, `gate-${gate}`, null);
        });
      });

      // Handle custom description inputs
      html.querySelectorAll('.custom-description-input').forEach(input => {
        const impulseId = input.dataset.impulseId;

        // Save on blur (when user clicks away)
        input.addEventListener('blur', async () => {
          const description = input.value.trim();
          await setCustomDescription(actor, impulseId, description);
        });

        // Save on Enter key
        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            const description = input.value.trim();
            await setCustomDescription(actor, impulseId, description);
            input.blur(); // Remove focus after saving
          }
        });
      });
    },
    position: { width: 700, height: 750 },
  });
}

/**
 * Use an Elemental Blast
 */
async function useBlast(blast, { actor, token, range, map, actions, damageType }) {
  if (!blast) {
    ui.notifications.error("Could not find blast data");
    return;
  }

  // Check if kinetic aura is active
  const hasKineticAura = actor.itemTypes.effect?.some(e =>
    e.slug?.includes("kinetic-aura") ||
    e.name?.toLowerCase().includes("kinetic aura")
  );

  if (!hasKineticAura) {
    ui.notifications.error(
      "Kinetic Aura must be active to use Elemental Blasts. " +
      "Use Channel Elements to activate your Kinetic Aura first."
    );
    return;
  }

  // Check if there's an animation macro
  const macroUuid = getAnimationMacro(actor, blast.id);
  console.log(`useBlast - Checking for macro. blast.id: ${blast.id}, macroUuid: ${macroUuid}`);
  if (macroUuid) {
    const macro = await fromUuid(macroUuid);
    console.log(`Found macro:`, macro?.name);
    if (macro) {
      console.log(`Executing macro: ${macro.name}`);
      await macro.execute({ actor, token, speaker: { actor: actor.id, token: token.id } });
    }
  } else {
    console.log(`No macro bound to blast ${blast.id}`);
  }

  // Build info string for the blast configuration
  let blastInfo = [];
  blastInfo.push(range.charAt(0).toUpperCase() + range.slice(1));
  blastInfo.push(actions === 2 ? "2-Action" : "1-Action");
  if (map !== 0) blastInfo.push(`MAP ${map > 0 ? '+' : ''}${map}`);
  if (damageType) blastInfo.push(damageType.charAt(0).toUpperCase() + damageType.slice(1));

  const infoStr = ` (${blastInfo.join(', ')})`;
  ui.notifications.info(`Using ${blast.name}${infoStr}...`);

  // Use the PF2e system's ElementalBlast class
  // This is how pf2e-hud does it!
  try {
    if (!game.pf2e?.ElementalBlast) {
      ui.notifications.error("PF2e ElementalBlast class not found. Please update your PF2e system.");
      return;
    }

    // Create an ElementalBlast instance for this actor
    const elementalBlast = new game.pf2e.ElementalBlast(actor);

    // Call the attack method with the appropriate options
    const mapIncreases = Math.abs(map) / 5; // Convert -5 to 1, -10 to 2
    await elementalBlast.attack({
      element: blast.element,
      damageType: damageType || blast.damageTypes[0], // Use selected or first available
      melee: range === "melee",
      mapIncreases: mapIncreases,
      event: null
    });

    console.log("PF2e Kineticist Assistant | Successfully used Elemental Blast");
  } catch (error) {
    console.error("PF2e Kineticist Assistant | Error using Elemental Blast:", error);
    ui.notifications.error(
      "Failed to use Elemental Blast. " +
      "Try clicking the Elemental Blast on your character sheet instead."
    );
  }
}

/**
 * Roll damage for an Elemental Blast
 */
async function rollBlastDamage(blast, { actor, actions, isCrit, damageType }) {
  if (!blast) {
    ui.notifications.error("Could not find blast data");
    return;
  }

  // Build info string
  let damageInfo = [];
  damageInfo.push(actions === 2 ? "2-Action" : "1-Action");
  if (isCrit) damageInfo.push("Critical");
  if (damageType) damageInfo.push(damageType.charAt(0).toUpperCase() + damageType.slice(1));

  const infoStr = damageInfo.length > 0 ? ` (${damageInfo.join(', ')})` : '';
  ui.notifications.info(`Rolling damage for ${blast.name}${infoStr}...`);

  // Prefer ranged strike as it's the default, fall back to melee
  const strike = blast.rangedStrike || blast.meleeStrike;

  if (strike) {
    // Build options for the damage roll
    const damageOptions = {
      event: null
    };

    // If a damage type was selected, add it to options
    if (damageType) {
      damageOptions.damageType = damageType;
    }

    // Roll damage or critical damage
    try {
      if (isCrit && typeof strike.critical === 'function') {
        await strike.critical(damageOptions);
        return;
      } else if (typeof strike.damage === 'function') {
        await strike.damage(damageOptions);
        return;
      }
    } catch (error) {
      console.error("Error rolling elemental blast damage via strike:", error);
    }
  }

  // No strike available - check if Kinetic Aura is active
  const hasKineticAura = actor.itemTypes.effect?.some(e =>
    e.slug?.includes("kinetic-aura") ||
    e.name?.toLowerCase().includes("kinetic aura")
  );

  if (!hasKineticAura) {
    ui.notifications.error(
      "Kinetic Aura must be active to roll Elemental Blast damage from this menu. " +
      "Please activate your Kinetic Aura first."
    );
    return;
  }

  // Kinetic Aura is active but we still couldn't find the strike
  ui.notifications.error(
    "Could not find Elemental Blast strike data. Please try using the attack from your character sheet instead."
  );
}

/**
 * Use an Impulse
 */
async function useImpulse(impulseId, impulseUuid, { actor, token }) {
  const item = await fromUuid(impulseUuid);
  if (!item) {
    ui.notifications.error("Could not find impulse item");
    return;
  }

  // Check if there's an animation macro
  const macroUuid = getAnimationMacro(actor, impulseId);
  console.log(`useImpulse - Checking for macro. impulseId: ${impulseId}, macroUuid: ${macroUuid}`);
  if (macroUuid) {
    const macro = await fromUuid(macroUuid);
    console.log(`Found macro:`, macro?.name);
    if (macro) {
      console.log(`Executing macro: ${macro.name}`);
      ui.notifications.info(`Executing animation for ${item.name}...`);
      await macro.execute();
    }
  } else {
    console.log(`No macro bound to impulse ${impulseId}`);
  }

  // Use the item
  ui.notifications.info(`Using ${item.name}...`);
  await item.toMessage();
}
