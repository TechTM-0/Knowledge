<#
    Knowledge サーバーの起動・停止 GUI。

    デスクトップの「Knowledge サーバー」ショートカットから起動される。
    起動・停止の実処理は server.ps1 に置いてある。
#>

. (Join-Path $PSScriptRoot 'server.ps1')

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$colorRunning = [System.Drawing.Color]::FromArgb(22, 163, 74)
$colorStopped = [System.Drawing.Color]::FromArgb(148, 163, 184)
$colorBusy    = [System.Drawing.Color]::FromArgb(217, 119, 6)

$fontBig   = New-Object System.Drawing.Font('Meiryo UI', 15, [System.Drawing.FontStyle]::Bold)
$fontSmall = New-Object System.Drawing.Font('Meiryo UI', 9)
$fontBtn   = New-Object System.Drawing.Font('Meiryo UI', 11)

$form = New-Object System.Windows.Forms.Form
$form.Text            = 'Knowledge サーバー'
$form.ClientSize      = New-Object System.Drawing.Size(360, 232)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox     = $false
$form.StartPosition   = 'CenterScreen'
$form.BackColor       = [System.Drawing.Color]::White

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Location = New-Object System.Drawing.Point(20, 18)
$lblStatus.Size     = New-Object System.Drawing.Size(320, 32)
$lblStatus.Font     = $fontBig
$form.Controls.Add($lblStatus)

$lnkUrl = New-Object System.Windows.Forms.LinkLabel
$lnkUrl.Location  = New-Object System.Drawing.Point(22, 52)
$lnkUrl.Size      = New-Object System.Drawing.Size(320, 20)
$lnkUrl.Font      = $fontSmall
$lnkUrl.Text      = $url
$lnkUrl.Add_LinkClicked({ Start-Process $url })
$form.Controls.Add($lnkUrl)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Location  = New-Object System.Drawing.Point(20, 88)
$btnStart.Size      = New-Object System.Drawing.Size(155, 48)
$btnStart.Text      = '起 動'
$btnStart.Font      = $fontBtn
$btnStart.FlatStyle = 'System'
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Location  = New-Object System.Drawing.Point(185, 88)
$btnStop.Size      = New-Object System.Drawing.Size(155, 48)
$btnStop.Text      = '停 止'
$btnStop.Font      = $fontBtn
$btnStop.FlatStyle = 'System'
$form.Controls.Add($btnStop)

$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Location  = New-Object System.Drawing.Point(20, 148)
$btnOpen.Size      = New-Object System.Drawing.Size(320, 36)
$btnOpen.Text      = 'ブラウザで開く'
$btnOpen.Font      = $fontSmall
$btnOpen.FlatStyle = 'System'
$btnOpen.Add_Click({ Start-Process $url })
$form.Controls.Add($btnOpen)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Location  = New-Object System.Drawing.Point(20, 196)
$lblHint.Size      = New-Object System.Drawing.Size(320, 20)
$lblHint.Font      = $fontSmall
$lblHint.ForeColor = $colorStopped
$lblHint.Text      = 'この画面を閉じてもサーバーは動き続けます'
$form.Controls.Add($lblHint)

# 現在の状態を画面に反映する
function Sync-Ui {
    if (Get-ServerProcess) {
        $lblStatus.Text      = '● 起動中'
        $lblStatus.ForeColor = $colorRunning
        $btnStart.Enabled    = $false
        $btnStop.Enabled     = $true
        $btnOpen.Enabled     = $true
        $lnkUrl.Enabled      = $true
    } else {
        $lblStatus.Text      = '● 停止中'
        $lblStatus.ForeColor = $colorStopped
        $btnStart.Enabled    = $true
        $btnStop.Enabled     = $false
        $btnOpen.Enabled     = $false
        $lnkUrl.Enabled      = $false
    }
}

# 処理中の表示にして、ボタンを一時的に無効化する
function Set-Busy([string]$text) {
    $lblStatus.Text      = "● $text"
    $lblStatus.ForeColor = $colorBusy
    $btnStart.Enabled    = $false
    $btnStop.Enabled     = $false
    $form.Cursor         = [System.Windows.Forms.Cursors]::WaitCursor
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
}

function Clear-Busy {
    $form.Cursor = [System.Windows.Forms.Cursors]::Default
    Sync-Ui
}

function Show-Failure([string]$message) {
    [void][System.Windows.Forms.MessageBox]::Show(
        $form, $message, 'Knowledge サーバー',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning)
}

$btnStart.Add_Click({
    Set-Busy '起動しています…'
    $result = Start-Server
    Clear-Busy
    if (-not $result.Ok) { Show-Failure $result.Message }
})

$btnStop.Add_Click({
    Set-Busy '停止しています…'
    $result = Stop-Server
    Clear-Busy
    if (-not $result.Ok) { Show-Failure $result.Message }
})

# 外部で起動・停止された場合にも表示が追従するよう、定期的に見に行く
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({ if ($form.Cursor -ne [System.Windows.Forms.Cursors]::WaitCursor) { Sync-Ui } })
$timer.Start()

Sync-Ui
[void]$form.ShowDialog()
$timer.Stop()
