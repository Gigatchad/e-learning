# Setup the Backend
FROM node:18-alpine

ENV NODE_ENV=production

WORKDIR /app

# Copy backend dependency files
COPY package*.json ./

# Install backend production dependencies
RUN npm install --omit=dev

# Copy backend source code
COPY src ./src
COPY .env.example ./

# Create uploads directory
RUN mkdir -p uploads

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
