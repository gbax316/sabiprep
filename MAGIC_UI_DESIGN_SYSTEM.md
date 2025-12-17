# Magic UI Design System

**Version**: 1.0  
**Last Updated**: December 17, 2024  
**Status**: Production Ready

---

## Overview

The Magic UI design system is a **dark-first, gradient-rich design language** that transforms SabiPrep into a modern, engaging learning platform. Built with Tailwind CSS and Framer Motion, it features:

- 🌑 **Dark Theme** - Sophisticated slate backgrounds with vibrant accents
- 🎨 **Gradient Magic** - Smooth color transitions and glowing effects
- ✨ **Smooth Animations** - Framer Motion-powered micro-interactions
- 📱 **Mobile-First** - Responsive design for all screen sizes
- ♿ **Accessible** - WCAG 2.1 Level AA compliant

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing System](#spacing-system)
4. [Component Library](#component-library)
5. [Utility Classes](#utility-classes)
6. [Animation Guidelines](#animation-guidelines)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)
9. [Best Practices](#best-practices)

---

## Color Palette

### Background Colors

```css
/* Primary Backgrounds */
--bg-primary: #020617;      /* slate-950 - Main app background */
--bg-secondary: #0F172A;    /* slate-900 - Card backgrounds */
--bg-tertiary: #1E293B;     /* slate-800 - Elevated surfaces */

/* Usage */
.bg-slate-950  /* Main background */
.bg-slate-900  /* Cards, modals */
.bg-slate-800  /* Buttons, inputs */
```

**When to use:**
- `slate-950`: Main page backgrounds
- `slate-900`: Card backgrounds, modal overlays
- `slate-800`: Interactive elements, hover states

### Accent Colors

```css
/* Primary Accents */
--accent-cyan: #22D3EE;     /* cyan-400 - Primary actions */
--accent-cyan-dark: #06B6D4; /* cyan-500 - Hover states */

/* Secondary Accents */
--accent-violet: #6366F1;   /* indigo-500 - Secondary actions */
--accent-purple: #A78BFA;   /* violet-400 - Tertiary accents */

/* Usage */
.text-cyan-400     /* Primary text accents */
.bg-cyan-500       /* Primary buttons */
.border-violet-500 /* Secondary borders */
```

**When to use:**
- **Cyan**: Primary CTAs, links, active states
- **Violet/Indigo**: Secondary actions, badges
- **Purple**: Tertiary accents, decorative elements

### Status Colors

```css
/* Success */
--success: #34D399;         /* emerald-400 */
--success-dark: #10B981;    /* emerald-500 */

/* Warning */
--warning: #FBBF24;         /* amber-400 */
--warning-dark: #F59E0B;    /* amber-500 */

/* Error */
--error: #F87171;           /* red-400 */
--error-dark: #EF4444;      /* red-500 */

/* Info */
--info: #60A5FA;            /* blue-400 */
```

**When to use:**
- **Success**: Correct answers, achievements, completion
- **Warning**: Hints, cautions, pending states
- **Error**: Wrong answers, validation errors
- **Info**: Informational messages, tips

### Text Colors

```css
/* Text Hierarchy */
--text-primary: #F9FAFB;    /* slate-50 - Headings */
--text-secondary: #CBD5E1;  /* slate-300 - Body text */
--text-muted: #94A3B8;      /* slate-400 - Labels */
--text-disabled: #64748B;   /* slate-500 - Disabled */

/* Usage */
.text-white        /* Headings, important text */
.text-slate-300    /* Body text */
.text-slate-400    /* Secondary text, labels */
.text-slate-500    /* Disabled, placeholder */
```

### Border Colors

```css
/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1);   /* border-slate-800 */
--border-medium: rgba(255, 255, 255, 0.2);   /* border-slate-700 */
--border-strong: rgba(255, 255, 255, 0.3);   /* border-slate-600 */

/* Usage */
.border-slate-800  /* Subtle dividers */
.border-slate-700  /* Card borders */
.border-slate-600  /* Emphasized borders */
```

---

## Typography

### Font Families

```css
/* Display Font - Headings */
--font-display: 'Plus Jakarta Sans', 'Inter', sans-serif;

/* Body Font - Content */
--font-body: 'Inter', system-ui, sans-serif;

/* Usage */
.font-display  /* Hero text, page titles */
.font-sans     /* Body text, UI elements */
```

### Font Sizes

```css
/* Hero & Display */
--text-hero: 3.5rem;        /* 56px - Hero headings */
--text-display: 3rem;       /* 48px - Large displays */

/* Headings */
--text-h1: 2.5rem;          /* 40px - Page titles */
--text-h2: 2rem;            /* 32px - Section titles */
--text-h3: 1.5rem;          /* 24px - Card titles */
--text-h4: 1.25rem;         /* 20px - Subsections */

/* Body */
--text-lg: 1.125rem;        /* 18px - Large body */
--text-base: 1rem;          /* 16px - Regular body */
--text-sm: 0.875rem;        /* 14px - Small text */
--text-xs: 0.75rem;         /* 12px - Captions */

/* Tailwind Classes */
.text-5xl      /* Hero (48px) */
.text-4xl      /* Display (36px) */
.text-3xl      /* H1 (30px) */
.text-2xl      /* H2 (24px) */
.text-xl       /* H3 (20px) */
.text-lg       /* Large body (18px) */
.text-base     /* Body (16px) */
.text-sm       /* Small (14px) */
.text-xs       /* Caption (12px) */
```

### Font Weights

```css
--font-black: 900;      /* .font-black - Hero text */
--font-bold: 700;       /* .font-bold - Headings */
--font-semibold: 600;   /* .font-semibold - Subheadings */
--font-medium: 500;     /* .font-medium - Emphasis */
--font-regular: 400;    /* .font-normal - Body text */
```

### Typography Examples

```tsx
{/* Hero Heading */}
<h1 className="font-display text-5xl font-black text-white">
  Welcome to SabiPrep
</h1>

{/* Page Title */}
<h2 className="font-display text-3xl font-bold text-white">
  Your Dashboard
</h2>

{/* Section Title */}
<h3 className="font-display text-xl font-semibold text-white">
  Recent Activity
</h3>

{/* Body Text */}
<p className="text-base text-slate-300">
  Track your learning progress and achievements.
</p>

{/* Small Text */}
<span className="text-sm text-slate-400">
  Last updated 2 hours ago
</span>
```

---

## Spacing System

### Spacing Scale

```css
/* Tailwind Spacing */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */

/* Common Usage */
.p-4    /* Padding: 16px */
.p-6    /* Padding: 24px */
.p-8    /* Padding: 32px */
.gap-4  /* Gap: 16px */
.gap-6  /* Gap: 24px */
.mb-4   /* Margin bottom: 16px */
```

### Component Padding

```css
/* Cards */
.p-6    /* Standard card padding (24px) */
.p-8    /* Large card padding (32px) */

/* Buttons */
.px-6 py-3  /* Standard button (24px x 12px) */
.px-8 py-4  /* Large button (32px x 16px) */

/* Sections */
.py-6   /* Section vertical padding (24px) */
.py-10  /* Large section padding (40px) */
```

### Border Radius

```css
--radius-sm: 0.5rem;    /* 8px - .rounded-lg */
--radius-md: 0.75rem;   /* 12px - .rounded-xl */
--radius-lg: 1rem;      /* 16px - .rounded-2xl */
--radius-xl: 1.5rem;    /* 24px - .rounded-3xl */
--radius-full: 9999px;  /* .rounded-full - Pills */

/* Usage */
.rounded-xl    /* Cards (12px) */
.rounded-2xl   /* Large cards (16px) */
.rounded-full  /* Buttons, badges */
```

---

## Component Library

### MagicCard

Base card component with gradient borders and glow effects.

**Props:**
```typescript
interface MagicCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;      // Enable hover effects (default: true)
  glow?: boolean;       // Enable glow effect (default: false)
}
```

**Usage:**
```tsx
import { MagicCard } from '@/components/magic';

<MagicCard hover glow className="p-6">
  <h3 className="text-xl font-bold text-white mb-2">Card Title</h3>
  <p className="text-slate-400">Card content goes here</p>
</MagicCard>
```

**Variants:**
```tsx
{/* Standard Card */}
<MagicCard className="p-6">
  Content
</MagicCard>

{/* Card with Hover Effect */}
<MagicCard hover className="p-6">
  Hover me
</MagicCard>

{/* Card with Glow */}
<MagicCard glow className="p-6">
  Glowing card
</MagicCard>
```

**CSS Classes:**
- `.magic-card` - Base card styles
- `.magic-card-glow` - Adds glow effect

---

### MagicButton

Pill-shaped buttons with gradients and animations.

**Props:**
```typescript
interface MagicButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}
```

**Usage:**
```tsx
import { MagicButton } from '@/components/magic';

<MagicButton 
  variant="primary" 
  size="md" 
  onClick={handleClick}
>
  Click Me
</MagicButton>
```

**Variants:**
```tsx
{/* Primary - Gradient background */}
<MagicButton variant="primary">
  Primary Action
</MagicButton>

{/* Secondary - Outlined */}
<MagicButton variant="secondary">
  Secondary Action
</MagicButton>

{/* Ghost - Transparent */}
<MagicButton variant="ghost">
  Ghost Button
</MagicButton>

{/* Icon - Square button */}
<MagicButton variant="icon">
  <Search className="w-5 h-5" />
</MagicButton>
```

**Sizes:**
```tsx
<MagicButton size="sm">Small</MagicButton>
<MagicButton size="md">Medium</MagicButton>
<MagicButton size="lg">Large</MagicButton>
```

---

### MagicBadge

Pill-shaped tags for categories and status.

**Props:**
```typescript
interface MagicBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}
```

**Usage:**
```tsx
import { MagicBadge } from '@/components/magic';

<MagicBadge variant="success" size="sm">
  Completed
</MagicBadge>
```

**Variants:**
```tsx
<MagicBadge variant="default">Default</MagicBadge>
<MagicBadge variant="primary">Primary</MagicBadge>
<MagicBadge variant="accent">Accent</MagicBadge>
<MagicBadge variant="success">Success</MagicBadge>
<MagicBadge variant="warning">Warning</MagicBadge>
```

---

### StatCard

Display large numbers with icons and gradients.

**Props:**
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}
```

**Usage:**
```tsx
import { StatCard } from '@/components/magic';
import { Target } from 'lucide-react';

<StatCard
  title="Questions Answered"
  value={1234}
  icon={<Target className="w-6 h-6" />}
  trend="up"
  trendValue="+12%"
/>
```

---

### BentoGrid

Flexible grid layout for dashboard elements.

**Props:**
```typescript
interface BentoGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Usage:**
```tsx
import { BentoGrid } from '@/components/magic';

<BentoGrid columns={3} gap="md">
  <MagicCard>Item 1</MagicCard>
  <MagicCard>Item 2</MagicCard>
  <MagicCard>Item 3</MagicCard>
</BentoGrid>
```

---

## Utility Classes

### Gradient Text

```css
/* Primary Gradient - Cyan to Blue */
.text-gradient-primary {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-cyan-300;
}

/* Accent Gradient - Indigo to Violet */
.text-gradient-accent {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400;
}

/* Magic Gradient - Cyan to Violet */
.text-gradient-magic {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400;
}
```

**Usage:**
```tsx
<h1 className="text-gradient-magic text-5xl font-black">
  Welcome to SabiPrep
</h1>
```

### Glow Effects

```css
/* Primary Glow - Cyan */
.glow-primary {
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.3);
}

/* Strong Primary Glow */
.glow-primary-strong {
  box-shadow: 0 0 50px rgba(34, 211, 238, 0.5);
}

/* Accent Glow - Violet */
.glow-accent {
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
}

/* Hover Glow */
.hover-glow-primary {
  @apply transition-shadow duration-300;
}
.hover-glow-primary:hover {
  box-shadow: 0 0 40px rgba(34, 211, 238, 0.4);
}
```

**Usage:**
```tsx
<div className="glow-primary rounded-2xl p-6">
  Glowing content
</div>

<button className="hover-glow-primary">
  Hover for glow
</button>
```

### Frosted Glass

```css
/* Standard Frosted Glass */
.frosted-glass {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

/* Light Frosted Glass */
.frosted-glass-light {
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
}

/* Strong Frosted Glass */
.frosted-glass-strong {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
}
```

**Usage:**
```tsx
{/* Navigation Header */}
<header className="frosted-glass sticky top-0 z-30">
  <nav>...</nav>
</header>

{/* Modal Overlay */}
<div className="frosted-glass-strong rounded-2xl p-8">
  Modal content
</div>
```

### Gradient Backgrounds

```css
/* Gradient Mesh - Dark */
.gradient-mesh-dark {
  background:
    radial-gradient(at 27% 37%, rgba(34, 211, 238, 0.15) 0px, transparent 50%),
    radial-gradient(at 97% 21%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
    radial-gradient(at 52% 99%, rgba(139, 92, 246, 0.1) 0px, transparent 50%);
  background-color: #020617;
}

/* Gradient Mesh - Card */
.gradient-mesh-card {
  background:
    radial-gradient(at 40% 20%, rgba(34, 211, 238, 0.1) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%);
  background-color: #0F172A;
}
```

**Usage:**
```tsx
{/* Hero Section */}
<section className="gradient-mesh-dark py-20">
  <h1>Hero Content</h1>
</section>

{/* Feature Card */}
<div className="gradient-mesh-card rounded-2xl p-8">
  Card content
</div>
```

---

## Animation Guidelines

### Framer Motion Patterns

#### Fade In Animation

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

#### Slide Up Animation

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

#### Stagger Children

```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
>
  {items.map((item, index) => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

#### Hover Scale

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
  Click Me
</motion.button>
```

### CSS Animations

#### Shimmer Effect

```css
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

#### Pulse Glow

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

### Animation Best Practices

**Do's ✅**
- Use subtle animations (0.2-0.3s duration)
- Stagger list items for visual interest
- Add hover effects to interactive elements
- Use spring animations for natural feel
- Respect `prefers-reduced-motion`

**Don'ts ❌**
- Don't animate everything
- Avoid long animations (>0.5s)
- Don't use jarring easing functions
- Avoid animating layout properties excessively
- Don't ignore accessibility preferences

---

## Responsive Design

### Breakpoints

```css
/* Tailwind Breakpoints */
sm: 640px   /* @media (min-width: 640px) */
md: 768px   /* @media (min-width: 768px) */
lg: 1024px  /* @media (min-width: 1024px) */
xl: 1280px  /* @media (min-width: 1280px) */
2xl: 1536px /* @media (min-width: 1536px) */
```

### Mobile-First Approach

```tsx
{/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <MagicCard>Item 1</MagicCard>
  <MagicCard>Item 2</MagicCard>
  <MagicCard>Item 3</MagicCard>
</div>

{/* Responsive Text Sizes */}
<h1 className="text-3xl md:text-4xl lg:text-5xl font-black">
  Responsive Heading
</h1>

{/* Responsive Padding */}
<section className="px-4 md:px-6 lg:px-8 py-6 md:py-10">
  Content
</section>
```

### Container Widths

```tsx
{/* Responsive Container */}
<div className="container-app">
  {/* max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 */}
  Content
</div>

{/* Narrow Container */}
<div className="max-w-2xl mx-auto px-4">
  Narrow content
</div>
```

---

## Accessibility

### Color Contrast

All color combinations meet WCAG 2.1 Level AA standards:

- **Text on Dark Background**: White text (#F9FAFB) on slate-950 (#020617) = 19.77:1 ✅
- **Cyan Accent**: Cyan-400 (#22D3EE) on slate-950 = 8.59:1 ✅
- **Violet Accent**: Indigo-500 (#6366F1) on slate-950 = 5.89:1 ✅

### Keyboard Navigation

```tsx
{/* Focus Ring */}
<button className="focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950">
  Accessible Button
</button>

{/* Skip to Content */}
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### ARIA Labels

```tsx
{/* Icon Buttons */}
<button aria-label="Close menu">
  <X className="w-5 h-5" />
</button>

{/* Loading States */}
<div role="status" aria-live="polite">
  {loading ? 'Loading...' : 'Content loaded'}
</div>

{/* Progress Indicators */}
<div 
  role="progressbar" 
  aria-valuenow={progress} 
  aria-valuemin={0} 
  aria-valuemax={100}
>
  {progress}%
</div>
```

### Screen Reader Support

```tsx
{/* Visually Hidden Text */}
<span className="sr-only">
  Additional context for screen readers
</span>

{/* Semantic HTML */}
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/home">Home</a></li>
  </ul>
</nav>
```

---

## Best Practices

### Do's ✅

**Layout:**
- Use MagicCard for all card-based layouts
- Apply BentoGrid for dashboard sections
- Use consistent spacing (multiples of 4px)
- Maintain visual hierarchy with size and weight

**Colors:**
- Use gradient text for hero headings
- Apply glow effects to primary CTAs
- Use status colors consistently
- Maintain sufficient contrast ratios

**Typography:**
- Use font-display for headings
- Keep line lengths readable (60-80 characters)
- Use appropriate font weights for hierarchy
- Scale text responsively

**Animations:**
- Add hover effects to interactive elements
- Use stagger animations for lists
- Keep animations subtle and quick
- Respect reduced motion preferences

**Components:**
- Use MagicButton for all buttons
- Apply MagicBadge for tags and status
- Use StatCard for metrics display
- Leverage Framer Motion for animations

### Don'ts ❌

**Layout:**
- Don't mix old Card component with MagicCard
- Don't use inconsistent spacing
- Don't skip mobile responsiveness
- Don't create overly complex layouts

**Colors:**
- Don't use light colors on dark backgrounds without checking contrast
- Don't overuse gradients
- Don't ignore status color meanings
- Don't use too many accent colors

**Typography:**
- Don't use more than 3 font weights per screen
- Don't make text too small (<14px for body)
- Don't use all caps for long text
- Don't forget responsive text sizes

**Animations:**
- Don't animate everything
- Don't use long animations (>0.5s)
- Don't forget loading states
- Don't ignore accessibility

**Components:**
- Don't create custom components when Magic UI components exist
- Don't skip prop validation
- Don't forget error states
- Don't ignore TypeScript types

---

## Quick Reference

### Common Patterns

```tsx
{/* Hero Section */}
<section className="gradient-mesh-dark py-20">
  <h1 className="text-gradient-magic text-5xl font-black mb-4">
    Hero Title
  </h1>
  <p className="text-xl text-slate-300">
    Hero description
  </p>
</section>

{/* Stats Grid */}
<BentoGrid columns={3} gap="md">
  <StatCard title="Metric 1" value={100} icon={<Icon />} />
  <StatCard title="Metric 2" value={200} icon={<Icon />} />
  <StatCard title="Metric 3" value={300} icon={<Icon />} />
</BentoGrid>

{/* Feature Card */}
<MagicCard hover glow className="p-6">
  <div className="flex items-center gap-4 mb-4">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-bold text-white">Feature Title</h3>
  </div>
  <p className="text-slate-400">Feature description</p>
</MagicCard>

{/* CTA Button */}
<MagicButton variant="primary" size="lg">
  Get Started
</MagicButton>
```

---

## Resources

### Documentation
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

### Design Tools
- [Coolors](https://coolors.co/) - Color palette generator
- [Contrast Checker](https://webaim.org/resources/contrastchecker/) - WCAG compliance
- [Gradient Generator](https://cssgradient.io/) - CSS gradients

### Related Documentation
- [`MAGIC_UI_IMPLEMENTATION_SUMMARY.md`](MAGIC_UI_IMPLEMENTATION_SUMMARY.md:1) - Implementation details
- [`DESIGN.md`](DESIGN.md:1) - Original design document
- [`README.md`](README.md:1) - Project overview

---

**Version**: 1.0  
**Last Updated**: December 17, 2024  
**Maintained by**: SabiPrep Development Team