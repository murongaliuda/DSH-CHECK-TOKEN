<#
.SYNOPSIS
  Install DSH-check-token into a DSH web profile: create the node_modules
  link, register the file: dependency, and append the cordis.patch.yml entry.

.DESCRIPTION
  Idempotent: safe to run repeatedly; completed steps are skipped. Run the
  script from inside the plugin package directory (same folder as package.json).

.PARAMETER ProfileDir
  DSH web profile directory. Defaults to $env:DSH_HOME/profiles/web
  ($env:USERPROFILE/.dsh/profiles/web when DSH_HOME is unset).

.PARAMETER SkipLink
  Skip the node_modules link step.

.PARAMETER SkipPackageJson
  Skip the profile package.json dependency registration step.

.PARAMETER SkipPatch
  Skip the cordis.patch.yml entry step.

.EXAMPLE
  .\install.ps1

.EXAMPLE
  .\install.ps1 -ProfileDir "D:\dsh\profiles\web" -SkipPatch
#>
[CmdletBinding()]
param(
	[string]$ProfileDir = "",
	[switch]$SkipLink,
	[switch]$SkipPackageJson,
	[switch]$SkipPatch
)

$ErrorActionPreference = "Stop"
$pluginDir = $PSScriptRoot
$pluginName = "DSH-check-token"

# --- 0. Locate the profile directory ---
if (-not $ProfileDir) {
	$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" }
	$ProfileDir = Join-Path $dshHome "profiles\web"
}
if (-not (Test-Path $ProfileDir)) {
	throw "profile directory not found: $ProfileDir"
}
if (-not (Test-Path (Join-Path $pluginDir "package.json"))) {
	throw "this folder is not the plugin package (package.json missing): $pluginDir"
}

Write-Host "== DSH-check-token install =="
Write-Host ("plugin dir : {0}" -f $pluginDir)
Write-Host ("profile    : {0}" -f $ProfileDir)

# --- 1. node_modules link (bare-name resolution) ---
if (-not $SkipLink) {
	$nm = Join-Path $ProfileDir "node_modules"
	$link = Join-Path $nm $pluginName
	if (Test-Path $link) {
		$item = Get-Item $link -Force
		if ($item.LinkType) {
			$target = [string]$item.Target
			if ($target.TrimEnd('\') -eq $pluginDir.TrimEnd('\')) {
				Write-Host "[link] already present and pointing at the plugin dir, skip"
			} else {
				Remove-Item $link -Force
				New-Item -ItemType Junction -Path $link -Target $pluginDir | Out-Null
				Write-Host "[link] rebuilt junction -> $pluginDir"
			}
		} else {
			Write-Warning "node_modules\$pluginName exists but is not a link (manual copy?), leaving it alone"
		}
	} else {
		if (-not (Test-Path $nm)) {
			New-Item -ItemType Directory -Path $nm -Force | Out-Null
		}
		try {
			New-Item -ItemType Junction -Path $link -Target $pluginDir | Out-Null
			Write-Host "[link] junction created: $link"
		} catch {
			# Junction failed (permissions/filesystem) -> fall back to a real copy.
			Write-Warning ("junction failed, falling back to a directory copy: {0}" -f $_.Exception.Message)
			Copy-Item -Path (Join-Path $pluginDir "*") -Destination $link -Recurse -Force
			Write-Host "[link] copied to: $link"
		}
	}
}

# --- 2. Register the file: dependency in the profile package.json ---
if (-not $SkipPackageJson) {
	$pkgPath = Join-Path $ProfileDir "package.json"
	$content = Get-Content $pkgPath -Raw -Encoding utf8
	$dep = "`"$pluginName`": `"file:plugins/$pluginName`""
	if ($content -match [regex]::Escape($pluginName)) {
		Write-Host "[pkg] dependency already registered, skip"
	} else {
		if ($content -match '"dependencies"\s*:\s*\{\s*\}') {
			$content = $content -replace '"dependencies"\s*:\s*\{\s*\}', ("`"dependencies`": {`n    {0}`n  }}" -f $dep)
		} elseif ($content -match '"dependencies"\s*:\s*\{') {
			$content = $content -replace '"dependencies"\s*:\s*\{', ("`"dependencies`": {`n    {0}," -f $dep)
		} else {
			throw "package.json has no dependencies field; add manually: $dep"
		}
		Set-Content -Path $pkgPath -Value $content -Encoding utf8 -NoNewline
		Write-Host "[pkg] dependency registered: $dep"
	}
}

# --- 3. Append the cordis.patch.yml entry (hot-mounted by watchUserPatches) ---
if (-not $SkipPatch) {
	$patchPath = Join-Path $ProfileDir "cordis.patch.yml"
	$marker = "account-balance"
	$block = @'

# DSH-check-token: floating account-balance widget (written by install.ps1)
- insert:
    - id: account-balance
      name: DSH-check-token
'@
	$content = Get-Content $patchPath -Raw -Encoding utf8
	if ($content -match [regex]::Escape($marker)) {
		Write-Host "[patch] entry already present, skip"
	} else {
		# Detect an empty "[]" list ignoring comment lines.
		$body = (($content -split "`r?`n") | Where-Object { $_ -notmatch '^\s*#' }) -join "`n"
		if ($body.Trim() -eq "[]") {
			$content = $content -replace '\[\]', $block
		} else {
			$content = $content.TrimEnd() + $block + "`n"
		}
		Set-Content -Path $patchPath -Value $content -Encoding utf8 -NoNewline
		Write-Host "[patch] entry written: $patchPath"
	}
}

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1) If dsh web is running: the cordis.patch.yml hot-update mounts the host half automatically; refresh the browser (F5) to see the widget."
Write-Host "  2) If the server is not running: just start dsh web. Later edits to lib/client.js hot-update via client-HMR."
