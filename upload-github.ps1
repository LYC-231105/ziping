param([string]$Message = '同步子平研习项目')
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $OutputEncoding
$ProjectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$RepositoryUrl = 'https://github.com/LYC-231105/ziping.git'
$TargetBranch = 'main'
$PreviousLocation = Get-Location
function Invoke-GitResult {
    param([string[]]$GitArguments)
    # Windows PowerShell treats native stderr as ErrorRecord, even on success.
    $ErrorActionPreference = 'Continue'
    $GitOutput = @(& git @GitArguments 2>&1)
    $GitExitCode = $LASTEXITCODE
    return [pscustomobject]@{ ExitCode = $GitExitCode; Text = (($GitOutput | ForEach-Object { $_.ToString() }) -join "`n").Trim() }
}
function Invoke-ProjectGit {
    param([string[]]$GitArguments)
    $GitResult = Invoke-GitResult -GitArguments $GitArguments
    if ($GitResult.ExitCode -ne 0) { throw ('Git 操作失败：' + ($GitArguments -join ' ') + "`n" + $GitResult.Text) }
    return $GitResult.Text
}
function Read-ProjectRef {
    param([string]$Reference)
    $RefResult = Invoke-GitResult -GitArguments @('rev-parse','--verify','--quiet',$Reference)
    if ($RefResult.ExitCode -eq 0) { return $RefResult.Text }
    return $null
}

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw '本机没有找到 Git，请安装 Git 并登录 GitHub 后再上传。' }
    Set-Location -LiteralPath $ProjectRoot
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot '.git'))) {
        $null = Invoke-ProjectGit -GitArguments @('init','-b',$TargetBranch,'.')
    }
    $ActualRoot = [IO.Path]::GetFullPath((Invoke-ProjectGit -GitArguments @('rev-parse','--show-toplevel')))
    if ($ActualRoot.TrimEnd('\','/') -ne $ProjectRoot.TrimEnd('\','/')) { throw 'Git 根目录与本网页目录不一致，已停止上传。' }
    $CurrentBranch = Invoke-ProjectGit -GitArguments @('symbolic-ref','--quiet','--short','HEAD')
    if ($CurrentBranch -ne $TargetBranch) { throw '当前不是 main 分支，请先处理当前分支后再使用完整版本上传入口。' }
    $RemoteNames = (Invoke-ProjectGit -GitArguments @('remote')) -split "\r?\n"
    if ($RemoteNames -contains 'origin') {
        $RemoteUrl = Invoke-ProjectGit -GitArguments @('remote','get-url','origin')
        $PushUrl = Invoke-ProjectGit -GitArguments @('remote','get-url','--push','origin')
        foreach ($CheckUrl in @($RemoteUrl,$PushUrl)) {
            if ($CheckUrl.TrimEnd('/') -notin @($RepositoryUrl,$RepositoryUrl.Substring(0,$RepositoryUrl.Length-4),'git@github.com:LYC-231105/ziping.git')) {
                throw 'origin 不是指定的子平仓库，已停止上传；未修改现有远端。'
            }
        }
    } else {
        $null = Invoke-ProjectGit -GitArguments @('remote','add','origin',$RepositoryUrl)
    }
    Write-Host '正在准备当前项目的完整版本……'
    $null = Invoke-ProjectGit -GitArguments @('add','--all','--','.')
    $null = Invoke-ProjectGit -GitArguments @('rm','--cached','--ignore-unmatch','--','books/BK*.js','private/passages.jsonl')
    $SnapshotTree = Invoke-ProjectGit -GitArguments @('write-tree')
    $OriginalLocalHead = Read-ProjectRef -Reference ('refs/heads/' + $TargetBranch)
    $Succeeded = $false
    for ($Attempt = 1; $Attempt -le 3; $Attempt++) {
        Write-Host ('正在同步 GitHub，尝试 ' + $Attempt + '/3……')
        $null = Invoke-ProjectGit -GitArguments @('fetch','--prune','origin')
        $RemoteHead = Read-ProjectRef -Reference ('refs/remotes/origin/' + $TargetBranch)
        if ($RemoteHead) {
            $RemoteTree = Invoke-ProjectGit -GitArguments @('rev-parse',($RemoteHead + '^{tree}'))
            if ($RemoteTree -eq $SnapshotTree) {
                $PublishedCommit = $RemoteHead
                $Succeeded = $true
                Write-Host '仓库已是当前完整版本，无需重复上传。'
                break
            }
        }
        $ParentHead = if ($RemoteHead) { $RemoteHead } else { $OriginalLocalHead }
        $CommitArguments = @('commit-tree',$SnapshotTree)
        if ($ParentHead) { $CommitArguments += @('-p',$ParentHead) }
        $CommitArguments += @('-m',$Message)
        $PublishedCommit = Invoke-ProjectGit -GitArguments $CommitArguments
        $PushResult = Invoke-GitResult -GitArguments @('push','origin',($PublishedCommit + ':refs/heads/' + $TargetBranch))
        if ($PushResult.ExitCode -eq 0) {
            $Succeeded = $true
            break
        }
        if ($Attempt -eq 3) { throw ('GitHub 未接受上传：' + $PushResult.Text) }
        Write-Host '上传未完成，正在重新获取远端状态后重试……'
    }
    if (-not $Succeeded) { throw '上传未完成，未报告成功。' }
    $RemoteLine = Invoke-ProjectGit -GitArguments @('ls-remote','--exit-code','origin',('refs/heads/' + $TargetBranch))
    if (($RemoteLine -split '\s+')[0] -ne $PublishedCommit) { throw '远端提交已再次变化，无法确认本次版本仍为最新，请重新上传。' }
    $ExpectedOld = if ($OriginalLocalHead) { $OriginalLocalHead } else { '0000000000000000000000000000000000000000' }
    $null = Invoke-ProjectGit -GitArguments @('update-ref',('refs/heads/' + $TargetBranch),$PublishedCommit,$ExpectedOld)
    $null = Invoke-ProjectGit -GitArguments @('update-ref',('refs/remotes/origin/' + $TargetBranch),$PublishedCommit)
    $null = Invoke-ProjectGit -GitArguments @('branch','--set-upstream-to',('origin/' + $TargetBranch),$TargetBranch)
    Write-Host ('上传成功，已核对远端提交：' + $PublishedCommit) -ForegroundColor Green
    Write-Host '当前版本已同步；原版本保留在 GitHub 提交历史中。'
    exit 0
} catch {
    Write-Host ('上传未完成：' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    Set-Location -LiteralPath $PreviousLocation
}
