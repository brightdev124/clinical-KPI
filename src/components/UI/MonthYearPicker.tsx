import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: string;
  selectedYear: number;
  onSelect: (month: string, year: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  selectedMonth,
  selectedYear,
  onSelect,
  isOpen,
  onToggle
}) => {
  const [viewMonth, setViewMonth] = useState(selectedMonth);
  const [viewYear, setViewYear] = useState(selectedYear);
  const pickerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  // Reset view to selected values when opened
  useEffect(() => {
    if (isOpen) {
      setViewMonth(selectedMonth);
      setViewYear(selectedYear);
    }
  }, [isOpen, selectedMonth, selectedYear]);

  const handlePreviousYear = () => {
    setViewYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    if (viewYear < currentYear) {
      setViewYear(prev => prev + 1);
    }
  };

  const handleMonthSelect = (month: string) => {
    // Don't allow selection of future months in current year
    if (viewYear === currentYear) {
      const monthIndex = months.indexOf(month);
      const currentMonthIndex = months.indexOf(currentMonth);
      if (monthIndex > currentMonthIndex) {
        return;
      }
    }
    
    onSelect(month, viewYear);
  };

  const isMonthDisabled = (month: string) => {
    if (viewYear === currentYear) {
      const monthIndex = months.indexOf(month);
      const currentMonthIndex = months.indexOf(currentMonth);
      return monthIndex > currentMonthIndex;
    }
    return false;
  };

  const isMonthSelected = (month: string) => {
    return month === selectedMonth && viewYear === selectedYear;
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Trigger Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
      >
        <Calendar className="w-4 h-4" />
        <span>{selectedMonth} {selectedYear}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Picker Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px]">
          {/* Year Navigation */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <button
              onClick={handlePreviousYear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="font-semibold text-gray-900">{viewYear}</span>
            
            <button
              onClick={handleNextYear}
              disabled={viewYear >= currentYear}
              className={`p-1 rounded transition-colors ${
                viewYear >= currentYear 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-gray-100'
              }`}
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  disabled={isMonthDisabled(month)}
                  className={`
                    px-3 py-2 text-sm rounded-md transition-colors
                    ${isMonthSelected(month)
                      ? 'bg-blue-600 text-white'
                      : isMonthDisabled(month)
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Current Selection Info */}
          <div className="px-3 pb-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
            Selected: {selectedMonth} {selectedYear}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;