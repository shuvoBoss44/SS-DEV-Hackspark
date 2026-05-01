import React from 'react';
import { classNames } from '../../utils/helpers.js';

const variants = {
  primary: 'bg-rent-500 text-white hover:bg-rent-700',
  secondary: 'bg-rent-950 text-white',
  ghost: 'border border-rent-100 text-rent-700 hover:bg-rent-50',
  danger: 'bg-red-500 text-white hover:bg-red-600'
};

const sizes = {
  sm: 'min-h-8 px-3 text-sm',
  md: 'min-h-9 px-4 text-sm',
  lg: 'min-h-10 px-5'
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  type = 'button',
  ...props 
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classNames(
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-150',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Please wait...
        </>
      ) : children}
    </button>
  );
};

export default Button;
