# Use Node.js LTS version
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Set environment variables
ENV PORT=3157
ENV NODE_OPTIONS="--no-deprecation"

# Install app dependencies
COPY package*.json ./
RUN npm install

# Install netstat for network diagnostics
RUN apk add --no-cache net-tools

# Bundle app source
COPY . .

# Make the start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 3157

# Start command using our script
CMD ["./start.sh"] 