#!/usr/bin/env python3
"""Descarga los PDF nuevos de un grupo de Telegram para la lectura de prensa.

Usa Telethon con una sesión de usuario (los bots no pueden leer grupos que no administran ni bajar archivos de más de 20 MB).

Uso:
  python medios_telegram.py login                      # una sola vez, en tu computadora: crea TG_SESSION
  python medios_telegram.py listar                     # muestra los chats y su id, para elegir TG_GRUPO
  python medios_telegram.py descargar --destino DIR    # lo que ejecuta GitHub Actions cada día

Variables de entorno (en GitHub: Settings > Secrets and variables > Actions):
  TG_API_ID, TG_API_HASH   se sacan en https://my.telegram.org (API development tools)
  TG_SESSION               cadena creada por «login». Da acceso a la cuenta: es un secreto, nunca va en el repositorio
  TG_GRUPO                 id numérico o nombre exacto del grupo
"""
import argparse
import asyncio
import datetime as dt
import json
import os
import sys
import unicodedata
from zoneinfo import ZoneInfo

LIMA = ZoneInfo("America/Lima")
MAX_MB = 120


def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def faltantes():
    return [v for v in ("TG_API_ID", "TG_API_HASH", "TG_SESSION", "TG_GRUPO") if not os.environ.get(v)]


def _cliente(sesion=None):
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    return TelegramClient(StringSession(sesion or ""), int(os.environ["TG_API_ID"]), os.environ["TG_API_HASH"])


async def _buscar_grupo(cli, grupo):
    if grupo.lstrip("-").isdigit():
        gid = int(grupo)
        async for d in cli.iter_dialogs():
            if d.id == gid or d.id == -1000000000000 - gid or abs(d.id) == abs(gid):
                return d.entity
    objetivo = norm(grupo)
    async for d in cli.iter_dialogs():
        if norm(d.name) == objetivo:
            return d.entity
    async for d in cli.iter_dialogs():
        if objetivo and objetivo in norm(d.name):
            return d.entity
    raise SystemExit(f"No se encontró el grupo «{grupo}». Ejecuta «listar» para ver los nombres e ids disponibles.")


def _es_pdf(msg):
    f = msg.file
    if not f:
        return False
    nombre = (f.name or "").lower()
    return nombre.endswith(".pdf") or (f.mime_type or "") == "application/pdf"


async def descargar(destino, dias, ya_procesados):
    os.makedirs(destino, exist_ok=True)
    cli = _cliente(os.environ["TG_SESSION"])
    await cli.connect()
    try:
        if not await cli.is_user_authorized():
            raise SystemExit("La sesión de Telegram no es válida o venció. Genera una nueva con «login» y actualiza TG_SESSION.")
        grupo = await _buscar_grupo(cli, os.environ["TG_GRUPO"])
        desde = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=dias)
        manifiesto, vistos = [], 0
        async for msg in cli.iter_messages(grupo, limit=3000):
            if msg.date < desde:
                break
            if not _es_pdf(msg):
                continue
            vistos += 1
            if msg.id in ya_procesados:
                continue
            tam_mb = (msg.file.size or 0) / 1e6
            if tam_mb > MAX_MB:
                print(f"Se omite {msg.file.name} ({tam_mb:.0f} MB > {MAX_MB} MB)")
                continue
            ruta = os.path.join(destino, f"{msg.id}.pdf")  # el nombre original solo va en el manifiesto
            await cli.download_media(msg, file=ruta)
            manifiesto.append({
                "id": msg.id, "archivo": f"{msg.id}.pdf", "nombre": msg.file.name or f"{msg.id}.pdf",
                "fecha_mensaje": msg.date.astimezone(LIMA).date().isoformat(), "bytes": os.path.getsize(ruta),
            })
            print(f"Descargado {msg.file.name} ({tam_mb:.1f} MB)")
        with open(os.path.join(destino, "manifiesto.json"), "w", encoding="utf-8") as f:
            json.dump(manifiesto, f, ensure_ascii=False, indent=1)
        print(f"PDF en los últimos {dias} días: {vistos}; nuevos: {len(manifiesto)}")
    finally:
        await cli.disconnect()


async def listar():
    cli = _cliente(os.environ["TG_SESSION"])
    await cli.connect()
    try:
        async for d in cli.iter_dialogs():
            if d.is_group or d.is_channel:
                print(f"{d.id}\t{d.name}")
    finally:
        await cli.disconnect()


def login():
    """Interactivo: pide teléfono y código. Imprime la cadena TG_SESSION."""
    from telethon.sync import TelegramClient
    from telethon.sessions import StringSession
    api_id = os.environ.get("TG_API_ID") or input("TG_API_ID: ").strip()
    api_hash = os.environ.get("TG_API_HASH") or input("TG_API_HASH: ").strip()
    with TelegramClient(StringSession(), int(api_id), api_hash) as cli:
        print("\nCopia esta cadena en el secreto TG_SESSION de GitHub (no la compartas ni la subas al repositorio):\n")
        print(cli.session.save())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("accion", choices=["login", "listar", "descargar"])
    ap.add_argument("--destino", default="prensa")
    ap.add_argument("--dias", type=int, default=2, help="cuántos días hacia atrás revisar")
    ap.add_argument("--estado", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "medios.json"),
                    help="medios.json con los mensajes ya procesados, para no volver a bajarlos")
    a = ap.parse_args()
    if a.accion == "login":
        login()
        return 0
    falta = [v for v in ("TG_API_ID", "TG_API_HASH", "TG_SESSION") if not os.environ.get(v)]
    if a.accion == "descargar":
        falta = faltantes()
    if falta:
        print("Faltan variables de entorno: " + ", ".join(falta), file=sys.stderr)
        return 2
    if a.accion == "listar":
        asyncio.run(listar())
        return 0
    ya = set()
    try:
        with open(a.estado, encoding="utf-8") as f:
            ya = set(json.load(f).get("procesados", []))
    except (OSError, ValueError):
        pass
    asyncio.run(descargar(a.destino, a.dias, ya))
    return 0


if __name__ == "__main__":
    sys.exit(main())
