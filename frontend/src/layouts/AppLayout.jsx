// AppLayout.jsx — basic sidebar + main content shell
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../app/AppContext';

const navItems = [
  { label: 'Overview', to: '/overview', requiresData: true },
  { label: 'Products', to: '/products', requiresData: true },
  { label: 'Parts', to: '/parts', requiresData: true },
  { label: 'Bottlenecks', to: '/bottlenecks', requiresData: true },
  { label: 'Stock Value', to: '/stock-value', requiresData: true },
  { label: 'Obsolete Stock', to: '/obsolete', requiresData: true },
];

const toolItems = [
  { label: 'Data Setup', to: '/setup' },
  { label: 'Validation Report', to: '/validation', requiresData: true },
];

export default function AppLayout() {
  const { hasData, hasResults } = useApp();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <nav
        style={{
          width: 200,
          background: '#1e293b',
          color: '#cbd5e1',
          padding: '16px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 16px 16px', fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>
          Inventory Planner
        </div>

        <SectionLabel label="Analysis" />
        {navItems.map((item) => (
          <SidebarLink
            key={item.to}
            {...item}
            disabled={item.requiresData && !hasResults}
          />
        ))}

        <SectionLabel label="Tools" />
        {toolItems.map((item) => (
          <SidebarLink
            key={item.to}
            {...item}
            disabled={item.requiresData && !hasData}
          />
        ))}
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: 24, background: '#f8fafc', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        color: '#64748b',
        padding: '12px 16px 4px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  );
}

function SidebarLink({ label, to, disabled }) {
  if (disabled) {
    return (
      <div
        style={{
          display: 'block',
          padding: '8px 16px',
          color: '#475569',
          fontSize: 14,
          cursor: 'not-allowed',
        }}
      >
        {label}
      </div>
    );
  }
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'block',
        padding: '8px 16px',
        fontSize: 14,
        textDecoration: 'none',
        color: isActive ? '#fff' : '#94a3b8',
        background: isActive ? '#334155' : 'transparent',
        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
      })}
    >
      {label}
    </NavLink>
  );
}
