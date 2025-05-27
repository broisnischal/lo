# Use the official Bun image
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Expose port 3000
EXPOSE 4000

# Start the application
CMD ["bun", "run", "src/index.ts"]
