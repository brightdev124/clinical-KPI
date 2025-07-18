import { formatUserName } from './nameFormatter';

describe('formatUserName', () => {
  test('formats names correctly', () => {
    expect(formatUserName('John Michael Smith')).toBe('John M. S.');
    expect(formatUserName('Oleg Gabriel')).toBe('Oleg G.');
    expect(formatUserName('Dr. Sarah Johnson')).toBe('Dr. S. J.');
    expect(formatUserName('Mary Elizabeth Johnson Brown')).toBe('Mary E. J. B.');
  });

  test('handles single names', () => {
    expect(formatUserName('John')).toBe('John');
    expect(formatUserName('Madonna')).toBe('Madonna');
  });

  test('handles empty or invalid input', () => {
    expect(formatUserName('')).toBe('');
    expect(formatUserName('   ')).toBe('   ');
    expect(formatUserName(null as any)).toBe('');
    expect(formatUserName(undefined as any)).toBe('');
  });

  test('handles multiple spaces', () => {
    expect(formatUserName('John   Michael   Smith')).toBe('John M. S.');
    expect(formatUserName('  John  Michael  ')).toBe('John M.');
  });

  test('preserves capitalization of first word', () => {
    expect(formatUserName('john michael smith')).toBe('john M. S.');
    expect(formatUserName('JOHN MICHAEL SMITH')).toBe('JOHN M. S.');
  });
});