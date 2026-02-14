$baseDir = "e:\Github\BE-AlexKim.github.io"
$imagesDir = "$baseDir\assets\images\work"
$artworksDir = "$baseDir\_artworks"

if (-not (Test-Path $artworksDir)) {
    New-Item -ItemType Directory -Path $artworksDir
}

$artists = Get-ChildItem -Path $imagesDir -Directory

foreach ($artistFolder in $artists) {
    $artistName = $artistFolder.Name
    $artistSlug = $artistName.ToLower().Replace(" ", "-")
    
    $images = Get-ChildItem -Path $artistFolder.FullName -File | Where-Object { $_.Name -notmatch "profile" }
    
    $count = 1
    foreach ($img in $images) {
        $artworkSlug = "$artistSlug-work-$count"
        $targetFile = "$artworksDir\$artworkSlug.md"
        
        # Skip if already exists or customize logic
        if (-not (Test-Path $targetFile)) {
            $content = @"
---
layout: artwork
title: "$artistName - Work $count"
artist: "$artistName"
medium: "Contemporary Art"
dimensions: "Various"
year: "2024"
image: /assets/images/work/$artistName/$($img.Name)
status: "available"
price: "Contact for price"
description: "A compelling contemporary piece by $artistName, exploring themes of threshold and liminality."
---
"@
            Set-Content -Path $targetFile -Value $content -Encoding UTF8
        }
        $count++
    }
}
