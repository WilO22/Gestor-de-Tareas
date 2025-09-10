# check_server.ps1 - run checks to verify dev server connectivity
Write-Output "1) HTTP request to /dashboard-islands"
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:4310/dashboard-islands' -UseBasicParsing -TimeoutSec 10
    Write-Output ("STATUS: " + $r.StatusCode)
    $content = $r.Content
    if ($content) {
        if ($content.Length -gt 4000) {
            Write-Output $content.Substring(0,4000)
            Write-Output '---TRUNCATED---'
        } else {
            Write-Output $content
        }
    }
} catch {
    Write-Output ("ERROR: " + $_.Exception.Message)
}

Write-Output "`n2) Test-NetConnection to localhost:4310"
try {
    $t = Test-NetConnection -ComputerName 'localhost' -Port 4310 -InformationLevel Detailed
    $t | Format-List
} catch {
    Write-Output ("TNC ERROR: " + $_.Exception.Message)
}

Write-Output "`n3) netstat listeners (port 4310)"
try {
    netstat -ano | Select-String ':4310' | ForEach-Object { $_.ToString() }
} catch {
    Write-Output ("NETSTAT ERROR: " + $_.Exception.Message)
}

Write-Output "`n4) dev-related processes (pnpm/astro/node/esbuild)"
try {
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match 'pnpm|astro|node_modules|esbuild') } | Select-Object ProcessId,Name,CommandLine | Format-Table -AutoSize -Wrap
} catch {
    Write-Output ("PROC ERROR: " + $_.Exception.Message)
}
