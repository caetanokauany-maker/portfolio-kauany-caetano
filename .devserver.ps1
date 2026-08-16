$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8532
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".ico"  = "image/x-icon"
  ".json" = "application/json"
  ".pdf"  = "application/pdf"
  ".webp" = "image/webp"
  ".mp4"  = "video/mp4"
  ".mov"  = "video/quicktime"
  ".webm" = "video/webm"
  ".docx" = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

$handlerScript = @'
param($context, $root, $mime)
$req = $context.Request
$res = $context.Response
try {
  $path = $req.Url.LocalPath
  if ($path -eq "/") { $path = "/index.html" }
  $filePath = Join-Path $root ($path.TrimStart("/"))
  $filePath = [System.IO.Path]::GetFullPath($filePath)
  if (-not $filePath.StartsWith($root)) {
    $res.StatusCode = 403
    return
  }
  if ([System.IO.File]::Exists($filePath)) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }
    $res.ContentType = $contentType
    $res.Headers.Add("Accept-Ranges", "bytes")
    $fs = [System.IO.File]::OpenRead($filePath)
    try {
      $totalLength = $fs.Length
      $start = [int64]0
      $end = $totalLength - 1
      $rangeHeader = $req.Headers["Range"]
      if ($rangeHeader -and $rangeHeader.StartsWith("bytes=")) {
        $parts = $rangeHeader.Substring(6).Split("-")
        if ($parts[0] -ne "") { $start = [int64]$parts[0] }
        if ($parts.Length -gt 1 -and $parts[1] -ne "") { $end = [int64]$parts[1] }
        if ($end -ge $totalLength) { $end = $totalLength - 1 }
        $res.StatusCode = 206
        $res.Headers.Add("Content-Range", "bytes $start-$end/$totalLength")
      }
      $length = $end - $start + 1
      $res.ContentLength64 = $length
      $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
      $buffer = New-Object byte[] 65536
      $remaining = $length
      while ($remaining -gt 0) {
        $toRead = [Math]::Min($buffer.Length, $remaining)
        $read = $fs.Read($buffer, 0, [int]$toRead)
        if ($read -le 0) { break }
        $res.OutputStream.Write($buffer, 0, $read)
        $remaining -= $read
      }
    } finally {
      $fs.Close()
    }
  } else {
    $res.StatusCode = 404
    $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
    $res.OutputStream.Write($notFound, 0, $notFound.Length)
  }
} catch {
} finally {
  try { $res.OutputStream.Close() } catch {}
  try { $res.Close() } catch {}
}
'@

$runspacePool = [runspacefactory]::CreateRunspacePool(2, 16)
$runspacePool.Open()
$pending = New-Object System.Collections.Generic.List[object]

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $ps = [powershell]::Create()
  $ps.RunspacePool = $runspacePool
  [void]$ps.AddScript($handlerScript).AddArgument($context).AddArgument($root).AddArgument($mime)
  $handle = $ps.BeginInvoke()
  $pending.Add(@{ PS = $ps; Handle = $handle })

  for ($i = $pending.Count - 1; $i -ge 0; $i--) {
    if ($pending[$i].Handle.IsCompleted) {
      try { $pending[$i].PS.EndInvoke($pending[$i].Handle) } catch {}
      $pending[$i].PS.Dispose()
      $pending.RemoveAt($i)
    }
  }
}
