$ErrorActionPreference = 'Stop'
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:4324/dashboard-islands' -UseBasicParsing
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
