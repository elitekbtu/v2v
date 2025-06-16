# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --silent --no-progress

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:stable-alpine
# install openssl to generate self-signed cert
RUN apk add --no-cache openssl && \
    mkdir -p /etc/ssl/private && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/selfsigned.key \
        -out /etc/ssl/certs/selfsigned.crt \
        -subj "/CN=localhost"
COPY --from=builder /app/dist /usr/share/nginx/html
# custom nginx configuration
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"] 