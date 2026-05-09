// api.js — main API router
const express = require('express');
const multer = require('multer');
const {
  uploadAndProcess,
  recalculate,
  getResults,
  getValidation,
  getSession,
  clearSession,
} = require('../controllers/dataController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are accepted.'));
    }
  },
});

router.get('/session', getSession);
router.delete('/session', clearSession);
router.post('/upload', upload.single('file'), uploadAndProcess);
router.post('/recalculate', recalculate);
router.get('/results', getResults);
router.get('/validation', getValidation);

module.exports = router;
