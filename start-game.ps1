$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes"
$node = Get-ChildItem -Path $runtimeRoot -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $node) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $node) {
  Write-Error "找不到 Node.js。請先安裝 Node.js，再重新執行。"
  exit 1
}
Start-Process -FilePath $node -ArgumentList "server.mjs" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
Start-Sleep -Milliseconds 700
Start-Process "http://127.0.0.1:4173"
