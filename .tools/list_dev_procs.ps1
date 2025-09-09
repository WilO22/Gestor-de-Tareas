# List processes whose command line likely indicates a dev server for this workspace
$keywords = @('pnpm','node','astro','vite','Gestor-de-Tareas-Mock','GestorProyectosClone')
Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -and ($keywords | ForEach-Object { $_ -and ($_.Length -gt 0) } ) } |
    Where-Object { $keywords | ForEach-Object { if ($_.Length -gt 0) { if ($_.ToLower() -inotlike '*') { } } } }
# Fallback simple listing if above filtering fails
Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | Where-Object { $_.CommandLine -and ($_.CommandLine -match 'pnpm|node|astro|vite|Gestor-de-Tareas-Mock|GestorProyectosClone') } | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Depth 3
