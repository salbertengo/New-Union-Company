# Use Node.js LTS as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .


# Expose the port
EXPOSE 8080

# Start the frontend server
CMD ["npm", "start"]
 