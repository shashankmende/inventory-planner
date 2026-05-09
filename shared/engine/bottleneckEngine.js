// bottleneckEngine.js
// Identifies and ranks parts that are constraining capacity.

/**
 * A part is a bottleneck when total demand across all products exceeds available stock.
 *
 * @param {Array} products - with standaloneCapacity + targetQty
 * @param {Object} bomMap  - { productCode: [{materialCode, bomQty}] }
 * @param {Object} stockMap - { materialCode: qty }
 * @param {Array} activeParts - parts in scope for this capacity mode
 * @returns {Array} sorted bottlenecks (worst first)
 */
function identifyBottlenecks(products, bomMap, stockMap, activeParts) {
  const activeSet = new Set(activeParts.map((p) => p.materialCode));

  const partStats = {};

  for (const product of products) {
    const bom = bomMap[product.productCode] || [];
    // Use standalone capacity capped by target (if set) as the demand reference
    const demandQty =
      product.targetQty != null
        ? Math.min(product.standaloneCapacity ?? 0, product.targetQty)
        : product.standaloneCapacity ?? 0;

    for (const item of bom) {
      if (!activeSet.has(item.materialCode)) continue;

      if (!partStats[item.materialCode]) {
        partStats[item.materialCode] = {
          materialCode: item.materialCode,
          stock: stockMap[item.materialCode] ?? 0,
          totalDemand: 0,
          affectedProducts: new Set(),
        };
      }

      partStats[item.materialCode].totalDemand += item.bomQty * demandQty;
      partStats[item.materialCode].affectedProducts.add(product.productCode);
    }
  }

  const bottlenecks = [];

  for (const stat of Object.values(partStats)) {
    const shortage = Math.max(0, stat.totalDemand - stat.stock);
    if (shortage <= 0) continue;

    const shortageRatio = stat.totalDemand > 0 ? shortage / stat.totalDemand : 0;
    const severity =
      stat.stock === 0 ? 'critical' : shortageRatio > 0.5 ? 'high' : 'medium';

    bottlenecks.push({
      materialCode: stat.materialCode,
      stock: stat.stock,
      totalDemand: stat.totalDemand,
      shortage,
      shortageRatio,
      severity,
      affectedProducts: [...stat.affectedProducts],
    });
  }

  // Sort by shortageRatio descending (most constrained first)
  return bottlenecks.sort((a, b) => b.shortageRatio - a.shortageRatio);
}

module.exports = { identifyBottlenecks };
