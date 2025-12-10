import { MODULE_ID } from "./module.js";
import { ELEMENTS } from "./const.js";
import { localize } from "./misc.js";

export async function openElementSelector(actor) {
  const currentGates = actor.getFlag(MODULE_ID, "selectedGates") || [];

  // Build element selection checkboxes
  let elementCheckboxes = Object.entries(ELEMENTS).map(([key, data]) => {
    const isChecked = currentGates.includes(key);
    return `
      <div class="element-checkbox-row" style="display: flex; align-items: center; gap: 12px; padding: 8px; border: 2px solid ${isChecked ? data.color : 'transparent'}; border-radius: 4px; margin-bottom: 8px; cursor: pointer; background: ${isChecked ? 'rgba(255,255,255,0.05)' : 'transparent'};">
        <input type="checkbox" name="element-${key}" value="${key}" ${isChecked ? 'checked' : ''} style="width: 20px; height: 20px;">
        <img src="${data.icon}" style="width: 32px; height: 32px; border: 2px solid ${data.color}; border-radius: 50%; padding: 4px; background: rgba(0,0,0,0.3);">
        <div>
          <div style="font-weight: 600; color: ${data.color};">${data.name}</div>
          <div style="font-size: 0.85em; opacity: 0.7;">${data.damageType} damage</div>
        </div>
      </div>
    `;
  }).join("");

  let content = `
    <style>
      .element-checkbox-row:hover {
        background: rgba(255,255,255,0.08) !important;
      }
    </style>
    <div style="padding: 8px;">
      <p style="margin-bottom: 16px;">${localize("dialog.elementSelector.description") || "Select the elemental gates your Kineticist has access to:"}</p>
      ${elementCheckboxes}
    </div>
  `;

  return foundry.applications.api.DialogV2.wait({
    window: {
      title: localize("dialog.elementSelector.title") || "Select Elemental Gates",
      icon: "fa-solid fa-atom",
    },
    content,
    buttons: [
      {
        action: "save",
        label: localize("buttons.save") || "Save",
        icon: "fa-solid fa-save",
        callback: async (event, button, dialog) => {
          const html = dialog.element;
          const selected = [];

          html.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            selected.push(checkbox.value);
          });

          await actor.setFlag(MODULE_ID, "selectedGates", selected);
          ui.notifications.info(localize("notifications.gatesSaved") || "Elemental gates saved!");

          // Re-render the character sheet
          actor.sheet.render(false);
        }
      },
      {
        action: "cancel",
        label: localize("buttons.cancel") || "Cancel",
        icon: "fa-solid fa-xmark",
      }
    ],
    render: (event, app) => {
      const html = app.element;

      // Make rows clickable to toggle checkboxes
      html.querySelectorAll('.element-checkbox-row').forEach(row => {
        row.addEventListener('click', function(e) {
          if (e.target.type === 'checkbox') return; // Don't interfere with direct checkbox clicks

          const checkbox = this.querySelector('input[type="checkbox"]');
          checkbox.checked = !checkbox.checked;

          // Update styling
          const elementKey = checkbox.value;
          const elemData = ELEMENTS[elementKey];
          if (checkbox.checked) {
            this.style.border = `2px solid ${elemData.color}`;
            this.style.background = 'rgba(255,255,255,0.05)';
          } else {
            this.style.border = '2px solid transparent';
            this.style.background = 'transparent';
          }
        });

        // Update styling on checkbox change
        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
          const elementKey = this.value;
          const elemData = ELEMENTS[elementKey];
          if (this.checked) {
            row.style.border = `2px solid ${elemData.color}`;
            row.style.background = 'rgba(255,255,255,0.05)';
          } else {
            row.style.border = '2px solid transparent';
            row.style.background = 'transparent';
          }
        });
      });
    },
    position: { width: 500 },
  });
}
