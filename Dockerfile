# Use Node.js 20 LTS as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build the TypeScript code
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership of the app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Expose port 8000 (standard for Smithery)
EXPOSE 8000

# Start the MCP server
CMD ["node", "build/index.js"]