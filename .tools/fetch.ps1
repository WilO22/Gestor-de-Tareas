param([int]$Port = 4324)
$ErrorActionPreference = 'Stop'
try {
  $url = "http://localhost:$Port/dashboard-islands"
  Write-Output "Fetching $url"
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
  Write-Output "STATUS: $($r.StatusCode) $($r.StatusDescription)"
  Write-Output "LENGTH: $($r.Content.Length)"
  $preview = $r.Content
  if ($preview.Length -gt 400) { $preview = $preview.Substring(0,400) }
  Write-Output "PREVIEW_START"
  Write-Output $preview
  Write-Output "PREVIEW_END"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  exit 1
}
