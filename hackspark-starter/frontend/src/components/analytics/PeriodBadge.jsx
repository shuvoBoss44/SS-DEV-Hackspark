import React from 'react';
import { Badge } from '../common/Badge.jsx';

export const PeriodBadge = ({ from, to, count, loading }) => {
  if (loading) {
    return <div className="h-20 bg-rent-100/50 rounded-lg animate-pulse" />;
  }

  if (!from || !to) return null;

  return (
    <div className="mt-4 space-y-2">
      <Badge variant="primary">Peak window</Badge>
      <h2 className="text-lg font-semibold text-rent-950">
        {from} to {to}
      </h2>
      <p className="text-sm text-rent-700">
        {count?.toLocaleString()} rentals
      </p>
    </div>
  );
};

export default PeriodBadge;
