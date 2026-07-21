.PHONY: help install build test docker-build docker-up docker-up-redis docker-up-monitoring docker-up-full docker-up-dev docker-up-dev-full docker-down docker-logs docker-ps deploy clean

# Default target
.DEFAULT_GOAL := help

# Variables
DOCKER_IMAGE := ai-provider-gateway
DOCKER_TAG := latest
DOCKER_DIR := deployment/docker
COMPOSE_ENV_FILE := .env
COMPOSE := docker-compose --env-file $(COMPOSE_ENV_FILE)

# Compose file combinations (all in deployment/docker/)
COMPOSE_BASE := $(DOCKER_DIR)/docker-compose.yml
COMPOSE_REDIS := $(DOCKER_DIR)/docker-compose.redis.yml
COMPOSE_MONITORING := $(DOCKER_DIR)/docker-compose.monitoring.yml
COMPOSE_OLLAMA := $(DOCKER_DIR)/docker-compose.ollama.yml
COMPOSE_DEV := $(DOCKER_DIR)/docker-compose.dev.yml

## help: Display this help message
help:
	@echo "AI Provider Gateway - Makefile targets:"
	@echo ""
	@echo "=== Development ==="
	@grep -E '^## (install|build|test|lint|format|audit):' Makefile | sed 's/## /  /'
	@echo ""
	@echo "=== Docker - Production ==="
	@grep -E '^## docker-(build|up|down|logs|ps|clean):' Makefile | sed 's/## /  /'
	@echo ""
	@echo "=== Docker - Deployment Variants ==="
	@grep -E '^## docker-up-(redis|monitoring|full|ollama):' Makefile | sed 's/## /  /'
	@echo ""
	@echo "=== Docker - Development ==="
	@grep -E '^## docker-up-dev' Makefile | sed 's/## /  /'
	@echo ""
	@echo "=== Deployment ==="
	@grep -E '^## deploy-' Makefile | sed 's/## /  /'
	@echo ""
	@echo "=== Services ==="
	@grep -E '^## (redis|ollama|monitoring)-(up|down):' Makefile | sed 's/## /  /'
	@echo ""
	@echo "=== Utilities ==="
	@grep -E '^## (metrics|dashboard|health):' Makefile | sed 's/## /  /'

## install: Install dependencies
install:
	npm ci

## build: Build TypeScript
build:
	npm run build

## test: Run all tests
test:
	npm run test:all

## test-security: Run security tests
test-security:
	npm run test:security

## lint: Run linter
lint:
	npm run lint

## format: Format code with Prettier
format:
	npm run format

## docker-build: Build Docker image
docker-build:
	docker build -f $(DOCKER_DIR)/Dockerfile -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

## docker-up: Start MVP (gateway only)
docker-up:
	$(COMPOSE) -f $(COMPOSE_BASE) up -d

## docker-up-redis: Start gateway + Redis cache
docker-up-redis:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) up -d

## docker-up-monitoring: Start gateway + Prometheus + Grafana
docker-up-monitoring:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_MONITORING) up -d

## docker-up-full: Start full production stack (gateway + redis + monitoring)
docker-up-full:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) up -d

## docker-up-ollama: Start gateway + Ollama local LLM
docker-up-ollama:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_OLLAMA) up -d

## docker-up-dev: Start development mode (gateway only, hot reload)
docker-up-dev:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) up -d

## docker-up-dev-full: Start full development stack (gateway + redis + monitoring, hot reload)
docker-up-dev-full:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) -f $(COMPOSE_DEV) up -d

## docker-down: Stop all services
docker-down:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) -f $(COMPOSE_OLLAMA) -f $(COMPOSE_DEV) down

## docker-logs: Show logs from all services
docker-logs:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) -f $(COMPOSE_OLLAMA) logs -f

## docker-ps: Show running containers
docker-ps:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) -f $(COMPOSE_OLLAMA) ps

## docker-clean: Stop and remove all containers, networks, and volumes
docker-clean:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) -f $(COMPOSE_OLLAMA) down -v

## redis-up: Start only Redis service
redis-up:
	$(COMPOSE) -f $(COMPOSE_REDIS) up -d

## redis-down: Stop only Redis service
redis-down:
	$(COMPOSE) -f $(COMPOSE_REDIS) down

## monitoring-up: Start only monitoring services (Prometheus + Grafana)
monitoring-up:
	$(COMPOSE) -f $(COMPOSE_MONITORING) up -d

## monitoring-down: Stop only monitoring services
monitoring-down:
	$(COMPOSE) -f $(COMPOSE_MONITORING) down

## ollama-up: Start only Ollama service
ollama-up:
	$(COMPOSE) -f $(COMPOSE_OLLAMA) up -d

## ollama-down: Stop only Ollama service
ollama-down:
	$(COMPOSE) -f $(COMPOSE_OLLAMA) down

## deploy-mvp: Deploy MVP (gateway only) after tests
deploy-mvp: test docker-build
	@echo "🚀 Deploying MVP (gateway only)..."
	$(MAKE) docker-down
	$(MAKE) docker-up
	@echo "Waiting for health check..."
	@sleep 15
	@curl -f http://localhost:3000/health/liveness || ($(COMPOSE) -f $(COMPOSE_BASE) logs gateway && exit 1)
	@echo "✅ MVP deployment successful"

## deploy-staging: Deploy to staging (gateway + monitoring)
deploy-staging: test docker-build
	@echo "🚀 Deploying to staging..."
	$(MAKE) docker-down
	$(MAKE) docker-up-monitoring
	@echo "Waiting for health check..."
	@sleep 15
	@curl -f http://localhost:3000/health/liveness || ($(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_MONITORING) logs gateway && exit 1)
	@echo "✅ Staging deployment successful"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3001"

## deploy-production: Deploy to production (full stack) after security tests
deploy-production: test-security docker-build
	@echo "⚠️  Deploying to PRODUCTION (full stack)..."
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	$(MAKE) docker-down
	$(MAKE) docker-up-full
	@echo "Waiting for health check..."
	@sleep 15
	@curl -f http://localhost:3000/health/liveness || ($(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) logs gateway && exit 1)
	@echo "✅ Production deployment successful"
	@echo "🚀 Gateway: http://localhost:3000"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3001"

## clean: Remove build artifacts
clean:
	rm -rf dist node_modules coverage

## audit: Run security audit
audit:
	npm audit --audit-level=moderate

## metrics: Open Prometheus in browser
metrics:
	@echo "Opening Prometheus..."
	@command -v xdg-open >/dev/null && xdg-open http://localhost:9090 || open http://localhost:9090 || start http://localhost:9090

## dashboard: Open Grafana in browser
dashboard:
	@echo "Opening Grafana..."
	@command -v xdg-open >/dev/null && xdg-open http://localhost:3001 || open http://localhost:3001 || start http://localhost:3001

## health: Check gateway health
health:
	@curl -s http://localhost:3000/health/liveness | jq '.'

## dev: Start full development environment (alias for docker-up-dev-full)
dev: docker-up-dev-full
	@echo "Development environment started"
	@echo "🚀 Gateway: http://localhost:3000 (hot reload)"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3001"
	@echo "💾 Redis: localhost:6379"