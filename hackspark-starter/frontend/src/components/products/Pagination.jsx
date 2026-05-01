import React from 'react';
import { Button } from '../common/Button.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ 
  page, 
  totalPages, 
  onPageChange,
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-end gap-3 py-4 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous
      </Button>

      <span className="text-sm text-rent-700 font-medium">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

export default Pagination;
