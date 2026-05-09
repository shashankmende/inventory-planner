// Bottlenecks — ranked list of capacity-constraining parts
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import TablePagination from '@mui/material/TablePagination';

export default function Bottlenecks() {
  const { results, hasResults } = useApp();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  if (!hasResults) {
    return <NoData onSetup={() => navigate('/setup')} />;
  }

  const { bottlenecks, kpis } = results;

  if (bottlenecks.length === 0) {
    return (
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Bottlenecks</h1>
        <div style={{ padding: '16px 20px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d' }}>
          ✓ No bottlenecks detected for <strong>{kpis.capacityMode}</strong> mode. All active parts have sufficient stock.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Bottlenecks</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        Parts ranked by how severely they constrain capacity. Resolve top items first.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KpiCard label="Total Bottlenecks" value={bottlenecks.length} color="#dc2626" />
        <KpiCard label="Critical" value={bottlenecks.filter((b) => b.severity === 'critical').length} color="#dc2626" />
        <KpiCard label="High" value={bottlenecks.filter((b) => b.severity === 'high').length} color="#ea580c" />
        <KpiCard label="Medium" value={bottlenecks.filter((b) => b.severity === 'medium').length} color="#d97706" />
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            {['Rank', 'Part Code', 'Part Name', 'Stock', 'Total Demand', 'Shortage', 'Shortage %', 'Severity', 'Affected Products'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bottlenecks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((b, i) => (
            <tr key={b.materialCode} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
              <td style={{ ...td, fontWeight: 700, color: '#64748b' }}>#{i + 1}</td>
              <td style={td}><strong>{b.materialCode}</strong></td>
              <td style={td}>{b.materialName || '—'}</td>
              <td style={td}>{b.stock}</td>
              <td style={td}>{b.totalDemand}</td>
              <td style={{ ...td, color: '#dc2626', fontWeight: 700 }}>{b.shortage}</td>
              <td style={td}>{(b.shortageRatio * 100).toFixed(0)}%</td>
              <td style={td}><SeverityBadge s={b.severity} /></td>
              <td style={{ ...td, fontSize: 12, color: '#475569' }}>
                {b.affectedProducts.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination
        component="div"
        count={bottlenecks.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      <div style={{ marginTop: 8, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
        <strong>Action:</strong> Procure the parts listed above to unlock additional allocated capacity. Start with the highest shortage % items.
      </div>
    </div>
  );
}

function KpiCard({ label, value, color = '#0f172a' }) {
  return (
    <div style={{ padding: '12px 18px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 110, background: '#fff' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SeverityBadge({ s }) {
  const colours = { critical: ['#fee2e2', '#dc2626'], high: ['#fff7ed', '#ea580c'], medium: ['#fffbeb', '#d97706'] };
  const [bg, fg] = colours[s] || ['#f1f5f9', '#64748b'];
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{s}</span>;
}

function NoData({ onSetup }) {
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Bottlenecks</h1>
      <p style={{ color: '#64748b' }}>No results yet. <button style={linkBtn} onClick={onSetup}>Upload data first</button></p>
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { border: '1px solid #e2e8f0', padding: '8px 10px', background: '#f8fafc', textAlign: 'left' };
const td = { border: '1px solid #e2e8f0', padding: '8px 10px' };
const linkBtn = { background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 };
