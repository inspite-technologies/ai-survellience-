# Faceapp Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start Vite with host exposure for Docker
CMD ["npm", "run", "dev", "--", "--host"]
