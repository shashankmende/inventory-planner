// insightEngine.js
// Generates actionable business insights from calculation results.

function generateInsights(products, bottlenecks, stockValue, kpis) {
  const insights = [];

  // Blocked products
  const blocked = products.filter((p) => p.classification === 'Blocked');
  if (blocked.length > 0) {
    insights.push({
      type: 'critical',
      category: 'capacity',
      title: `${blocked.length} product(s) fully blocked`,
      message: `Zero allocated capacity: ${blocked.map((p) => p.productCode).join(', ')}.`,
      action: 'Review bottleneck parts and prioritise procurement to unblock these products.',
    });
  }

  // Top bottleneck
  if (bottlenecks.length > 0) {
    const top = bottlenecks[0];
    insights.push({
      type: top.severity === 'critical' ? 'critical' : 'warning',
      category: 'bottleneck',
      title: `Top bottleneck: ${top.materialName || top.materialCode}`,
      message: `Shortage of ${top.shortage} units. Affects ${top.affectedProducts.length} product(s). Stock: ${top.stock}, Demand: ${top.totalDemand}.`,
      action: `Procure ${top.shortage} units of ${top.materialCode} to restore full capacity.`,
    });
  } else {
    insights.push({
      type: 'success',
      category: 'bottleneck',
      title: 'No bottlenecks detected',
      message: 'All active parts have sufficient stock to meet demand.',
      action: 'Monitor replenishment cycles to maintain this position.',
    });
  }

  // Stock value efficiency
  if (stockValue && stockValue.total > 0) {
    const idlePct = ((stockValue.remaining / stockValue.total) * 100).toFixed(1);
    if (Number(idlePct) > 50) {
      insights.push({
        type: 'warning',
        category: 'stock_value',
        title: `${idlePct}% of stock value is idle`,
        message: `Only ${(100 - Number(idlePct)).toFixed(1)}% of total stock value is consumed by current allocation.`,
        action: 'Review demand planning and consider reducing overstock on slow-moving parts.',
      });
    }
    if (stockValue.obsolete > 0) {
      const obsoletePct = ((stockValue.obsolete / stockValue.total) * 100).toFixed(1);
      insights.push({
        type: 'warning',
        category: 'obsolete',
        title: `${obsoletePct}% of stock value is obsolete`,
        message: `Obsolete stock value: ${stockValue.obsolete.toLocaleString()}.`,
        action: 'Write off or return obsolete stock to recover capital.',
      });
    }
  }

  // High contributors
  const high = products.filter((p) => p.classification === 'High');
  if (high.length > 0) {
    insights.push({
      type: 'info',
      category: 'products',
      title: `${high.length} high-contributing product(s)`,
      message: `${high.map((p) => p.productCode).join(', ')} each contribute ≥20% of total allocated capacity.`,
      action: 'Ensure these products retain stock allocation priority.',
    });
  }

  return insights;
}

module.exports = { generateInsights };
