// standaloneCapacity.js
// Calculates standalone capacity for a single product if it were the sole consumer of stock.

/**
 * @param {string} productCode
 * @param {Array<{materialCode: string, bomQty: number}>} bom - filtered BOM for this product
 * @param {Object} stockMap - { materialCode: stockQty }
 * @returns {{ capacity: number, limitingParts: Array }}
 */
function calculateStandaloneCapacity(productCode, bom, stockMap) {
  if (!bom || bom.length === 0) return { capacity: 0, limitingParts: [] };

  let capacity = Infinity;
  let limitingParts = [];

  for (const item of bom) {
    const bomQty = Number(item.bomQty);
    if (!bomQty || bomQty <= 0) continue;

    const stock = stockMap[item.materialCode] ?? 0;
    const possible = Math.floor(stock / bomQty);

    if (possible < capacity) {
      capacity = possible;
      limitingParts = [{ materialCode: item.materialCode, stock, bomQty, possible }];
    } else if (possible === capacity) {
      limitingParts.push({ materialCode: item.materialCode, stock, bomQty, possible });
    }
  }

  return {
    capacity: capacity === Infinity ? 0 : capacity,
    limitingParts,
  };
}

module.exports = { calculateStandaloneCapacity };
