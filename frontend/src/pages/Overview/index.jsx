// Overview — KPIs, insights, capacity mode context
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';

const MODE_LABELS = {
  manufacturing: 'Manufacturing',
  dispatch: 'Dispatch',
  strict: 'Strict BOM',
};

const STRATEGY_LABELS = {
  strict_priority: 'Strict Priority',
  priority_with_target: 'Priority with Target',
};

export default function Overview() {
  const { results, config, hasResults } = useApp();
  const navigate = useNavigate();

  const products = results?.products;
  const parts = results?.parts;
  const stockValue = results?.stockValue;
  const bomItems = results?.bomItems;

  // Product-wise breakdown of Used Value
  // Computed from bomItems + parts (isActive) + stockValue.breakdown (unit price) + products (allocatedCapacity)
  // Falls back to backend-computed valueConsumed if front-end inputs are unavailable
  const productValueBreakdown = React.useMemo(() => {
    // --- Frontend computation (preferred, always consistent with DistributionTab) ---
    if (bomItems && parts && stockValue?.breakdown && products) {
      // Build unit price map: materialCode → value per unit
      const unitPriceMap = {};
      for (const b of stockValue.breakdown) {
        const part = parts.find((p) => p.materialCode === b.materialCode);
        unitPriceMap[b.materialCode] = part?.stock > 0 ? (b.totalValue || 0) / part.stock : 0;
      }
      // Build active parts set
      const activeSet = new Set(parts.filter((p) => p.isActive).map((p) => p.materialCode));
      // Build BOM map: productCode → [{ materialCode, bomQty }]
      const bomMap = {};
      for (const item of bomItems) {
        if (!bomMap[item.productCode]) bomMap[item.productCode] = [];
        bomMap[item.productCode].push({ materialCode: item.materialCode, bomQty: item.bomQty });
      }
      // Compute per-product consumed value (active parts only)
      const entries = products.map((prod) => {
        const bom = (bomMap[prod.productCode] || []).filter((i) => activeSet.has(i.materialCode));
        const valueConsumed = bom.reduce(
          (sum, i) => sum + i.bomQty * (prod.allocatedCapacity || 0) * (unitPriceMap[i.materialCode] || 0),
          0
        );
        return { productCode: prod.productCode, valueConsumed };
      }).filter((e) => e.valueConsumed > 0);

      const totalConsumed = entries.reduce((s, e) => s + e.valueConsumed, 0);
      return entries
        .map((e) => ({
          ...e,
          pctOfUsed: totalConsumed > 0 ? (e.valueConsumed / totalConsumed) * 100 : 0,
        }))
        .sort((a, b) => b.pctOfUsed - a.pctOfUsed);
    }

    // --- Fallback: use backend-computed valueConsumed ---
    const withValue = (products || []).filter((p) => p.valueConsumed != null && p.valueConsumed > 0);
    const totalConsumed = withValue.reduce((s, p) => s + p.valueConsumed, 0);
    return withValue
      .map((p) => ({
        productCode: p.productCode,
        valueConsumed: p.valueConsumed,
        pctOfUsed: totalConsumed > 0 ? (p.valueConsumed / totalConsumed) * 100 : 0,
      }))
      .sort((a, b) => b.pctOfUsed - a.pctOfUsed);
  }, [products, parts, stockValue, bomItems]);

  const productValueMap = React.useMemo(
    () => Object.fromEntries(productValueBreakdown.map((item) => [item.productCode, item])),
    [productValueBreakdown]
  );

  if (!hasResults) {
    return <NoData onSetup={() => navigate('/setup')} />;
  }

  const { kpis, insights, bottlenecks } = results;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Overview</h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Mode: <strong>{MODE_LABELS[kpis.capacityMode]}</strong> &nbsp;|&nbsp;
            Strategy: <strong>{STRATEGY_LABELS[kpis.allocationStrategy]}</strong>
          </div>
        </div>
        <button onClick={() => navigate('/setup')} style={secondaryBtn}>Change Config</button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard label="Allocated Capacity" value={kpis.totalAllocatedCapacity} color="#3b82f6" />
        <KpiCard label="Products" value={kpis.productCount} />
        <KpiCard label="Bottlenecks" value={kpis.bottleneckCount} color={kpis.bottleneckCount > 0 ? '#dc2626' : '#16a34a'} />
        <KpiCard label="Blocked Products" value={kpis.blockedProductCount} color={kpis.blockedProductCount > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Stock value row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8, alignItems: 'stretch' }}>
        <KpiCard label="Total Stock Value" value={fmt(kpis.totalStockValue)} />
        <StockValuePctCard label="Used" value={kpis.usedStockValue} total={kpis.totalStockValue} color="#3b82f6" breakdown={productValueBreakdown} />
        <StockValuePctCard label="Remaining" value={kpis.remainingStockValue} total={kpis.totalStockValue} color="#d97706" />
        <StockValuePctCard label="Obsolete" value={kpis.obsoleteStockValue} total={kpis.totalStockValue} color={kpis.obsoleteStockValue > 0 ? '#dc2626' : '#64748b'} />
      </div>
      {kpis.capacityMode !== 'strict' && (
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 20, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600, color: '#1d4ed8' }}>
            <span>ℹ</span> Scope note
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            {kpis.capacityMode === 'manufacturing' && (
              <li>Only <strong>Manufacturing Critical</strong> parts are counted. Dispatch Critical (packing, consumables) are excluded.</li>
            )}
            {kpis.capacityMode === 'dispatch' && (
              <li>Includes <strong>Manufacturing + Dispatch Critical</strong> parts. Warning Only and Optional parts are excluded.</li>
            )}
            {kpis.unreferencedPartsCount > 0 && (
              <li><strong>{kpis.unreferencedPartsCount} part(s)</strong> have stock but are not used in any BOM — see <button style={linkBtn} onClick={() => navigate('/parts')}>Parts → Unreferenced</button></li>
            )}
          </ul>
        </div>
      )}

      {/* Insights */}
      <Section title="Business Insights">
        {insights.length === 0 ? (
          <p style={{ color: '#64748b' }}>No insights generated.</p>
        ) : (
          insights.map((ins, i) => <InsightCard key={i} insight={ins} />)
        )}
      </Section>

      {/* Product summary */}
      <Section title="Product Summary">
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Product', 'Allocated', 'Standalone', 'Allocation Gap', 'Target', 'Target Gap', 'Value Used', 'Contribution', 'Classification'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const value = productValueMap[p.productCode];
              return (
                <tr key={p.productCode} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                  <td style={td}><strong>{p.productCode}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{p.productName}</span></td>
                  <td style={{ ...td, fontWeight: 700, color: '#3b82f6' }}>{p.allocatedCapacity}</td>
                  <td style={{ ...td, color: '#64748b' }}>{p.standaloneCapacity}</td>
                  <td style={{ ...td, color: p.gap > 0 ? '#dc2626' : '#16a34a' }}>
                    {p.gap > 0 ? `-${p.gap}` : '0'}
                  </td>
                  <td style={{ ...td, color: '#64748b' }}>{p.targetQty != null ? p.targetQty : '—'}</td>
                  <td style={{ ...td, color: p.targetGap > 0 ? '#dc2626' : '#16a34a', fontWeight: p.targetGap > 0 ? 600 : 400 }}>
                    {p.targetQty != null ? (p.targetGap > 0 ? `-${p.targetGap}` : '0') : '—'}
                  </td>
                  <td style={td}>{value ? `${fmt(value.valueConsumed)} (${value.pctOfUsed.toFixed(1)}%)` : '—'}</td>
                  <td style={td}>{p.contributionPct.toFixed(1)}%</td>
                  <td style={td}><ClassBadge cls={p.classification} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
          Allocation Gap = Standalone − Allocated (how much more this product could make if it had sole access to stock).
          Target Gap = Target − Allocated (shortfall against your planned production target).
        </p>
      </Section>

      {/* Top bottlenecks */}
      {bottlenecks.length > 0 && (
        <Section title={`Top Bottlenecks (${bottlenecks.length})`}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Part', 'Stock', 'Demand', 'Shortage', 'Severity', 'Affects'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bottlenecks.slice(0, 10).map((b, i) => (
                <tr key={b.materialCode} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                  <td style={td}><strong>{b.materialCode}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{b.materialName}</span></td>
                  <td style={td}>{b.stock}</td>
                  <td style={td}>{b.totalDemand}</td>
                  <td style={{ ...td, color: '#dc2626', fontWeight: 600 }}>{b.shortage}</td>
                  <td style={td}><SeverityBadge s={b.severity} /></td>
                  <td style={{ ...td, fontSize: 12 }}>{b.affectedProducts.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

function NoData({ onSetup }) {
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Overview</h1>
      <p style={{ color: '#64748b' }}>No results yet. <button style={linkBtn} onClick={onSetup}>Upload data first</button></p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}

function KpiCard({ label, value, color = '#0f172a' }) {
  return (
    <div style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 120, background: '#fff' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StockValuePctCard({ label, value, total, color, breakdown }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  const [hovered, setHovered] = React.useState(false);
  const hasBreakdown = breakdown && breakdown.length > 0;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 110, background: '#fff', cursor: 'default' }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{pct}%</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label} Value</div>
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', color: '#fff',
          padding: hasBreakdown ? '10px 12px' : '5px 10px',
          borderRadius: 6, fontSize: 12, zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.24)',
          whiteSpace: hasBreakdown ? 'normal' : 'nowrap',
          minWidth: hasBreakdown ? 230 : 'auto',
        }}>
          {/* Total value line */}
          <div style={{ whiteSpace: 'nowrap', marginBottom: hasBreakdown ? 8 : 0, color: '#e2e8f0' }}>
            {fmt(value)}&nbsp;&nbsp;·&nbsp;&nbsp;₹{Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          {/* Per-product breakdown table */}
          {hasBreakdown && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 4, paddingRight: 8, color: '#94a3b8', fontWeight: 500 }}>Product</th>
                  <th style={{ textAlign: 'right', paddingBottom: 4, paddingRight: 8, color: '#94a3b8', fontWeight: 500 }}>Value</th>
                  <th style={{ textAlign: 'right', paddingBottom: 4, color: '#94a3b8', fontWeight: 500 }}>% of used</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={b.productCode}>
                    <td style={{ paddingTop: 4, paddingRight: 8 }}>{b.productCode}</td>
                    <td style={{ paddingTop: 4, textAlign: 'right', paddingRight: 8 }}>{fmt(b.valueConsumed)}</td>
                    <td style={{ paddingTop: 4, textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>{b.pctOfUsed.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #0f172a',
          }} />
        </div>
      )}
    </div>
  );
}

const INSIGHT_ICONS = {
  critical: '🚫',
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
};

const INSIGHT_COLORS = {
  critical: { left: '#dc2626', bg: '#fff5f5', border: '#fecaca', title: '#991b1b', badge: '#fee2e2', badgeText: '#b91c1c' },
  warning:  { left: '#d97706', bg: '#fffdf0', border: '#fde68a', title: '#92400e', badge: '#fef9c3', badgeText: '#92400e' },
  success:  { left: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', title: '#15803d', badge: '#dcfce7', badgeText: '#15803d' },
  info:     { left: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8', badge: '#dbeafe', badgeText: '#1e40af' },
};

function InsightCard({ insight }) {
  const c = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info;
  const icon = INSIGHT_ICONS[insight.type] || 'ℹ️';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      border: `1px solid ${c.border}`, background: c.bg,
      borderRadius: 8, padding: '10px 14px', marginBottom: 8,
      borderLeft: `4px solid ${c.left}`,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: c.title, fontSize: 13 }}>{insight.title}</span>
          <span style={{ fontSize: 11, background: c.badge, color: c.badgeText, padding: '1px 8px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>
            {insight.category.replace('_', ' ')}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{insight.message}</div>
        <div style={{ fontSize: 12, color: c.left, marginTop: 4, fontWeight: 500 }}>→ {insight.action}</div>
      </div>
    </div>
  );
}

function ClassBadge({ cls }) {
  const colours = { High: ['#dcfce7', '#15803d'], Medium: ['#fef9c3', '#854d0e'], Low: ['#f1f5f9', '#475569'], Blocked: ['#fee2e2', '#dc2626'] };
  const [bg, fg] = colours[cls] || ['#f1f5f9', '#475569'];
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{cls}</span>;
}

function SeverityBadge({ s }) {
  const colours = { critical: ['#fee2e2', '#dc2626'], high: ['#fff7ed', '#ea580c'], medium: ['#fffbeb', '#d97706'] };
  const [bg, fg] = colours[s] || ['#f1f5f9', '#64748b'];
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{s}</span>;
}

function fmt(n, short = false) {
  if (n == null || (n !== 0 && !n)) return '—';
  const v = Number(n);
  if (short || Math.abs(v) >= 1e7) {
    // Crores
    return (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  } else if (Math.abs(v) >= 1e5) {
    // Lakhs
    return (v / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  } else if (Math.abs(v) >= 1e3) {
    // Thousands
    return (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + ' K';
  }
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { border: '1px solid #e2e8f0', padding: '8px 10px', background: '#f8fafc', textAlign: 'left' };
const td = { border: '1px solid #e2e8f0', padding: '8px 10px' };
const secondaryBtn = { padding: '7px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const linkBtn = { background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 };
