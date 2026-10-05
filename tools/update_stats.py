#!/usr/bin/env python3
"""Забирает gungame.stats с игрового сервера и собирает из него public/data/stats.js для сайта.

Запускается по расписанию из .github/workflows/site.yml, можно и руками: python tools/update_stats.py
Файл на сайте переписывается, только если статистика реально изменилась.
"""
import json
import os
import sys
import time
import urllib.request

SOURCE = "http://149.50.98.60:90/s37705/gungame.stats"
TARGET = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data", "stats.js")
PREFIX = "window.GG_STATS = "


def parse(raw):
    """Строка файла: authid, победы, ник, время последней игры, очки, лучшая серия, дальше командные поля."""
    players = []
    for line in raw.split(b"\n"):
        parts = line.rstrip(b"\r").split(b"\t")
        if len(parts) < 6 or parts[0] == b"BOT":
            continue
        try:
            wins, seen, points, streak = int(parts[1]), int(parts[3]), int(parts[4]), int(parts[5])
        except ValueError:
            continue
        if wins <= 0 and points <= 0:
            continue
        players.append({
            "name": parts[2].decode("utf-8", "replace"),
            "wins": wins,
            "points": points,
            "streak": streak,
            "seen": seen,
        })
    players.sort(key=lambda p: (-p["wins"], -p["points"]))
    return players


def load_current():
    try:
        with open(TARGET, encoding="utf-8") as f:
            return json.loads(f.read()[len(PREFIX):].rstrip().rstrip(";"))
    except (OSError, ValueError):
        return None


def main():
    try:
        raw = urllib.request.urlopen(SOURCE, timeout=30).read()
    except OSError as error:
        # сервер бывает недоступен; оставляем на сайте прежние данные и не роняем запуск
        print("не удалось скачать статистику: %s" % error)
        return 0

    players = parse(raw)
    current = load_current()

    if current is not None:
        if players == current.get("players"):
            print("без изменений, игроков: %d" % len(players))
            return 0

        # плагин переписывает файл в конце каждой карты; если попасть в этот момент, придёт обрубок.
        # настоящий сброс статистики: удалить public/data/stats.js, тогда сравнивать будет не с чем
        if len(players) * 2 < len(current.get("players", [])):
            print("в файле подозрительно мало игроков (%d), пропускаю этот запуск" % len(players))
            return 0

    data = {"updated": int(time.time()), "players": players}
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with open(TARGET, "w", encoding="utf-8", newline="\n") as f:
        f.write(PREFIX + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n")
    print("обновлено, игроков: %d" % len(players))
    return 0


if __name__ == "__main__":
    sys.exit(main())
