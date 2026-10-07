param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ColumnIndex([string]$reference) {
  $letters = ($reference -replace '\d', '')
  $value = 0
  foreach ($character in $letters.ToCharArray()) {
    $value = ($value * 26) + ([int][char]$character - [int][char]'A' + 1)
  }
  return $value
}

function Get-CellText($cell, $sharedStrings) {
  $value = $cell.v
  if ($null -eq $value) { return $null }
  if ($cell.t -eq 's') { return [string]$sharedStrings[[int]$value] }
  if ($cell.t -eq 'inlineStr') { return [string]$cell.is.t }
  return [string]$value
}

function ConvertTo-Number($value) {
  $number = 0.0
  if ($null -eq $value -or -not [double]::TryParse([string]$value, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return $null
  }
  return $number
}

$archive = [System.IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  [xml]$sharedXml = (New-Object System.IO.StreamReader($archive.GetEntry('xl/sharedStrings.xml').Open())).ReadToEnd()
  $sharedStrings = @($sharedXml.sst.si | ForEach-Object { ($_.t, $_.r.t -join '') })
  # REKAP Prod per TT is the inspected primary source, stored as sheet2.xml.
  [xml]$sheetXml = (New-Object System.IO.StreamReader($archive.GetEntry('xl/worksheets/sheet2.xml').Open())).ReadToEnd()

  $rows = @()
  foreach ($xmlRow in $sheetXml.worksheet.sheetData.row) {
    if ([int]$xmlRow.r -lt 8) { continue }
    $cells = @{}
    foreach ($cell in $xmlRow.c) { $cells[(Get-ColumnIndex $cell.r)] = Get-CellText $cell $sharedStrings }
    $plantingYear = $cells[4]
    if ($plantingYear -notmatch '^(19|20)\d{2}(\.0+)?$') { continue }
    if ([string]::IsNullOrWhiteSpace($cells[2]) -or [string]::IsNullOrWhiteSpace($cells[3])) { continue }
    $actual = if ($cells.ContainsKey(41)) { ConvertTo-Number $cells[41] } else { 0 }
    $rkap = if ($cells.ContainsKey(19)) { ConvertTo-Number $cells[19] } else { 0 }
    if ($null -eq $actual -or $null -eq $rkap) { continue }
    if ($actual -eq 0 -and $rkap -eq 0) { continue }
    $months = @()
    for ($i = 0; $i -lt 12; $i++) {
      $actualMonth = if ($cells.ContainsKey(29 + $i)) { ConvertTo-Number $cells[29 + $i] } else { 0 }
      $rkapMonth = if ($cells.ContainsKey(7 + $i)) { ConvertTo-Number $cells[7 + $i] } else { 0 }
      if ($null -eq $actualMonth) { $actualMonth = 0 }
      if ($null -eq $rkapMonth) { $rkapMonth = 0 }
      $months += [pscustomobject]@{ month = $i + 1; actual = $actualMonth; rkap = $rkapMonth }
    }
    $rows += [pscustomobject]@{
      row = [int]$xmlRow.r; commodity = $cells[1]; estateCode = $cells[2]; estate = $cells[3]; plantingYear = [int][double]$plantingYear
      area = $cells[5]; population = $cells[6]; actual = $actual; rkap = $rkap; months = $months
    }
  }
  $duplicateGroups = $rows | Group-Object { "$($_.commodity)|$($_.estateCode)|$($_.plantingYear)" } | Where-Object Count -gt 1
  $summary = [pscustomobject]@{
    recordCount = $rows.Count
    actualTotal = [math]::Round((($rows | Measure-Object actual -Sum).Sum), 2)
    rkapTotal = [math]::Round((($rows | Measure-Object rkap -Sum).Sum), 2)
    actualMonths = @($rows | ForEach-Object months | Group-Object month | Sort-Object { [int]$_.Name } | ForEach-Object { [pscustomobject]@{ month = [int]$_.Name; actual = [math]::Round((($_.Group | Measure-Object actual -Sum).Sum), 2); rkap = [math]::Round((($_.Group | Measure-Object rkap -Sum).Sum), 2) } })
    commodities = @($rows | Group-Object commodity | Sort-Object Name | ForEach-Object { [pscustomobject]@{ commodity = $_.Name; records = $_.Count; actual = [math]::Round((($_.Group | Measure-Object actual -Sum).Sum), 2); rkap = [math]::Round((($_.Group | Measure-Object rkap -Sum).Sum), 2) } })
    estates = @($rows | Group-Object estate | Sort-Object Name | ForEach-Object { [pscustomobject]@{ estate = $_.Name; records = $_.Count; actual = [math]::Round((($_.Group | Measure-Object actual -Sum).Sum), 2); rkap = [math]::Round((($_.Group | Measure-Object rkap -Sum).Sum), 2) } })
    duplicateKeyGroups = @($duplicateGroups | ForEach-Object { [pscustomobject]@{ key = $_.Name; count = $_.Count; rows = @($_.Group.row) } })
    rows = $rows
  }
  $summary | ConvertTo-Json -Depth 6
}
finally { $archive.Dispose() }
