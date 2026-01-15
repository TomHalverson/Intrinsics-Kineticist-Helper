import { MODULE_ID } from "./module.js";
import { KINETICIST_TRAITS } from "./const.js";

/**
 * Check if an actor is a Kineticist
 */
export function isKineticist(actor) {
  if (!actor) return false;

  // Check if the actor has the Kineticist class
  const classes = actor.itemTypes?.class || [];
  const hasKineticistClass = classes.some(cls =>
    cls.name.toLowerCase().includes("kineticist") ||
    cls.slug === "kineticist"
  );

  return hasKineticistClass;
}

/**
 * Get elemental gates from actor
 */
export function getElementalGates(actor) {
  const gates = [];
  const allItems = actor.items || [];

  // Look for features with "gate" in the name or kinetic-gate trait
  const gateItems = allItems.filter(item => {
    const name = item.name.toLowerCase();
    const traits = item.system?.traits?.value || [];
    return (
      name.includes("gate") ||
      traits.includes("kinetic-gate") ||
      name.includes("elemental gate")
    );
  });

  // Extract element types from gate items
  for (const item of gateItems) {
    const name = item.name.toLowerCase();
    if (name.includes("air")) gates.push("air");
    if (name.includes("earth")) gates.push("earth");
    if (name.includes("fire")) gates.push("fire");
    if (name.includes("metal")) gates.push("metal");
    if (name.includes("water")) gates.push("water");
    if (name.includes("wood")) gates.push("wood");
  }

  // Return unique gates
  return [...new Set(gates)];
}

/**
 * Get impulses from actor
 */
export function getImpulses(actor) {
  const allItems = actor.items || [];

  // Names to exclude from impulses list
  const excludedNames = ["elemental blast", "channel elements", "impulses"];

  return allItems.filter(item => {
    const traits = item.system?.traits?.value || [];
    const actionType = item.system?.actionType?.value;
    const name = item.name.toLowerCase();

    // Exclude specific items
    if (excludedNames.some(excluded => name.includes(excluded))) {
      return false;
    }

    return (
      traits.includes("impulse") ||
      (item.type === "feat" && name.includes("impulse")) ||
      (item.type === "action" && traits.some(t => t.includes("kineticist")))
    );
  }).map(item => ({
    id: item.id,
    uuid: item.uuid,
    name: item.name,
    img: item.img,
    link: item.link,
    type: item.type,
    actionCost: item.system?.actionType?.value || item.system?.actions?.value,
    description: item.system?.description?.value || "",
    traits: item.system?.traits?.value || []
  }));
}

/**
 * Get elemental blasts from actor
 */
export function getElementalBlasts(actor) {
  const blasts = [];

  // Elemental Blasts are stored in actor flags by the gate feats
  const elementalBlastFlags = actor.flags?.pf2e?.kineticist?.elementalBlast || {};

  // Check if kinetic aura is active
  const hasKineticAura = actor.itemTypes.effect?.some(e =>
    e.slug?.includes("kinetic-aura") ||
    e.name?.toLowerCase().includes("kinetic aura")
  );

  if (!hasKineticAura) {
    return blasts;
  }

  // Get the elemental blast action item
  const blastItem = actor.itemTypes.action?.find(item =>
    item.slug === "elemental-blast"
  );

  if (!blastItem) {
    return blasts;
  }

  // Get attack bonus calculation
  // Elemental blasts use simple weapon proficiency + CON modifier
  const simpleProficiency = actor.system?.proficiencies?.attacks?.simple?.value || 0;
  const conMod = actor.system?.abilities?.con?.mod || 0;
  const baseAttackBonus = simpleProficiency + conMod;

  // Process each elemental blast from the flags
  for (const [element, blastData] of Object.entries(elementalBlastFlags)) {
    // Localize the label if it's a localization key
    let blastName = blastData.label || `Elemental Blast (${element.charAt(0).toUpperCase() + element.slice(1)})`;
    if (blastName.includes('.')) {
      blastName = game.i18n.localize(blastName);
    }

    // Create blast entry - reference the action item directly
    blasts.push({
      id: `elemental-blast-${element}`,
      uuid: blastItem.uuid, // Use the actual action item's UUID
      name: blastName,
      img: blastData.img || "systems/pf2e/icons/default-icons/action.svg",
      link: blastItem.link || "",
      type: "action", // It's an action, not a strike
      element: element,
      description: blastItem.system?.description?.value || "",
      traits: blastItem.system?.traits?.value || [],
      item: blastItem, // Reference to the blast action item
      attackBonus: baseAttackBonus,
      damageTypes: blastData.damageTypes || [],
      dieFaces: blastData.dieFaces || 6,
      range: blastData.range || 0
    });
  }

  return blasts;
}

/**
 * Detect element from item name
 */
function detectElement(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("air")) return "air";
  if (lowerName.includes("earth")) return "earth";
  if (lowerName.includes("fire")) return "fire";
  if (lowerName.includes("metal")) return "metal";
  if (lowerName.includes("water")) return "water";
  if (lowerName.includes("wood")) return "wood";
  return "unknown";
}

/**
 * Get localized string
 */
export function localize(key) {
  return game.i18n.localize(`intrinsics-kineticist-helper.${key}`);
}

/**
 * Get the user's controlled token
 */
export function getYourToken() {
  const controlled = canvas.tokens.controlled;
  if (controlled.length > 0) return controlled[0];

  // Fallback to character token
  if (game.user.character) {
    const charToken = canvas.tokens.placeables.find(
      t => t.actor?.id === game.user.character.id
    );
    if (charToken) return charToken;
  }

  return null;
}

/**
 * Get animation macro for an impulse/blast
 */
export function getAnimationMacro(actor, itemId) {
  const animations = actor.getFlag(MODULE_ID, "animations") || {};
  return animations[itemId];
}

/**
 * Set animation macro for an impulse/blast
 */
export async function setAnimationMacro(actor, itemId, macroId) {
  const animations = actor.getFlag(MODULE_ID, "animations") || {};
  animations[itemId] = macroId;
  await actor.setFlag(MODULE_ID, "animations", animations);
}

/**
 * Remove animation macro for an impulse/blast
 */
export async function removeAnimationMacro(actor, itemId) {
  const animations = actor.getFlag(MODULE_ID, "animations") || {};
  delete animations[itemId];
  await actor.setFlag(MODULE_ID, "animations", animations);
}

/**
 * Get custom description for an impulse
 */
export function getCustomDescription(actor, itemId) {
  const descriptions = actor.getFlag(MODULE_ID, "customDescriptions") || {};
  return descriptions[itemId] || "";
}

/**
 * Set custom description for an impulse
 */
export async function setCustomDescription(actor, itemId, description) {
  const descriptions = actor.getFlag(MODULE_ID, "customDescriptions") || {};
  descriptions[itemId] = description;
  await actor.setFlag(MODULE_ID, "customDescriptions", descriptions);
}
