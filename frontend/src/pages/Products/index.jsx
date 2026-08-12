// Products — detailed product-level capacity table
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import TablePagination from '@mui/material/TablePagination';

export default function Products() {
  const { results, hasResults } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('capacity');

  if (!hasResults) {
    return <NoData onSetup={() => navigate('/setup')} />;
  }

  const { products, kpis, parts, bomItems } = results;

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Products</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        Allocated capacity after shared inventory distribution. Total: <strong>{kpis.totalAllocatedCapacity}</strong>
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20, gap: 4 }}>
        {[
          { key: 'capacity', label: 'Capacity Allocation' },
          { key: 'distribution', label: 'Stock Distribution' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 20px', border: 'none', borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -2, background: 'none', cursor: 'pointer', fontSize: 14,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#3b82f6' : '#64748b',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'capacity'
        ? <CapacityTab products={products} parts={parts} bomItems={bomItems} />
        : <DistributionTab results={results} />
      }
    </div>
  );
}

/* ── Tab 1: Capacity Allocation ───────────────────────────────────── */
function CapacityTab({ products, parts, bomItems }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [detailProduct, setDetailProduct] = useState(null);

  const classifications = ['all', 'High', 'Medium', 'Low', 'Blocked'];

  const stockMap = useMemo(() => {
    return Object.fromEntries(parts.map((part) => [part.materialCode, part.stock ?? 0]));
  }, [parts]);

  const productLimitingMap = useMemo(() => {
    const activeSet = new Set(parts.filter((part) => part.isActive).map((part) => part.materialCode));
    const map = {};
    for (const prod of products) {
      const productBom = bomItems
        .filter((item) => item.productCode === prod.productCode && activeSet.has(item.materialCode))
        .map((item) => ({
          materialCode: item.materialCode,
          materialName: parts.find((p) => p.materialCode === item.materialCode)?.materialName || item.materialCode,
          bomQty: item.bomQty,
          stock: stockMap[item.materialCode] ?? 0,
          possible: item.bomQty > 0 ? Math.floor((stockMap[item.materialCode] ?? 0) / item.bomQty) : 0,
        }))
        .sort((a, b) => a.possible - b.possible || a.materialCode.localeCompare(b.materialCode));
      map[prod.productCode] = productBom;
    }
    return map;
  }, [products, bomItems, parts, stockMap]);

  const filtered = products.filter((p) => {
    const matchClass = filter === 'all' || p.classification === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.productCode.toLowerCase().includes(q) || (p.productName || '').toLowerCase().includes(q);
    return matchClass && matchSearch;
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {classifications.map((cls) => (
          <button key={cls} onClick={() => { setFilter(cls); setPage(0); }}
            style={{ padding: '5px 14px', border: '1px solid #cbd5e1', borderRadius: 16, cursor: 'pointer', fontSize: 13,
              background: filter === cls ? '#3b82f6' : '#fff', color: filter === cls ? '#fff' : '#374151' }}>
            {cls === 'all' ? 'All' : cls} ({cls === 'all' ? products.length : products.filter((p) => p.classification === cls).length})
          </button>
        ))}
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search product…"
          style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginLeft: 'auto' }} />
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            {['#', 'Product Code', 'Product Name', 'Allocated', 'Standalone', 'Gap', 'Contribution %', 'Classification', 'Limiting Parts'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#64748b' }}>No products match filter.</td></tr>
          ) : (
            paginated.map((p, i) => (
              <tr key={p.productCode} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                <td style={{ ...td, color: '#64748b' }}>{page * rowsPerPage + i + 1}</td>
                <td style={td}><strong>{p.productCode}</strong></td>
                <td style={td}>{p.productName}</td>
                <td style={{ ...td, fontWeight: 700, color: '#3b82f6' }}>{p.allocatedCapacity}</td>
                <td style={{ ...td, color: '#64748b' }}>{p.standaloneCapacity}</td>
                <td style={{ ...td, color: p.gap > 0 ? '#dc2626' : '#16a34a', fontWeight: p.gap > 0 ? 600 : 400 }}>
                  {p.gap > 0 ? `-${p.gap}` : '0'}
                </td>
                <td style={td}>{p.contributionPct.toFixed(1)}%</td>
                <td style={td}><ClassBadge cls={p.classification} /></td>
                <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                  {productLimitingMap[p.productCode]?.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDetailProduct(p.productCode)}
                      style={{
                        background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0,
                        textAlign: 'left', fontSize: 12, textDecoration: 'underline', fontWeight: 600,
                      }}
                    >
                      {`${productLimitingMap[p.productCode][0].materialName} (${productLimitingMap[p.productCode][0].possible})`}
                      {productLimitingMap[p.productCode].length > 1 ? ` + ${productLimitingMap[p.productCode].length - 1} more` : ''}
                    </button>
                  ) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <TablePagination component="div" count={filtered.length} page={page}
        onPageChange={(_, np) => setPage(np)} rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]} />
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
        Allocated capacity is the only reliable total. Standalone values are for comparison only.
      </p>

      {detailProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.36)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ width: 'min(720px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 20px 45px rgba(15,23,42,0.24)', padding: 24, position: 'relative' }}>
            <button type="button" onClick={() => setDetailProduct(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>
              ×
            </button>
            <h2 style={{ margin: 0, fontSize: 18, marginBottom: 12 }}>Limiting parts for {detailProduct}</h2>
            <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 13 }}>
              Showing the top 5 most limiting active BOM parts for this product.
            </p>
            <table style={{ ...tableStyle, minWidth: 0 }}>
              <thead>
                <tr>
                  {['#', 'Part', 'Stock', 'BOM Qty', 'Possible'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(productLimitingMap[detailProduct] || []).slice(0, 5).map((item, index) => (
                  <tr key={item.materialCode} style={{ background: index % 2 ? '#f8fafc' : '#fff' }}>
                    <td style={td}>{index + 1}</td>
                    <td style={td}><strong>{item.materialName}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{item.materialCode}</span></td>
                    <td style={td}>{item.stock}</td>
                    <td style={td}>{item.bomQty}</td>
                    <td style={td}>{item.possible}</td>
                  </tr>
                ))}
                {productLimitingMap[detailProduct]?.length === 0 && (
                  <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#64748b', padding: 20 }}>No active limiting parts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Tab 2: Stock Distribution ─────────────────────────────────────── */
function DistributionTab({ results }) {
  const { products, parts, bomItems, stockValue } = results;
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Products sorted by allocation priority (same order as engine ran)
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => (a.priority || 999) - (b.priority || 999)),
    [products]
  );

  // Build bom lookup: { materialCode: { productCode: bomQty } }
  const bomLookup = useMemo(() => {
    const map = {};
    if (!bomItems) return map;
    for (const item of bomItems) {
      if (!map[item.materialCode]) map[item.materialCode] = {};
      map[item.materialCode][item.productCode] = item.bomQty;
    }
    return map;
  }, [bomItems]);

  // Unit price per part = totalValue / originalStock (from stockValue breakdown)
  const unitPriceMap = useMemo(() => {
    const map = {};
    if (!stockValue?.breakdown) return map;
    for (const b of stockValue.breakdown) {
      const part = parts.find((p) => p.materialCode === b.materialCode);
      map[b.materialCode] = part?.stock > 0 ? (b.totalValue || 0) / part.stock : 0;
    }
    return map;
  }, [stockValue, parts]);

  // Cumulative stock allocation matrix — calculated in priority order
  // Only deducts stock for parts that are ACTIVE (pass the capacity mode filter)
  // matrix[productCode][materialCode] = { opening, bomQty, consumed, closing, valueUsed, isActive }
  const allocationMatrix = useMemo(() => {
    const matrix = {};
    const running = {};
    for (const p of parts) running[p.materialCode] = p.stock ?? 0;

    // Build isActive lookup
    const activeSet = new Set(parts.filter((p) => p.isActive).map((p) => p.materialCode));

    for (const prod of sortedProducts) {
      matrix[prod.productCode] = {};
      const productBomMaterials = Object.keys(bomLookup).filter(
        (mc) => bomLookup[mc][prod.productCode] != null
      );
      for (const mc of productBomMaterials) {
        const bomQty = bomLookup[mc][prod.productCode];
        const isActive = activeSet.has(mc);
        const opening = running[mc] ?? 0;
        // Only consume stock if the part is active in this capacity mode
        const consumed = isActive ? bomQty * (prod.allocatedCapacity ?? 0) : 0;
        const closing = Math.max(0, opening - consumed);
        const valueUsed = consumed * (unitPriceMap[mc] || 0);
        matrix[prod.productCode][mc] = { opening, bomQty, consumed, closing, valueUsed, isActive };
        running[mc] = closing;
      }
    }
    return matrix;
  }, [sortedProducts, bomLookup, parts, unitPriceMap]);

  // Product unit cost = sum of (bomQty × unitPrice) over ACTIVE BOM parts only
  const productUnitCost = useMemo(() => {
    const activeSet = new Set(parts.filter((p) => p.isActive).map((p) => p.materialCode));
    const costMap = {};
    for (const prod of sortedProducts) {
      let cost = 0;
      for (const mc of Object.keys(bomLookup)) {
        if (!activeSet.has(mc)) continue;
        const bomQty = bomLookup[mc][prod.productCode];
        if (bomQty != null) cost += bomQty * (unitPriceMap[mc] || 0);
      }
      costMap[prod.productCode] = cost;
    }
    return costMap;
  }, [sortedProducts, bomLookup, unitPriceMap, parts]);

  // Total value produced — prefer backend-computed valueConsumed (authoritative)
  const productTotalValue = useMemo(() => {
    const tvMap = {};
    for (const prod of sortedProducts) {
      // Use backend value if available (it uses resolveUnitValue same as stockValueEngine)
      tvMap[prod.productCode] = prod.valueConsumed != null
        ? prod.valueConsumed
        : (productUnitCost[prod.productCode] || 0) * (prod.allocatedCapacity || 0);
    }
    return tvMap;
  }, [sortedProducts, productUnitCost]);

  // Parts referenced in visible product(s), matching search
  const referencedParts = useMemo(() => {
    return parts
      .filter((p) => {
        const bom = bomLookup[p.materialCode];
        if (!bom) return false;
        if (selectedProduct !== 'all') return !!bom[selectedProduct];
        return true;
      })
      .filter((p) => {
        const q = search.toLowerCase();
        return !q || p.materialCode.toLowerCase().includes(q) || (p.materialName || '').toLowerCase().includes(q);
      });
  }, [parts, bomLookup, selectedProduct, search]);

  const paginated = referencedParts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const visibleProducts = selectedProduct === 'all'
    ? sortedProducts.map((p) => p.productCode)
    : [selectedProduct];

  const COLS_PER_PRODUCT = 5; // Opening, BOM Qty, Consumed, Closing, Value Used
  const fixedCols = 5; // Material Code, Name, Category, Unit Price, Initial Stock

  return (
    <>
      {/* Product filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Filter:</span>
        {['all', ...sortedProducts.map((p) => p.productCode)].map((code) => {
          const prod = sortedProducts.find((p) => p.productCode === code);
          return (
            <button key={code} onClick={() => { setSelectedProduct(code); setPage(0); }}
              style={{ padding: '4px 12px', border: '1px solid #cbd5e1', borderRadius: 14, cursor: 'pointer', fontSize: 13,
                background: selectedProduct === code ? '#3b82f6' : '#fff',
                color: selectedProduct === code ? '#fff' : '#374151' }}>
              {code === 'all' ? 'All Products' : `#${prod?.priority ?? '?'} ${code}`}
            </button>
          );
        })}
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search part…"
          style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginLeft: 'auto' }} />
      </div>

      <div style={{ fontSize: 12, color: '#475569', marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <strong>How this works:</strong> Stock flows in priority order. Each product's <em>Opening</em> = previous product's <em>Closing</em>.
        &nbsp;<em>Consumed</em> = BOM Qty × Allocated. &nbsp;<em>Value Used</em> = Consumed × Unit Price. &nbsp;<em>Unit Cost</em> = cost to produce 1 unit of that product.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...tableStyle, minWidth: 500, borderSpacing: 0 }}>
          <thead>
            {/* Row 1 — product group headers */}
            <tr>
              <th style={{ ...th, verticalAlign: 'middle' }} rowSpan={2}>Material Code</th>
              <th style={{ ...th, verticalAlign: 'middle' }} rowSpan={2}>Material Name</th>
              <th style={{ ...th, verticalAlign: 'middle' }} rowSpan={2}>Category</th>
              <th style={{ ...th, verticalAlign: 'middle', textAlign: 'center' }} rowSpan={2}>Unit Price</th>
              <th style={{ ...th, verticalAlign: 'middle', textAlign: 'center', background: '#f1f5f9' }} rowSpan={2}>Initial Stock</th>
              {visibleProducts.map((code, idx) => {
                const prod = products.find((p) => p.productCode === code);
                const unitCost = productUnitCost[code] || 0;
                const totalVal = productTotalValue[code] || 0;
                return (
                  <th key={code} colSpan={COLS_PER_PRODUCT}
                    style={{ ...th, textAlign: 'center', background: '#eff6ff', borderLeft: '2px solid #93c5fd', padding: '6px 10px' }}>
                    <div style={{ color: '#1e40af', fontWeight: 700, fontSize: 13 }}>
                      #{prod?.priority ?? idx + 1} &nbsp;{code}
                    </div>
                    <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span>Alloc: <strong>{prod?.allocatedCapacity ?? '—'}</strong></span>
                      <span>Unit Cost: <strong>{fmtMoney(unitCost)}</strong></span>
                      <span>Total Value: <strong>{fmtMoney(totalVal)}</strong></span>
                    </div>
                  </th>
                );
              })}
            </tr>
            {/* Row 2 — sub-column headers */}
            <tr>
              {visibleProducts.map((code) => (
                <React.Fragment key={code}>
                  <th style={{ ...th, background: '#dbeafe', fontSize: 10, textAlign: 'center', borderLeft: '2px solid #93c5fd', minWidth: 68 }}>Opening</th>
                  <th style={{ ...th, background: '#dbeafe', fontSize: 10, textAlign: 'center', minWidth: 60 }}>BOM Qty</th>
                  <th style={{ ...th, background: '#dbeafe', fontSize: 10, textAlign: 'center', minWidth: 72 }}>Consumed</th>
                  <th style={{ ...th, background: '#dbeafe', fontSize: 10, textAlign: 'center', minWidth: 68 }}>Closing</th>
                  <th style={{ ...th, background: '#dbeafe', fontSize: 10, textAlign: 'center', minWidth: 80 }}>Value Used</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={fixedCols + visibleProducts.length * COLS_PER_PRODUCT}
                  style={{ ...td, textAlign: 'center', color: '#64748b', padding: 20 }}>
                  No parts found.
                </td>
              </tr>
            ) : (
              paginated.map((p, i) => {
                const unitPrice = unitPriceMap[p.materialCode] || 0;
                return (
                  <tr key={p.materialCode} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                    <td style={td}><strong>{p.materialCode}</strong></td>
                    <td style={td}>{p.materialName || '—'}</td>
                    <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{p.category || '—'}</td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 12, color: '#64748b' }}>{fmtMoney(unitPrice)}</td>
                    <td style={{ ...td, textAlign: 'center', background: '#f1f5f9', fontWeight: 600 }}>{p.stock}</td>
                    {visibleProducts.map((code) => {
                      const alloc = allocationMatrix[code]?.[p.materialCode];
                      if (!alloc) {
                        // Not in this product's BOM
                        return (
                          <React.Fragment key={code}>
                            {Array.from({ length: COLS_PER_PRODUCT }).map((_, j) => (
                              <td key={j} style={{ ...td, color: '#d1d5db', textAlign: 'center', fontSize: 12,
                                borderLeft: j === 0 ? '2px solid #93c5fd' : undefined }}>—</td>
                            ))}
                          </React.Fragment>
                        );
                      }
                      return (
                        <React.Fragment key={code}>
                          <td style={{ ...td, textAlign: 'center', borderLeft: '2px solid #93c5fd' }}>
                            {alloc.opening}
                          </td>
                          <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>
                            {alloc.bomQty}
                          </td>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                            {alloc.consumed}
                          </td>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 600,
                            color: alloc.closing === 0 ? '#dc2626' : '#16a34a' }}>
                            {alloc.closing}
                          </td>
                          <td style={{ ...td, textAlign: 'center', fontSize: 12, color: '#7c3aed' }}>
                            {fmtMoney(alloc.valueUsed)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination component="div" count={referencedParts.length} page={page}
        onPageChange={(_, np) => setPage(np)} rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]} />
    </>
  );
}

// Compact Indian monetary format
function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  const v = Number(n);
  if (!v) return '₹0';
  if (Math.abs(v) >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (Math.abs(v) >= 1e5) return '₹' + (v / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  if (Math.abs(v) >= 1e3) return '₹' + (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ClassBadge({ cls }) {
  const colours = { High: ['#dcfce7', '#15803d'], Medium: ['#fef9c3', '#854d0e'], Low: ['#f1f5f9', '#475569'], Blocked: ['#fee2e2', '#dc2626'] };
  const [bg, fg] = colours[cls] || ['#f1f5f9', '#475569'];
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{cls}</span>;
}

function NoData({ onSetup }) {
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Products</h1>
      <p style={{ color: '#64748b' }}>No results yet. <button style={linkBtn} onClick={onSetup}>Upload data first</button></p>
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { border: '1px solid #e2e8f0', padding: '8px 10px', background: '#f8fafc', textAlign: 'left' };
const td = { border: '1px solid #e2e8f0', padding: '8px 10px' };
const linkBtn = { background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 };
