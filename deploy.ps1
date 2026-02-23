[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AppDir,

    [Parameter(Mandatory = $true)]
    [string]$CommitSha,

    [string]$Branch = "master",
    [string]$NodeExePath = "",
    [string]$PidFileName = ".hanako-console.pid",
    [string]$WindowTitle = "Hanako Bot",
    [switch]$SkipDeployCommands,
    [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-Host "[deploy] $Message"
}

function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Label was not found: $Path"
    }
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & git -C $AppDir @Args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Get-PidFilePath {
    return Join-Path $AppDir $PidFileName
}

function Read-HanakoPid {
    $pidFilePath = Get-PidFilePath
    if (-not (Test-Path -LiteralPath $pidFilePath)) {
        return $null
    }

    $raw = (Get-Content -LiteralPath $pidFilePath -Raw -ErrorAction SilentlyContinue).Trim()
    if ([string]::IsNullOrWhiteSpace($raw)) {
        Remove-Item -LiteralPath $pidFilePath -Force -ErrorAction SilentlyContinue
        return $null
    }

    $pidRef = 0
    if (-not [int]::TryParse($raw, [ref]$pidRef)) {
        Write-Warning "Invalid PID file content. Removing: $pidFilePath"
        Remove-Item -LiteralPath $pidFilePath -Force -ErrorAction SilentlyContinue
        return $null
    }

    return [int]$pidRef
}

function Stop-HanakoConsole {
    $pidFilePath = Get-PidFilePath
    $hanakoPid = Read-HanakoPid

    if (-not $hanakoPid) {
        Write-Step "No running Hanako PID was found."
        return
    }

    $proc = Get-Process -Id $hanakoPid -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Step "Stale PID file detected. Removing: $pidFilePath"
        Remove-Item -LiteralPath $pidFilePath -Force -ErrorAction SilentlyContinue
        return
    }

    Write-Step "Stopping Hanako process tree (PID: $hanakoPid)."
    & taskkill /PID $hanakoPid /T /F | Out-Null
    if (($LASTEXITCODE -ne 0) -and ($LASTEXITCODE -ne 128)) {
        throw "taskkill failed with exit code $LASTEXITCODE."
    }

    Start-Sleep -Seconds 2
    Remove-Item -LiteralPath $pidFilePath -Force -ErrorAction SilentlyContinue
}

function Start-HanakoConsole {
    $pidFilePath = Get-PidFilePath

    if (-not (Test-Path -LiteralPath (Join-Path $AppDir "log"))) {
        New-Item -Path (Join-Path $AppDir "log") -ItemType Directory -Force | Out-Null
    }

    $cmdLine = "title $WindowTitle && cd /d `"$AppDir`" && `"$NodeExePath`" index.js"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $cmdLine -WorkingDirectory $AppDir -PassThru

    if (-not $proc) {
        throw "Failed to start Hanako console process."
    }

    Set-Content -Path $pidFilePath -Value $proc.Id -Encoding ASCII
    Write-Step "Started Hanako console. PID: $($proc.Id)"

    return $proc.Id
}

function Assert-AppStarted {
    param(
        [Parameter(Mandatory = $true)]
        [datetime]$StartedAfter,

        [int]$TimeoutSec = 90
    )

    $appLog = Join-Path $AppDir "log\\app.log"
    $deadline = (Get-Date).AddSeconds($TimeoutSec)

    Write-Step "Checking startup log and process status."

    while ((Get-Date) -lt $deadline) {
        $hanakoPid = Read-HanakoPid
        if (-not $hanakoPid) {
            throw "PID file disappeared while waiting for startup."
        }

        $proc = Get-Process -Id $hanakoPid -ErrorAction SilentlyContinue
        if (-not $proc) {
            throw "Hanako process exited before startup completed (PID: $hanakoPid)."
        }

        if (Test-Path -LiteralPath $appLog) {
            $item = Get-Item -LiteralPath $appLog
            if ($item.LastWriteTime -ge $StartedAfter) {
                $tail = Get-Content -LiteralPath $appLog -Tail 200 -ErrorAction SilentlyContinue
                if ($tail -match "Logged in as") {
                    Write-Step "Startup log was detected."
                    return
                }
            }
        }

        Start-Sleep -Seconds 3
    }

    throw "Startup log entry 'Logged in as' was not found in $appLog within ${TimeoutSec}s."
}

function Install-RuntimeDependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ContextLabel
    )

    if ($SkipNpmInstall.IsPresent) {
        Write-Step "Skipping npm install in $ContextLabel because -SkipNpmInstall was specified."
        return
    }

    Write-Step "Installing runtime dependencies with npm ci --omit=dev --ignore-scripts=false ($ContextLabel)."
    & $npmCmd "ci" "--omit=dev" "--ignore-scripts=false"
    if ($LASTEXITCODE -ne 0) {
        throw "npm ci --omit=dev --ignore-scripts=false failed in $ContextLabel with exit code $LASTEXITCODE."
    }
}

function Test-OpusLoad {
    & $NodeExePath "-e" "try { require('@discordjs/opus'); process.exit(0); } catch (e) { process.exit(1); }"
    return ($LASTEXITCODE -eq 0)
}

function Write-OpusDiagnostics {
    $nodeAbi = (& $NodeExePath "-p" "process.versions.modules" | Out-String).Trim()
    $nodeNapi = (& $NodeExePath "-p" "process.versions.napi" | Out-String).Trim()
    Write-Warning "Node ABI=$nodeAbi N-API=$nodeNapi"

    $ignoreScripts = (& $npmCmd "config" "get" "ignore-scripts" | Out-String).Trim()
    Write-Warning "npm config ignore-scripts=$ignoreScripts"

    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    $clCmd = Get-Command cl.exe -ErrorAction SilentlyContinue
    Write-Warning "python available=$([bool]$pythonCmd) cl.exe available=$([bool]$clCmd)"

    $expectedBinary = (& $NodeExePath "-e" "const { resolve } = require('node:path'); const { find } = require('@discordjs/node-pre-gyp'); process.stdout.write(find(resolve(process.cwd(),'node_modules','@discordjs','opus','package.json')));" 2>$null | Out-String).Trim()
    if (-not [string]::IsNullOrWhiteSpace($expectedBinary)) {
        Write-Warning "Expected @discordjs/opus binary path: $expectedBinary"
        if (-not (Test-Path -LiteralPath $expectedBinary)) {
            Write-Warning "The expected binary path does not exist."
        }
    }

    $prebuildDir = Join-Path $AppDir "node_modules\\@discordjs\\opus\\prebuild"
    if (Test-Path -LiteralPath $prebuildDir) {
        Write-Step "Listing @discordjs/opus prebuild files for diagnostics."
        Get-ChildItem -LiteralPath $prebuildDir -Recurse -File | Select-Object FullName
    }
    else {
        Write-Warning "@discordjs/opus prebuild directory does not exist: $prebuildDir"
    }
}

function Assert-NativeDependencies {
    Write-Step "Validating native runtime dependencies."
    if (Test-OpusLoad) {
        return
    }

    Write-Warning "@discordjs/opus failed to load after npm ci. Running explicit rebuild for diagnosis."
    & $npmCmd "rebuild" "@discordjs/opus" "--build-from-source" "--foreground-scripts" "--verbose"
    $rebuildExitCode = $LASTEXITCODE
    if ($rebuildExitCode -ne 0) {
        Write-OpusDiagnostics
        throw "@discordjs/opus rebuild failed with exit code $rebuildExitCode. Build prerequisites (Python/Visual C++ Build Tools) may be missing for this Node runtime."
    }

    if (-not (Test-OpusLoad)) {
        Write-OpusDiagnostics
        throw "@discordjs/opus is installed but opus.node is still missing after rebuild."
    }
}

Assert-PathExists -Path $AppDir -Label "AppDir"
$AppDir = (Resolve-Path -LiteralPath $AppDir).Path

if ([string]::IsNullOrWhiteSpace($NodeExePath)) {
    throw "NodeExePath is required."
}
Assert-PathExists -Path $NodeExePath -Label "Node executable"

$nodeDir = Split-Path -Path $NodeExePath -Parent
$npmCmd = Join-Path -Path $nodeDir -ChildPath "npm.cmd"
Assert-PathExists -Path $npmCmd -Label "npm.cmd"

$targetCommit = $CommitSha.Trim()
if ([string]::IsNullOrWhiteSpace($targetCommit)) {
    throw "CommitSha is required."
}

$trackedChanges = & git -C $AppDir status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0) {
    throw "git status failed with exit code $LASTEXITCODE."
}
if (-not [string]::IsNullOrWhiteSpace((($trackedChanges | Out-String).Trim()))) {
    throw "Tracked local changes were found in $AppDir. Commit or discard them before deploy."
}

$previousCommit = (& git -C $AppDir rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "git rev-parse HEAD failed with exit code $LASTEXITCODE."
}

Write-Step "Current commit: $previousCommit"
Write-Step "Target commit: $targetCommit"

try {
    Stop-HanakoConsole

    Write-Step "Fetching origin/$Branch."
    Invoke-Git @("fetch", "--prune", "origin", $Branch)
    Invoke-Git @("cat-file", "-e", "$targetCommit^{commit}")
    Invoke-Git @("checkout", "-B", $Branch, "origin/$Branch")
    Invoke-Git @("reset", "--hard", $targetCommit)

    Push-Location $AppDir
    try {
        Install-RuntimeDependencies -ContextLabel "deploy"
        Assert-NativeDependencies

        if (-not $SkipDeployCommands.IsPresent) {
            Write-Step "Running deploy-commands.js."
            & $NodeExePath "deploy-commands.js"
            if ($LASTEXITCODE -ne 0) {
                throw "deploy-commands.js failed with exit code $LASTEXITCODE."
            }
        }
        else {
            Write-Step "Skipping deploy-commands.js."
        }
    }
    finally {
        Pop-Location
    }

    $startedAt = Get-Date
    Start-HanakoConsole | Out-Null
    Assert-AppStarted -StartedAfter $startedAt

    Write-Step "Deploy completed successfully."
}
catch {
    $deployError = $_
    Write-Warning "Deploy failed: $($deployError.Exception.Message)"
    Write-Warning "Attempting rollback to $previousCommit."

    try {
        Stop-HanakoConsole
    }
    catch {
        Write-Warning "Process stop during rollback failed: $($_.Exception.Message)"
    }

    try {
        Invoke-Git @("reset", "--hard", $previousCommit)

        Push-Location $AppDir
        try {
            Install-RuntimeDependencies -ContextLabel "rollback"
            Assert-NativeDependencies
        }
        finally {
            Pop-Location
        }

        $rollbackStartedAt = Get-Date
        Start-HanakoConsole | Out-Null
        Assert-AppStarted -StartedAfter $rollbackStartedAt
        Write-Warning "Rollback completed."
    }
    catch {
        Write-Error "Rollback failed: $($_.Exception.Message)"
    }

    throw $deployError
}
