$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutPptx = Join-Path $Root "three-body-project-concise.pptx"
$VerifyDir = Join-Path $Root ".pptx-verify"
$OutPdf = Join-Path $VerifyDir "three-body-project-concise.pdf"

New-Item -ItemType Directory -Force -Path $VerifyDir | Out-Null

function Pt($inches) { return [double]$inches * 72.0 }

function Rgb($hex) {
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return $r + ($g * 256) + ($b * 65536)
}

$C = @{
  Navy   = "0A1F3D"
  Navy2  = "152A4A"
  Paper  = "F1F3F5"
  Paper2 = "E4E8EC"
  Cyan   = "56CFE1"
  Amber  = "F2C14E"
  Red    = "D96C75"
  Green  = "7BD88F"
  Ink    = "111827"
  Muted  = "64748B"
  White  = "FFFFFF"
}

function Add-Rect($slide, $x, $y, $w, $h, $fill, $line = $null, $transparency = 0) {
  $shape = $slide.Shapes.AddShape(1, (Pt $x), (Pt $y), (Pt $w), (Pt $h))
  $shape.Fill.ForeColor.RGB = Rgb $fill
  $shape.Fill.Transparency = [single]$transparency
  if ($null -eq $line) {
    $shape.Line.Visible = 0
  } else {
    $shape.Line.Visible = -1
    $shape.Line.ForeColor.RGB = Rgb $line
    $shape.Line.Weight = 1
  }
  return $shape
}

function Add-Oval($slide, $x, $y, $w, $h, $fill) {
  $shape = $slide.Shapes.AddShape(9, (Pt $x), (Pt $y), (Pt $w), (Pt $h))
  $shape.Fill.ForeColor.RGB = Rgb $fill
  $shape.Line.Visible = 0
  return $shape
}

function Add-Text($slide, $text, $x, $y, $w, $h, $size, $color, $font = "Aptos", $bold = $false, $italic = $false, $align = 1, $link = $null) {
  $shape = $slide.Shapes.AddTextbox(1, (Pt $x), (Pt $y), (Pt $w), (Pt $h))
  $shape.TextFrame.MarginLeft = 0
  $shape.TextFrame.MarginRight = 0
  $shape.TextFrame.MarginTop = 0
  $shape.TextFrame.MarginBottom = 0
  $shape.TextFrame.WordWrap = -1
  $range = $shape.TextFrame.TextRange
  $range.Text = $text
  $range.Font.Name = $font
  $range.Font.Size = [single]$size
  $range.Font.Color.RGB = Rgb $color
  $range.Font.Bold = $(if ($bold) { -1 } else { 0 })
  $range.Font.Italic = $(if ($italic) { -1 } else { 0 })
  $range.ParagraphFormat.Alignment = $align
  if ($null -ne $link) {
    $shape.ActionSettings(1).Hyperlink.Address = $link
    $range.Font.Underline = -1
  }
  return $shape
}

function Add-Label($slide, $label, $footer, $num, $dark) {
  $ink = $(if ($dark) { $C.Paper } else { $C.Navy })
  Add-Text $slide ($label.ToUpperInvariant()) 0.55 0.34 6.2 0.25 8 $ink "Aptos" $false $false 1 | Out-Null
  Add-Text $slide ("{0:D2} / 08" -f $num) 11.65 0.34 1.1 0.25 8 $ink "Aptos" $false $false 3 | Out-Null
  Add-Rect $slide 0.58 6.96 1.2 0.03 $C.Cyan $null 0 | Out-Null
  Add-Text $slide $footer 1.95 6.82 6.4 0.28 8 $ink "Aptos" $false $false 1 | Out-Null
}

function Add-Card($slide, $x, $y, $w, $h, $title, $body, $accent, $dark) {
  $fill = $(if ($dark) { $C.Navy2 } else { $C.White })
  $titleColor = $(if ($dark) { $C.Paper } else { $C.Ink })
  $bodyColor = $(if ($dark) { $C.Paper2 } else { $C.Muted })
  Add-Rect $slide $x $y $w $h $fill $accent 0 | Out-Null
  Add-Rect $slide $x $y 0.08 $h $accent $null 0 | Out-Null
  Add-Text $slide $title ($x + 0.24) ($y + 0.18) ($w - 0.42) 0.36 15 $titleColor "Aptos Display" $true | Out-Null
  Add-Text $slide $body ($x + 0.24) ($y + 0.68) ($w - 0.42) ($h - 0.78) 9.5 $bodyColor "Aptos" | Out-Null
}

function Add-BlankSlide($deck, $bg, $label, $footer, $num, $dark) {
  $slide = $deck.Slides.Add($deck.Slides.Count + 1, 12)
  Add-Rect $slide 0 0 13.333 7.5 $bg $null 0 | Out-Null
  Add-Label $slide $label $footer $num $dark
  return $slide
}

$app = $null
$deck = $null

try {
  $app = New-Object -ComObject PowerPoint.Application
  $deck = $app.Presentations.Add(-1)
  $deck.PageSetup.SlideWidth = Pt 13.333
  $deck.PageSetup.SlideHeight = Pt 7.5

  $s = Add-BlankSlide $deck $C.Navy "Final Project" "Interactive reading - ideology deck" 1 $true
  Add-Text $s "Three-Body`nInteractive Platform" 0.72 1.28 8.4 1.75 38 $C.Paper "Georgia" $true | Out-Null
  Add-Text $s "Dialogue with memory, ideology, and consequence." 0.78 3.12 7.3 0.42 18 $C.Cyan "Georgia" $false $true | Out-Null
  Add-Text $s "A Book I narrative interface where four Claude personas remember the same player and steer toward different endgames." 0.82 4.05 6.9 0.9 15 $C.Paper2 "Aptos" | Out-Null
  $words = @(
    @("MEMORY", $C.Cyan),
    @("TIMELINE", $C.Amber),
    @("IDEOLOGY", $C.Red)
  )
  for ($i = 0; $i -lt $words.Count; $i++) {
    Add-Rect $s 8.45 (1.15 + ($i * 1.18)) 3.8 0.72 $C.Navy2 $words[$i][1] 0 | Out-Null
    Add-Text $s $words[$i][0] 8.75 (1.34 + ($i * 1.18)) 2.8 0.24 13 $C.Paper "Aptos" $true | Out-Null
  }

  $s = Add-BlankSlide $deck $C.Paper "System Snapshot" "Product summary" 2 $false
  Add-Text $s "A story system, not just a chatbot." 0.66 0.92 8.2 0.6 28 $C.Navy "Georgia" $true | Out-Null
  Add-Text $s "The player moves between interviews, but the world keeps one shared state." 0.7 1.56 8.5 0.34 14 $C.Muted "Aptos" | Out-Null
  $cards = @(
    @("4 voices", "Ye, Wang, Shi, Evans each argue from a different moral frame.", $C.Cyan),
    @("1 memory", "Every choice writes to shared localStorage continuity.", $C.Amber),
    @("10-turn events", "The World Book timeline forces external pressure.", $C.Green),
    @("4 endings", "Alignment decides the endgame after turn six.", $C.Red)
  )
  for ($i = 0; $i -lt $cards.Count; $i++) {
    Add-Card $s (0.75 + (($i % 2) * 6.0)) (2.25 + ([math]::Floor($i / 2) * 1.65)) 5.25 1.2 $cards[$i][0] $cards[$i][1] $cards[$i][2] $false
  }

  $s = Add-BlankSlide $deck $C.Navy "Runtime" "One turn pipeline" 3 $true
  Add-Text $s "One player line becomes six consequences." 0.66 0.92 8.4 0.6 28 $C.Paper "Georgia" $true | Out-Null
  $steps = @("Speak", "Remember", "Timeline", "Persona", "Align", "Resolve")
  for ($i = 0; $i -lt $steps.Count; $i++) {
    $x = 0.72 + ($i * 2.05)
    $fill = $(if ($i -in @(0, 3)) { $C.Cyan } elseif ($i -in @(2, 5)) { $C.Amber } else { $C.Paper2 })
    Add-Oval $s $x 2.36 0.7 0.7 $fill | Out-Null
    Add-Text $s ("{0:D2}" -f ($i + 1)) ($x + 0.12) 2.55 0.46 0.16 10 $C.Navy "Aptos" $true $false 2 | Out-Null
    Add-Text $s $steps[$i] ($x - 0.25) 3.28 1.2 0.28 12 $C.Paper "Aptos" $true $false 2 | Out-Null
    if ($i -lt ($steps.Count - 1)) { Add-Rect $s ($x + 0.85) 2.69 0.88 0.035 $C.Paper2 $null 0.25 | Out-Null }
  }
  Add-Text $s "The model does not own event timing. Forced timeline events and ending checks are deterministic app state." 1.1 4.5 10.7 0.55 17 $C.Cyan "Georgia" $false $true 2 | Out-Null

  $s = Add-BlankSlide $deck $C.Paper "Alignment Model" "Ideology axes" 4 $false
  Add-Text $s "The player is scored by worldview." 0.66 0.92 8.2 0.6 28 $C.Navy "Georgia" $true | Out-Null
  $axes = @(
    @("Adventist", "Humanity is failed. Trisolaris is correction.", $C.Red),
    @("Redemptionist", "Trisolaris is godlike. Service outranks sovereignty.", $C.Cyan),
    @("Survivor", "Save mine first. The species is negotiable.", $C.Amber),
    @("Frontier", "Investigate, resist, protect ordinary human life.", $C.Green)
  )
  for ($i = 0; $i -lt $axes.Count; $i++) {
    Add-Card $s (0.85 + (($i % 2) * 5.95)) (2.0 + ([math]::Floor($i / 2) * 1.75)) 5.25 1.35 $axes[$i][0] $axes[$i][1] $axes[$i][2] $false
  }

  $s = Add-BlankSlide $deck $C.Navy "The Cast" "Character ideology" 5 $true
  Add-Text $s "The cast is an argument." 0.66 0.92 7.2 0.6 30 $C.Paper "Georgia" $true | Out-Null
  $chars = @(
    @("Ye Wenjie", "ORIGIN WOUND", "Founder, betrayer, witness. Not a simple Adventist.", $C.Amber),
    @("Wang Miao", "EVIDENCE", "Frontier scientist. Fearful because normal life matters.", $C.Cyan),
    @("Shi Qiang", "PROTECTION", "Frontier pragmatist. People first, theory later.", $C.Green),
    @("Mike Evans", "EXTINCTION", "Hard Adventist. Pan-species ethics turns anti-human.", $C.Red)
  )
  for ($i = 0; $i -lt $chars.Count; $i++) {
    $x = 0.7 + ($i * 3.12)
    Add-Rect $s $x 2.05 2.72 3.25 $C.Navy2 $chars[$i][3] 0 | Out-Null
    Add-Rect $s $x 2.05 2.72 0.11 $chars[$i][3] $null 0 | Out-Null
    Add-Text $s $chars[$i][0] ($x + 0.18) 2.42 2.22 0.34 15 $C.Paper "Georgia" $true | Out-Null
    Add-Text $s $chars[$i][1] ($x + 0.18) 2.96 2.2 0.22 8 $chars[$i][3] "Aptos" $true | Out-Null
    Add-Text $s $chars[$i][2] ($x + 0.18) 3.45 2.25 1.05 10 $C.Paper2 "Aptos" | Out-Null
  }

  $s = Add-BlankSlide $deck $C.Paper "Turn-Based Persona" "Ye Wenjie temporal arc" 6 $false
  Add-Text $s "Ye Wenjie changes with turn pressure." 0.66 0.92 8.6 0.6 28 $C.Navy "Georgia" $true | Out-Null
  Add-Text $s "Her ideology is modeled as an arc, not a fixed faction label." 0.7 1.54 7.5 0.34 14 $C.Muted "Aptos" | Out-Null
  $arc = @(
    @("0-4", "Red Coast", "Judgment feels necessary."),
    @("5-9", "Faction split", "She distances from Evans and worship."),
    @("10-14", "Consequences", "Yang Dong, Wang, and ETO violence weigh in."),
    @("15+", "Witness", "Regret becomes names, diagrams, confession.")
  )
  for ($i = 0; $i -lt $arc.Count; $i++) {
    $x = 0.9 + ($i * 3.0)
    Add-Oval $s $x 2.55 0.72 0.72 $C.Navy | Out-Null
    Add-Text $s $arc[$i][0] ($x + 0.08) 2.75 0.55 0.18 9 $C.Paper "Aptos" $true $false 2 | Out-Null
    if ($i -lt 3) { Add-Rect $s ($x + 0.78) 2.89 2.05 0.035 $C.Muted $null 0.4 | Out-Null }
    Add-Text $s $arc[$i][1] ($x - 0.15) 3.55 2.1 0.32 14 $C.Navy "Georgia" $true $false 2 | Out-Null
    Add-Text $s $arc[$i][2] ($x - 0.25) 4.08 2.28 0.72 10 $C.Muted "Aptos" $false $false 2 | Out-Null
  }

  $s = Add-BlankSlide $deck $C.Navy "Narrative Rules" "Design guardrails" 7 $true
  Add-Text $s "The world, not a character, controls escalation." 0.66 0.92 8.6 0.6 28 $C.Paper "Georgia" $true | Out-Null
  $rules = @(
    @("Shared memory", "All agents know the player's broad record.", $C.Cyan),
    @("Forced timeline", "Every ten turns, the World Book advances.", $C.Amber),
    @("No pop-up events", "Characters cannot trigger scene or guest events.", $C.Red),
    @("Auto compact", "Every five turns, context compresses without counting as a turn.", $C.Green),
    @("Ending gate", "Checks begin after turn six with axis threshold seven.", $C.Cyan),
    @("Rewind", "Decision snapshots keep branches replayable.", $C.Amber)
  )
  for ($i = 0; $i -lt $rules.Count; $i++) {
    Add-Card $s (0.78 + (($i % 3) * 4.12)) (2.05 + ([math]::Floor($i / 3) * 1.55)) 3.45 1.08 $rules[$i][0] $rules[$i][1] $rules[$i][2] $true
  }

  $s = Add-BlankSlide $deck $C.Paper "Video Demo" "Demo videos and takeaway" 8 $false
  Add-Text $s "Demo: endings as ideological consequences." 0.66 0.92 8.8 0.6 27 $C.Navy "Georgia" $true | Out-Null
  Add-Card $s 0.82 2.0 5.65 1.55 "Walkthrough" "One possible endgame path from interview to resolution." $C.Cyan $false
  Add-Text $s "Open video: youtu.be/oRf81m0zX6M" 1.08 3.05 4.8 0.28 11 $C.Navy "Aptos" $true $false 1 "https://youtu.be/oRf81m0zX6M" | Out-Null
  Add-Card $s 6.9 2.0 5.65 1.55 "Endgame range" "A survey of different endings from different alignments." $C.Red $false
  Add-Text $s "Open video: youtu.be/wHOtb31VOGM" 7.16 3.05 4.85 0.28 11 $C.Navy "Aptos" $true $false 1 "https://youtu.be/wHOtb31VOGM" | Out-Null
  Add-Rect $s 1.1 4.55 11.1 0.035 $C.Navy $null 0.35 | Out-Null
  Add-Text $s "Goal: stop the destruction of the human world." 1.05 4.88 10.8 0.5 22 $C.Navy "Georgia" $true $false 2 | Out-Null
  Add-Text $s "The system makes that hard by making every belief travel across memory, time, and character ideology." 2.0 5.5 9.0 0.42 14 $C.Muted "Aptos" $false $false 2 | Out-Null

  if (Test-Path -LiteralPath $OutPptx) { Remove-Item -LiteralPath $OutPptx -Force }
  if (Test-Path -LiteralPath $OutPdf) { Remove-Item -LiteralPath $OutPdf -Force }
  $deck.SaveAs($OutPptx, 24)
  $deck.SaveAs($OutPdf, 32)
  Write-Output $OutPptx
  Write-Output $OutPdf
}
finally {
  if ($deck) { $deck.Close() | Out-Null }
  if ($app) { $app.Quit() | Out-Null }
  if ($deck) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($deck) | Out-Null }
  if ($app) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null }
}
