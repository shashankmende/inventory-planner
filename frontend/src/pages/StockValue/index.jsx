// StockValue — breakdown of stock value: used, remaining, blocked, obsolete
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import TablePagination from '@mui/material/TablePagination';

function fmt(n) {
  if (n == null || (n !== 0 && !n)) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1e7) return (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (Math.abs(v) >= 1e5) return (v / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + ' K';
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtFull(n) {
  if (n == null || (n !== 0 && !n)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function pct(part, total) {
  if (!total) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

export default function StockValue() {
  const { results, hasResults } = useApp();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  if (!hasResults) {
    return <NoData onSetup={() => navigate('/setup')} />;
  }

  const { stockValue, kpis } = results;
  const { total, used, remaining, blocked, obsolete, breakdown } = stockValue;

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Stock Value</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Monetary breakdown of inventory. Values derived from Stock Value column, or Stock × Buy Price × Conversion Rate.
      </p>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <ValueCard label="Total Stock Value"       value={fmt(total)}     rawValue={total}     pct={null}              color="#0f172a" />
        <ValueCard label="Used (allocated)"        value={fmt(used)}      rawValue={used}      pct={pct(used, total)}  color="#3b82f6" />
        <ValueCard label="Remaining (unallocated)" value={fmt(remaining)} rawValue={remaining} pct={pct(remaining, total)} color="#d97706" />
        <ValueCard label="Blocked (not in mode)"   value={fmt(blocked)}   rawValue={blocked}   pct={pct(blocked, total)}  color="#64748b" />
        <ValueCard label="Obsolete"                value={fmt(obsolete)}  rawValue={obsolete}  pct={pct(obsolete, total)} color={obsolete > 0 ? '#dc2626' : '#64748b'} />
      </div>

      {/* Visual bar */}
      <ValueBar total={total} used={used} remaining={remaining} blocked={blocked} obsolete={obsolete} />

      {/* Breakdown table */}
      <h2 style={{ fontSize: 15, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12, marginTop: 24 }}>
        Part-level Breakdown
      </h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            {['Material Code', 'Material Name', 'Total Value', 'Used Value', 'Remaining Value', 'Blocked Value', 'Obsolete Value'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {breakdown
            .filter((b) => b.totalValue > 0)
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((b, i) => (
              <tr key={b.materialCode} style={{ background: b.obsoleteValue > 0 ? '#fffbeb' : i % 2 ? '#f8fafc' : '#fff' }}>
                <td style={td}><strong>{b.materialCode}</strong></td>
                <td style={td}>{b.materialName || '—'}</td>
                <td style={{ ...td, fontWeight: 600 }}>{fmt(b.totalValue)}</td>
                <td style={{ ...td, color: '#3b82f6' }}>{fmt(b.usedValue)}</td>
                <td style={{ ...td, color: '#d97706' }}>{fmt(b.remainingValue)}</td>
                <td style={{ ...td, color: '#64748b' }}>{fmt(b.blockedValue)}</td>
                <td style={{ ...td, color: b.obsoleteValue > 0 ? '#dc2626' : '#94a3b8' }}>{fmt(b.obsoleteValue)}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <TablePagination
        component="div"
        count={breakdown.filter((b) => b.totalValue > 0).length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}

function ValueCard({ label, value, rawValue, pct, color }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 140, background: '#fff', cursor: 'default' }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {pct !== null && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{pct} of total</div>}
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{label}</div>
      {hovered && rawValue != null && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, background: '#0f172a', color: '#fff', padding: '4px 10px',
          borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap', zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {fmtFull(rawValue)}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #0f172a' }} />
        </div>
      )}
    </div>
  );
}

function ValueBar({ total, used, remaining, blocked, obsolete }) {
  if (!total) return null;
  const usedW = (used / total) * 100;
  const remW = (remaining / total) * 100;
  const blkW = (blocked / total) * 100;
  const obsW = (obsolete / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {usedW > 0 && <div style={{ width: `${usedW}%`, background: '#3b82f6' }} title={`Used: ${usedW.toFixed(1)}%`} />}
        {remW > 0 && <div style={{ width: `${remW}%`, background: '#fbbf24' }} title={`Remaining: ${remW.toFixed(1)}%`} />}
        {blkW > 0 && <div style={{ width: `${blkW}%`, background: '#94a3b8' }} title={`Blocked: ${blkW.toFixed(1)}%`} />}
        {obsW > 0 && <div style={{ width: `${obsW}%`, background: '#ef4444' }} title={`Obsolete: ${obsW.toFixed(1)}%`} />}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#64748b' }}>
        <LegendDot color="#3b82f6" label="Used" />
        <LegendDot color="#fbbf24" label="Remaining" />
        <LegendDot color="#94a3b8" label="Blocked" />
        <LegendDot color="#ef4444" label="Obsolete" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 10, height: 10, background: color, borderRadius: '50%', display: 'inline-block' }} />
      {label}
    </span>
  );
}

function NoData({ onSetup }) {
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Stock Value</h1>
      <p style={{ color: '#64748b' }}>No results yet. <button style={linkBtn} onClick={onSetup}>Upload data first</button></p>
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { border: '1px solid #e2e8f0', padding: '8px 10px', background: '#f8fafc', textAlign: 'left' };
const td = { border: '1px solid #e2e8f0', padding: '8px 10px' };
const linkBtn = { background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 };
