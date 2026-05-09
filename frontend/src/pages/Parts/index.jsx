// Parts — stock and usage breakdown per part
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import TablePagination from '@mui/material/TablePagination';

export default function Parts() {
  const { results, hasResults } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  if (!hasResults) {
    return <NoData onSetup={() => navigate('/setup')} />;
  }

  const { parts } = results;

  // Exclusive bucket assignment (priority: bottleneck > obsolete > unreferenced > active > inactive)
  const bucket = (p) => {
    if (p.isBottleneck) return 'bottleneck';
    if (p.isObsolete) return 'obsolete';
    if (p.isUnreferenced) return 'unreferenced';
    if (p.isActive) return 'active';
    return 'inactive';
  };

  const filters = [
    { key: 'all',           label: 'All',          count: parts.length },
    { key: 'active',        label: 'Active',        count: parts.filter((p) => bucket(p) === 'active').length },
    { key: 'bottleneck',    label: 'Bottleneck',    count: parts.filter((p) => bucket(p) === 'bottleneck').length },
    { key: 'obsolete',      label: 'Obsolete',      count: parts.filter((p) => bucket(p) === 'obsolete').length },
    { key: 'unreferenced',  label: 'Unreferenced',  count: parts.filter((p) => bucket(p) === 'unreferenced').length },
    { key: 'inactive',      label: 'Inactive',      count: parts.filter((p) => bucket(p) === 'inactive').length },
  ].filter((f) => f.key === 'all' || f.count > 0);

  const filtered = parts.filter((p) => {
    const matchFilter = filter === 'all' || bucket(p) === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.materialCode.toLowerCase().includes(q) || (p.materialName || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Parts</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        Stock availability, usage after allocation, and bottleneck status.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(0); }}
            style={{
              padding: '5px 14px', border: '1px solid #cbd5e1', borderRadius: 16,
              cursor: 'pointer', fontSize: 13,
              background: filter === f.key ? '#3b82f6' : '#fff',
              color: filter === f.key ? '#fff' : '#374151',
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search part…"
          style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginLeft: 'auto' }}
        />
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            {['Material Code', 'Material Name', 'Category', 'Sub-Category', 'Inventory Type', 'Priority', 'Stock', 'Used', 'Remaining', 'Active', 'Bottleneck', 'Shortage', 'Supplier'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={13} style={{ ...td, textAlign: 'center', color: '#64748b' }}>No parts match filter.</td></tr>
          ) : (
            paginated.map((p, i) => (
              <tr
                key={p.materialCode}
                style={{
                  background: p.isBottleneck ? '#fff1f2' : p.isObsolete ? '#fffbeb' : p.isUnreferenced ? '#f0f9ff' : i % 2 ? '#f8fafc' : '#fff',
                }}
              >
                <td style={td}><strong>{p.materialCode}</strong></td>
                <td style={td}>{p.materialName || '—'}</td>
                <td style={td}>{p.category || '—'}</td>
                <td style={td}>{p.subCategory || '—'}</td>
                <td style={td}>
                  {p.inventoryType ? <InvTypeBadge t={p.inventoryType} /> : '—'}
                  {p.isUnreferenced && <span style={{ marginLeft: 4, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>Unreferenced</span>}
                </td>
                <td style={td}><PriorityBadge priority={p.priority} /></td>
                <td style={td}>{p.stock}</td>
                <td style={td}>{p.usedStock}</td>
                <td style={{ ...td, color: p.remainingStock === 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{p.remainingStock}</td>
                <td style={td}>{p.isActive ? '✓' : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                <td style={td}>
                  {p.isBottleneck ? <SeverityBadge s={p.bottleneckSeverity} /> : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td style={{ ...td, color: p.shortage > 0 ? '#dc2626' : undefined, fontWeight: p.shortage > 0 ? 600 : 400 }}>
                  {p.shortage > 0 ? p.shortage : '—'}
                </td>
                <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{p.supplier || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}

function InvTypeBadge({ t }) {
  const isObs = String(t).toLowerCase() === 'obsolete';
  return (
    <span style={{
      background: isObs ? '#fff7ed' : '#f1f5f9',
      color: isObs ? '#ea580c' : '#475569',
      padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600,
    }}>{t}</span>
  );
}

function PriorityBadge({ priority }) {
  const colours = {
    'Manufacturing Critical': ['#fee2e2', '#dc2626'],
    'Dispatch Critical': ['#fff7ed', '#ea580c'],
    'Warning Only': ['#fffbeb', '#d97706'],
    'Optional': ['#f0fdf4', '#16a34a'],
    'Substitute Available': ['#eff6ff', '#2563eb'],
  };
  const [bg, fg] = colours[priority] || ['#f1f5f9', '#64748b'];
  return <span style={{ background: bg, color: fg, padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{priority || '—'}</span>;
}

function SeverityBadge({ s }) {
  const colours = { critical: ['#fee2e2', '#dc2626'], high: ['#fff7ed', '#ea580c'], medium: ['#fffbeb', '#d97706'] };
  const [bg, fg] = colours[s] || ['#f1f5f9', '#64748b'];
  return <span style={{ background: bg, color: fg, padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{s}</span>;
}

function NoData({ onSetup }) {
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Parts</h1>
      <p style={{ color: '#64748b' }}>No results yet. <button style={linkBtn} onClick={onSetup}>Upload data first</button></p>
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { border: '1px solid #e2e8f0', padding: '8px 10px', background: '#f8fafc', textAlign: 'left' };
const td = { border: '1px solid #e2e8f0', padding: '8px 10px' };
const linkBtn = { background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 };
