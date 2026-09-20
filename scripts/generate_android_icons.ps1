Add-Type -AssemblyName System.Drawing

$logoPath = "public\logo.png"
if (-not (Test-Path $logoPath)) {
    Write-Error "Logo not found at $logoPath"
    exit 1
}

$fullLogoPath = (Resolve-Path $logoPath).Path
$srcImage = [System.Drawing.Image]::FromFile($fullLogoPath)

# 1. Launcher Icons
$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 48; ForeSize = 108 },
    @{ Name = "mipmap-hdpi"; Size = 72; ForeSize = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 96; ForeSize = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; ForeSize = 432 }
)

function New-ResizedImage($img, [int]$w, [int]$h, [string]$dest) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    
    if (Test-Path $dest) { Remove-Item -Force $dest }
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-RoundIcon($img, [int]$size, [string]$dest) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($img, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()
    
    if (Test-Path $dest) { Remove-Item -Force $dest }
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-ForegroundIcon($img, [int]$totalSize, [string]$dest) {
    $iconSize = [int]($totalSize * 0.72)
    $offset = [int](($totalSize - $iconSize) / 2)
    
    $bmp = New-Object System.Drawing.Bitmap($totalSize, $totalSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $g.DrawImage($img, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()
    
    if (Test-Path $dest) { Remove-Item -Force $dest }
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-SplashScreen($img, [int]$w, [int]$h, [string]$dest) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    
    $minDim = [Math]::Min($w, $h)
    $logoSize = [int]($minDim * 0.35)
    $offsetX = [int](($w - $logoSize) / 2)
    $offsetY = [int](($h - $logoSize) / 2)
    
    $g.DrawImage($img, $offsetX, $offsetY, $logoSize, $logoSize)
    $g.Dispose()
    
    if (Test-Path $dest) { Remove-Item -Force $dest }
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$resDir = "android\app\src\main\res"

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Name
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
    
    $launcherPath = Join-Path $folder "ic_launcher.png"
    $roundPath = Join-Path $folder "ic_launcher_round.png"
    $forePath = Join-Path $folder "ic_launcher_foreground.png"
    
    New-ResizedImage $srcImage $d.Size $d.Size $launcherPath
    New-RoundIcon $srcImage $d.Size $roundPath
    New-ForegroundIcon $srcImage $d.ForeSize $forePath
    
    Write-Host "Success: Generated icons for $($d.Name)"
}

# 2. Splash Screens
$splashConfigs = @(
    @{ Folder = "drawable"; W = 480; H = 800 },
    @{ Folder = "drawable-port-mdpi"; W = 320; H = 480 },
    @{ Folder = "drawable-port-hdpi"; W = 480; H = 800 },
    @{ Folder = "drawable-port-xhdpi"; W = 720; H = 1280 },
    @{ Folder = "drawable-port-xxhdpi"; W = 960; H = 1600 },
    @{ Folder = "drawable-port-xxxhdpi"; W = 1280; H = 1920 },
    @{ Folder = "drawable-land-mdpi"; W = 480; H = 320 },
    @{ Folder = "drawable-land-hdpi"; W = 800; H = 480 },
    @{ Folder = "drawable-land-xhdpi"; W = 1280; H = 720 },
    @{ Folder = "drawable-land-xxhdpi"; W = 1600; H = 960 },
    @{ Folder = "drawable-land-xxxhdpi"; W = 1920; H = 1280 }
)

foreach ($sc in $splashConfigs) {
    $folder = Join-Path $resDir $sc.Folder
    if (Test-Path $folder) {
        $splashPath = Join-Path $folder "splash.png"
        New-SplashScreen $srcImage $sc.W $sc.H $splashPath
        Write-Host "Success: Generated splash for $($sc.Folder)"
    }
}

$srcImage.Dispose()
Write-Host "All Android launcher icons and splash screens updated successfully with EventPass logo!"
