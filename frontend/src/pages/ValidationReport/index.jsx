// ValidationReport — shows validation errors and warnings from uploaded data
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import TablePagination from '@mui/material/TablePagination';

export default function ValidationReport() {
  const { validation, hasResults } = useApp();
  const navigate = useNavigate();

  if (!validation) {
    return (
      <div>
        <h1 style={{ fontSize: 22 }}>Validation Report</h1>
        <p style={{ color: '#64748b' }}>No data loaded yet. <button style={linkBtn} onClick={() => navigate('/setup')}>Upload a file</button></p>
      </div>
    );
  }

  const { errors, warnings, errorCount, warningCount, isValid } = validation;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Validation Report</h1>
        <StatusBadge ok={isValid} label={isValid ? 'PASSED' : 'FAILED'} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Errors" value={errorCount} color={errorCount > 0 ? '#dc2626' : '#16a34a'} />
        <KpiCard label="Warnings" value={warningCount} color={warningCount > 0 ? '#d97706' : '#64748b'} />
        <KpiCard label="Rows affected" value={new Set([...errors, ...warnings].map((r) => r.row).filter(Boolean)).size} color="#64748b" />
      </div>

      {!isValid && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, color: '#991b1b', fontSize: 13 }}>
          Fix all <strong>{errorCount} error(s)</strong> before results can be calculated. Warnings can be reviewed later.
        </div>
      )}

      {isValid && hasResults && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate('/overview')} style={primaryBtn}>View Results →</button>
        </div>
      )}

      {errors.length > 0 && (
        <Section title={`Errors (${errors.length})`} color="#dc2626" bg="#fff1f2">
          <IssueTable rows={errors} type="error" />
        </Section>
      )}

      {warnings.length > 0 && (
        <Section title={`Warnings (${warnings.length})`} color="#d97706" bg="#fffbeb">
          <IssueTable rows={warnings} type="warning" />
        </Section>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <p style={{ color: '#16a34a', fontWeight: 600 }}>✓ No issues found. Data is clean.</p>
      )}
    </div>
  );
}

function IssueTable({ rows, type }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fieldFilter, setFieldFilter] = useState('all');

  const fields = ['all', ...Array.from(new Set(rows.map((r) => r.field).filter(Boolean))).sort()];

  const filtered = fieldFilter === 'all' ? rows : rows.filter((r) => r.field === fieldFilter);
  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const rowBg = type === 'error' ? '#fff1f2' : '#fffbeb';
  const badgeColor = type === 'error' ? '#dc2626' : '#d97706';
  const badgeBg = type === 'error' ? '#fee2e2' : '#fef9c3';

  return (
    <div>
      {/* Field filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {fields.map((f) => {
          const count = f === 'all' ? rows.length : rows.filter((r) => r.field === f).length;
          const active = fieldFilter === f;
          return (
            <button
              key={f}
              onClick={() => { setFieldFilter(f); setPage(0); }}
              style={{
                padding: '3px 10px', border: `1px solid ${active ? badgeColor : '#e2e8f0'}`,
                borderRadius: 12, fontSize: 12, cursor: 'pointer',
                background: active ? badgeBg : '#fff',
                color: active ? badgeColor : '#475569', fontWeight: active ? 700 : 400,
              }}
            >
              {f === 'all' ? 'All fields' : f} ({count})
            </button>
          );
        })}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Row', 'Field', 'Material Code', 'Message'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr><td colSpan={4} style={{ ...tdCell, textAlign: 'center', color: '#94a3b8', padding: 16 }}>No issues for this field.</td></tr>
          ) : (
            pageRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? rowBg : 'transparent' }}>
                <td style={{ ...tdCell, color: '#64748b', width: 50, textAlign: 'center' }}>{r.row || '—'}</td>
                <td style={tdCell}>
                  <span style={{ background: badgeBg, color: badgeColor, padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {r.field || '—'}
                  </span>
                </td>
                <td style={{ ...tdCell, fontFamily: 'monospace', color: '#0f172a' }}>{r.materialCode || r.productCode || '—'}</td>
                <td style={tdCell}>{r.message}</td>
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
        rowsPerPageOptions={[10, 25, 50]}
      />
    </div>
  );
}

function Section({ title, color, bg, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, color, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ border: `1px solid ${color}30`, borderRadius: 8, overflow: 'hidden', padding: '12px 14px', background: bg }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ ok, label }) {
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
      background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#15803d' : '#dc2626',
    }}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{ padding: '12px 20px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 100, background: '#fff' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
    </div>
  );
}

const th = { border: '1px solid #e2e8f0', padding: '7px 10px', background: '#f8fafc', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdCell = { border: '1px solid #e2e8f0', padding: '7px 10px', verticalAlign: 'top' };
const primaryBtn = {
  padding: '8px 18px', background: '#3b82f6', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
};
const linkBtn = {
  background: 'none', border: 'none', color: '#3b82f6',
  textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0,
};
