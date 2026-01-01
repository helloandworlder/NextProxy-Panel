# Panel Agent Dockerfile
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./

# Remove local replace directive for Docker build and update dependencies
RUN sed -i '/^replace/d' go.mod && \
    go mod tidy && \
    go mod download

# Copy source and build
COPY . .

# Remove replace again after COPY (in case it was copied) and rebuild deps
RUN sed -i '/^replace/d' go.mod && go mod tidy

RUN CGO_ENABLED=0 GOOS=linux go build -o agent ./cmd/agent

# Production stage
FROM alpine:latest AS runner

WORKDIR /app

# Install ca-certificates and xray
RUN apk add --no-cache ca-certificates curl unzip \
    && curl -L -o /tmp/xray.zip https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip \
    && unzip /tmp/xray.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/xray \
    && rm /tmp/xray.zip

# Copy agent binary
COPY --from=builder /app/agent /usr/local/bin/agent

# Config directory
RUN mkdir -p /etc/panel-agent /var/log/panel-agent

EXPOSE 50051

CMD ["agent", "-config", "/etc/panel-agent/config.yaml"]
