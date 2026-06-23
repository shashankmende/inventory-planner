// dataController.js
// Handles file upload, validation, calculation, and result retrieval.

const { parseExcel } = require('../services/excelParser');
const { validate } = require('../engine/validationEngine');
const { calculate } = require('../services/calculationService');

// Simple in-process session store (replace with Redis/DB for multi-user)
let session = null;

const uploadAndProcess = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a multipart/form-data request with field "file".' });
    }

    // Parse Excel
    let parsed;
    try {
      parsed = parseExcel(req.file.buffer);
    } catch (parseErr) {
      return res.status(422).json({ error: `Excel parse error: ${parseErr.message}` });
    }

    const { stockItems, bomItems, sheetNames } = parsed;

    // Parse config from body
    let productPriority = [];
    if (req.body.productPriority) {
      try {
        productPriority = JSON.parse(req.body.productPriority);
      } catch (_) {
        productPriority = [];
      }
    }

    const config = {
      capacityMode: req.body.capacityMode || 'manufacturing',
      allocationStrategy: req.body.allocationStrategy || 'strict_priority',
      productPriority,
    };

    // Validate
    const validation = validate(stockItems, bomItems);

    // Calculate (even if warnings; block only on errors)
    let results = null;
    if (validation.isValid) {
      results = calculate(stockItems, bomItems, config);
    }

    session = { stockItems, bomItems, config, validation, results, sheetNames };

    // Include bomItems in results so frontend can render product-wise stock distribution
    const enrichedResults = results ? { ...results, bomItems } : null;
    return res.json({ success: true, validation, results: enrichedResults, config, sheetNames });
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
};

const recalculate = async (req, res) => {
  try {
    if (!session) {
      return res.status(400).json({ error: 'No data loaded. Upload a file first.' });
    }

    // productPriority arrives as a parsed array (application/json body)
    const productPriority = Array.isArray(req.body.productPriority)
      ? req.body.productPriority
      : session.config.productPriority;

    const config = {
      capacityMode: req.body.capacityMode || session.config.capacityMode,
      allocationStrategy: req.body.allocationStrategy || session.config.allocationStrategy,
      productPriority,
    };

    const results = calculate(session.stockItems, session.bomItems, config);
    session.results = results;
    session.config = config;

    return res.json({ success: true, results: { ...results, bomItems: session.bomItems }, config });
  } catch (err) {
    console.error('[recalculate] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

const getResults = (req, res) => {
  if (!session?.results) {
    return res.status(404).json({ error: 'No results available. Upload and process a file first.' });
  }
  return res.json(session.results);
};

const getValidation = (req, res) => {
  if (!session?.validation) {
    return res.status(404).json({ error: 'No validation results available.' });
  }
  return res.json(session.validation);
};

const getSession = (req, res) => {
  return res.json({
    hasData: !!session,
    hasResults: !!session?.results,
    config: session?.config || null,
    stockItemCount: session?.stockItems?.length || 0,
    bomItemCount: session?.bomItems?.length || 0,
    sheetNames: session?.sheetNames || null,
  });
};

const clearSession = (req, res) => {
  session = null;
  return res.json({ success: true, message: 'Session cleared.' });
};

module.exports = { uploadAndProcess, recalculate, getResults, getValidation, getSession, clearSession };
