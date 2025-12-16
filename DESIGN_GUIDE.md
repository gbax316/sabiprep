# SABIPREP - Design Guide

This document serves as the single source of truth for all design decisions, ensuring consistency across the entire application.

---

## 1. Color System

### Primary Colors
```css
/* Primary - Indigo */
--primary-50: #EEF2FF;
--primary-100: #E0E7FF;
--primary-200: #C7D2FE;
--primary-300: #A5B4FC;
--primary-400: #818CF8;
--primary-500: #6366F1;
--primary-600: #4F46E5;  /* Main Primary */
--primary-700: #4338CA;
--primary-800: #3730A3;
--primary-900: #312E81;
```

### Secondary Colors
```css
/* Secondary - Purple */
--secondary-50: #FAF5FF;
--secondary-100: #F3E8FF;
--secondary-200: #E9D5FF;
--secondary-300: #D8B4FE;
--secondary-400: #C084FC;
--secondary-500: #A855F7;  /* Main Secondary */
--secondary-600: #9333EA;
--secondary-700: #7E22CE;
--secondary-800: #6B21A8;
--secondary-900: #581C87;
```

### Semantic Colors
```css
/* Success - Emerald */
--success-50: #ECFDF5;
--success-100: #D1FAE5;
--success-500: #10B981;  /* Main Success */
--success-600: #059669;
--success-700: #047857;

/* Warning - Amber */
--warning-50: #FFFBEB;
--warning-100: #FEF3C7;
--warning-500: #F59E0B;  /* Main Warning */
--warning-600: #D97706;
--warning-700: #B45309;

/* Error - Red */
--error-50: #FEF2F2;
--error-100: #FEE2E2;
--error-500: #EF4444;  /* Main Error */
--error-600: #DC2626;
--error-700: #B91C1C;

/* Info - Blue */
--info-50: #EFF6FF;
--info-100: #DBEAFE;
--info-500: #3B82F6;  /* Main Info */
--info-600: #2563EB;
--info-700: #1D4ED8;

/* Accent - Orange */
--accent-50: #FFF7ED;
--accent-100: #FFEDD5;
--accent-400: #FB923C;
--accent-500: #F97316;  /* Main Accent */
--accent-600: #EA580C;
```

### Neutral Colors
```css
/* Gray Scale */
--gray-50: #F9FAFB;   /* Background */
--gray-100: #F3F4F6;  /* Card Background */
--gray-200: #E5E7EB;  /* Border */
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;  /* Secondary Text */
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;  /* Primary Text */
```

### Tailwind Class Mapping
| Purpose | Tailwind Class |
|---------|---------------|
| Primary Button | `bg-indigo-600 hover:bg-indigo-700` |
| Secondary Button | `bg-gray-100 text-gray-700` |
| Success State | `bg-emerald-500 text-white` |
| Error State | `bg-red-500 text-white` |
| Warning State | `bg-amber-500 text-white` |
| Info State | `bg-blue-500 text-white` |
| Accent/Highlight | `bg-orange-500 text-white` |
| Background | `bg-gray-50` |
| Card | `bg-white` |
| Border | `border-gray-200` |
| Primary Text | `text-gray-900` |
| Secondary Text | `text-gray-500` |

---

## 2. Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes
| Name | Size | Line Height | Tailwind Class |
|------|------|-------------|----------------|
| Display | 48px | 1.1 | `text-5xl` |
| H1 | 32px | 1.2 | `text-3xl` |
| H2 | 24px | 1.3 | `text-2xl` |
| H3 | 20px | 1.4 | `text-xl` |
| H4 | 18px | 1.4 | `text-lg` |
| Body Large | 16px | 1.5 | `text-base` |
| Body | 14px | 1.5 | `text-sm` |
| Caption | 12px | 1.4 | `text-xs` |

### Font Weights
| Name | Weight | Tailwind Class |
|------|--------|----------------|
| Regular | 400 | `font-normal` |
| Medium | 500 | `font-medium` |
| Semibold | 600 | `font-semibold` |
| Bold | 700 | `font-bold` |

### Typography Usage
```jsx
// Page Title
<h1 className="text-3xl font-bold text-gray-900">Page Title</h1>

// Section Title
<h2 className="text-2xl font-bold text-gray-900">Section Title</h2>

// Card Title
<h3 className="text-xl font-semibold text-gray-900">Card Title</h3>

// Subtitle
<h4 className="text-lg font-semibold text-gray-900">Subtitle</h4>

// Body Text
<p className="text-base text-gray-700">Body text content</p>

// Secondary Text
<p className="text-sm text-gray-500">Secondary information</p>

// Caption/Label
<span className="text-xs text-gray-500">Caption text</span>
```

---

## 3. Spacing System

### Base Unit: 4px

| Name | Value | Tailwind Class |
|------|-------|----------------|
| 0 | 0px | `p-0`, `m-0` |
| 1 | 4px | `p-1`, `m-1` |
| 2 | 8px | `p-2`, `m-2` |
| 3 | 12px | `p-3`, `m-3` |
| 4 | 16px | `p-4`, `m-4` |
| 5 | 20px | `p-5`, `m-5` |
| 6 | 24px | `p-6`, `m-6` |
| 8 | 32px | `p-8`, `m-8` |
| 10 | 40px | `p-10`, `m-10` |
| 12 | 48px | `p-12`, `m-12` |

### Common Spacing Patterns
```jsx
// Page Padding
<div className="p-6">...</div>

// Card Padding
<div className="p-4">...</div>

// Section Margin
<section className="mb-6">...</section>

// Element Gap
<div className="space-y-4">...</div>

// Inline Gap
<div className="space-x-3">...</div>
```

---

## 4. Border Radius

| Name | Value | Tailwind Class | Usage |
|------|-------|----------------|-------|
| None | 0px | `rounded-none` | - |
| Small | 4px | `rounded` | Small elements |
| Medium | 8px | `rounded-lg` | Buttons, inputs |
| Large | 12px | `rounded-xl` | Cards |
| XL | 16px | `rounded-2xl` | Large cards |
| 2XL | 24px | `rounded-3xl` | Modals |
| Full | 9999px | `rounded-full` | Avatars, badges |

### Usage Examples
```jsx
// Button
<button className="rounded-xl">...</button>

// Card
<div className="rounded-2xl">...</div>

// Avatar
<div className="rounded-full">...</div>

// Badge
<span className="rounded-full">...</span>

// Input
<input className="rounded-xl" />
```

---

## 5. Shadows

| Name | Tailwind Class | Usage |
|------|----------------|-------|
| None | `shadow-none` | Flat elements |
| Small | `shadow-sm` | Cards, buttons |
| Medium | `shadow` | Elevated cards |
| Large | `shadow-lg` | Modals, dropdowns |
| XL | `shadow-xl` | Floating elements |
| 2XL | `shadow-2xl` | Phone mockups |

### Usage Examples
```jsx
// Card
<div className="shadow-sm">...</div>

// Elevated Card
<div className="shadow-lg">...</div>

// Modal
<div className="shadow-2xl">...</div>
```

---

## 6. Component Specifications

### 6.1 Buttons

#### Primary Button
```jsx
<button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors">
  Button Text
</button>
```

#### Secondary Button
```jsx
<button className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
  Button Text
</button>
```

#### Tertiary Button (Text)
```jsx
<button className="py-4 text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
  Button Text
</button>
```

#### Icon Button
```jsx
<button className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors">
  <Icon className="w-5 h-5 text-white" />
</button>
```

#### Button Sizes
| Size | Padding | Font Size | Tailwind Classes |
|------|---------|-----------|------------------|
| Small | py-2 px-4 | text-sm | `py-2 px-4 text-sm` |
| Medium | py-3 px-6 | text-base | `py-3 px-6 text-base` |
| Large | py-4 px-8 | text-base | `py-4 px-8 text-base` |
| Full Width | py-4 w-full | text-base | `py-4 w-full` |

#### Button States
```jsx
// Default
className="bg-indigo-600"

// Hover
className="hover:bg-indigo-700"

// Active/Pressed
className="active:bg-indigo-800"

// Disabled
className="disabled:bg-gray-300 disabled:cursor-not-allowed"

// Loading
className="opacity-75 cursor-wait"
```

### 6.2 Cards

#### Basic Card
```jsx
<div className="bg-white rounded-2xl shadow-sm p-4">
  {/* Card content */}
</div>
```

#### Clickable Card
```jsx
<button className="w-full bg-white rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition-shadow">
  {/* Card content */}
</button>
```

#### Card with Border
```jsx
<div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
  {/* Card content */}
</div>
```

#### Selected Card
```jsx
<div className="bg-white rounded-2xl border-2 border-indigo-500 p-4">
  {/* Card content */}
</div>
```

#### Gradient Card
```jsx
<div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
  {/* Card content */}
</div>
```

### 6.3 Inputs

#### Text Input
```jsx
<input 
  type="text"
  placeholder="Placeholder text"
  className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
/>
```

#### Input with Icon
```jsx
<div className="relative">
  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <input 
    type="text"
    placeholder="Search..."
    className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
  />
</div>
```

#### Input States
```jsx
// Default
className="border-gray-200"

// Focus
className="focus:ring-2 focus:ring-indigo-500 focus:border-transparent"

// Error
className="border-red-500 focus:ring-red-500"

// Disabled
className="bg-gray-100 cursor-not-allowed"
```

### 6.4 Badges

#### Status Badge
```jsx
<span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-medium">
  Badge Text
</span>
```

#### Badge Colors
```jsx
// Primary
className="bg-indigo-100 text-indigo-600"

// Success
className="bg-emerald-100 text-emerald-600"

// Warning
className="bg-amber-100 text-amber-600"

// Error
className="bg-red-100 text-red-600"

// Info
className="bg-blue-100 text-blue-600"

// Neutral
className="bg-gray-100 text-gray-600"
```

### 6.5 Progress Bars

#### Linear Progress
```jsx
<div className="h-2 bg-gray-100 rounded-full">
  <div 
    className="h-full bg-indigo-600 rounded-full transition-all"
    style={{ width: '60%' }}
  />
</div>
```

#### Progress with Label
```jsx
<div className="flex items-center space-x-3">
  <div className="flex-1 h-2 bg-gray-100 rounded-full">
    <div className="h-full bg-indigo-600 rounded-full" style={{ width: '60%' }} />
  </div>
  <span className="text-sm font-medium text-gray-600">60%</span>
</div>
```

### 6.6 Icons

#### Icon Sizes
| Size | Dimensions | Tailwind Class |
|------|------------|----------------|
| XS | 16x16 | `w-4 h-4` |
| SM | 20x20 | `w-5 h-5` |
| MD | 24x24 | `w-6 h-6` |
| LG | 28x28 | `w-7 h-7` |
| XL | 32x32 | `w-8 h-8` |

#### Icon Container
```jsx
// Small Icon Container
<div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
  <Icon className="w-5 h-5 text-indigo-600" />
</div>

// Medium Icon Container
<div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
  <Icon className="w-6 h-6 text-indigo-600" />
</div>

// Large Icon Container
<div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
  <Icon className="w-7 h-7 text-indigo-600" />
</div>
```

### 6.7 Navigation

#### Bottom Navigation
```jsx
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3">
  <div className="flex items-center justify-around">
    {/* Active Item */}
    <button className="flex flex-col items-center text-indigo-600">
      <Icon className="w-6 h-6" />
      <span className="text-xs mt-1 font-medium">Home</span>
    </button>
    
    {/* Inactive Item */}
    <button className="flex flex-col items-center text-gray-400">
      <Icon className="w-6 h-6" />
      <span className="text-xs mt-1">Learn</span>
    </button>
  </div>
</div>
```

#### Header Navigation
```jsx
<div className="bg-white px-6 py-4 border-b border-gray-100">
  <div className="flex items-center space-x-4">
    <button className="p-2 -ml-2">
      <ChevronLeft className="w-6 h-6 text-gray-600" />
    </button>
    <h1 className="text-xl font-bold text-gray-900">Page Title</h1>
  </div>
</div>
```

### 6.8 Lists

#### List Item
```jsx
<button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
  <div className="flex items-center space-x-3">
    <Icon className="w-5 h-5 text-gray-600" />
    <span className="font-medium text-gray-900">Item Label</span>
  </div>
  <ChevronRight className="w-5 h-5 text-gray-400" />
</button>
```

#### List with Dividers
```jsx
<div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
  {items.map(item => (
    <ListItem key={item.id} {...item} />
  ))}
</div>
```

---

## 7. Layout Patterns

### 7.1 Page Layout
```jsx
<div className="min-h-screen bg-gray-50 flex flex-col">
  {/* Header */}
  <header className="bg-white px-6 py-4 border-b border-gray-100">
    ...
  </header>
  
  {/* Main Content */}
  <main className="flex-1 p-6 overflow-y-auto pb-24">
    ...
  </main>
  
  {/* Bottom Navigation */}
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
    ...
  </nav>
</div>
```

### 7.2 Card Grid
```jsx
<div className="grid grid-cols-2 gap-4">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### 7.3 Stacked Cards
```jsx
<div className="space-y-4">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### 7.4 Header with Gradient
```jsx
<div className="bg-indigo-600 px-6 pt-6 pb-20 relative">
  {/* Header content */}
</div>
<div className="px-6 -mt-12">
  {/* Overlapping content */}
</div>
```

---

## 8. Animation & Transitions

### Transition Durations
| Name | Duration | Tailwind Class |
|------|----------|----------------|
| Fast | 150ms | `duration-150` |
| Normal | 200ms | `duration-200` |
| Slow | 300ms | `duration-300` |

### Common Transitions
```jsx
// Color Transition
className="transition-colors"

// Shadow Transition
className="transition-shadow"

// All Transitions
className="transition-all"

// Transform Transition
className="transition-transform"
```

### Hover Effects
```jsx
// Scale on Hover
className="hover:scale-105 transition-transform"

// Shadow on Hover
className="hover:shadow-md transition-shadow"

// Color on Hover
className="hover:bg-indigo-700 transition-colors"
```

### Loading States
```jsx
// Pulse Animation
className="animate-pulse"

// Spin Animation
className="animate-spin"

// Bounce Animation
className="animate-bounce"
```

---

## 9. Responsive Design

### Breakpoints
| Name | Min Width | Tailwind Prefix |
|------|-----------|-----------------|
| Mobile | 0px | (default) |
| Tablet | 640px | `sm:` |
| Desktop | 1024px | `lg:` |
| Large Desktop | 1280px | `xl:` |

### Mobile-First Approach
```jsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  ...
</div>

// Mobile: Full width, Desktop: Fixed width
<div className="w-full lg:w-96">
  ...
</div>
```

---

## 10. Accessibility

### Focus States
```jsx
// Visible Focus Ring
className="focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"

// Focus Within (for containers)
className="focus-within:ring-2 focus-within:ring-indigo-500"
```

### Touch Targets
- Minimum touch target size: 44x44px
- Adequate spacing between interactive elements

### Color Contrast
- Text on white: Use gray-700 or darker
- Text on colored backgrounds: Ensure 4.5:1 contrast ratio
- Interactive elements: Clear visual distinction

### Screen Reader
```jsx
// Hidden visually but accessible
className="sr-only"

// Skip link
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## 11. Component Variants Reference

### Button Variants
| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | `bg-indigo-600` | `text-white` | - |
| Secondary | `bg-gray-100` | `text-gray-700` | - |
| Outline | `bg-transparent` | `text-indigo-600` | `border-indigo-600` |
| Ghost | `bg-transparent` | `text-gray-600` | - |
| Danger | `bg-red-600` | `text-white` | - |
| Success | `bg-emerald-600` | `text-white` | - |

### Card Variants
| Variant | Background | Border | Shadow |
|---------|------------|--------|--------|
| Default | `bg-white` | - | `shadow-sm` |
| Elevated | `bg-white` | - | `shadow-lg` |
| Outlined | `bg-white` | `border-gray-200` | - |
| Selected | `bg-white` | `border-indigo-500` | - |
| Gradient | `bg-gradient-to-r` | - | - |

### Badge Variants
| Variant | Background | Text |
|---------|------------|------|
| Primary | `bg-indigo-100` | `text-indigo-600` |
| Success | `bg-emerald-100` | `text-emerald-600` |
| Warning | `bg-amber-100` | `text-amber-600` |
| Error | `bg-red-100` | `text-red-600` |
| Info | `bg-blue-100` | `text-blue-600` |
| Neutral | `bg-gray-100` | `text-gray-600` |

---

## 12. Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Default content |
| Dropdown | 10 | Dropdown menus |
| Sticky | 20 | Sticky headers |
| Fixed | 30 | Fixed elements |
| Modal Backdrop | 40 | Modal overlay |
| Modal | 50 | Modal content |
| Popover | 60 | Popovers, tooltips |
| Toast | 70 | Toast notifications |

---

## 13. File Naming Conventions

### Components
- PascalCase: `Button.tsx`, `Card.tsx`, `ProgressBar.tsx`
- Index exports: `index.ts`

### Hooks
- camelCase with 'use' prefix: `useAuth.ts`, `useTimer.ts`

### Types
- PascalCase for interfaces: `User`, `Question`
- camelCase for type files: `auth.ts`, `questions.ts`

### Utilities
- camelCase: `formatDate.ts`, `calculateScore.ts`

### Pages
- kebab-case for routes: `mode-select`, `practice`
- PascalCase for page components: `page.tsx`

---

## 14. Import Order

```typescript
// 1. React and Next.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { motion } from 'framer-motion';

// 3. Internal components
import { Button, Card } from '@/components/common';

// 4. Hooks
import { useAuth } from '@/hooks/useAuth';

// 5. Types
import type { User } from '@/types';

// 6. Utilities
import { formatDate } from '@/lib/utils';

// 7. Styles (if any)
import styles from './Component.module.css';
```

---

**Last Updated**: 2025-12-16  
**Version**: 1.0
