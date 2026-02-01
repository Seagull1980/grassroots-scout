# Backend deployment Dockerfile for Railway
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# Expose port (Railway will set PORT environment variable)
EXPOSE 3000

# Start the backend server (updated)
CMD ["npm", "start"]