import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

interface WeekPickerProps {
  selectedWeek: { year: number; week: number };
  onWeekChange: (week: { year: number; week: number }) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const WeekPicker: React.FC<WeekPickerProps> = ({
  selectedWeek,
  onWeekChange,
  isOpen,
  onToggle
}) => {
  const [viewYear, setViewYear] = useState(selectedWeek.year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

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

  // Reset view to selected year and month when opened
  useEffect(() => {
    if (isOpen) {
      setViewYear(selectedWeek.year);
      // Reset to month selection view
      setSelectedMonth(null);
    }
  }, [isOpen, selectedWeek.year]);

  const getWeeksInYear = (year: number) => {
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    
    // If Jan 1 is Thu, Fri, Sat, or Sun, then week 1 starts in previous year
    const jan1Day = jan1.getDay();
    const firstWeekStart = jan1Day <= 4 ? jan1 : new Date(year, 0, 8 - jan1Day);
    
    // Calculate number of weeks
    const diffTime = dec31.getTime() - firstWeekStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  const getWeekStart = (year: number, week: number) => {
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    
    // Find the first Monday of the year
    const firstMonday = new Date(year, 0, 1 + (jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day));
    
    // Calculate the start of the specified week
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    return weekStart;
  };

  const getWeekDateRange = (year: number, week: number) => {
    const weekStart = getWeekStart(year, week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { start: weekStart, end: weekEnd };
  };

  const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + (jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day));
    const diffTime = now.getTime() - firstMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return { year, week: Math.max(1, week) };
  };

  const getWeeksInMonth = (year: number, month: number) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Find all weeks that have days in this month
    for (let week = 1; week <= getWeeksInYear(year); week++) {
      const { start, end } = getWeekDateRange(year, week);
      
      // Check if this week overlaps with the month
      if ((start <= lastDay && end >= firstDay)) {
        weeks.push(week);
      }
    }
    
    return weeks;
  };

  const getMonthFromWeek = (year: number, week: number) => {
    const { start } = getWeekDateRange(year, week);
    return start.getMonth();
  };

  const handlePreviousYear = () => {
    setViewYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    if (viewYear < currentYear + 1) {
      setViewYear(prev => prev + 1);
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    // Don't allow selection of future months in current year
    if (viewYear === currentYear) {
      const currentMonth = currentDate.getMonth();
      if (monthIndex > currentMonth) {
        return;
      }
    }
    
    setSelectedMonth(monthIndex);
  };

  const handleWeekSelect = (week: number) => {
    // Don't allow selection of future weeks in current year
    if (viewYear === currentYear) {
      const currentWeek = getCurrentWeek();
      if (week > currentWeek.week) {
        return;
      }
    }
    
    onWeekChange({ year: viewYear, week });
    onToggle(); // Close picker after selection
  };

  const handleBackToMonths = () => {
    setSelectedMonth(null);
  };

  const isWeekDisabled = (week: number) => {
    if (viewYear === currentYear) {
      const currentWeek = getCurrentWeek();
      return week > currentWeek.week;
    }
    if (viewYear > currentYear) {
      return true;
    }
    return false;
  };

  const isWeekSelected = (week: number) => {
    return week === selectedWeek.week && viewYear === selectedWeek.year;
  };

  const isMonthDisabled = (monthIndex: number) => {
    if (viewYear === currentYear) {
      const currentMonth = currentDate.getMonth();
      return monthIndex > currentMonth;
    }
    if (viewYear > currentYear) {
      return true;
    }
    return false;
  };

  const isMonthSelected = (monthIndex: number) => {
    return monthIndex === selectedMonth;
  };

  const getWeekDisplayText = () => {
    const { start, end } = getWeekDateRange(selectedWeek.year, selectedWeek.week);
    return `Week ${selectedWeek.week}, ${selectedWeek.year} (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
  };

  // Get weeks for the selected month, or all weeks if no month selected
  const getDisplayWeeks = () => {
    if (selectedMonth !== null) {
      return getWeeksInMonth(viewYear, selectedMonth);
    }
    return [];
  };

  const displayWeeks = getDisplayWeeks();

  return (
    <div className="relative" ref={pickerRef}>
      {/* Trigger Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
      >
        <Calendar className="w-4 h-4" />
        <span className="text-sm sm:text-base">{getWeekDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Picker Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[320px]">
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
              disabled={viewYear >= currentYear + 1}
              className={`p-1 rounded transition-colors ${
                viewYear >= currentYear + 1
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-gray-100'
              }`}
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-3">
            {selectedMonth === null ? (
              /* Month Selection Grid */
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(index)}
                    disabled={isMonthDisabled(index)}
                    className={`
                      px-3 py-2 text-sm rounded-md transition-colors
                      ${isMonthSelected(index)
                        ? 'bg-blue-600 text-white'
                        : isMonthDisabled(index)
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : (
              /* Week Selection for Selected Month */
              <div>
                {/* Month Header with Back Button */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <button
                    onClick={handleBackToMonths}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    ← Back to Months
                  </button>
                  <span className="font-medium text-gray-900">
                    {months[selectedMonth]} {viewYear}
                  </span>
                </div>

                {/* Week Grid */}
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {displayWeeks.map((week) => {
                    const { start, end } = getWeekDateRange(viewYear, week);
                    const weekLabel = `${start.getDate()}-${end.getDate()}`;
                    
                    return (
                      <button
                        key={week}
                        onClick={() => handleWeekSelect(week)}
                        disabled={isWeekDisabled(week)}
                        className={`
                          px-2 py-3 text-xs rounded-md transition-colors flex flex-col items-center
                          ${isWeekSelected(week)
                            ? 'bg-blue-600 text-white'
                            : isWeekDisabled(week)
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                        title={`Week ${week}: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`}
                      >
                        <span className="font-medium">W{week}</span>
                        <span className="text-xs opacity-75">{weekLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Current Selection Info */}
          <div className="px-3 pb-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
            Selected: {getWeekDisplayText()}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekPicker;