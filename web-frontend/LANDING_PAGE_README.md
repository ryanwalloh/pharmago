# Pharmago Landing Page

This is a modern, responsive landing page for the Pharmago pharmacy management system built with React and Tailwind CSS.

## Structure

The landing page is organized into several components:

- **`App.js`** - Main application entry point
- **`components/LandingPage.js`** - Main landing page component
- **`components/Header.js`** - Navigation header component
- **`components/Hero.js`** - Hero section with main call-to-action

## Features

- **Responsive Design** - Works on all device sizes
- **Modern UI** - Clean, professional design using Tailwind CSS
- **Component-Based** - Easy to modify and extend
- **SEO Friendly** - Semantic HTML structure
- **Accessibility** - Proper ARIA labels and keyboard navigation

## Customization

### Colors
The main color scheme uses blue tones. You can customize colors by modifying the Tailwind classes:
- Primary: `blue-600`, `blue-500`
- Secondary: `gray-900`, `gray-500`
- Accent: `indigo-100`

### Content
To modify the content:
1. **Header**: Edit `components/Header.js` for navigation changes
2. **Hero**: Edit `components/Hero.js` for main messaging
3. **Features**: Edit the features section in `components/LandingPage.js`
4. **Footer**: Edit the footer section in `components/LandingPage.js`

### Adding New Sections
To add new sections:
1. Create a new component in the `components/` directory
2. Import and use it in `LandingPage.js`
3. Style with Tailwind CSS classes

## Running the Development Server

Since you're using Docker, you can start the development environment with:

```bash
# From the project root
docker-compose up web-frontend
```

Or if you prefer to run locally:

```bash
cd web-frontend
npm start
```

## Building for Production

```bash
cd web-frontend
npm run build
```

## Dependencies

- React 19.1.1
- Tailwind CSS 3.4.0
- PostCSS & Autoprefixer

## File Organization

```
web-frontend/src/
├── components/
│   ├── LandingPage.js    # Main landing page
│   ├── Header.js         # Navigation header
│   └── Hero.js           # Hero section
├── App.js                # Main app component
└── index.js              # Entry point
```

## Next Steps

1. **Add Routing**: Install `react-router-dom` for multi-page navigation
2. **Add Forms**: Create contact forms and signup forms
3. **Add Animations**: Consider adding Framer Motion for smooth animations
4. **Add Backend Integration**: Connect forms to your Django backend
5. **Add Analytics**: Integrate Google Analytics or similar tracking

## Tips

- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) for mobile-first design
- Keep components small and focused on single responsibilities
- Use semantic HTML elements for better SEO and accessibility
- Test on different screen sizes during development
