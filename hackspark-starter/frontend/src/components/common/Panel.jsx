import React from 'react';
import { classNames } from '../../utils/helpers.js';

export const Panel = ({ 
  title, 
  subtitle, 
  action, 
  children,
  className = '' 
}) => {
  return (
    <section className={classNames('space-y-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-rent-950">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-rent-700">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

export default Panel;
