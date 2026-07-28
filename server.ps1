<#
    Knowledge サーバーの起動・停止ロジック。

    通常は server-gui.ps1（GUI）から呼ばれる。
    コマンドラインから直接使うこともできる:
        powershell -ExecutionPolicy Bypass -File server.ps1 status
#>
param(
    [ValidateSet('start', 'stop', 'status')]
    [string]$Action
)

$root    = $PSScriptRoot
$uvicorn = Join-Path $root '.venv\Scripts\uvicorn.exe'
$logFile = Join-Path $root 'server.log'
$port    = 8000
$url     = "http://127.0.0.1:$port"

# ポート 8000 を LISTEN しているプロセスと、それがこのプロジェクトのものかを返す。
#
# PID ファイルは使わない。ポートから実プロセスを引く方式なら、GUI 以外の方法で
# 起動したサーバーも正しく認識・停止できるし、記録が実体とズレることもない。
#
# 判定にコマンドラインを使っているのは、uvicorn.exe が実行ファイルではなく
# スクリプトのため。ポートを握るのはそれを実行しているベースの python.exe
# （例: C:\Program Files\Python311\python.exe）になり、プロセスのパスからは
# このプロジェクトかどうか判別できない。コマンドラインには .venv の
# uvicorn.exe のフルパスが残るので、そちらで見分ける。
function Get-PortOwnerInfo {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
    } catch {
        return $null
    }
    if (-not $conn) { return $null }

    $ownerId = ($conn | Select-Object -First 1).OwningProcess
    $proc = Get-Process -Id $ownerId -ErrorAction SilentlyContinue
    if (-not $proc) { return $null }

    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction SilentlyContinue).CommandLine
    $isOurs  = $cmdLine -and $cmdLine.IndexOf($uvicorn, [System.StringComparison]::OrdinalIgnoreCase) -ge 0

    return [pscustomobject]@{ Process = $proc; IsOurs = $isOurs }
}

# 動いているサーバーのプロセスを返す（いなければ $null）。
function Get-ServerProcess {
    $info = Get-PortOwnerInfo
    if ($info -and $info.IsOurs) { return $info.Process }
    return $null
}

# ポートを使っているのが自分のサーバー以外だった場合に、その相手を返す。
function Get-ForeignPortOwner {
    $info = Get-PortOwnerInfo
    if ($info -and -not $info.IsOurs) {
        return [pscustomobject]@{ Id = $info.Process.Id; Name = $info.Process.ProcessName }
    }
    return $null
}

function New-Result([bool]$ok, [string]$message) {
    return [pscustomobject]@{ Ok = $ok; Message = $message }
}

function Start-Server {
    if (-not (Test-Path $uvicorn)) {
        return New-Result $false "uvicorn が見つかりません:`n$uvicorn`n`n仮想環境 (.venv) が壊れている可能性があります。"
    }

    if (Get-ServerProcess) {
        return New-Result $true '既に起動しています。'
    }

    $foreign = Get-ForeignPortOwner
    if ($foreign) {
        return New-Result $false "ポート $port は別のプロセスが使用中です。`n(PID=$($foreign.Id), $($foreign.Name))`n`nそのプロセスを終了してから、もう一度お試しください。"
    }

    # ウィンドウを出さずに起動し、ログはファイルに落とす。
    # リダイレクトのために cmd を噛ませている（uvicorn は stderr にログを出す）。
    # UseShellExecute で起動するのでこのスクリプトを閉じてもサーバーは生き続ける。
    $cmdLine = '/c ""{0}" main:app --host 127.0.0.1 --port {1} > "{2}" 2>&1"' -f $uvicorn, $port, $logFile
    Start-Process -FilePath 'cmd.exe' -ArgumentList $cmdLine -WindowStyle Hidden -WorkingDirectory $root

    # LISTEN 状態になるまで最大 20 秒待つ
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        if (Get-ServerProcess) {
            return New-Result $true "サーバーを起動しました。`n$url"
        }
    }

    $tail = ''
    if (Test-Path $logFile) {
        $tail = (Get-Content $logFile -Tail 15 -ErrorAction SilentlyContinue) -join "`n"
    }
    return New-Result $false "20 秒待ってもサーバーが応答しませんでした。`n`nログの末尾:`n$tail"
}

function Stop-Server {
    $target = Get-ServerProcess

    if (-not $target) {
        $foreign = Get-ForeignPortOwner
        if ($foreign) {
            return New-Result $false "ポート $port を使っているのはこのプロジェクトのサーバーではありません。`n(PID=$($foreign.Id), $($foreign.Name))`n`n安全のため停止しませんでした。"
        }
        return New-Result $true 'サーバーは起動していません。'
    }

    Stop-Process -Id $target.Id -Force
    return New-Result $true 'サーバーを停止しました。'
}

# コマンドラインから引数付きで呼ばれたときだけ実行する。
# （GUI からドットソースで読み込むときは何も起きない）
if ($PSBoundParameters.ContainsKey('Action')) {
    switch ($Action) {
        'start'  { $r = Start-Server; Write-Host $r.Message; exit ([int](-not $r.Ok)) }
        'stop'   { $r = Stop-Server;  Write-Host $r.Message; exit ([int](-not $r.Ok)) }
        'status' {
            if (Get-ServerProcess) { Write-Host "起動中  $url" } else { Write-Host '停止中' }
            exit 0
        }
    }
}
