import React from 'react';
import { Select } from '../common/Select.jsx';
import { CATEGORIES } from '../../utils/constants.js';

export const ProductFilters = ({ 
  category, 
  onCategoryChange, 
  limit, 
  onLimitChange,
  total = 0,
  className = '' 
}) => {
  const categoryOptions = CATEGORIES.map((cat) => ({
    value: cat,
    label: cat || 'All categories'
  }));

  const limitOptions = [12, 24, 48].map((n) => ({
    value: n,
    label: `${n} per page`
  }));

  return (
    <div className={`flex flex-wrap items-end gap-4 bg-white border border-rent-100 rounded-lg p-4 ${className}`}>
      <Select
        label="Category"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        options={categoryOptions}
        containerClassName="min-w-[160px]"
      />
      
      <Select
        label="Page size"
        value={limit}
        onChange={(e) => onLimitChange(Number(e.target.value))}
        options={limitOptions}
        containerClassName="min-w-[140px]"
      />

      {total > 0 && (
        <div className="ml-auto text-sm text-rent-700">
          {total.toLocaleString()} products
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
