import React from 'react';
import { classNames } from '../../utils/helpers.js';
import { formatDateTime } from '../../utils/formatters.js';
import { MessageSquare } from 'lucide-react';

export const SessionItem = ({ 
  session, 
  isActive, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'w-full text-left p-3 rounded-lg border transition-all duration-150',
        'grid gap-1',
        isActive 
          ? 'border-rent-500 bg-rent-50' 
          : 'border-rent-100 hover:border-rent-200 hover:bg-rent-50/50'
      )}
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-rent-500 flex-shrink-0" />
        <strong className="text-sm font-semibold text-rent-950 line-clamp-1">
          {session.name}
        </strong>
      </div>
      <span className="text-xs text-rent-700 pl-6">
        {formatDateTime(session.lastMessageAt)}
      </span>
    </button>
  );
};

export default SessionItem;
