# Use the official Node.js runtime as the base image
# Using Node.js 18 LTS for stability and security
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
# Using npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production && \
    npm cache clean --force

# Copy the application code
COPY . .

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: process.env.PORT || 3001, path: '/', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["npm", "start"]