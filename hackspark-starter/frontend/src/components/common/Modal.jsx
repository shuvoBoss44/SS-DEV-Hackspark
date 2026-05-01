import React from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '../../utils/helpers.js';
import { X } from 'lucide-react';

export const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  className = '' 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rent-950/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={classNames(
          'bg-white rounded-lg shadow-soft max-w-lg w-full max-h-[90vh] overflow-auto',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between p-4 border-b border-rent-100">
            {title && <h3 className="text-lg font-semibold text-rent-950">{title}</h3>}
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1 rounded-md hover:bg-rent-50 text-rent-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
