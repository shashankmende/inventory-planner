// capacityModes.js
// Filters parts by capacity mode and resolves per-part priority.

const CATEGORY_PRIORITY_MAP = {
  Mechanical: 'Manufacturing Critical',
  Electrical: 'Manufacturing Critical',
  Electronics: 'Manufacturing Critical',
  Fasteners: 'Manufacturing Critical',
  Consumables: 'Dispatch Critical',
  Plastics: 'Dispatch Critical',
  'Packing Material': 'Dispatch Critical',
  Rubber: 'Dispatch Critical',
  Stickers: 'Dispatch Critical',
};

// Sub-category priority map.
// Consumables, Plastics, Packing Material → Dispatch Critical only.
// Everything else → Manufacturing Critical.
const SUBCATEGORY_PRIORITY_MAP = {
  Accessories: 'Manufacturing Critical',
  Consumables: 'Dispatch Critical',
  Hardware: 'Manufacturing Critical',
  Keypad: 'Manufacturing Critical',
  Motors: 'Manufacturing Critical',
  'Packing Material': 'Dispatch Critical',
  Plastics: 'Dispatch Critical',
  Steel: 'Manufacturing Critical',
  Switches: 'Manufacturing Critical',
  Wiring: 'Manufacturing Critical',
};

const VALID_SUBCATEGORIES = Object.keys(SUBCATEGORY_PRIORITY_MAP);

const VALID_PRIORITIES = [
  'Manufacturing Critical',
  'Dispatch Critical',
  'Warning Only',
  'Optional',
  'Substitute Available',
];

/**
 * Priority resolution order:
 * 1. Explicit priority column (Excel override)
 * 2. Sub-category mapping
 * 3. Category mapping
 * 4. Default: Warning Only
 */
function resolvePriority(part) {
  if (part.priority && VALID_PRIORITIES.includes(part.priority)) {
    return part.priority;
  }
  if (part.subCategory) {
    const sc = String(part.subCategory).trim();
    if (SUBCATEGORY_PRIORITY_MAP[sc]) return SUBCATEGORY_PRIORITY_MAP[sc];
  }
  if (part.category) {
    const cat = String(part.category).trim();
    if (CATEGORY_PRIORITY_MAP[cat]) return CATEGORY_PRIORITY_MAP[cat];
  }
  return 'Warning Only';
}

/**
 * Returns only the parts that are blocking in the given capacity mode.
 * mode: 'manufacturing' | 'dispatch' | 'strict'
 */
function filterPartsByMode(parts, mode) {
  return parts
    .map((p) => ({ ...p, resolvedPriority: resolvePriority(p) }))
    .filter((p) => {
      if (mode === 'manufacturing') return p.resolvedPriority === 'Manufacturing Critical';
      if (mode === 'dispatch')
        return (
          p.resolvedPriority === 'Manufacturing Critical' ||
          p.resolvedPriority === 'Dispatch Critical'
        );
      return true; // strict — all parts
    });
}

module.exports = {
  filterPartsByMode,
  resolvePriority,
  CATEGORY_PRIORITY_MAP,
  SUBCATEGORY_PRIORITY_MAP,
  VALID_SUBCATEGORIES,
  VALID_PRIORITIES,
};
