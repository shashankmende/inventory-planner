// excelParser.js
// Parses an uploaded Excel buffer into normalised stockItems and bomItems.

const xlsx = require('xlsx');

// ─── Known product codes ──────────────────────────────────────────────────────
// Add new product codes here (case-insensitive match against Excel column headers).
// Any column whose header exactly matches one of these is treated as a product column.
const KNOWN_PRODUCT_CODES = [
  'PM125',
  'PM250SK',
  'STSK',
  'PG',
  'WGFK',
  'LPMV2_FV',
  'PM250MAX',
  'LPM CHINA',
];

// Column aliases -> internal field name (lowercase keys for case-insensitive match)
const STOCK_COL_MAP = {
  'material code': 'materialCode',
  'material_code': 'materialCode',
  'materialcode': 'materialCode',
  'part code': 'materialCode',
  'part_code': 'materialCode',
  'material name': 'materialName',
  'material_name': 'materialName',
  'materialname': 'materialName',
  'part name': 'materialName',
  'description': 'materialName',
  stock: 'stock',
  'stock qty': 'stock',
  quantity: 'stock',
  qty: 'stock',
  'buy price': 'buyPrice',
  'buy_price': 'buyPrice',
  'unit price': 'buyPrice',
  'price': 'buyPrice',
  'conversion rate': 'conversionRate',
  'conversion_rate': 'conversionRate',
  'fx rate': 'conversionRate',
  'stock value': 'stockValue',
  'stock_value': 'stockValue',
  'total value': 'stockValue',
  'value': 'stockValue',
  category: 'category',
  'part category': 'category',
  priority: 'priority',
  'part priority': 'priority',
  'lead time': 'leadTime',
  'lead_time': 'leadTime',
  'leadtime': 'leadTime',
  supplier: 'supplier',
  // Inventory type — replaces 'is obsolete'. Value 'obsolete' marks dead stock.
  'inventory type': 'inventoryType',
  'inventory_type': 'inventoryType',
  'inventorytype': 'inventoryType',
  type: 'inventoryType',
  // Legacy aliases kept for backward compatibility
  'is obsolete': 'inventoryType',
  'is_obsolete': 'inventoryType',
  obsolete: 'inventoryType',
  // Sub-category
  'sub category': 'subCategory',
  'sub-category': 'subCategory',
  'sub- category': 'subCategory',
  'sub_category': 'subCategory',
  subcategory: 'subCategory',
  'part sub category': 'subCategory',
  'part sub-category': 'subCategory',
};

const BOM_COL_MAP = {
  'product code': 'productCode',
  'product_code': 'productCode',
  'productcode': 'productCode',
  'fg code': 'productCode',
  'product name': 'productName',
  'product_name': 'productName',
  'productname': 'productName',
  'fg name': 'productName',
  'material code': 'materialCode',
  'material_code': 'materialCode',
  'materialcode': 'materialCode',
  'part code': 'materialCode',
  'component code': 'materialCode',
  'bom qty': 'bomQty',
  'bom_qty': 'bomQty',
  'bom quantity': 'bomQty',
  'qty': 'bomQty',
  'quantity': 'bomQty',
  'component qty': 'bomQty',
};

/**
 * Wide-format detection: returns the original header names (preserving case)
 * for columns that exactly match a known product code (case-insensitive).
 */
function detectProductColumns(rawRows) {
  if (!rawRows.length) return [];
  const knownSet = new Set(KNOWN_PRODUCT_CODES.map((c) => c.toLowerCase().trim()));
  const headers = Object.keys(rawRows[0]);
  return headers.filter((h) => knownSet.has(h.toLowerCase().trim()));
}

function normaliseRow(row, colMap) {
  const out = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = String(rawKey).toLowerCase().trim().replace(/\s+/g, ' ');
    const mapped = colMap[key];
    if (mapped) out[mapped] = value;
  }
  return out;
}

function findSheet(workbook, candidates) {
  for (const name of candidates) {
    const match = workbook.SheetNames.find(
      (s) => s.toLowerCase().trim() === name.toLowerCase()
    );
    if (match) return match;
  }
  return null;
}

function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });

  const sheets = workbook.SheetNames;
  if (sheets.length === 0) throw new Error('Excel file has no sheets.');

  const stockSheetName =
    findSheet(workbook, ['stock', 'inventory', 'parts', 'materials']) ||
    sheets[0];

  const rawStock = xlsx.utils.sheet_to_json(workbook.Sheets[stockSheetName], { defval: null });

  // --- Wide-format detection ---
  // Columns whose header exactly matches a known product code → product columns.
  const productColumns = detectProductColumns(rawStock);
  const isWideFormat = productColumns.length > 0;

  // --- Normalise stock items ---
  // Do NOT filter out rows with missing materialCode here — pass them through so
  // the validation engine can report them as blocking errors.
  const stockItems = rawStock
    .map((row) => normaliseRow(row, STOCK_COL_MAP))
    .filter((item) => {
      // Only skip completely empty rows (no fields at all after normalisation)
      return Object.keys(item).length > 0;
    })
    .map((item) => ({
      ...item,
      materialCode: item.materialCode ? String(item.materialCode).trim() : '',
      materialName: item.materialName ? String(item.materialName).trim() : '',
      stock: item.stock != null ? Number(item.stock) : 0,
      buyPrice: item.buyPrice != null ? Number(item.buyPrice) : null,
      conversionRate: item.conversionRate != null ? Number(item.conversionRate) : 1,
      stockValue: item.stockValue != null ? Number(item.stockValue) : null,
      category: item.category ? String(item.category).trim() : '',
      priority: item.priority ? String(item.priority).trim() : null,
      leadTime: item.leadTime != null ? String(item.leadTime) : null,
      supplier: item.supplier ? String(item.supplier).trim() : null,
      subCategory: item.subCategory ? String(item.subCategory).trim() : null,
      inventoryType: item.inventoryType ? String(item.inventoryType).trim() : null,
      isObsolete: item.inventoryType
        ? String(item.inventoryType).toLowerCase().trim() === 'obsolete'
        : false,
    }));

  // --- Extract BOM items ---
  let bomItems = [];
  let bomSource;

  if (isWideFormat) {
    // Wide format: each product column × part row → one BOM entry per non-zero cell
    bomSource = `${stockSheetName} (wide format — ${productColumns.length} products detected)`;
    for (const rawRow of rawStock) {
      const normRow = normaliseRow(rawRow, STOCK_COL_MAP);
      if (!normRow.materialCode) continue;
      const materialCode = String(normRow.materialCode).trim();
      for (const col of productColumns) {
        const qty = rawRow[col];
        if (qty != null && qty !== '' && Number(qty) > 0) {
          bomItems.push({
            productCode: col.trim(),
            productName: col.trim(),
            materialCode,
            bomQty: Number(qty),
          });
        }
      }
    }
  } else {
    // Separate BOM sheet (or single-sheet row-based fallback)
    const bomSheetName =
      findSheet(workbook, ['bom', 'bill of materials', 'bill_of_materials', 'components', 'bom data', 'bom_data']) ||
      sheets.find((s) => s !== stockSheetName) ||
      null;

    const singleSheetMode = !bomSheetName || bomSheetName === stockSheetName;
    const rawBom = singleSheetMode
      ? rawStock
      : xlsx.utils.sheet_to_json(workbook.Sheets[bomSheetName], { defval: null });

    bomSource = singleSheetMode
      ? `${stockSheetName} (single-sheet mode)`
      : bomSheetName;

    bomItems = rawBom
      .map((row) => normaliseRow(row, BOM_COL_MAP))
      .filter((item) => item.productCode && item.materialCode)
      .map((item) => ({
        ...item,
        productCode: String(item.productCode).trim(),
        productName: item.productName
          ? String(item.productName).trim()
          : String(item.productCode).trim(),
        materialCode: String(item.materialCode).trim(),
        bomQty: item.bomQty != null ? Number(item.bomQty) : 0,
      }));
  }

  return {
    stockItems,
    bomItems,
    isWideFormat,
    productColumns: isWideFormat ? productColumns.map((c) => c.trim()) : [],
    sheetNames: {
      stock: stockSheetName,
      bom: bomSource,
    },
  };
}

module.exports = { parseExcel };
