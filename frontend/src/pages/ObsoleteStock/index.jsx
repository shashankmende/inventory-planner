// ObsoleteStock — dead inventory with value impact
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import TablePagination from '@mui/material/TablePagination';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ObsoleteStock() {
  const { results, hasResults } = useApp();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  if (!hasResults) {
    return <NoData onSetup={() => navigate('/setup')} />;
  }

  const { obsoleteStock, kpis } = results;

  const totalValue = obsoleteStock.reduce((sum, i) => sum + (i.totalValue || 0), 0);
  const totalQty = obsoleteStock.reduce((sum, i) => sum + (i.stock || 0), 0);

  if (obsoleteStock.length === 0) {
    return (
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Obsolete Stock</h1>
        <div style={{ padding: '16px 20px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d' }}>
          ✓ No obsolete stock detected. All parts are referenced in at least one BOM.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Obsolete Stock</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Parts marked as obsolete or not referenced in any active BOM. These tie up capital with no production value.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Obsolete Parts" value={obsoleteStock.length} color="#dc2626" />
        <KpiCard label="Total Obsolete Value" value={fmt(totalValue)} color="#dc2626" />
        <KpiCard label="% of Total Stock Value" value={kpis.totalStockValue > 0 ? ((totalValue / kpis.totalStockValue) * 100).toFixed(1) + '%' : '—'} color="#d97706" />
        <KpiCard label="Total Obsolete Qty" value={fmt(totalQty)} />
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            {['#', 'Material Code', 'Material Name', 'Stock Qty', 'Stock Value', 'Reason'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {obsoleteStock.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, i) => (
            <tr key={item.materialCode} style={{ background: i % 2 ? '#fff7ed' : '#fffbeb' }}>
              <td style={{ ...td, color: '#64748b' }}>{i + 1}</td>
              <td style={td}><strong>{item.materialCode}</strong></td>
              <td style={td}>{item.materialName || '—'}</td>
              <td style={td}>{item.stock}</td>
              <td style={{ ...td, color: '#dc2626', fontWeight: 600 }}>{fmt(item.totalValue)}</td>
              <td style={{ ...td, fontSize: 12, color: '#78350f' }}>{item.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination
        component="div"
        count={obsoleteStock.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      <div style={{ marginTop: 8, padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
        <strong>Action:</strong> Write off, return to supplier, or repurpose obsolete stock to recover <strong>{fmt(totalValue)}</strong> in tied-up capital.
      </div>
    </div>
  );
}

function KpiCard({ label, value, color = '#0f172a' }) {
  return (
    <div style={{ padding: '12px 18px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 120, background: '#fff' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function NoData({ onSetup }) {
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Obsolete Stock</h1>
      <p style={{ color: '#64748b' }}>No results yet. <button style={linkBtn} onClick={onSetup}>Upload data first</button></p>
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { border: '1px solid #e2e8f0', padding: '8px 10px', background: '#f8fafc', textAlign: 'left' };
const td = { border: '1px solid #e2e8f0', padding: '8px 10px' };
const linkBtn = { background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 };
