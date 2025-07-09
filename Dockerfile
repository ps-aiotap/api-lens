FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Copy Python requirements and install
COPY python/requirements.txt ./python/
RUN pip3 install -r python/requirements.txt

# Copy application code
COPY . .

# Expose ports
EXPOSE 3001

# Start the API server
CMD ["node", "api-server.js"]