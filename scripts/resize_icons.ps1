Add-Type -AssemblyName System.Drawing

function Resize-Image([string]$source, [string]$dest, [int]$size) {
    $srcPath = Resolve-Path $source
    $destPath = Join-Path (Get-Location) $dest
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
    Write-Host "Generated $dest ($size x $size)"
}

Resize-Image 'public/Ajay-round.png' 'public/pwa-192x192.png' 192
Resize-Image 'public/Ajay-round.png' 'public/pwa-512x512.png' 512
Resize-Image 'public/Ajay-round.png' 'public/apple-touch-icon.png' 180
