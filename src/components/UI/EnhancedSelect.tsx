import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: ReactNode;
  group?: string;
}

interface EnhancedSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'minimal' | 'gradient';
  error?: boolean;
  icon?: ReactNode;
  className?: string;
  required?: boolean;
  label?: string;
  description?: string;
  searchable?: boolean;
  clearable?: boolean;
  customDropdown?: boolean;
  maxHeight?: string;
  loading?: boolean;
}

const EnhancedSelect: React.FC<EnhancedSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  size = 'md',
  variant = 'default',
  error = false,
  icon,
  className = '',
  required = false,
  label,
  description,
  searchable = false,
  clearable = false,
  customDropdown = false,
  maxHeight = "200px",
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, highlightedIndex]);

  // Filter options based on search term
  const filteredOptions = searchable && searchTerm
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Get selected option
  const selectedOption = options.find(option => option.value === value);

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  // Variant styles
  const variantStyles = {
    default: `
      bg-white border-2 border-gray-200 text-gray-900
      hover:border-gray-300 hover:shadow-sm
      focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
      transition-all duration-200 ease-in-out
    `,
    filled: `
      bg-gray-50 border-2 border-gray-200 text-gray-900
      hover:bg-gray-100 hover:border-gray-300
      focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
      transition-all duration-200 ease-in-out
    `,
    minimal: `
      bg-transparent border-0 border-b-2 border-gray-200 text-gray-900 rounded-none
      hover:border-gray-400 hover:bg-gray-50/50
      focus:border-blue-500 focus:ring-0 focus:bg-white/80
      transition-all duration-200 ease-in-out
    `,
    gradient: `
      bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 text-gray-900
      hover:from-blue-100 hover:to-purple-100 hover:border-blue-300
      focus:from-white focus:to-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
      transition-all duration-200 ease-in-out
    `
  };

  // Error styles
  const errorStyles = error ? `
    border-red-300 bg-red-50 text-red-900
    hover:border-red-400
    focus:border-red-500 focus:ring-red-500/10
  ` : '';

  // Disabled styles
  const disabledStyles = disabled ? `
    opacity-60 cursor-not-allowed bg-gray-100 text-gray-500
    hover:border-gray-200 hover:bg-gray-100
  ` : 'cursor-pointer';

  const baseClasses = `
    w-full rounded-xl font-medium
    appearance-none
    outline-none
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${errorStyles}
    ${disabledStyles}
    ${className}
  `;

  const handleOptionSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // Group options if they have groups
  const groupedOptions = options.reduce((groups, option) => {
    const group = option.group || 'default';
    if (!groups[group]) groups[group] = [];
    groups[group].push(option);
    return groups;
  }, {} as Record<string, Option[]>);

  const hasGroups = Object.keys(groupedOptions).length > 1 || !groupedOptions.default;

  if (!customDropdown) {
    // Return original select for backwards compatibility
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {icon}
            </div>
          )}
          
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            className={`${baseClasses} ${icon ? 'pl-10' : ''} pr-10`}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-white text-gray-900 py-2"
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom chevron icon */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDown 
              className={`w-5 h-5 transition-colors duration-200 ${
                error 
                  ? 'text-red-400' 
                  : disabled 
                    ? 'text-gray-300' 
                    : 'text-gray-400 group-hover:text-gray-600'
              }`}
            />
          </div>
        </div>
        
        {description && (
          <p className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
    );
  }

  // Custom dropdown implementation
  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className={`${baseClasses} ${icon ? 'pl-10' : ''} ${clearable && value ? 'pr-16' : 'pr-10'} 
            flex items-center justify-between text-left ${isOpen ? 'ring-4 ring-blue-500/10 border-blue-500' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center flex-1 min-w-0">
            {icon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
                {icon}
              </div>
            )}
            {selectedOption?.icon && (
              <div className="mr-2 text-gray-500">
                {selectedOption.icon}
              </div>
            )}
            <span className={`block truncate ${!selectedOption ? 'text-gray-500' : ''}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {loading && (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            )}
            {clearable && value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
            <ChevronDown 
              className={`w-5 h-5 transition-all duration-200 ${
                isOpen ? 'rotate-180' : ''
              } ${
                error 
                  ? 'text-red-400' 
                  : disabled 
                    ? 'text-gray-300' 
                    : 'text-gray-400'
              }`}
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden"
            style={{ maxHeight }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto" style={{ maxHeight: searchable ? 'calc(240px - 60px)' : '240px' }}>
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No options found' : 'No options available'}
                </div>
              ) : hasGroups ? (
                // Grouped options
                Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <div key={groupName}>
                    {groupName !== 'default' && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        {groupName}
                      </div>
                    )}
                    {groupOptions
                      .filter(option => !searchTerm || option.label.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((option, index) => {
                        const globalIndex = filteredOptions.indexOf(option);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleOptionSelect(option)}
                            disabled={option.disabled}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors
                              ${globalIndex === highlightedIndex ? 'bg-blue-50 text-blue-700' : ''}
                              ${option.value === value ? 'bg-blue-100 text-blue-700' : 'text-gray-900'}
                              ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center min-w-0 flex-1">
                                {option.icon && (
                                  <div className="mr-3 text-gray-500">
                                    {option.icon}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate">{option.label}</div>
                                  {option.description && (
                                    <div className="text-sm text-gray-500 truncate mt-1">
                                      {option.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {option.value === value && (
                                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ))
              ) : (
                // Ungrouped options
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionSelect(option)}
                    disabled={option.disabled}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors
                      ${index === highlightedIndex ? 'bg-blue-50 text-blue-700' : ''}
                      ${option.value === value ? 'bg-blue-100 text-blue-700' : 'text-gray-900'}
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        {option.icon && (
                          <div className="mr-3 text-gray-500">
                            {option.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{option.label}</div>
                          {option.description && (
                            <div className="text-sm text-gray-500 truncate mt-1">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {option.value === value && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {description && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {description}
        </p>
      )}
    </div>
  );
};

export default EnhancedSelect;