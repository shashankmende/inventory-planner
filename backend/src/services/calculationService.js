// calculationService.js
// Orchestrates all engines to produce a full calculation result.

const { filterPartsByMode, resolvePriority } = require('../engine/capacityModes');
const { calculateStandaloneCapacity } = require('../engine/standaloneCapacity');
const { runAllocation } = require('../engine/allocationEngine');
const { identifyBottlenecks } = require('../engine/bottleneckEngine');
const { calculateStockValue, resolveUnitValue } = require('../engine/stockValueEngine');
const { generateInsights } = require('../engine/insightEngine');

function buildBomMap(bomItems) {
  const map = {};
  for (const item of bomItems) {
    if (!map[item.productCode]) map[item.productCode] = [];
    map[item.productCode].push({ materialCode: item.materialCode, bomQty: item.bomQty });
  }
  return map;
}

function buildStockMap(stockItems) {
  const map = {};
  for (const item of stockItems) {
    map[item.materialCode] = item.stock ?? 0;
  }
  return map;
}

function getProducts(bomItems, productPriority = []) {
  const map = {};
  for (const item of bomItems) {
    if (!map[item.productCode]) {
      map[item.productCode] = {
        productCode: item.productCode,
        productName: item.productName || item.productCode,
        priority: 999,
        targetQty: null,
      };
    }
    if (item.productName) map[item.productCode].productName = item.productName;
  }

  for (const override of productPriority) {
    if (map[override.productCode]) {
      if (override.priority != null) map[override.productCode].priority = override.priority;
      if (override.targetQty != null) map[override.productCode].targetQty = override.targetQty;
    }
  }

  return Object.values(map);
}

function classifyProduct(allocatedCapacity, totalAllocated) {
  if (allocatedCapacity === 0) return 'Blocked';
  if (totalAllocated === 0) return 'Blocked';
  const pct = (allocatedCapacity / totalAllocated) * 100;
  if (pct >= 20) return 'High';
  if (pct >= 5) return 'Medium';
  return 'Low';
}

function calculate(stockItems, bomItems, config = {}) {
  const {
    capacityMode = 'manufacturing',
    allocationStrategy = 'strict_priority',
    productPriority = [],
  } = config;

  // Step 1 — filter parts by capacity mode AND exclude obsolete parts from forecasting
  const activeParts = filterPartsByMode(
    stockItems.filter((p) => !p.isObsolete),
    capacityMode
  );
  const activePartsSet = new Set(activeParts.map((p) => p.materialCode));

  // Step 2 — build maps
  const bomMap = buildBomMap(bomItems);
  const stockMap = buildStockMap(stockItems);

  // Step 3 — product list with priorities
  const products = getProducts(bomItems, productPriority);

  // Step 4 — standalone capacity per product
  const stockNameMap = Object.fromEntries(
    stockItems.map((s) => [s.materialCode, s.materialName || s.materialCode])
  );
  for (const product of products) {
    const filteredBom = (bomMap[product.productCode] || []).filter((i) =>
      activePartsSet.has(i.materialCode)
    );
    const { capacity, limitingParts } = calculateStandaloneCapacity(
      product.productCode,
      filteredBom,
      stockMap
    );
    product.standaloneCapacity = capacity;
    // Enrich limitingParts with materialName
    product.limitingParts = limitingParts.map((lp) => ({
      ...lp,
      materialName: stockNameMap[lp.materialCode] || lp.materialCode,
    }));
  }

  // Step 5 — allocation
  const { results: allocationResults, remainingStock } = runAllocation(
    products,
    bomMap,
    stockMap,
    activeParts,
    allocationStrategy
  );

  // Step 6 — merge allocation into products
  const totalAllocated = allocationResults.reduce((sum, r) => sum + r.allocatedCapacity, 0);
  for (const product of products) {
    const r = allocationResults.find((x) => x.productCode === product.productCode);
    product.allocatedCapacity = r?.allocatedCapacity ?? 0;
    product.gap = product.standaloneCapacity - product.allocatedCapacity;
    product.targetGap = product.targetQty != null
      ? Math.max(0, product.targetQty - product.allocatedCapacity)
      : null;
    product.contributionPct =
      totalAllocated > 0 ? (product.allocatedCapacity / totalAllocated) * 100 : 0;
    product.classification = classifyProduct(product.allocatedCapacity, totalAllocated);
  }

  // Step 6b — per-product value consumed (only active parts count)
  // Used by Overview hover and Stock Distribution tab for consistency
  const stockItemMap = Object.fromEntries(stockItems.map((s) => [s.materialCode, s]));
  for (const product of products) {
    let valueConsumed = 0;
    const activeBom = (bomMap[product.productCode] || []).filter((i) =>
      activePartsSet.has(i.materialCode)
    );
    for (const item of activeBom) {
      const part = stockItemMap[item.materialCode];
      if (part) {
        valueConsumed += item.bomQty * product.allocatedCapacity * resolveUnitValue(part);
      }
    }
    product.valueConsumed = Math.round(valueConsumed * 100) / 100;
  }

  // Step 7 — bottlenecks
  const bottlenecks = identifyBottlenecks(products, bomMap, stockMap, activeParts);
  for (const b of bottlenecks) {
    b.materialName = stockNameMap[b.materialCode] || b.materialCode;
  }

  // Step 8 — obsolete stock
  // Only parts explicitly marked inventoryType='obsolete' are treated as obsolete.
  // Parts with stock > 0 that are not referenced in any BOM are tracked separately as 'unreferenced'.
  const bomUsedParts = new Set(bomItems.map((i) => i.materialCode));
  const obsoleteSet = new Set(
    stockItems.filter((p) => p.isObsolete).map((p) => p.materialCode)
  );
  const unreferencedSet = new Set(
    stockItems
      .filter((p) => !p.isObsolete && p.stock > 0 && !bomUsedParts.has(p.materialCode))
      .map((p) => p.materialCode)
  );

  // Step 9 — stock value
  const stockValue = calculateStockValue(stockItems, remainingStock, activePartsSet, obsoleteSet);

  // Step 10 — parts output
  const partsOutput = stockItems.map((part) => {
    const rp = resolvePriority(part);
    const origStock = part.stock ?? 0;
    const remQty = remainingStock[part.materialCode] ?? origStock;
    const usedQty = Math.max(0, origStock - remQty);
    const bn = bottlenecks.find((b) => b.materialCode === part.materialCode);
    return {
      materialCode: part.materialCode,
      materialName: part.materialName,
      category: part.category,
      subCategory: part.subCategory || null,
      inventoryType: part.inventoryType || null,
      priority: rp,
      stock: origStock,
      usedStock: usedQty,
      remainingStock: remQty,
      isActive: activePartsSet.has(part.materialCode),
      isBottleneck: !!bn,
      bottleneckSeverity: bn?.severity || null,
      shortage: bn?.shortage || 0,
      affectedProducts: bn?.affectedProducts || [],
      isObsolete: obsoleteSet.has(part.materialCode),
      isUnreferenced: unreferencedSet.has(part.materialCode),
      supplier: part.supplier || null,
      leadTime: part.leadTime || null,
    };
  });

  // Step 11 — obsolete stock output (only explicitly obsolete parts)
  const obsoleteItems = partsOutput.filter((p) => p.isObsolete).map((p) => {
    const svEntry = stockValue.breakdown.find((b) => b.materialCode === p.materialCode);
    const rawPart = stockItems.find((s) => s.materialCode === p.materialCode);
    return {
      materialCode: p.materialCode,
      materialName: p.materialName,
      stock: p.stock,
      totalValue: svEntry?.totalValue || 0,
      inventoryType: rawPart?.inventoryType || null,
      reason: `Inventory Type = "${rawPart?.inventoryType || 'obsolete'}"`,
    };
  });

  // Unreferenced parts — stock > 0 but not used in any BOM, not obsolete
  const unreferencedItems = partsOutput.filter((p) => p.isUnreferenced).map((p) => {
    const svEntry = stockValue.breakdown.find((b) => b.materialCode === p.materialCode);
    return {
      materialCode: p.materialCode,
      materialName: p.materialName,
      category: p.category,
      stock: p.stock,
      totalValue: svEntry?.totalValue || 0,
      inventoryType: p.inventoryType,
    };
  });

  // Step 12 — KPIs
  const kpis = {
    totalAllocatedCapacity: totalAllocated,
    productCount: products.length,
    activePartsCount: activeParts.length,
    totalPartsCount: stockItems.length,
    bottleneckCount: bottlenecks.length,
    blockedProductCount: products.filter((p) => p.classification === 'Blocked').length,
    highProductCount: products.filter((p) => p.classification === 'High').length,
    unreferencedPartsCount: unreferencedItems.length,
    totalStockValue: stockValue.total,
    usedStockValue: stockValue.used,
    remainingStockValue: stockValue.remaining,
    blockedStockValue: stockValue.blocked,
    obsoleteStockValue: stockValue.obsolete,
    capacityMode,
    allocationStrategy,
  };

  // Step 13 — insights
  const insights = generateInsights(products, bottlenecks, stockValue, kpis);

  return {
    config: { capacityMode, allocationStrategy },
    kpis,
    products,
    parts: partsOutput,
    bottlenecks,
    stockValue,
    obsoleteStock: obsoleteItems,
    unreferencedStock: unreferencedItems,
    insights,
  };
}

module.exports = { calculate };
