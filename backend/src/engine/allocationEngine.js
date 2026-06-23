// allocationEngine.js
// Allocates shared inventory across products based on strategy.

const { calculateStandaloneCapacity } = require('./standaloneCapacity');

/**
 * Strict priority: allocate maximum to each product sequentially by priority.
 */
function allocateStrictPriority(sortedProducts, bomMap, stockMap, activePartsSet) {
  const remaining = { ...stockMap };
  const results = [];

  for (const product of sortedProducts) {
    const bom = (bomMap[product.productCode] || []).filter((i) =>
      activePartsSet.has(i.materialCode)
    );
    const { capacity } = calculateStandaloneCapacity(product.productCode, bom, remaining);

    // Deduct consumed stock
    for (const item of bom) {
      remaining[item.materialCode] =
        (remaining[item.materialCode] ?? 0) - capacity * item.bomQty;
    }

    results.push({ productCode: product.productCode, allocatedCapacity: capacity });
  }

  return { results, remainingStock: remaining };
}

/**
 * Priority with target: like strict priority but caps allocation at targetQty.
 */
function allocatePriorityWithTarget(sortedProducts, bomMap, stockMap, activePartsSet) {
  const remaining = { ...stockMap };
  const results = [];

  for (const product of sortedProducts) {
    const bom = (bomMap[product.productCode] || []).filter((i) =>
      activePartsSet.has(i.materialCode)
    );
    const { capacity } = calculateStandaloneCapacity(product.productCode, bom, remaining);
    const allocated =
      product.targetQty != null ? Math.min(capacity, product.targetQty) : capacity;

    for (const item of bom) {
      remaining[item.materialCode] =
        (remaining[item.materialCode] ?? 0) - allocated * item.bomQty;
    }

    results.push({ productCode: product.productCode, allocatedCapacity: allocated });
  }

  return { results, remainingStock: remaining };
}

/**
 * Main entry: run allocation based on strategy.
 * @param {Array} products - product list with priority + targetQty
 * @param {Object} bomMap  - { productCode: [{materialCode, bomQty}] }
 * @param {Object} stockMap - { materialCode: qty }
 * @param {Array} activeParts - parts filtered by capacity mode (have .materialCode)
 * @param {string} strategy - 'strict_priority' | 'priority_with_target'
 */
function runAllocation(products, bomMap, stockMap, activeParts, strategy) {
  const activePartsSet = new Set(activeParts.map((p) => p.materialCode));
  const sorted = [...products].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  if (strategy === 'priority_with_target') {
    return allocatePriorityWithTarget(sorted, bomMap, stockMap, activePartsSet);
  }
  return allocateStrictPriority(sorted, bomMap, stockMap, activePartsSet);
}

module.exports = { runAllocation };
