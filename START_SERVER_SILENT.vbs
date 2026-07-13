' Starts Blue Cat portal server in background (no console window).
' Used at Windows logon and by OPEN_PORTAL.bat

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

portal = fso.GetParentFolderName(WScript.ScriptFullName)
pythonCmd = "python"
servePy = portal & "\serve_nocache.py"

If Not fso.FileExists(servePy) Then
  WScript.Quit 1
End If

' Already listening on 8765?
Set exec = sh.Exec("cmd /c netstat -ano | findstr :8765 | findstr LISTENING")
Do While exec.Status = 0
  WScript.Sleep 50
Loop
out = exec.StdOut.ReadAll
If InStr(out, "LISTENING") > 0 Then
  WScript.Quit 0
End If

' Start minimized/hidden python server
sh.CurrentDirectory = portal
sh.Run "cmd /c python serve_nocache.py", 0, False
WScript.Sleep 1500
