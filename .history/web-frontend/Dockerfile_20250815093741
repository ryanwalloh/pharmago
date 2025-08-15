# web-frontend/Dockerfile
FROM node:18.20-alpine AS build

# Set working directory
WORKDIR /app

# Copy and install dependencies first (better cache)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy all source files
COPY . .

# Ensure CRA binds to 0.0.0.0
ENV HOST=0.0.0.0
ENV REACT_APP_API_URL=http://localhost:8000/api

EXPOSE 3000
CMD ["npm", "start"]
