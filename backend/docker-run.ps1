# Build and run MCPPro Backend Docker container

Write-Host "Building MCPPro Backend Docker image..." -ForegroundColor Yellow
docker build -t mcppro-backend:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker image built successfully!" -ForegroundColor Green
    
    Write-Host "🚀 Starting MCPPro Backend container..." -ForegroundColor Yellow
    docker run -d `
        --name mcppro-api `
        -p 8000:8000 `
        -v "${PWD}/results:/app/results" `
        -v "${PWD}/vector_store_cache:/app/vector_store_cache" `
        mcppro-backend:latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Container started successfully!" -ForegroundColor Green
        Write-Host "🌐 API is available at: http://localhost:8000" -ForegroundColor Cyan
        Write-Host "📊 Health check: http://localhost:8000/health" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To view logs: docker logs mcppro-api" -ForegroundColor Gray
        Write-Host "To stop: docker stop mcppro-api" -ForegroundColor Gray
        Write-Host "To remove: docker rm mcppro-api" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to start container" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Failed to build Docker image" -ForegroundColor Red
    exit 1
}
