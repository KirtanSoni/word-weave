.PHONY: all build clean run test vet fmt deps help fbuild

# Default target
all: deps fbuild vet build 

# Build the application
build:
	go build -o bin/words-weave .

# Clean build artifacts
clean:
	rm -rf internal/frontend/reactbuild/*
	rm -rf bin/*
	go clean

# Run the application
run: build
	./bin/words-weave

# Run tests
test:
	go test -v ./...

# Run go vet
vet:
	go vet ./...

# Format code
fmt:
	go fmt ./...

fbuild:
	cd words-weave && npm run build

# Install dependencies
deps:
	go mod tidy
	cd words-weave && npm ci
	

# Show help
help:
	@echo "Available targets:"
	@echo "  all       - Format, vet, lint, and build the application (default)"
	@echo "  build     - Build the application"
	@echo "  clean     - Remove build artifacts"
	@echo "  run       - Build and run the application"
	@echo "  test      - Run tests"
	@echo "  vet       - Run go vet"
	@echo "  fmt       - Format code using go fmt"
	@echo "  lint      - Run golangci-lint"
	@echo "  frontend  - Build frontend assets"
	@echo "  deps      - Install dependencies"
	@echo "  dev       - Run with hot reload using Air"
	@echo "  help      - Show this help message"