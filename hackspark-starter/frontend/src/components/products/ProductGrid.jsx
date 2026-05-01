import React from 'react';
import { ProductCard } from './ProductCard.jsx';
import { SkeletonGrid } from '../common/Skeleton.jsx';
import { Notice } from '../common/Notice.jsx';

export const ProductGrid = ({ 
  products, 
  loading, 
  error, 
  onProductClick,
  emptyMessage = 'No products found.' 
}) => {
  if (loading) {
    return <SkeletonGrid count={12} />;
  }

  if (error) {
    return <Notice kind="error">{error}</Notice>;
  }

  if (!products || products.length === 0) {
    return <Notice>{emptyMessage}</Notice>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id || product.productId}
          product={product}
          onClick={() => onProductClick?.(product)}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
