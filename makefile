.PHONY: all build clean run test vet fmt  frontend deps help db-init db-reset db-import

# Default target
all: vet build

# Build the application
build:
	go build -o bin/server .

# Clean build artifacts
clean:
	rm -rf bin/
	go clean

# Run the application
run: build
	./bin/server

# Run tests
test:
	go test -v ./...

# Run go vet
vet:
	go vet ./...

# Format code
fmt:
	go fmt ./...


# Install dependencies
deps:
	go mod tidy

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
	@echo "  db-init   - Initialize database schema"
	@echo "  db-reset  - Reset all challenges to unused state"
	@echo "  db-import - Import challenges from JSON file"
	@echo "  dev       - Run with hot reload using Air"
	@echo "  help      - Show this help message"