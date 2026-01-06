$cd = "c:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend"
Set-Location $cd

# Start server in background
Write-Host "Starting server..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow

# Wait for server to start
Write-Host "Waiting for server to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Run tests
Write-Host "Running tests..." -ForegroundColor Green
& node test-admin-dashboard-api.js

# Clean up - stop server
Write-Host "`nStopping server..." -ForegroundColor Yellow
Stop-Process -InputObject $serverProcess -Force -ErrorAction SilentlyContinue

Write-Host "Done!" -ForegroundColor Green
