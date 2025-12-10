// Element types and their associated data
export const ELEMENTS = {
  air: {
    name: "Air",
    icon: "systems/pf2e/icons/spells/aerial-form.webp",
    color: "#e3f2fd",
    damageType: "electricity"
  },
  earth: {
    name: "Earth",
    icon: "systems/pf2e/icons/spells/stone-tell.webp",
    color: "#795548",
    damageType: "bludgeoning"
  },
  fire: {
    name: "Fire",
    icon: "systems/pf2e/icons/spells/fireball.webp",
    color: "#ff5722",
    damageType: "fire"
  },
  metal: {
    name: "Metal",
    icon: "systems/pf2e/icons/equipment/weapons/longsword.webp",
    color: "#9e9e9e",
    damageType: "slashing"
  },
  water: {
    name: "Water",
    icon: "systems/pf2e/icons/spells/hydraulic-torrent.webp",
    color: "#2196f3",
    damageType: "bludgeoning"
  },
  wood: {
    name: "Wood",
    icon: "systems/pf2e/icons/spells/tree-shape.webp",
    color: "#4caf50",
    damageType: "bludgeoning"
  }
};

// Traits that identify Kineticist class features
export const KINETICIST_TRAITS = ["kineticist", "impulse", "kinetic-gate"];

// Default elemental blast image if none is found
export const DEFAULT_BLAST_ICON = "systems/pf2e/icons/spells/magic-missile.webp";
