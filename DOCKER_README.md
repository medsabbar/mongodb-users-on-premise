# Docker Setup for MongoDB User Management Application

This document provides instructions for running the MongoDB User Management application using Docker.

## Files Created

- `Dockerfile` - Multi-stage production-ready Docker image
- `.dockerignore` - Excludes unnecessary files from Docker build context
- `docker-compose.yml` - Complete stack with app and MongoDB
- `init-mongo.js` - MongoDB initialization script
- `DOCKER_README.md` - This documentation

## Quick Start with Docker Compose

The easiest way to run the application is using Docker Compose, which will start both the application and MongoDB:

```bash
# Build and start the services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

The application will be available at: http://localhost:3001

### Default MongoDB Connection
- **Host**: mongodb (internal) / localhost:27017 (external)
- **Username**: appuser
- **Password**: apppassword123
- **Database**: admin
- **Full URI**: `mongodb://appuser:apppassword123@mongodb:27017/admin`

## Manual Docker Commands

### Build the Application Image

```bash
docker build -t mongodb-usermanagement .
```

### Run with External MongoDB

```bash
docker run -p 3001:3001 \
  -e MONGODB_URI="your-mongodb-connection-string" \
  mongodb-usermanagement
```

### Run with Docker Network

```bash
# Create a network
docker network create app-network

# Run MongoDB
docker run -d \
  --name mongodb \
  --network app-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -v mongodb_data:/data/db \
  mongo:7.0

# Run the application
docker run -d \
  --name mongodb-app \
  --network app-network \
  -p 3001:3001 \
  -e MONGODB_URI="mongodb://admin:password123@mongodb:27017/admin" \
  mongodb-usermanagement
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Port the application listens on |
| `NODE_ENV` | production | Node.js environment |
| `MONGODB_URI` | - | MongoDB connection string |

## Docker Image Features

- **Base Image**: Node.js 18 Alpine (lightweight and secure)
- **Security**: Runs as non-root user (nextjs:nodejs)
- **Health Check**: Built-in health check endpoint
- **Production Ready**: Optimized for production deployment
- **Multi-architecture**: Supports AMD64 and ARM64

## Dockerfile Highlights

```dockerfile
# Security: Non-root user
USER nextjs

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3

# Optimized dependency installation
RUN npm ci --only=production && npm cache clean --force
```

## Development vs Production

### Development
```bash
# Use docker-compose for development with hot reload
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Use the main docker-compose.yml
docker-compose up -d
```

## Troubleshooting

### Container Health
```bash
# Check container health
docker ps
docker logs mongodb-usermanagement

# Check MongoDB connection
docker exec -it mongodb mongosh -u admin -p password123
```

### Common Issues

1. **Port already in use**: Change the port mapping in docker-compose.yml
2. **MongoDB connection failed**: Ensure MongoDB is running and accessible
3. **Permission denied**: The app runs as non-root user, check file permissions

### Demo Mode
The application supports demo mode for testing without MongoDB:
- Use URI containing "demo" or "test-demo"
- Example: `mongodb://demo:demo@localhost:27017/demo`

## Security Considerations

- Application runs as non-root user
- MongoDB has authentication enabled
- Sensitive files excluded via .dockerignore
- Health checks enabled for monitoring
- Production environment variables set

## Monitoring

The application includes a health check endpoint that can be used with:
- Docker health checks
- Kubernetes liveness/readiness probes
- Load balancer health checks

## Scaling

For production scaling, consider:
- Using Docker Swarm or Kubernetes
- External MongoDB service (MongoDB Atlas)
- Load balancer for multiple app instances
- Persistent volumes for MongoDB data