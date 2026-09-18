@echo off
rem Corrida semanal de la ingesta RSS (tarea programada "Apliko - becas RSS").
cd /d "%~dp0.."
echo ==== %date% %time% >> data\rss\ingest.log
python scripts\ingest_rss.py >> data\rss\ingest.log 2>&1
