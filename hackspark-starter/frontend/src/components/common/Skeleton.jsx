import React from 'react';
import { classNames } from '../../utils/helpers.js';

export const Skeleton = ({ 
  className = '', 
  count = 1,
  ...props 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={classNames(
            'animate-pulse bg-gradient-to-r from-rent-100 via-rent-50 to-rent-100',
            'bg-[length:200%_100%] rounded-md',
            className
          )}
          style={{
            animation: 'shimmer 1.5s infinite'
          }}
          {...props}
        />
      ))}
    </>
  );
};

export const SkeletonCard = ({ className = '' }) => (
  <div className={classNames('p-4 bg-white border border-rent-100 rounded-lg', className)}>
    <Skeleton className="h-4 w-20 mb-3" />
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const SkeletonGrid = ({ count = 6, className = '' }) => (
  <div className={classNames('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} className="h-32" />
    ))}
  </div>
);

export default Skeleton;
