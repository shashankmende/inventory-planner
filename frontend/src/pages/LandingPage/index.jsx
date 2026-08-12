// LandingPage — explains the tool and drives user to Data Setup
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 780, margin: '48px auto', padding: '0 24px 48px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Inventory Planner</h1>
      <p style={{ color: '#475569', fontSize: 15, marginBottom: 32 }}>
        A decision support tool for inventory capacity planning — upload an Excel file, get instant answers.
      </p>

      <Section title="What this tool does">
        <ul style={{ lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
          <li>Calculates how many finished goods can be <strong>manufactured</strong> or <strong>dispatched</strong> from current stock</li>
          <li>Allocates <strong>shared inventory</strong> across multiple products without double-counting</li>
          <li>Identifies <strong>bottleneck parts</strong> blocking capacity with severity ranking</li>
          <li>Breaks down <strong>stock value</strong> — used, remaining, blocked, obsolete</li>
          <li>Generates <strong>actionable business insights</strong> automatically</li>
        </ul>
      </Section>

      <Section title="Excel input — single sheet format">
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
          Upload a <strong>single Excel sheet</strong>. Each row is a part/material. Product codes (e.g. PM125, STSK) appear as columns — the cell value is the BOM quantity needed for that product.
        </p>

        {/* Column reference */}
        <div style={sheetBox}>
          <div style={sheetLabel}>Column reference</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Column</th>
                <th style={thStyle}>Required?</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Material Code', '✅ Required', 'Unique part identifier'],
                ['Material Name', '✅ Required', 'Part description'],
                ['Main Category', '✅ Required', 'Used to auto-assign part priority (e.g. Electrical, Plastics)'],
                ['Sub-Category', '⚪ Optional', 'Finer-grained priority mapping (e.g. Motors, Packing Material)'],
                ['Stock', '✅ Required', 'Current quantity on hand'],
                ['Buy Price (In Rs.)', '✅ Optional*', 'Unit cost in INR (or source currency with Conversion Rate)'],
                ['Stock Value', '✅ Optional*', 'Total INR value of stock — use instead of Buy Price if available'],
                ['Inventory Type', '✅ Optional', 'Set to "obsolete" to flag dead stock'],
                ['PM125, STSK, … (product columns)', '✅ At least one', 'BOM quantity of this part for that product. Leave blank or 0 if not used.'],
              ].map(([col, req, desc]) => (
                <tr key={col}>
                  <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{req}</td>
                  <td style={tdStyle}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={noteStyle}>
            * For stock value, provide either <strong>Buy Price</strong> or <strong>Stock Value</strong>. If both are missing, that part shows ₹0 in value calculations.
          </div>
        </div>

        {/* Example rows */}
        <div style={sheetBox}>
          <div style={sheetLabel}>Example (2 rows)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 700 }}>
              <thead>
                <tr>
                  {['Material Code', 'Main Category', 'Sub-Category', 'Material Name', 'PM125', 'STSK', 'Buy Price (In Rs.)', 'Stock', 'Stock Value', 'Inventory Type'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['MT-001', 'Electrical', 'Motors', 'Motor 12V', '1', '2', '500', '150', '75000', 'active'].map((v, i) => (
                    <td key={i} style={{ ...tdStyle, color: v === '' ? '#cbd5e1' : 'inherit' }}>{v || '—'}</td>
                  ))}
                </tr>
                <tr style={{ background: '#f8fafc' }}>
                  {['PK-010', 'Packing Material', '', 'Outer Box', '1', '1', '300', '300', '9000', 'active'].map((v, i) => (
                    <td key={i} style={{ ...tdStyle, color: v === '' ? '#cbd5e1' : 'inherit' }}>{v || '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div style={noteStyle}>
            Row 1: Motor — <strong>Manufacturing Critical</strong> (blocks both manufacturing &amp; dispatch). Needs 1 unit for PM125 and 2 for STSK.<br />
            Row 2: Box — <strong>Dispatch Critical</strong> (blocks dispatch only). Stock value provided directly instead of Buy Price.
          </div>
        </div>
      </Section>

      {/* <Section title="Category → Priority mapping (auto-assigned)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <PriorityGroup
            label="Manufacturing Critical"
            color="#dc2626"
            items={['Mechanical', 'Electrical', 'Electronics', 'Fasteners', 'Accessories', 'Hardware', 'Motors', 'Switches', 'Wiring']}
          />
          <PriorityGroup
            label="Dispatch Critical"
            color="#d97706"
            items={['Consumables', 'Plastics', 'Packing Material', 'Rubber', 'Stickers']}
          />
          <PriorityGroup
            label="Warning Only (default)"
            color="#64748b"
            items={['Anything else / no category']}
          />
        </div>
        <div style={{ ...noteStyle, marginTop: 12 }}>
          You can override any part's priority by adding a <strong>Priority</strong> column with values: <em>Manufacturing Critical</em>, <em>Dispatch Critical</em>, <em>Warning Only</em>, <em>Optional</em>, or <em>Substitute Available</em>.
        </div>
      </Section> */}

      <button
        onClick={() => navigate('/setup')}
        style={{
          marginTop: 8,
          padding: '12px 28px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 15,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Get Started → Upload Data
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 15, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 14 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function PriorityGroup({ label, color, items }) {
  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: 6, padding: '10px 14px', minWidth: 180, background: `${color}08` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
      {items.map((item) => (
        <div key={item} style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>· {item}</div>
      ))}
    </div>
  );
}

const tableStyle = { borderCollapse: 'collapse', fontSize: 12, marginBottom: 8, width: '100%' };
const thStyle = { border: '1px solid #e2e8f0', padding: '6px 10px', background: '#f8fafc', textAlign: 'left', fontWeight: 600 };
const tdStyle = { border: '1px solid #e2e8f0', padding: '6px 10px' };
const sheetBox = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 16, background: '#fff' };
const sheetLabel = { fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' };
const noteStyle = { fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.6 };
