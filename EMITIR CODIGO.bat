@echo off
rem Abre a janela de emissao de codigos de acesso do Certifa.
rem Duplo clique neste arquivo — nao precisa abrir terminal.
cd /d "%~dp0"

rem pythonw abre sem a janela preta de console.
start "" pythonw "_ferramentas\emitir.pyw"
if not errorlevel 1 goto :eof

rem Se pythonw nao existir no PATH, tenta pelo py launcher.
start "" pyw "_ferramentas\emitir.pyw"
if not errorlevel 1 goto :eof

echo.
echo Nao foi possivel abrir a janela automaticamente.
echo Verifique se o Python esta instalado e no PATH.
echo.
pause
