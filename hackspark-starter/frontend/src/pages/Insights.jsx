import React, { useState, useMemo } from 'react';
import { api } from '../api/client.js';
import { Panel } from '../components/common/Panel.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { BarChart } from '../components/analytics/BarChart.jsx';
import { PeriodBadge } from '../components/analytics/PeriodBadge.jsx';
import { getThisMonth } from '../utils/formatters.js';
import { TrendingUp, BarChart3 } from 'lucide-react';

export const Insights = () => {
  const [month, setMonth] = useState(getThisMonth());
  const [range, setRange] = useState({ from: getThisMonth(), to: getThisMonth() });
  
  const [surge, setSurge] = useState({ loading: false, error: '', data: [] });
  const [peak, setPeak] = useState({ loading: false, error: '', data: null });

  const maxSurgeCount = useMemo(() => {
    return Math.max(1, ...surge.data.map((d) => d.count || 0));
  }, [surge.data]);

  const loadSurge = async () => {
    setSurge({ loading: true, error: '', data: [] });
    try {
      const data = await api.get('/analytics/surge-days', { month });
      setSurge({ loading: false, error: '', data: data.data || [] });
    } catch (err) {
      setSurge({ loading: false, error: err.message, data: [] });
    }
  };

  const loadPeak = async () => {
    setPeak({ loading: true, error: '', data: null });
    try {
      const data = await api.get('/analytics/peak-window', range);
      setPeak({ loading: false, error: '', data: data.peakWindow });
    } catch (err) {
      setPeak({ loading: false, error: err.message, data: null });
    }
  };

  return (
    <Panel 
      title="Analytics insights" 
      subtitle="Spot demand surges and the strongest seven-day rental window."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Surge Days */}
        <div className="bg-white border border-rent-100 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-rent-500" />
            <h3 className="font-semibold text-rent-950">Surge Days</h3>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); loadSurge(); }}
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <Input
              label="Month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              containerClassName="min-w-[160px]"
            />
            <Button type="submit" variant="primary" loading={surge.loading}>
              Load
            </Button>
          </form>

          {surge.error && <Notice kind="error">{surge.error}</Notice>}

          {surge.data.length > 0 && (
            <BarChart data={surge.data} maxValue={maxSurgeCount} />
          )}
        </div>

        {/* Peak Window */}
        <div className="bg-white border border-rent-100 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-rent-500" />
            <h3 className="font-semibold text-rent-950">Peak Window</h3>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); loadPeak(); }}
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <Input
              label="From"
              type="month"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
              containerClassName="min-w-[160px]"
            />
            <Input
              label="To"
              type="month"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
              containerClassName="min-w-[160px]"
            />
            <Button type="submit" variant="primary" loading={peak.loading}>
              Find
            </Button>
          </form>

          {peak.error && <Notice kind="error">{peak.error}</Notice>}

          <PeriodBadge 
            from={peak.data?.from}
            to={peak.data?.to}
            count={peak.data?.totalRentals}
            loading={peak.loading}
          />
        </div>
      </div>
    </Panel>
  );
};

export default Insights;
