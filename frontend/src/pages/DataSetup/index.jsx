// DataSetup — file upload + calculation config
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CAPACITY_MODES = [
  { value: 'manufacturing', label: 'Manufacturing — Critical parts only' },
  { value: 'dispatch', label: 'Dispatch — Critical + packing/consumables' },
  { value: 'strict', label: 'Strict BOM — All parts' },
];

const STRATEGIES = [
  { value: 'strict_priority', label: 'Strict Priority — allocate max in order' },
  { value: 'priority_with_target', label: 'Priority with Target — cap by target qty' },
];

export default function DataSetup() {
  const { uploadFile, recalculate, isLoading, error, config, updateConfig, hasData, hasResults, results, validation } =
    useApp();
  console.log("config", config);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  const [uploadError, setUploadError] = useState(null);

  // Product priority order: [{ productCode, productName, targetQty }]
  const [productOrder, setProductOrder] = useState([]);

  // Sync productOrder whenever results change (products detected from Excel)
  useEffect(() => {
    if (!results?.products?.length) return;
    console.log('Syncing product order from results and config:', results, config);
    const existingPriority = config.productPriority || [];
    if (existingPriority.length > 0) {
      // Restore previously set order
      // const sorted = [...results.products].sort((a, b) => {
      //   const pa = existingPriority.find((p) => p.productCode === a.productCode);
      //   const pb = existingPriority.find((p) => p.productCode === b.productCode);
      //   return (pa?.priority ?? 999) - (pb?.priority ?? 999);
      // });
      setProductOrder(
        results.products.map((p) => ({
          productCode: p.productCode,
          productName: p.productName || p.productCode,
          targetQty: existingPriority.find((pp) => pp.productCode === p.productCode)?.targetQty ?? '',
        }))
      );
    } else {
      // Default: Excel column order
      setProductOrder(
        results.products.map((p) => ({
          productCode: p.productCode,
          productName: p.productName || p.productCode,
          targetQty: '',
        }))
      );
    }
  }, [results, config.productPriority]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProductOrder((prev) => {
        const oldIdx = prev.findIndex((p) => p.productCode === active.id);
        const newIdx = prev.findIndex((p) => p.productCode === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const setTargetQty = (idx, value) => {
    setProductOrder((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], targetQty: value };
      return arr;
    });
  };

  const buildProductPriority = () =>
    productOrder.map((p, i) => ({
      productCode: p.productCode,
      priority: i + 1,
      targetQty:
        p.targetQty !== '' && p.targetQty != null && !isNaN(Number(p.targetQty))
          ? Number(p.targetQty)
          : 0,
    }));

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.xlsx?$/i)) {
      setUploadError('Only .xlsx or .xls files are accepted.');
      return;
    }
    setUploadError(null);
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setUploadError('Please select an Excel file.'); return; }
    setUploadError(null);
    try {
      // On fresh upload, don't pass productPriority yet — let Excel column order be default
      const uploadConfig = { ...localConfig, productPriority: [] };
      const result = await uploadFile(file, uploadConfig);
      updateConfig(uploadConfig);
      setFile(null); // clear file input so user sees the priority section below
      if (result.validation?.errorCount > 0) {
        navigate('/validation');
      }
      // On success: stay on this page — priority section will appear below
    } catch (err) {
      // error set in context
    }
  };

  const handleRecalculate = async () => {
    const productPriority = buildProductPriority();
    const newConfig = { ...localConfig, productPriority };
    updateConfig(newConfig);
    try {
      await recalculate(newConfig);
      navigate('/overview');
    } catch (err) {
      // error set in context
      console.error('Recalculation failed:', err);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Data Setup</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Upload your Excel file and configure how capacity is calculated.
      </p>

      {(error || uploadError) && (
        <div style={alertStyle('error')}>{error || uploadError}</div>
      )}

      {hasData && !file && (
        <div style={alertStyle('info')}>
          Data already loaded.{' '}
          {hasResults ? (
            <button style={linkBtn} onClick={() => navigate('/overview')}>View results</button>
          ) : (
            <button style={linkBtn} onClick={() => navigate('/validation')}>View validation</button>
          )}
          {' | '}
          <button style={linkBtn} onClick={() => navigate('/validation')}>
            {validation?.errorCount} error(s), {validation?.warningCount} warning(s)
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fileInput').click()}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : '#cbd5e1'}`,
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 24,
            background: dragOver ? '#eff6ff' : '#f8fafc',
          }}
        >
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div>
              <strong>{file.name}</strong>
              <div style={{ color: '#64748b', fontSize: 13 }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : (
            <div style={{ color: '#64748b' }}>
              Drop Excel file here or <span style={{ color: '#3b82f6' }}>browse</span>
              <div style={{ fontSize: 12, marginTop: 4 }}>Accepts .xlsx and .xls</div>
            </div>
          )}
        </div>

        {/* Capacity mode */}
        <Field label="Capacity Mode">
          {CAPACITY_MODES.map((m) => (
            <label key={m.value} style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>
              <input
                type="radio"
                name="capacityMode"
                value={m.value}
                checked={localConfig.capacityMode === m.value}
                onChange={() => setLocalConfig((c) => ({ ...c, capacityMode: m.value }))}
                style={{ marginRight: 8 }}
              />
              {m.label}
            </label>
          ))}
        </Field>

        {/* Allocation strategy */}
        <Field label="Allocation Strategy">
          {STRATEGIES.map((s) => (
            <label key={s.value} style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>
              <input
                type="radio"
                name="allocationStrategy"
                value={s.value}
                checked={localConfig.allocationStrategy === s.value}
                onChange={() => setLocalConfig((c) => ({ ...c, allocationStrategy: s.value }))}
                style={{ marginRight: 8 }}
              />
              {s.label}
            </label>
          ))}
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, paddingLeft: 2 }}>
            {localConfig.allocationStrategy === 'strict_priority'
              ? 'Each product gets the maximum it can from stock in priority order. Top-ranked products can consume everything.'
              : 'Each product is capped at its target quantity. Unused stock flows to lower-priority products.'}
          </div>
        </Field>

        <button
          type="submit"
          disabled={isLoading || !file}
          style={{
            padding: '10px 24px',
            background: isLoading || !file ? '#94a3b8' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            cursor: isLoading || !file ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {isLoading ? 'Processing…' : 'Upload & Calculate'}
        </button>
      </form>

      {/* Product Priority — only shown after data is loaded */}
      {hasResults && productOrder.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 28 }}>
            <h2 style={{ fontSize: 16, marginBottom: 4, marginTop: 0 }}>Product Priority Order</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Drag rows to set allocation order. #1 gets stock first.
              {localConfig.allocationStrategy === 'priority_with_target' &&
                ' Set a target quantity to cap how many units each product consumes (leave blank or 0 for no cap).'}
            </p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={productOrder.map((p) => p.productCode)} strategy={verticalListSortingStrategy}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ ...thStyle, width: 28 }}></th>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Product</th>
                      {localConfig.allocationStrategy === 'priority_with_target' && (
                        <th style={thStyle}>Target Qty</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {productOrder.map((p, idx) => (
                      <SortableRow
                        key={p.productCode}
                        item={p}
                        idx={idx}
                        showTarget={localConfig.allocationStrategy === 'priority_with_target'}
                        onTargetChange={(val) => setTargetQty(idx, val)}
                      />
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                onClick={handleRecalculate}
                disabled={isLoading}
                style={{
                  padding: '9px 20px',
                  background: isLoading ? '#94a3b8' : '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Recalculating…' : 'Apply Priority & Recalculate'}
              </button>
              <button
                onClick={() => navigate('/overview')}
                style={{
                  padding: '9px 20px',
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                Back to Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function alertStyle(type) {
  const colours = {
    error: { background: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
    info: { background: '#eff6ff', border: '#93c5fd', color: '#1e40af' },
  };
  const c = colours[type];
  return {
    padding: '10px 14px',
    border: `1px solid ${c.border}`,
    background: c.background,
    color: c.color,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
  };
}

const linkBtn = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 'inherit',
  padding: 0,
};

const thStyle = {
  padding: '8px 10px',
  fontWeight: 600,
  fontSize: 12,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '10px 10px',
  verticalAlign: 'middle',
};

function SortableRow({ item, idx, showTarget, onTargetChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.productCode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? '#eff6ff' : 'transparent',
    borderBottom: '1px solid #e2e8f0',
    cursor: isDragging ? 'grabbing' : 'auto',
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {/* drag handle */}
      <td style={{ ...tdStyle, color: '#94a3b8', cursor: 'grab', userSelect: 'none', paddingRight: 0 }}
          {...attributes} {...listeners}>
        ⋮⋮
      </td>
      <td style={tdStyle}>
        <span style={{
          display: 'inline-block', width: 24, height: 24, borderRadius: 12,
          background: '#3b82f6', color: '#fff', textAlign: 'center',
          lineHeight: '24px', fontSize: 11, fontWeight: 700,
        }}>{idx + 1}</span>
      </td>
      <td style={tdStyle}>
        <div style={{ fontWeight: 600 }}>{item.productCode}</div>
        {item.productName !== item.productCode && (
          <div style={{ color: '#64748b', fontSize: 11 }}>{item.productName}</div>
        )}
      </td>
      {showTarget && (
        <td style={tdStyle}>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={item.targetQty}
            onChange={(e) => onTargetChange(e.target.value)}
            style={{ width: 100, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
          />
        </td>
      )}
    </tr>
  );
}
