// stockValueEngine.js
// Calculates used, remaining, blocked, and obsolete stock value.

/**
 * Resolves total stock value for a part.
 * Uses stockValue if provided, otherwise stock × buyPrice × conversionRate.
 */
function resolveStockValue(part) {
  if (part.stockValue != null && part.stockValue > 0) return part.stockValue;
  return (part.stock ?? 0) * (part.buyPrice ?? 0) * (part.conversionRate ?? 1);
}

/**
 * Resolves unit value for a part (value per single unit).
 */
function resolveUnitValue(part) {
  if (part.stockValue != null && part.stockValue > 0 && (part.stock ?? 0) > 0) {
    return part.stockValue / part.stock;
  }
  return (part.buyPrice ?? 0) * (part.conversionRate ?? 1);
}

/**
 * Computes stock value breakdown after allocation.
 *
 * @param {Array} allParts      - all stock items (full list, not filtered)
 * @param {Object} remainingStockMap - { materialCode: remainingQty } after allocation
 * @param {Set} activePartsSet  - parts in scope (used in calculation)
 * @param {Set} obsoleteSet     - materialCodes considered obsolete
 * @returns {{ total, used, remaining, blocked, obsolete, breakdown }}
 */
function calculateStockValue(allParts, remainingStockMap, activePartsSet, obsoleteSet = new Set()) {
  let total = 0;
  let used = 0;
  let remaining = 0;
  let blocked = 0;
  let obsolete = 0;

  const breakdown = allParts.map((part) => {
    const totalValue = resolveStockValue(part);
    const unitValue = resolveUnitValue(part);
    const originalStock = part.stock ?? 0;
    const remainQty = remainingStockMap[part.materialCode] ?? originalStock;
    const usedQty = Math.max(0, originalStock - remainQty);

    const partUsed = usedQty * unitValue;
    const partRemaining = remainQty * unitValue;
    const partObsolete = obsoleteSet.has(part.materialCode) ? totalValue : 0;
    // Blocked = parts not in active scope but have stock (excluded by mode but have value)
    const partBlocked = !activePartsSet.has(part.materialCode) && originalStock > 0 && !obsoleteSet.has(part.materialCode)
      ? totalValue
      : 0;

    total += totalValue;
    used += partUsed;
    remaining += partRemaining;
    obsolete += partObsolete;
    blocked += partBlocked;

    return {
      materialCode: part.materialCode,
      materialName: part.materialName,
      totalValue,
      usedValue: partUsed,
      remainingValue: partRemaining,
      blockedValue: partBlocked,
      obsoleteValue: partObsolete,
    };
  });

  return { total, used, remaining, blocked, obsolete, breakdown };
}

module.exports = { calculateStockValue, resolveStockValue, resolveUnitValue };
