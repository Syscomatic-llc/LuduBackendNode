FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if available
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port (app defaults to 16000)
EXPOSE 16000

# Start the application
CMD [ "npm", "start" ]
