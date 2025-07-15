# Admin Analytics Component

## Overview
The AdminAnalytics component provides a comprehensive dashboard for super-admin users to analyze performance data for directors and clinicians across different time periods.

## Features

### Control Bar
- **User Type Toggle**: Switch between "Director" and "Clinician" views
- **Date Range Selection**: Select start and end months from the last 12 months
- **View Type Toggle**: Switch between "Table View" and "Chart View"
- **Sidebar Toggle**: Show/hide the user selection sidebar

### Sidebar (Collapsible)
- **Search Functionality**: Search users by name or username
- **Select All Button**: Quickly select/deselect all visible users
- **User List**: 
  - For Clinicians: Grouped by director with expandable sections
  - For Directors: Simple list view
- **Checkboxes**: Individual selection for each user
- **Director Selection**: When viewing clinicians, clicking a director's checkbox selects all their assigned clinicians

### Data Display
- **Table View**: Shows monthly scores in a tabular format with color-coded performance indicators
- **Chart View**: Line chart showing performance trends over the selected time period
- **Empty States**: Helpful messages when no users are selected or date range is incomplete

## Usage

### Integration
The component is automatically added to the super-admin dashboard:

```tsx
{user?.role === 'super-admin' && (
  <AdminAnalytics className="mt-8" />
)}
```

### Data Sources
The component uses the following data from DataContext:
- `profiles`: User profiles with position information
- `getClinicianScore()`: Function to get performance scores
- `getAssignedClinicians()`: Function to get clinicians assigned to a director

### Performance Indicators
- **Green (90-100%)**: Excellent performance
- **Blue (80-89%)**: Good performance  
- **Yellow (70-79%)**: Needs attention
- **Red (0-69%)**: Critical - requires immediate attention

## Component Structure

```
AdminAnalytics/
├── Control Bar
│   ├── User Type Toggle (Director/Clinician)
│   ├── Date Range Selectors
│   ├── View Type Toggle (Table/Chart)
│   └── Sidebar Toggle
├── Sidebar (Collapsible)
│   ├── Search Box
│   ├── Select All Button
│   └── User List
│       ├── Directors (with clinician counts)
│       └── Clinicians (grouped by director)
└── Data Display
    ├── Table View (with color-coded scores)
    └── Chart View (line chart with trends)
```

## Responsive Design
- Fully responsive layout
- Mobile-friendly controls
- Collapsible sidebar for smaller screens
- Horizontal scrolling for large tables

## Accessibility
- Keyboard navigation support
- Screen reader friendly
- High contrast color schemes
- Clear visual indicators for selected states