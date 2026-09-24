param(
  [string]$Executable = "src-tauri/target/release/desktop-manager.exe",
  [int]$WarmupSeconds = 8,
  [int]$SampleSeconds = 30
)

$ErrorActionPreference = "Stop"
$resolved = Resolve-Path $Executable
$timer = [System.Diagnostics.Stopwatch]::StartNew()
$process = Start-Process $resolved -PassThru
try {
  if (-not $process.WaitForInputIdle(15000)) {
    throw "Application did not become input-ready within 15 seconds."
  }
  $startupMs = $timer.Elapsed.TotalMilliseconds
  Start-Sleep -Seconds $WarmupSeconds

  function Get-ProcessTree([int]$RootId) {
    $ids = [System.Collections.Generic.List[int]]::new()
    $ids.Add($RootId)
    for ($index = 0; $index -lt $ids.Count; $index++) {
      Get-CimInstance Win32_Process -Filter "ParentProcessId=$($ids[$index])" | ForEach-Object { $ids.Add([int]$_.ProcessId) }
    }
    return Get-Process -Id $ids -ErrorAction SilentlyContinue
  }

  $before = Get-ProcessTree $process.Id
  $cpuBefore = ($before | Measure-Object CPU -Sum).Sum
  Start-Sleep -Seconds $SampleSeconds
  $after = Get-ProcessTree $process.Id
  $cpuAfter = ($after | Measure-Object CPU -Sum).Sum
  $memoryMb = [math]::Round((($after | Measure-Object WorkingSet64 -Sum).Sum / 1MB), 2)
  $cpuPercent = [math]::Round((($cpuAfter - $cpuBefore) / $SampleSeconds / [Environment]::ProcessorCount * 100), 2)

  $result = [ordered]@{
    startupMs = [math]::Round($startupMs, 2)
    idleCpuPercent = $cpuPercent
    processTreeMemoryMb = $memoryMb
    sampleSeconds = $SampleSeconds
  }
  $result | ConvertTo-Json

  if ($startupMs -gt 1500) { Write-Warning "Startup exceeded the 1.5 second target." }
  if ($cpuPercent -gt 1) { Write-Warning "Idle CPU exceeded the 1 percent target." }
  if ($memoryMb -gt 100) { Write-Warning "Process tree memory exceeded the 100 MB target." }
} finally {
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
