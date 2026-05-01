import React from 'react';

export const BarChart = ({ data, maxValue }) => {
  const safeMax = Math.max(1, maxValue || Math.max(...data.map(d => d.count || 0), 1));

  return (
    <div className="space-y-2 mt-4">
      {data.slice(0, 31).map((day) => (
        <div 
          key={day.date} 
          className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2"
        >
          <span className="text-xs text-rent-700 text-right">
            {day.date.slice(8)}
          </span>
          
          <div className="h-3 bg-rent-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rent-500 rounded-full transition-all duration-300"
              style={{ width: `${((day.count || 0) / safeMax) * 100}%` }}
            />
          </div>
          
          <span className="text-xs text-rent-700 font-medium">
            {day.count?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BarChart;
