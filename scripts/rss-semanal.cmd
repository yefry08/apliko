@echo off
rem Corrida semanal de la ingesta RSS (tarea programada "Apliko - becas RSS").
rem Si el catalogo cambia, sube solo esos archivos a GitHub y Vercel publica la nueva version.
cd /d "%~dp0.."
echo ==== %date% %time% >> data\rss\ingest.log
python scripts\ingest_rss.py >> data\rss\ingest.log 2>&1

git diff --quiet -- data\opportunities.json data\rss\candidates.json
if errorlevel 1 (
  git -c user.name=yefry08 -c user.email=yefrynunez45@gmail.com commit -m "Becas nuevas desde RSS" -- data\opportunities.json data\rss\candidates.json >> data\rss\ingest.log 2>&1
  git push origin main >> data\rss\ingest.log 2>&1
) else (
  echo Sin cambios en el catalogo: nada que publicar. >> data\rss\ingest.log
)
