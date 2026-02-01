# Backend Dockerfile for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY . .

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]