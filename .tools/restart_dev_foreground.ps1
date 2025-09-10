# restart_dev_foreground.ps1
# Lists candidate dev processes, stops them, then starts pnpm dev in foreground on port 4310.
$filter = 'pnpm dev|pnpm.cjs dev|astro dev|node_modules\\@esbuild|astro.js dev'
Write-Output "Using filter: $filter"
$matches = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match $filter) }
if ($matches) {
    Write-Output "Found the following candidate dev processes:"
    $matches | Select-Object ProcessId,Name,CommandLine | Format-Table -AutoSize
    foreach ($pid in $matches.ProcessId) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Output "Stopped PID $pid"
        } catch {
            Write-Output ('Failed to stop PID {0}: {1}' -f $pid, $_.Exception.Message)
        }
    }
} else {
    Write-Output 'No matching dev processes found.'
}
Write-Output 'Starting dev server: pnpm dev -- --host --port 4310'
pnpm dev -- --host --port 4310
