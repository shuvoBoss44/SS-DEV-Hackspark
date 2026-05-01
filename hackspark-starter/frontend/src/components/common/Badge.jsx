import React from 'react';
import { classNames } from '../../utils/helpers.js';

const variants = {
  default: 'bg-rent-50 text-rent-700',
  primary: 'bg-rent-500 text-white',
  dark: 'bg-rent-950 text-white',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700'
};

export const Badge = ({ 
  children, 
  variant = 'default', 
  className = '',
  ...props 
}) => {
  return (
    <span
      className={classNames(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
