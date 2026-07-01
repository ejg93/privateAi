$root = $PSScriptRoot
$limbus = Join-Path $root "limbus-workspace"
$story  = Join-Path $root "story-workspace"

# Windows Terminal이 있으면 탭 2개로 열기
if (Get-Command wt -ErrorAction SilentlyContinue) {
    Start-Process wt -ArgumentList "new-tab --title limbus-workspace --suppressApplicationTitle --startingDirectory `"$limbus`" -- powershell -NoExit -Command claude"
    Start-Sleep -Milliseconds 2000
    Start-Process wt -ArgumentList "--window 0 new-tab --title story-workspace --suppressApplicationTitle --startingDirectory `"$story`" -- powershell -NoExit -Command claude"
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$limbus'; claude"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$story'; claude"
}
