FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the client
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default values for environment variables used in nginx config
ENV PORT=80
ENV BACKEND_URL=http://server:3000

EXPOSE $PORT

CMD ["nginx", "-g", "daemon off;"]
