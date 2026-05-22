FROM node:20-alpine

# Install build dependencies for native modules (like bcrypt)
RUN apk add --no-cache python3 make g++ ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and nodemon globally
RUN npm install && npm install -g nodemon

# Copy all server files
COPY . ./

# Expose API port
EXPOSE 8080

# Start the server
CMD ["nodemon", "server.js"]