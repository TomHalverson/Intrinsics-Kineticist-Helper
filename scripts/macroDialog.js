import { MODULE_ID } from "./module.js";
import { localize, setAnimationMacro, removeAnimationMacro, getAnimationMacro } from "./misc.js";

export async function openMacroBindingDialog(actor, itemId, itemUuid) {
  const item = await fromUuid(itemUuid);
  if (!item) {
    ui.notifications.error("Could not find item");
    return;
  }

  const currentMacroUuid = getAnimationMacro(actor, itemId);
  const currentMacro = currentMacroUuid ? await fromUuid(currentMacroUuid) : null;

  let content = `
    <style>
      .kineticist-macro-drop-zone {
        min-height: 100px;
        border: 2px dashed #999;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background: rgba(0, 0, 0, 0.1);
      }
      .kineticist-macro-drop-zone:hover {
        border-color: #2196f3;
        background: rgba(33, 150, 243, 0.1);
      }
      .kineticist-macro-drop-zone.drag-over {
        border-color: #4caf50;
        background: rgba(76, 175, 80, 0.2);
        transform: scale(1.02);
      }
      .kineticist-macro-placeholder {
        color: #999;
      }
      .kineticist-macro-placeholder i {
        font-size: 2em;
        display: block;
        margin-bottom: 8px;
        opacity: 0.5;
      }
      .kineticist-macro-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      .kineticist-macro-content img {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      .kineticist-macro-content .macro-name {
        flex: 1;
        font-weight: 600;
      }
      .kineticist-macro-content .macro-remove {
        color: #f44336;
        cursor: pointer;
        padding: 4px 8px;
        transition: all 0.2s ease;
      }
      .kineticist-macro-content .macro-remove:hover {
        color: #fff;
        background: #f44336;
        border-radius: 4px;
      }
    </style>
    <div style="padding: 8px;">
      <p style="margin-bottom: 16px;">
        ${localize("dialog.macroBinding.description") || "Drag and drop a macro to execute when using"} <strong>${item.name}</strong>:
      </p>
      <div class="kineticist-macro-drop-zone" data-item-id="${itemId}">
        ${currentMacro ? `
          <div class="kineticist-macro-content">
            <img src="${currentMacro.img}" alt="${currentMacro.name}" />
            <span class="macro-name">${currentMacro.name}</span>
            <a class="macro-remove" title="Remove Macro"><i class="fas fa-times"></i></a>
          </div>
        ` : `
          <div class="kineticist-macro-placeholder">
            <i class="fas fa-code"></i>
            <p>Drag a macro here to execute when this ability is used</p>
            <p style="font-size: 0.85em; margin-top: 8px; opacity: 0.7;">You can drag from the Macro Directory sidebar</p>
          </div>
        `}
      </div>
      <div style="margin-top: 16px; padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196f3; border-radius: 4px;">
        <div style="font-size: 0.9em;">
          <i class="fas fa-info-circle"></i> <strong>${localize("dialog.macroBinding.tip") || "Tip"}:</strong>
          ${localize("dialog.macroBinding.tipText") || "The macro will execute when you left-click the ability icon. You can use this to trigger animations from modules like Sequencer or Automated Animations."}
        </div>
      </div>
    </div>
  `;

  const dialog = await foundry.applications.api.DialogV2.wait({
    window: {
      title: `${localize("dialog.macroBinding.title") || "Bind Animation Macro"}: ${item.name}`,
      icon: "fa-solid fa-film",
    },
    content,
    buttons: [
      {
        action: "close",
        label: localize("buttons.close") || "Close",
        icon: "fa-solid fa-xmark",
        default: true
      }
    ],
    position: { width: 500 },
    render: (event, dialog) => {
      // Setup drag-and-drop functionality
      // DialogV2 render callback provides the dialog instance, not the HTML
      setupMacroDragAndDrop(dialog.element, actor, itemId, item);
    }
  });
}

/**
 * Setup drag-and-drop functionality for macro binding
 */
function setupMacroDragAndDrop(html, actor, itemId, item) {
  // Convert jQuery object to native DOM element if needed
  const element = (html.jquery || html[0]) ? html[0] : html;
  const dropZone = element?.querySelector(".kineticist-macro-drop-zone");
  if (!dropZone) return;

  // Handle drag over
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });

  // Handle drag leave
  dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  });

  // Handle drop
  dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");

    // Get the dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return;
    }

    // Verify it's a macro
    if (data.type !== "Macro") {
      ui.notifications.warn("You can only drop macros here");
      return;
    }

    // Get the macro
    const droppedMacro = await fromUuid(data.uuid);
    if (!droppedMacro) {
      ui.notifications.error("Could not find the dropped macro");
      return;
    }

    // Save the macro UUID to the actor (supports both world macros and compendium macros)
    await setAnimationMacro(actor, itemId, data.uuid);

    console.log(`${MODULE_ID} | Bound macro "${droppedMacro.name}" (UUID: ${data.uuid}) to ${item.name} (itemId: ${itemId})`);

    // Verify it was saved
    const savedMacroId = getAnimationMacro(actor, itemId);
    console.log(`${MODULE_ID} | Verification - Saved macro ID: ${savedMacroId}`);

    ui.notifications.info(`Macro "${droppedMacro.name}" bound to ${item.name}`);

    // Update the drop zone UI
    updateDropZoneUI(dropZone, droppedMacro, actor, itemId, item);

    // Re-render the character sheet
    actor.sheet.render(false);
  });

  // Handle remove button click
  const removeBtn = dropZone.querySelector(".macro-remove");
  if (removeBtn) {
    removeBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      await removeAnimationMacro(actor, itemId);
      ui.notifications.info(`Animation macro removed from ${item.name}`);

      // Update the drop zone UI
      updateDropZoneUI(dropZone, null, actor, itemId, item);

      // Re-render the character sheet
      actor.sheet.render(false);
    });
  }

  // Make the macro content clickable to view the macro
  const macroContent = dropZone.querySelector(".kineticist-macro-content");
  if (macroContent) {
    macroContent.addEventListener("click", async (event) => {
      // Don't open if clicking the remove button
      if (event.target.closest(".macro-remove")) return;

      const currentMacroUuid = getAnimationMacro(actor, itemId);
      const macro = currentMacroUuid ? await fromUuid(currentMacroUuid) : null;
      if (macro) {
        macro.sheet.render(true);
      }
    });
  }
}

/**
 * Update the drop zone UI after adding/removing a macro
 */
function updateDropZoneUI(dropZone, macro, actor, itemId, item) {
  if (macro) {
    dropZone.innerHTML = `
      <div class="kineticist-macro-content">
        <img src="${macro.img}" alt="${macro.name}" />
        <span class="macro-name">${macro.name}</span>
        <a class="macro-remove" title="Remove Macro"><i class="fas fa-times"></i></a>
      </div>
    `;
  } else {
    dropZone.innerHTML = `
      <div class="kineticist-macro-placeholder">
        <i class="fas fa-code"></i>
        <p>Drag a macro here to execute when this ability is used</p>
        <p style="font-size: 0.85em; margin-top: 8px; opacity: 0.7;">You can drag from the Macro Directory sidebar</p>
      </div>
    `;
  }

  // Re-setup event listeners
  // Find the root dialog element to pass to setupMacroDragAndDrop
  const dialogElement = dropZone.closest('.window-app') || dropZone.closest('.dialog') || dropZone.parentElement;
  if (dialogElement) {
    setupMacroDragAndDrop(dialogElement, actor, itemId, item);
  }
}
