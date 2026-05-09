// Run: node inspect-excel.js "path/to/file.xlsx"
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error('Usage: node inspect-excel.js <path-to-xlsx>');
  process.exit(1);
}

const workbook = xlsx.readFile(filePath);
console.log('\n=== SHEETS ===');
workbook.SheetNames.forEach((name, i) => {
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[name], { defval: null });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  console.log(`\n[${i}] "${name}" — ${rows.length} rows`);
  console.log('    Headers:', headers.join(', '));
  if (rows.length > 0) {
    console.log('    Sample row 1:', JSON.stringify(rows[0]));
  }
});
