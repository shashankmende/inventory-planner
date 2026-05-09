// LandingPage — explains the tool and drives user to Data Setup
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 720, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Inventory Planner</h1>
      <p style={{ color: '#475569', fontSize: 16, marginBottom: 32 }}>
        A decision support system for inventory capacity planning.
      </p>

      <Section title="What this tool does">
        <ul>
          <li>Calculates how many finished goods can be <strong>manufactured</strong> or <strong>dispatched</strong> from current stock</li>
          <li>Allocates <strong>shared inventory</strong> across multiple products without double-counting</li>
          <li>Identifies <strong>bottleneck parts</strong> blocking capacity</li>
          <li>Breaks down <strong>stock value</strong> — used, remaining, blocked, obsolete</li>
          <li>Generates <strong>actionable insights</strong> for business decisions</li>
        </ul>
      </Section>

      <Section title="Inputs required (Excel upload)">
        <p><strong>Sheet 1 — Stock / Inventory</strong></p>
        <table style={tableStyle}>
          <thead>
            <tr>{['Material Code', 'Material Name', 'Stock', 'Category', 'Priority*', 'Buy Price*', 'Conversion Rate*', 'Stock Value*', 'Supplier*', 'Lead Time*', 'Is Obsolete*'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{['MT001', 'Motor 12V', '150', 'Electrical', '', '500', '1', '', '', '', ''].map((v, i) => <td key={i} style={tdStyle}>{v}</td>)}</tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: '#64748b' }}>* Optional columns</p>

        <p><strong>Sheet 2 — BOM</strong></p>
        <table style={tableStyle}>
          <thead>
            <tr>{['Product Code', 'Product Name', 'Material Code', 'BOM Qty'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{['PROD-A', 'Product Alpha', 'MT001', '2'].map((v, i) => <td key={i} style={tdStyle}>{v}</td>)}</tr>
          </tbody>
        </table>
      </Section>

      <Section title="Capacity modes">
        <ul>
          <li><strong>Manufacturing</strong> — only Manufacturing Critical parts (Mechanical, Electrical, Electronics, Fasteners)</li>
          <li><strong>Dispatch</strong> — adds Dispatch Critical parts (Consumables, Plastics, Packing, Rubber, Stickers)</li>
          <li><strong>Strict BOM</strong> — all parts in BOM</li>
        </ul>
      </Section>

      <button
        onClick={() => navigate('/setup')}
        style={{
          marginTop: 24,
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
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

const tableStyle = { borderCollapse: 'collapse', fontSize: 12, marginBottom: 8, width: '100%' };
const thStyle = { border: '1px solid #e2e8f0', padding: '4px 8px', background: '#f1f5f9', textAlign: 'left' };
const tdStyle = { border: '1px solid #e2e8f0', padding: '4px 8px' };
