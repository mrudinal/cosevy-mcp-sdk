param(
    [string]$OutputZip = "cosevi-mcp-sdks-source.zip"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not [System.IO.Path]::GetExtension($OutputZip)) {
    $OutputZip = "$OutputZip.zip"
}

$outputPath = Join-Path $root $OutputZip

if (Test-Path $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}

$excludeDirNames = @(".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache")
$excludeExtensions = @(".pyc", ".pyo", ".pyd")

$files = Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $fullName = $_.FullName
    $relativePath = $fullName.Substring($root.Length).TrimStart('\')
    $segments = $relativePath -split '[\\/]'

    foreach ($segment in $segments) {
        if ($excludeDirNames -contains $segment) {
            return $false
        }
    }

    if ($excludeExtensions -contains $_.Extension) {
        return $false
    }

    return $true
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($outputPath, [System.IO.Compression.ZipArchiveMode]::Create)

try {
    foreach ($file in $files) {
        $entryName = $file.FullName.Substring($root.Length).TrimStart('\') -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

Write-Host "Created $outputPath"
