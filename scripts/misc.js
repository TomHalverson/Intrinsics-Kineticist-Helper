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

  if (hasKineticistClass) return true;

  // Check if they have any Kineticist-related feats or features
  const allItems = actor.items || [];
  const hasKineticistFeatures = allItems.some(item => {
    const traits = item.system?.traits?.value || [];
    return KINETICIST_TRAITS.some(trait => traits.includes(trait));
  });

  return hasKineticistFeatures;
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

  return allItems.filter(item => {
    const traits = item.system?.traits?.value || [];
    const actionType = item.system?.actionType?.value;
    return (
      traits.includes("impulse") ||
      (item.type === "feat" && item.name.toLowerCase().includes("impulse")) ||
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
  const allItems = actor.items || [];

  return allItems.filter(item => {
    const name = item.name.toLowerCase();
    return (
      (item.type === "action" || item.type === "weapon") &&
      (name.includes("elemental blast") || name.includes("base kinetic"))
    );
  }).map(item => ({
    id: item.id,
    uuid: item.uuid,
    name: item.name,
    img: item.img,
    link: item.link,
    type: item.type,
    element: detectElement(item.name),
    description: item.system?.description?.value || "",
    traits: item.system?.traits?.value || []
  }));
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
  return game.i18n.localize(`pf2e-kineticist-assistant.${key}`);
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
