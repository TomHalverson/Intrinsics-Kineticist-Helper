import { MODULE_ID } from "./module.js";
import { localize, setAnimationMacro, removeAnimationMacro, getAnimationMacro } from "./misc.js";

export async function openMacroBindingDialog(actor, itemId, itemUuid) {
  const item = await fromUuid(itemUuid);
  if (!item) {
    ui.notifications.error("Could not find item");
    return;
  }

  const currentMacroId = getAnimationMacro(actor, itemId);
  const currentMacro = currentMacroId ? game.macros.get(currentMacroId) : null;

  // Get all macros available to the user
  const availableMacros = game.macros.contents.filter(m => m.canExecute);

  let macroOptions = `<option value="">-- ${localize("dialog.macroBinding.noMacro") || "No Macro"} --</option>`;
  macroOptions += availableMacros.map(macro => {
    const selected = currentMacroId === macro.id ? 'selected' : '';
    return `<option value="${macro.id}" ${selected}>${macro.name}</option>`;
  }).join("");

  let content = `
    <div style="padding: 8px;">
      <p style="margin-bottom: 16px;">
        ${localize("dialog.macroBinding.description") || "Select an animation macro to execute when using"} <strong>${item.name}</strong>:
      </p>
      <div class="form-group">
        <label><strong>${localize("dialog.macroBinding.selectMacro") || "Animation Macro"}:</strong></label>
        <select name="macro-select" style="width: 100%; margin-top: 8px; padding: 5px;">
          ${macroOptions}
        </select>
      </div>
      ${currentMacro ? `
        <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 4px;">
          <div style="font-size: 0.9em; opacity: 0.8;">Currently bound:</div>
          <div style="font-weight: 600; margin-top: 4px;">${currentMacro.name}</div>
        </div>
      ` : ''}
      <div style="margin-top: 16px; padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196f3; border-radius: 4px;">
        <div style="font-size: 0.9em;">
          <i class="fas fa-info-circle"></i> <strong>${localize("dialog.macroBinding.tip") || "Tip"}:</strong>
          ${localize("dialog.macroBinding.tipText") || "The macro will execute when you left-click the ability icon. You can use this to trigger animations from modules like Sequencer or Automated Animations."}
        </div>
      </div>
    </div>
  `;

  return foundry.applications.api.DialogV2.wait({
    window: {
      title: `${localize("dialog.macroBinding.title") || "Bind Animation Macro"}: ${item.name}`,
      icon: "fa-solid fa-film",
    },
    content,
    buttons: [
      {
        action: "save",
        label: localize("buttons.save") || "Save",
        icon: "fa-solid fa-save",
        callback: async (event, button, dialog) => {
          const html = dialog.element;
          const selectedMacroId = html.querySelector('select[name="macro-select"]').value;

          if (selectedMacroId) {
            await setAnimationMacro(actor, itemId, selectedMacroId);
            ui.notifications.info(localize("notifications.macroSaved") || `Animation macro bound to ${item.name}`);
          } else {
            await removeAnimationMacro(actor, itemId);
            ui.notifications.info(localize("notifications.macroRemoved") || `Animation macro removed from ${item.name}`);
          }

          // Re-render the character sheet
          actor.sheet.render(false);
        }
      },
      {
        action: "remove",
        label: localize("buttons.remove") || "Remove",
        icon: "fa-solid fa-trash",
        callback: async () => {
          await removeAnimationMacro(actor, itemId);
          ui.notifications.info(localize("notifications.macroRemoved") || `Animation macro removed from ${item.name}`);
          actor.sheet.render(false);
        }
      },
      {
        action: "cancel",
        label: localize("buttons.cancel") || "Cancel",
        icon: "fa-solid fa-xmark",
      }
    ],
    position: { width: 500 },
  });
}
