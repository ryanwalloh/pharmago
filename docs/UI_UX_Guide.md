# PharmaGo UI/UX Design Guide

## Table of Contents
1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Component Styling](#component-styling)
5. [Responsive Design](#responsive-design)
6. [Interactive Elements](#interactive-elements)
7. [Form Design](#form-design)
8. [Modal Design](#modal-design)
9. [Best Practices](#best-practices)

---

## Color Palette

### Primary Colors
The PharmaGo brand uses a nature-inspired green color palette that conveys trust, health, and growth.

| Color Name | Hex Code | Usage | CSS Variable |
|------------|----------|-------|--------------|
| **Primary Dark** | `#2C7A5D` | Headings, primary buttons, important text | `text-[#2C7A5D]` |
| **Primary Medium** | `#4DAF7C` | Secondary text, links, medium emphasis | `text-[#4DAF7C]` |
| **Primary Light** | `#6BBF9A` | Hover states, accents, light emphasis | `text-[#6BBF9A]` |
| **Background Light** | `#D5E8D4` | Borders, backgrounds, subtle elements | `border-[#D5E8D4]` |

### Secondary Colors
| Color Name | Hex Code | Usage | CSS Variable |
|------------|----------|-------|--------------|
| **Background Gradient Start** | `#D5E8D4` | Hero section gradient start | `from-[#D5E8D4]` |
| **Background Gradient End** | `#A8D5BA` | Hero section gradient end | `to-[#A8D5BA]` |
| **White** | `#FFFFFF` | Primary background, cards | `bg-white` |
| **Gray Dark** | `#2c2c2c` | Dark text, labels | `text-[#2c2c2c]` |
| **Gray Medium** | `#666666` | Secondary text | `text-gray-600` |
| **Gray Light** | `#999999` | Placeholder text, disabled states | `text-gray-500` |

### Status Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Success** | `#10B981` | Success messages, completed states |
| **Warning** | `#F59E0B` | Warning messages, caution states |
| **Error** | `#EF4444` | Error messages, validation errors |
| **Info** | `#3B82F6` | Information messages, tips |

---

## Typography

### Font Families
- **Primary**: System fonts (Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- **Fallback**: Sans-serif

### Font Weights
| Weight | Usage | Tailwind Class |
|--------|-------|----------------|
| **400** (Normal) | Body text, labels | `font-normal` |
| **500** (Medium) | Navigation links, secondary buttons | `font-medium` |
| **600** (Semibold) | Buttons, important labels | `font-semibold` |
| **700** (Bold) | Modal titles, section headings | `font-bold` |
| **800** (Extrabold) | Main headings, hero text | `font-extrabold` |

### Font Sizes
| Size | Usage | Tailwind Class | Example |
|------|-------|----------------|---------|
| **xs** (12px) | Disclaimers, fine print | `text-xs` | "This site is protected by reCAPTCHA..." |
| **sm** (14px) | Small labels, navigation | `text-sm` | Navigation links, form labels |
| **base** (16px) | Body text, default | `text-base` | Paragraphs, form inputs |
| **lg** (18px) | Large body text | `text-lg` | Hero descriptions |
| **xl** (20px) | Small headings | `text-xl` | Section descriptions |
| **2xl** (24px) | Medium headings | `text-2xl` | Modal titles, form headings |
| **3xl** (30px) | Large headings | `text-3xl` | Section headings |
| **4xl** (36px) | Hero headings | `text-4xl` | Main page headings |
| **5xl** (48px) | Large hero headings | `text-5xl` | Primary hero text |
| **6xl** (60px) | Extra large headings | `text-6xl` | Main hero headings |

### Line Heights
- **Tight**: `leading-tight` - For headings and titles
- **Relaxed**: `leading-relaxed` - For body text and descriptions
- **Normal**: Default - For most text elements

---

## Spacing & Layout

### Container Sizes
| Size | Max Width | Usage | Tailwind Class |
|------|-----------|-------|----------------|
| **Small** | 640px | Mobile containers | `max-w-sm` |
| **Medium** | 768px | Tablet containers | `max-w-md` |
| **Large** | 1024px | Desktop containers | `max-w-lg` |
| **Extra Large** | 1280px | Wide desktop | `max-w-xl` |
| **7XL** | 1280px | Main content areas | `max-w-7xl` |

### Padding & Margins
| Size | Value | Usage | Tailwind Classes |
|------|-------|-------|------------------|
| **xs** | 4px | Tight spacing | `p-1`, `m-1` |
| **sm** | 8px | Small spacing | `p-2`, `m-2` |
| **md** | 16px | Medium spacing | `p-4`, `m-4` |
| **lg** | 24px | Large spacing | `p-6`, `m-6` |
| **xl** | 32px | Extra large spacing | `p-8`, `m-8` |
| **2xl** | 48px | Section spacing | `p-12`, `m-12` |
| **3xl** | 64px | Page spacing | `p-16`, `m-16` |

### Grid System
- **Mobile**: Single column (`grid-cols-1`)
- **Tablet**: Two columns (`sm:grid-cols-2`)
- **Desktop**: Three columns (`lg:grid-cols-3`)
- **Gap**: 32px (`gap-8`) for feature grids

---

## Component Styling

### Buttons

#### Primary Button
```css
bg-[#4DAF7C] hover:bg-[#2C7A5D] text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5
```
- **Usage**: Main actions, CTAs, form submissions
- **States**: Default, hover, disabled
- **Animation**: Subtle lift on hover

#### Secondary Button
```css
text-[#4DAF7C] hover:text-[#2C7A5D] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 border border-[#D5E8D4] hover:border-[#6BBF9A]
```
- **Usage**: Secondary actions, navigation
- **States**: Default, hover
- **Style**: Outlined with color change

#### Text Button
```css
text-[#6BBF9A] hover:text-[#4DAF7C] transition-colors duration-200
```
- **Usage**: Links, subtle actions
- **States**: Default, hover

### Cards
```css
bg-white rounded-2xl shadow-2xl p-8
```
- **Usage**: Content containers, forms, feature cards
- **Border Radius**: 16px (`rounded-2xl`)
- **Shadow**: Large shadow (`shadow-2xl`)
- **Padding**: 32px (`p-8`)

### Feature Cards
```css
bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col
```
- **Usage**: Feature highlights, service cards
- **Background**: Light green (`#D5E8D4`)
- **Layout**: Flex column for equal heights

---

## Responsive Design

### Breakpoints
| Device | Min Width | Tailwind Prefix | Usage |
|--------|-----------|-----------------|-------|
| **Mobile** | 0px | None | Default styles |
| **Small** | 640px | `sm:` | Small tablets |
| **Medium** | 768px | `md:` | Tablets, small laptops |
| **Large** | 1024px | `lg:` | Laptops, desktops |
| **Extra Large** | 1280px | `xl:` | Large desktops |

### Mobile-First Approach
1. **Design for mobile first** - Start with mobile layout
2. **Progressive enhancement** - Add features for larger screens
3. **Touch-friendly** - Minimum 44px touch targets
4. **Readable text** - Minimum 16px font size on mobile

### Responsive Patterns

#### Navigation
```css
hidden md:block  /* Hide on mobile, show on desktop */
flex flex-col sm:flex-row  /* Stack on mobile, row on tablet+ */
```

#### Typography
```css
text-2xl sm:text-4xl md:text-5xl  /* Responsive text sizing */
```

#### Grid Layouts
```css
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  /* Responsive grid */
```

#### Spacing
```css
px-4 sm:px-6 lg:px-8  /* Responsive padding */
py-16 lg:py-20  /* Responsive vertical spacing */
```

---

## Interactive Elements

### Hover Effects
- **Duration**: 200ms (`duration-200`)
- **Easing**: Default (ease)
- **Types**:
  - Color transitions (`transition-colors`)
  - Transform effects (`transform hover:-translate-y-0.5`)
  - Shadow changes (`hover:shadow-lg`)

### Focus States
- **Outline**: None (`focus:outline-none`)
- **Ring**: 2px with opacity (`focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20`)
- **Border**: Color change (`focus:border-[#6BBF9A]`)

### Transitions
```css
transition-all duration-200  /* All properties, 200ms */
transition-colors duration-200  /* Color only */
transition-transform duration-300  /* Transform only */
```

---

## Form Design

### Input Fields
```css
peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200
```

### Floating Labels
```css
absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]
```

### Form Validation
- **Valid State**: Green border (`border-[#D5E8D4]`)
- **Invalid State**: Red border (`border-red-300`)
- **Focus State**: Accent color (`focus:border-[#6BBF9A]`)

### Radio Buttons
```css
h-4 w-4 text-[#6BBF9A] border-[#D5E8D4] focus:ring-[#6BBF9A] focus:ring-2
```

### Checkboxes
```css
accent-[#2c786c] w-6 h-6 cursor-pointer
```

---

## Modal Design

### Modal Overlay
```css
fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4
```

### Modal Container
```css
bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto
```

### Close Button
```css
text-gray-400 hover:text-gray-600 transition-colors duration-200
```

### Modal Content
- **Padding**: 32px (`px-8 pb-8`)
- **Spacing**: 24px between elements (`space-y-6`)
- **Typography**: Consistent with form headings

---

## Best Practices

### Accessibility
1. **Color Contrast**: Minimum 4.5:1 ratio for normal text
2. **Focus Indicators**: Visible focus states for keyboard navigation
3. **Alt Text**: Descriptive alt text for all images
4. **Semantic HTML**: Proper heading hierarchy and landmarks

### Performance
1. **CSS Classes**: Use Tailwind utility classes
2. **Animations**: Keep transitions under 300ms
3. **Images**: Optimize and use appropriate formats
4. **Fonts**: Use system fonts when possible

### Consistency
1. **Color Usage**: Stick to the defined color palette
2. **Spacing**: Use consistent spacing scale
3. **Typography**: Follow the typography hierarchy
4. **Components**: Reuse component patterns

### Mobile Optimization
1. **Touch Targets**: Minimum 44px for interactive elements
2. **Text Size**: Minimum 16px to prevent zoom on iOS
3. **Spacing**: Adequate spacing between clickable elements
4. **Navigation**: Simple, thumb-friendly navigation

---

## Implementation Notes

### Tailwind Configuration
The design system uses custom color values that should be added to the Tailwind config:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'pharma-dark': '#2C7A5D',
        'pharma-medium': '#4DAF7C',
        'pharma-light': '#6BBF9A',
        'pharma-bg': '#D5E8D4',
        'pharma-gradient-start': '#D5E8D4',
        'pharma-gradient-end': '#A8D5BA',
      }
    }
  }
}
```

### Component Library
Consider creating reusable components for:
- Buttons (Primary, Secondary, Text)
- Form inputs with floating labels
- Cards (Content, Feature)
- Modals
- Navigation elements

### Design Tokens
For larger projects, consider implementing design tokens for:
- Colors
- Typography scales
- Spacing values
- Border radius values
- Shadow definitions

---

*This guide should be updated as the design system evolves and new patterns are established.*
