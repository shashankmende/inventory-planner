import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';

const LandingPage = lazy(() => import('../pages/LandingPage'));
const DataSetup = lazy(() => import('../pages/DataSetup'));
const ValidationReport = lazy(() => import('../pages/ValidationReport'));
const Overview = lazy(() => import('../pages/Overview'));
const Products = lazy(() => import('../pages/Products'));
const Parts = lazy(() => import('../pages/Parts'));
const Bottlenecks = lazy(() => import('../pages/Bottlenecks'));
const StockValue = lazy(() => import('../pages/StockValue'));
const ObsoleteStock = lazy(() => import('../pages/ObsoleteStock'));

function Loading() {
  return <div style={{ padding: 24, color: '#64748b' }}>Loading…</div>;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/setup" element={<DataSetup />} />
          <Route path="/validation" element={<ValidationReport />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/products" element={<Products />} />
          <Route path="/parts" element={<Parts />} />
          <Route path="/bottlenecks" element={<Bottlenecks />} />
          <Route path="/stock-value" element={<StockValue />} />
          <Route path="/obsolete" element={<ObsoleteStock />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
