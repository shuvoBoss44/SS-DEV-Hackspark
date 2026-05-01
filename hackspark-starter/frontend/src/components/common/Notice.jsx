import React from 'react';
import { classNames } from '../../utils/helpers.js';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const variants = {
  info: 'bg-white border-rent-100 text-rent-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  error: 'bg-red-50 border-red-200 text-red-700'
};

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle
};

export const Notice = ({ 
  children, 
  kind = 'info', 
  className = '',
  ...props 
}) => {
  const Icon = icons[kind];
  
  return (
    <div
      className={classNames(
        'flex items-start gap-3 p-4 border rounded-lg',
        variants[kind],
        className
      )}
      {...props}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
};

export default Notice;
