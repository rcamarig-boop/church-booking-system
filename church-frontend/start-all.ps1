# PowerShell script to open backend and frontend in new windows
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Start-Process powershell -ArgumentList "-NoExit -Command cd '$scriptDir\..\church-backend'; echo 'Starting backend...'; node server.js"
Start-Process powershell -ArgumentList "-NoExit -Command cd '$scriptDir'; echo 'Starting frontend...'; npm start"
