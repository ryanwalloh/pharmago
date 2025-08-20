🛠️ Cursor Project Instructions for PharmaGo

PharmaGo is a medicine delivery application. The project must be built with seamless, scalable, secure, and debuggable code, adhering to industry standards for e-commerce and healthcare-related apps.

General Development Guidelines
Always generate clean, modular, and well-documented code.

Prioritize scalability (easy to expand features) and maintainability (easy debugging and refactoring).

Apply standard security practices for e-commerce apps:

Input validation & sanitization

Secure authentication and authorization

Protection against SQL injection, XSS, and CSRF

Secure storage of sensitive data (e.g., hashed passwords, encrypted tokens)

Follow the principle of least privilege

Ensure consistency across backend, web, and mobile implementations.

Follow best practices in error handling and logging, with a focus on detailed, centralized logging for easier debugging.

Strive for a highly accessible user interface, adhering to WCAG guidelines to ensure the application is usable by everyone, including people with disabilities.

Tech Stack
Backend: Django (Python)

Web Frontend: React + Tailwind CSS (with inline CSS allowed for special custom cases)

Mobile App: React Native + NativeWind (with inline styles allowed for special custom cases)

Containerization and Local Development
The entire development environment (backend and frontend) is Dockerized.

All services run in separate Docker containers.

Database migrations, tests, and running the server must be done using Docker commands.

A docker-compose.yml file is used to manage all services and their dependencies.

Frontend Styling & Accessibility Guidelines
React (Web):

Use Tailwind CSS as the main styling system.

Inline CSS is allowed for unique or complex cases not easily handled by Tailwind.

Ensure all components are keyboard-navigable and use proper ARIA attributes for screen readers.

React Native (Mobile):

Use NativeWind for styling.

Inline styles are permitted when NativeWind falls short.

Implement accessibility features like voice-over compatibility and adjustable font sizes.

Develop a shared design system or component library to maintain visual consistency across both web and mobile platforms.

Best Practices to Enforce
Consistent naming conventions (snake_case for Python, camelCase for JavaScript/React).

Reusable and modular components across frontend and mobile.

Keep business logic separate from presentation/UI code.

Database schemas should be normalized and future-proof.

API endpoints must be RESTful and well-documented.

Write unit tests and integration tests where applicable.

Implement a CI/CD pipeline to automate testing and deployment.

Establish a centralized logging protocol to log all errors, security events, and key transactions. Logs should include timestamps, user IDs, and relevant context for quick issue resolution.

Instructions for Cursor
Before responding to any prompt, always consider these instructions first.

The development environment is Dockerized. When providing command-line instructions, always assume the user is working inside a Docker container or using docker compose. Do not provide commands for a non-containerized environment unless necessary or is possible without docker commands.

Generate code that is:

Seamless (integrates well across tech stacks)

Scalable (future growth-ready)

Secure (adheres to industry security standards)

Easy to debug (readable, modular, with clear logging)