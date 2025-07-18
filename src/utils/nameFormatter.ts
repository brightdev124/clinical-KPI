import { useLocation } from 'react-router-dom';

/**
 * Formats a user's name by keeping the first word full and abbreviating subsequent words
 * @param name - The full name to format
 * @returns Formatted name (e.g., "John Michael Smith" => "John M. S.")
 */
export const formatUserName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '';
  }

  const words = name.trim().split(/\s+/);
  
  // If only one word, return as is
  if (words.length <= 1) {
    return name;
  }

  // Keep first word full, abbreviate the rest
  const firstWord = words[0];
  const abbreviatedWords = words.slice(1).map(word => {
    if (word.length > 0) {
      return word.charAt(0).toUpperCase() + '.';
    }
    return '';
  }).filter(abbrev => abbrev.length > 0);

  return [firstWord, ...abbreviatedWords].join(' ');
};

/**
 * Checks if the current page is the Permission Management page
 * This can be used to conditionally apply name formatting
 */
export const isPermissionManagementPage = (): boolean => {
  return window.location.pathname.includes('/permissions');
};

/**
 * React hook that returns a function to format names based on current page
 * Returns full name on Permission Management page, formatted name elsewhere
 */
export const useNameFormatter = () => {
  const location = useLocation();
  
  return (name: string): string => {
    const isPermissionPage = location.pathname.includes('/permissions');
    return isPermissionPage ? name : formatUserName(name);
  };
};