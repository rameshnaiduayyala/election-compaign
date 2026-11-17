Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Rounded rectangle background
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.ColorTranslator]::FromHtml('#1e40af')), ([System.Drawing.ColorTranslator]::FromHtml('#2563eb')), 45.0
    $g.FillRectangle($brush, $rect)

    # Inner circular badge
    $pad = [int]($size * 0.1)
    $innerSize = $size - (2 * $pad)
    $badgeRect = New-Object System.Drawing.Rectangle $pad, $pad, $innerSize, $innerSize
    $badgeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#0f172a'))
    $g.FillEllipse($badgeBrush, $badgeRect)
    
    $badgePen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#38bdf8')), ([float]($size * 0.025))
    $g.DrawEllipse($badgePen, $badgeRect)

    # Big Bold Letter 'E' in center
    $fontSize = [float]($size * 0.38)
    $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $g.DrawString("E", $font, $textBrush, [System.Drawing.RectangleF]::new(0, 0, [float]$size, [float]($size * 0.88)), $format)

    # Sub-badge 'WARD 2'
    $subFontSize = [float]($size * 0.09)
    $subFont = [System.Drawing.Font]::new("Arial", $subFontSize, [System.Drawing.FontStyle]::Bold)
    $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#facc15'))
    $g.DrawString("WARD 2", $subFont, $subBrush, [System.Drawing.RectangleF]::new(0, [float]($size * 0.68), [float]$size, [float]($size * 0.2)), $format)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $font.Dispose()
    $subFont.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully generated: $path"
}

Generate-Icon 192 'public/pwa-192x192.png'
Generate-Icon 512 'public/pwa-512x512.png'
Generate-Icon 180 'public/apple-touch-icon.png'
