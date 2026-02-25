# syntax=docker/dockerfile:1
FROM node:20-slim

WORKDIR /opt/relayer

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the entire application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port 3001
EXPOSE 3001

# Push schema and start the application
CMD npx drizzle-kit push --force && npm run start
