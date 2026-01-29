# Stage 1: Build the Frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy the rest of the frontend code
COPY frontend/ .

# Build the frontend
RUN npm run build

# Stage 2: Setup the Backend
FROM node:18-alpine

ENV NODE_ENV=production

WORKDIR /app

# Copy backend dependency files
COPY package*.json ./

# Install backend production dependencies
RUN npm ci --only=production

# Copy backend source code
COPY src ./src
COPY .env.example ./

# Copy built frontend assets from Stage 1 to the public directory
# matches app.js: path.join(__dirname, '../public')
# Since WORKDIR is /app, src is /app/src. relative ../public is /app/public.
COPY --from=frontend-builder /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p uploads

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
