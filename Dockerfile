# Stage 1: Build the Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the Backend & Final Image
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy backend dependency files
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY src ./src
COPY .env.example ./

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p uploads

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
