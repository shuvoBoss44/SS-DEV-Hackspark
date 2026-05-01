import React from 'react';

export const StatCard = ({ label, value }) => {
  return (
    <div className="bg-white border border-rent-100 rounded-lg p-4">
      <span className="text-sm text-rent-700">{label}</span>
      <strong className="mt-2 block text-2xl font-bold text-rent-950">
        {value}
      </strong>
    </div>
  );
};

export default StatCard;
