param([ValidateSet('inspect','create','pages','status')][string]$Action = 'inspect')
$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='never'
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill
if ($LASTEXITCODE -ne 0) { throw 'Existing Git credential unavailable. Login requires user action.' }
$credentialPassword = ($credentialLines | Where-Object { $_ -like 'password=*' }) -replace '^password=',''
if (!$credentialPassword) { throw 'No credential returned.' }
$headers = @{Authorization="Bearer $credentialPassword"; Accept='application/vnd.github+json'}
$account = Invoke-RestMethod https://api.github.com/user -Headers $headers
if ($account.login -cne 'dnfl1999') { throw 'Account mismatch. No mutation permitted.' }
Write-Output ('Verified account: ' + $account.login)
$base = 'https://api.github.com/repos/dnfl1999/memediff'
if ($Action -eq 'create') {
  $exists = $false
  try { $repo = Invoke-RestMethod $base -Headers $headers; $exists = $true } catch { if ([int]$_.Exception.Response.StatusCode -ne 404) { throw } }
  if ($exists) { Write-Output ('Existing repository preserved: ' + $repo.html_url) }
  else { $body = @{name='memediff';description='Evidence-first GitHub activity reports for meme-token research. Local snapshot comparisons, source links, PNG and JSON exports.';private=$false;auto_init=$false;has_wiki=$false} | ConvertTo-Json; $repo = Invoke-RestMethod https://api.github.com/user/repos -Method Post -Headers $headers -ContentType 'application/json' -Body $body; Write-Output ('Created: ' + $repo.html_url) }
} elseif ($Action -eq 'pages') {
  try { $pages = Invoke-RestMethod "$base/pages" -Headers $headers; Write-Output ('Existing Pages: ' + $pages.html_url + ' / ' + $pages.build_type) }
  catch { if ([int]$_.Exception.Response.StatusCode -ne 404) { throw }; $pages = Invoke-RestMethod "$base/pages" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"build_type":"workflow"}'; Write-Output ('Pages configured: ' + $pages.html_url) }
} elseif ($Action -eq 'status') {
  $runs = Invoke-RestMethod "$base/actions/runs?per_page=5" -Headers $headers
  $runs.workflow_runs | Select-Object id,status,conclusion,html_url,head_sha | ConvertTo-Json
  try { $pages = Invoke-RestMethod "$base/pages" -Headers $headers; $pages | Select-Object html_url,status,build_type | ConvertTo-Json } catch { Write-Output 'Pages not configured yet.' }
} else {
  try { $repo = Invoke-RestMethod $base -Headers $headers; $repo | Select-Object full_name,private,default_branch,html_url,permissions | ConvertTo-Json } catch { if ([int]$_.Exception.Response.StatusCode -eq 404) { Write-Output 'Repository does not exist.' } else { throw } }
}
$credentialPassword = $null; $credentialLines = $null; $headers = $null
