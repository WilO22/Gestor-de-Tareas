# clean_restart_dev.ps1
# Stop dev-related processes (astro/pnpm/esbuild) and start pnpm dev in foreground bound to 127.0.0.1:4310
$filter = 'pnpm.cjs dev|pnpm dev|\\bastro dev\\b|astro.js dev|node_modules\\@esbuild'
Write-Output "Filter used: $filter"
$matches = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match $filter) }
if ($matches) {
    Write-Output "Found candidate processes to stop:"
    $matches | Select-Object ProcessId,Name,CommandLine | Format-Table -AutoSize -Wrap
    foreach ($p in $matches) {
        $procId = $p.ProcessId
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Output ("Stopped PID {0} ({1})" -f $procId, $p.Name)
        } catch {
            Write-Output ("Failed to stop PID {0}: {1}" -f $procId, $_.Exception.Message)
        }
    }
} else {
    Write-Output "No matching dev processes found to stop."
}

Write-Output "Starting dev server in foreground bound to 127.0.0.1:4310"
# Start pnpm dev in foreground (this will block the terminal; interrupt with Ctrl+C when you want to stop)
pnpm dev -- --host 127.0.0.1 --port 4310
