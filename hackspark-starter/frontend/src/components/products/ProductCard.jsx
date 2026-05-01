import React from 'react';
import { Badge } from '../common/Badge.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import { classNames } from '../../utils/helpers.js';

export const ProductCard = ({ product, score, onClick, className = '' }) => {
  const productId = product.id || product.productId;
  const productName = product.name || `Product #${productId}`;
  const category = product.category || 'UNCATEGORIZED';

  return (
    <button
      onClick={onClick}
      className={classNames(
        'bg-white border border-rent-100 rounded-lg p-4 text-left',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft',
        'focus:outline-none focus:ring-2 focus:ring-rent-500/20',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant={getCategoryVariant(category)}>
          {category}
        </Badge>
        {score !== undefined && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-rent-950 text-white">
            Score: {score}
          </span>
        )}
      </div>

      <h3 className="mt-4 line-clamp-2 text-base font-semibold text-rent-950">
        {productName}
      </h3>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-rent-700">ID {productId}</span>
        {product.pricePerDay !== undefined && (
          <strong className="text-rent-700">
            {formatCurrency(product.pricePerDay)}/day
          </strong>
        )}
      </div>
    </button>
  );
};

const getCategoryVariant = (category) => {
  const variants = {
    'ELECTRONICS': 'primary',
    'FURNITURE': 'success',
    'VEHICLES': 'warning',
    'TOOLS': 'dark',
    'OUTDOOR': 'success',
    'SPORTS': 'primary',
    'MUSIC': 'warning',
    'OFFICE': 'dark',
    'CAMERAS': 'primary'
  };
  return variants[category] || 'default';
};

export default ProductCard;
