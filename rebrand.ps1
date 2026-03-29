# Rebrand script: Prism -> Verkspay

$extensions = @("*.tsx", "*.ts", "*.json", "*.md")
$excludePaths = @("node_modules", ".next", "dist")

Get-ChildItem -Path "C:\Users\Kevin Ong\.openclaw\workspace\prism" -Recurse -Include $extensions | Where-Object {
    $path = $_.FullName
    -not ($excludePaths | Where-Object { $path -match $_ })
} | ForEach-Object {
    $file = $_
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $original = $content
        
        # Global replacements
        $content = $content -replace 'Prism(?!JS)', 'Verkspay'
        $content = $content -replace 'prismops', 'verkspay'
        $content = $content -replace 'app\.prismops\.xyz', 'app.verkspay.com'
        $content = $content -replace 'support@prismops\.xyz', 'support@verkspay.com'
        
        if ($original -ne $content) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "Updated: $($file.Name)"
        }
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "Done"
