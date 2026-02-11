# Use the official Node.js runtime as the base image
# Using Node.js 24 LTS for stability and security

###
# Build stage: install deps and build backend + frontend
###
FROM node:24-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy root package.json/package-lock.json and backend sources
COPY package*.json ./
COPY tsconfig.backend.json ./
COPY server.ts ./server.ts
COPY lib ./lib

# Copy client app
COPY client ./client

# Install all dependencies (including dev) and build
RUN npm install && \
    npm cache clean --force && \
    cd client && npm install && \
    cd /app && npm run build && \
    npm prune --omit=dev

###
# Runtime stage: minimal image with compiled app and production deps only
###
FROM node:24-alpine AS runtime

# Set the working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Copy only what we need from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist
# init script is tiny; copy directly from build context
COPY init-mongo.js ./init-mongo.js

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

# Start the application
CMD ["npm", "start"]