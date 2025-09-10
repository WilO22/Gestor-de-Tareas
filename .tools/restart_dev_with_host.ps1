param()
$ErrorActionPreference = 'Stop'
$pid = 14644
try {
  $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($p) {
    Write-Output "Killing process $pid"
    $p.Kill()
    Start-Sleep -Milliseconds 500
  } else {
    Write-Output "Process $pid not found"
  }
} catch {
  Write-Output "Error killing process: $($_.Exception.Message)"
}
Write-Output "Starting dev server with --host"
Start-Process -NoNewWindow -FilePath pnpm -ArgumentList 'dev','--','--host' -WorkingDirectory (Get-Location)
