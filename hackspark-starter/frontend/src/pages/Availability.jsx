import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Panel } from '../components/common/Panel.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { getToday, formatDate } from '../utils/formatters.js';
import { Search, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export const Availability = () => {
  const [form, setForm] = useState({ 
    id: '', 
    from: getToday(), 
    to: getToday() 
  });
  const [state, setState] = useState({ 
    loading: false, 
    error: '', 
    result: null 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '', result: null });
    
    try {
      const data = await api.get(
        `/rentals/products/${form.id}/availability`,
        { from: form.from, to: form.to }
      );
      setState({ loading: false, error: '', result: data });
    } catch (err) {
      setState({ loading: false, error: err.message, result: null });
    }
  };

  return (
    <Panel 
      title="Availability" 
      subtitle="Check whether a product is free for a requested date range."
    >
      <form 
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 bg-white border border-rent-100 rounded-lg p-4"
      >
        <Input
          label="Product ID"
          type="number"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          required
          min="1"
          placeholder="Enter product ID"
          containerClassName="min-w-[140px]"
        />

        <Input
          label="From"
          type="date"
          value={form.from}
          onChange={(e) => setForm({ ...form, from: e.target.value })}
          required
          containerClassName="min-w-[160px]"
        />

        <Input
          label="To"
          type="date"
          value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })}
          required
          containerClassName="min-w-[160px]"
        />

        <Button 
          type="submit" 
          variant="primary"
          loading={state.loading}
          className="self-end"
        >
          <Search className="w-4 h-4 mr-2" />
          Check
        </Button>
      </form>

      {state.error && <Notice kind="error">{state.error}</Notice>}

      {state.result && <AvailabilityResult data={state.result} />}
    </Panel>
  );
};

const AvailabilityResult = ({ data }) => {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Status Card */}
      <div className="bg-white border border-rent-100 rounded-lg p-5 lg:col-span-1">
        <div className="flex items-center gap-2">
          {data.available ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <Badge variant="success">Available</Badge>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <Badge variant="error">Conflict found</Badge>
            </>
          )}
        </div>
        <h3 className="mt-4 text-base font-semibold text-rent-950">
          Product #{data.productId}
        </h3>
        <p className="mt-2 text-sm text-rent-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {formatDate(data.from)} to {formatDate(data.to)}
        </p>
      </div>

      {/* Busy Periods */}
      <PeriodList 
        title="Busy periods" 
        items={data.busyPeriods}
        empty="No busy periods overlap this range."
        type="busy"
      />

      {/* Free Windows */}
      <PeriodList 
        title="Free windows" 
        items={data.freeWindows}
        empty="No free window found in this range."
        type="free"
      />
    </div>
  );
};

const PeriodList = ({ title, items, empty, type }) => {
  const hasItems = items && items.length > 0;

  return (
    <div className="bg-white border border-rent-100 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-rent-950 uppercase tracking-wide">
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {hasItems ? (
          items.map((item, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 text-sm"
            >
              <span className={type === 'busy' ? 'text-red-600' : 'text-green-600'}>
                {formatDate(item.start)}
              </span>
              <span className="flex-1 h-px bg-rent-100" />
              <span className={type === 'busy' ? 'text-red-600' : 'text-green-600'}>
                {formatDate(item.end)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-rent-700">{empty}</p>
        )}
      </div>
    </div>
  );
};

export default Availability;
