// validationEngine.js
// Validates stock and BOM data and returns structured errors/warnings.

const VALID_CATEGORIES = [
  'Mechanical', 'Electrical', 'Electronics', 'Fasteners',
  'Consumables', 'Plastics', 'Packing Material', 'Rubber', 'Stickers',
];

const VALID_SUBCATEGORIES = [
  'Accessories', 'Consumables', 'Hardware', 'Keypad', 'Motors',
  'Packing Material', 'Plastics', 'Steel', 'Switches', 'Wiring',
];

const VALID_PRIORITIES = [
  'Manufacturing Critical', 'Dispatch Critical',
  'Warning Only', 'Optional', 'Substitute Available',
];

const VALID_INVENTORY_TYPES = ['obsolete', 'active', 'raw material', 'finished goods', 'wip'];

function validateStock(stockItems) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  stockItems.forEach((item, i) => {
    const row = i + 2; // 1-indexed, skip header
    const code = String(item.materialCode || '').trim();

    if (!code) {
      errors.push({ row, field: 'Material Code', message: 'Missing material code' });
      // do NOT return — continue checking other fields on this row
    }
    if (code && seen.has(code)) {
      errors.push({ row, field: 'Material Code', materialCode: code, message: `Duplicate material code "${code}"` });
    }
    if (code) seen.add(code);

    if (!item.materialName || String(item.materialName).trim() === '') {
      errors.push({ row, field: 'Material Name', materialCode: code, message: 'Missing material name' });
    }
    if (item.stock == null || item.stock === '') {
      errors.push({ row, field: 'Stock', materialCode: code, message: 'Blank stock value' });
    } else if (isNaN(Number(item.stock))) {
      errors.push({ row, field: 'Stock', materialCode: code, message: 'Stock is not a number' });
    } else if (Number(item.stock) < 0) {
      errors.push({ row, field: 'Stock', materialCode: code, message: 'Negative stock value' });
    }

    // Buy Price — if provided, must be numeric and non-negative
    if (item.buyPrice != null && item.buyPrice !== '') {
      if (isNaN(Number(item.buyPrice))) {
        errors.push({ row, field: 'Buy Price', materialCode: code, message: `Buy price is not a number: "${item.buyPrice}"` });
      } else if (Number(item.buyPrice) < 0) {
        errors.push({ row, field: 'Buy Price', materialCode: code, message: 'Buy price cannot be negative' });
      }
    }

    // Stock Value — if provided, must be numeric and non-negative
    if (item.stockValue != null && item.stockValue !== '') {
      if (isNaN(Number(item.stockValue))) {
        errors.push({ row, field: 'Stock Value', materialCode: code, message: `Stock value is not a number: "${item.stockValue}"` });
      } else if (Number(item.stockValue) < 0) {
        errors.push({ row, field: 'Stock Value', materialCode: code, message: 'Stock value cannot be negative' });
      }
    }

    // Category + Sub-Category — at least one must be provided (blocking)
    const hasCategory = item.category && String(item.category).trim() !== '';
    const hasSubCategory = item.subCategory && String(item.subCategory).trim() !== '';

    if (!hasCategory && !hasSubCategory) {
      errors.push({ row, field: 'Category / Sub-Category', materialCode: code, message: 'Both category and sub-category are missing. Provide at least one to determine part priority.' });
    } else {
      if (hasCategory && !VALID_CATEGORIES.includes(String(item.category).trim())) {
        warnings.push({ row, field: 'Category', materialCode: code, message: `Unknown category "${item.category}". Priority derived from sub-category if available, else Warning Only.` });
      }
      if (hasSubCategory && !VALID_SUBCATEGORIES.includes(String(item.subCategory).trim())) {
        warnings.push({ row, field: 'Sub-Category', materialCode: code, message: `Unknown sub-category "${item.subCategory}". Will not affect priority derivation.` });
      }
    }

    // Priority — info only
    if (item.priority && !VALID_PRIORITIES.includes(String(item.priority).trim())) {
      warnings.push({ row, field: 'Priority', materialCode: code, message: `Unknown priority "${item.priority}". Derived from sub-category/category instead.` });
    }

    // Inventory type — MANDATORY, blocking if missing
    if (!item.inventoryType || String(item.inventoryType).trim() === '') {
      errors.push({ row, field: 'Inventory Type', materialCode: code, message: 'Missing inventory type. Accepted values: active, obsolete, raw material, finished goods, wip.' });
    } else if (!VALID_INVENTORY_TYPES.includes(String(item.inventoryType).toLowerCase().trim())) {
      warnings.push({ row, field: 'Inventory Type', materialCode: code, message: `Unrecognised inventory type "${item.inventoryType}". Accepted: ${VALID_INVENTORY_TYPES.join(', ')}.` });
    }

    // Buy Price / Stock Value — at least one must be provided (blocking)
    const hasStockValue = item.stockValue != null && Number(item.stockValue) > 0;
    const hasBuyPrice = item.buyPrice != null && Number(item.buyPrice) > 0;
    if (!hasStockValue && !hasBuyPrice) {
      errors.push({ row, field: 'Buy Price / Stock Value', materialCode: code, message: 'No buy price or stock value provided. Cannot calculate financial impact.' });
    }

    // Lead time + supplier — optional, warning only (never block)
    if (!item.leadTime) {
      warnings.push({ row, field: 'Lead Time', materialCode: code, message: 'Missing lead time' });
    }
    if (!item.supplier) {
      warnings.push({ row, field: 'Supplier', materialCode: code, message: 'Missing supplier' });
    }
  });

  return { errors, warnings };
}

function validateBOM(bomItems, stockCodes) {
  const errors = [];
  const warnings = [];

  bomItems.forEach((item, i) => {
    const row = i + 2;
    const productCode = String(item.productCode || '').trim();
    const materialCode = String(item.materialCode || '').trim();

    if (!productCode) {
      errors.push({ row, field: 'Product Code', message: 'Missing product code' });
      return;
    }
    if (!materialCode) {
      errors.push({ row, field: 'Material Code', productCode, message: 'Missing material code in BOM' });
      return;
    }
    const qty = Number(item.bomQty);
    if (item.bomQty == null || item.bomQty === '') {
      errors.push({ row, field: 'BOM Qty', productCode, materialCode, message: 'Missing BOM quantity' });
    } else if (isNaN(qty) || qty <= 0) {
      errors.push({ row, field: 'BOM Qty', productCode, materialCode, message: `Invalid BOM quantity: ${item.bomQty}` });
    } else if (qty > 1000) {
      warnings.push({ row, field: 'BOM Qty', productCode, materialCode, message: `High BOM quantity (${qty}). Verify if correct.` });
    }
    if (stockCodes && materialCode && !stockCodes.has(materialCode)) {
      warnings.push({ row, field: 'Material Code', productCode, materialCode, message: `Material "${materialCode}" not found in stock data` });
    }
  });

  return { errors, warnings };
}

function validate(stockItems, bomItems) {
  const stockCodes = new Set(stockItems.map((i) => String(i.materialCode || '').trim()).filter(Boolean));
  const sv = validateStock(stockItems);
  const bv = validateBOM(bomItems, stockCodes);

  const errors = [...sv.errors, ...bv.errors];
  const warnings = [...sv.warnings, ...bv.warnings];

  return {
    isValid: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
  };
}

module.exports = { validate, validateStock, validateBOM };
