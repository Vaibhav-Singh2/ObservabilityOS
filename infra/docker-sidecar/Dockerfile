FROM node:18-alpine

WORKDIR /app

# Copy the shipper daemon
COPY shipper.js ./

# Set default env variables
ENV API_URL=http://host.docker.internal:3000/api/ingest
ENV API_KEY=""
ENV SERVICE_NAME="docker-app"
ENV ENVIRONMENT="prod"
ENV FLUSH_INTERVAL_MS=2000
ENV BATCH_SIZE=20

# Run the shipper script
CMD ["node", "shipper.js"]
