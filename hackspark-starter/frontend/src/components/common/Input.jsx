import React from 'react';
import { classNames } from '../../utils/helpers.js';

export const Input = ({ 
  label, 
  error, 
  className = '', 
  containerClassName = '',
  ...props 
}) => {
  return (
    <label className={classNames('grid gap-1.5', containerClassName)}>
      {label && (
        <span className="text-xs font-bold text-rent-700 uppercase tracking-wide">
          {label}
        </span>
      )}
      <input
        className={classNames(
          'min-h-10 px-3 py-2 bg-white border border-rent-100 rounded-md text-rent-950',
          'focus:outline-none focus:border-rent-500 focus:ring-2 focus:ring-rent-500/20',
          'placeholder:text-rent-300',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </label>
  );
};

export default Input;
