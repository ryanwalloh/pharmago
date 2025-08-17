🛠️ Cursor Project Instructions for PharmaGo

PharmaGo is a medicine delivery application. The project must be built with seamless, scalable, secure, and debuggable code, adhering to industry standards for e-commerce and healthcare-related apps.

🔑 General Development Guidelines

Always generate clean, modular, and well-documented code.

Prioritize scalability (easy to expand features) and maintainability (easy debugging and refactoring).

Apply standard security practices for e-commerce apps:

Input validation & sanitization

Secure authentication and authorization

Protection against SQL injection, XSS, CSRF

Secure storage of sensitive data (e.g., hashed passwords, encrypted tokens)

Follow the principle of least privilege

Ensure consistency across backend, web, and mobile implementations.

Follow best practices in error handling and logging.

🧑‍💻 Tech Stack

Backend: Django (Python)

Web Frontend: React + Tailwind CSS (with inline CSS allowed for special custom cases)

Mobile App: React Native + NativeWind (with inline styles allowed for special custom cases)

🎨 Frontend Styling Guidelines

React (Web):

Use Tailwind CSS as the main styling system.

Inline CSS allowed for unique or complex cases not easily handled by Tailwind.

React Native (Mobile):

Use NativeWind for styling.

Inline styles are permitted when NativeWind falls short.

⚡ Best Practices to Enforce

Consistent naming conventions (snake_case for Python, camelCase for JavaScript/React).

Reusable and modular components across frontend and mobile.

Keep business logic separate from presentation/UI code.

Database schemas should be normalized and future-proof.

API endpoints must be RESTful and well-documented.

Write unit tests and integration tests where applicable.

🧭 Instructions for Cursor

Before responding to any prompt:

Always consider these instructions first.

Generate code that is:

Seamless (integrates well across tech stacks)

Scalable (future growth-ready)

Secure (industry security standards)

Easy to debug (readable, modular, with logging)