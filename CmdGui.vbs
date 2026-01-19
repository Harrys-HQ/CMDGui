Set WshShell = CreateObject("WScript.Shell")
' Run electron in the current directory, hidden (0)
WshShell.Run "cmd /c node_modules\.bin\electron.cmd .", 0, False
Set WshShell = Nothing
