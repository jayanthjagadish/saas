# bootstrap.ps1 — Bootstrap the portable agentic workflow for a new project (Windows)
#
# Usage:
#   .\.squad\templates\workflow\bootstrap.ps1 -ProjectName "MyProject" -Stack "Node.js + React + PostgreSQL"
#
# Parameters:
#   -ProjectName    e.g. "MyProject"
#   -Stack          e.g. "Node.js + React + PostgreSQL"
#
# Optional parameters:
#   -LeadName       default: "lead"
#   -BackendName    default: "backend"
#   -FrontendName   default: "frontend"
#   -TesterName     default: "tester"
#   -Repo           default: detected from git remote

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,

    [Parameter(Mandatory=$true)]
    [string]$Stack,

    [string]$LeadName     = "lead",
    [string]$BackendName  = "backend",
    [string]$FrontendName = "frontend",
    [string]$TesterName   = "tester",
    [string]$Repo         = ""
)

$ErrorActionPreference = "Stop"

if (-not $Repo) {
    try { $Repo = (git remote get-url origin 2>$null) } catch { $Repo = "{{REPO}}" }
    if (-not $Repo) { $Repo = "{{REPO}}" }
}

$Today        = (Get-Date -Format "yyyy-MM-dd")
$BundleDir    = $PSScriptRoot
$ProjectRoot  = (Get-Location).Path

Write-Host ""
Write-Host "🚀 Bootstrapping agentic workflow for: $ProjectName"
Write-Host "   Stack:    $Stack"
Write-Host "   Repo:     $Repo"
Write-Host "   Agents:   $LeadName (lead) | $BackendName (backend) | $FrontendName (frontend) | $TesterName (tester) | scribe"
Write-Host ""

# ── Helper: substitute placeholders ───────────────────────────────────────
function Substitute-File {
    param([string]$FilePath)
    $content = Get-Content $FilePath -Raw
    $content = $content `
        -replace '\{\{PROJECT_NAME\}\}',    $ProjectName `
        -replace '\{\{STACK\}\}',           $Stack `
        -replace '\{\{REPO\}\}',            $Repo `
        -replace '\{\{LEAD_NAME\}\}',       $LeadName `
        -replace '\{\{BACKEND_NAME\}\}',    $BackendName `
        -replace '\{\{FRONTEND_NAME\}\}',   $FrontendName `
        -replace '\{\{TESTER_NAME\}\}',     $TesterName `
        -replace '\{\{PROJECT_START_DATE\}\}', $Today
    Set-Content $FilePath $content -NoNewline
}

# ── Create .squad directory structure ─────────────────────────────────────
Write-Host "📁 Creating .squad directory structure..."
$dirs = @(
    ".squad\agents\$LeadName",
    ".squad\agents\$BackendName",
    ".squad\agents\$FrontendName",
    ".squad\agents\$TesterName",
    ".squad\agents\scribe",
    ".squad\decisions\inbox",
    ".squad\log",
    ".squad\archive\history"
)
foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Path "$ProjectRoot\$dir" -Force | Out-Null
}

# ── Copy and substitute charters ──────────────────────────────────────────
Write-Host "📋 Installing agent charters..."

$charterMap = @{
    "lead.md"     = ".squad\agents\$LeadName\charter.md"
    "backend.md"  = ".squad\agents\$BackendName\charter.md"
    "frontend.md" = ".squad\agents\$FrontendName\charter.md"
    "tester.md"   = ".squad\agents\$TesterName\charter.md"
    "scribe.md"   = ".squad\agents\scribe\charter.md"
}

foreach ($entry in $charterMap.GetEnumerator()) {
    $src  = "$BundleDir\agent-charters\$($entry.Key)"
    $dest = "$ProjectRoot\$($entry.Value)"
    Copy-Item $src $dest -Force
    Substitute-File $dest
}

# ── Initialize history files ───────────────────────────────────────────────
Write-Host "📝 Initializing history files..."
$agents = @($LeadName, $BackendName, $FrontendName, $TesterName, "scribe")
foreach ($agent in $agents) {
    $histFile = "$ProjectRoot\.squad\agents\$agent\history.md"
    if (-not (Test-Path $histFile)) {
        @"
# $agent History

## Project Context

**Project:** $ProjectName
**Stack:** $Stack
**Started:** $Today

## Learnings

*(Scribe appends learnings here after each session.)*
"@ | Set-Content $histFile
    }
}

# ── Copy and substitute decisions-seed.md ─────────────────────────────────
Write-Host "📌 Installing decisions.md..."
$decisionsFile = "$ProjectRoot\.squad\decisions.md"
if (-not (Test-Path $decisionsFile)) {
    Copy-Item "$BundleDir\decisions-seed.md" $decisionsFile -Force
    Substitute-File $decisionsFile
} else {
    Write-Host "   ⚠️  .squad\decisions.md already exists — skipping (not overwritten)"
}

# ── Copy API contract template ─────────────────────────────────────────────
Write-Host "📄 Installing API contract template..."
$contractFile = "$ProjectRoot\API_CONTRACT.md"
if (-not (Test-Path $contractFile)) {
    Copy-Item "$BundleDir\API_CONTRACT_template.md" $contractFile -Force
    Substitute-File $contractFile
    Write-Host "   ✅ API_CONTRACT.md created at project root — fill this in before any feature work starts"
} else {
    Write-Host "   ⚠️  API_CONTRACT.md already exists — skipping (not overwritten)"
}

# ── Initialize team.md ────────────────────────────────────────────────────
Write-Host "👥 Initializing team roster..."
@"
# Team Roster — $ProjectName

| Agent | Role | Charter |
|---|---|---|
| $LeadName | Engineering Lead | .squad\agents\$LeadName\charter.md |
| $BackendName | Backend Engineer | .squad\agents\$BackendName\charter.md |
| $FrontendName | Frontend Engineer | .squad\agents\$FrontendName\charter.md |
| $TesterName | Automation Engineer | .squad\agents\$TesterName\charter.md |
| scribe | Knowledge & Compliance Officer | .squad\agents\scribe\charter.md |

*Maintained by Scribe. Update when roles change.*
"@ | Set-Content "$ProjectRoot\.squad\team.md"

# ── Initialize routing.md ─────────────────────────────────────────────────
@"
# Agent Routing — $ProjectName

## Who to involve for what

| Concern | Primary Agent | Reviewer |
|---|---|---|
| API contract changes | $BackendName | $LeadName |
| Frontend UI / components | $FrontendName | $LeadName |
| Test suite / automation | $TesterName | $LeadName |
| Schema / migrations | $BackendName | $LeadName |
| Architecture decisions | $LeadName | — |
| Security review | $LeadName | — |
| Decisions / history | scribe | $LeadName |
| Handoff files | $FrontendName → $TesterName | — |

*Maintained by Scribe. Update when responsibilities change.*
"@ | Set-Content "$ProjectRoot\.squad\routing.md"

# ── Done ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✅ Workflow bootstrapped for $ProjectName ($Stack)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Fill in the Tools & Stack sections in each agent charter"
Write-Host "  2. Have $BackendName fill in API_CONTRACT.md before any feature work"
Write-Host "  3. Review .squad\decisions.md and update PROJECT_START_DATE entries if needed"
Write-Host "  4. Start your first feature — the pipeline runs itself from here"
Write-Host ""
