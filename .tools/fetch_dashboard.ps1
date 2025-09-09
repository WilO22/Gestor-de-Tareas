try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4310/dashboard-islands' -UseBasicParsing -TimeoutSec 10
    Write-Output "STATUS: $($r.StatusCode)"
    Write-Output "CONTENT-LEN: $($r.Content.Length)"
    $preview = $r.Content.Substring(0,[math]::Min(2048,$r.Content.Length))
    Write-Output '---HTML-PREVIEW-START---'
    Write-Output $preview
    Write-Output '---HTML-PREVIEW-END---'
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
