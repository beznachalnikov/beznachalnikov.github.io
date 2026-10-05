#!/usr/bin/env python3
"""Спрашивает у игрового сервера, сколько на нём сейчас игроков и какая карта, и пишет public/data/status.js.

Запускается при каждой выкладке сайта из .github/workflows/site.yml. Файл в репозиторий не сохраняется.
Сервер считает ботов игроками, так что число здесь — вместе с ботами (так решено).
Если сервер не ответил, файл не создаётся и полоска на сайте просто не показывается.
"""
import json
import os
import socket
import sys
import time

SERVER = ("149.50.98.60", 27023)
TARGET = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data", "status.js")
PREFIX = "window.GG_STATUS = "
REQUEST = b"\xff\xff\xff\xffTSource Engine Query\x00"


def read_string(data, pos):
    end = data.index(b"\x00", pos)
    return data[pos:end].decode("utf-8", "replace"), end + 1


def ask():
    """Запрос A2S_INFO: имя сервера, карта, папка игры, название игры, id, игроки, максимум."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(3)
    try:
        sock.sendto(REQUEST, SERVER)
        data = sock.recv(4096)
        if data[4:5] == b"A":  # сервер просит повторить запрос с его числом-паролем
            sock.sendto(REQUEST + data[5:9], SERVER)
            data = sock.recv(4096)
        if data[4:5] != b"I":
            return None

        pos = 6
        _name, pos = read_string(data, pos)
        game_map, pos = read_string(data, pos)
        _folder, pos = read_string(data, pos)
        _game, pos = read_string(data, pos)
        pos += 2
        return {"players": data[pos], "max": data[pos + 1], "map": game_map}
    except (OSError, ValueError, IndexError):
        return None
    finally:
        sock.close()


def main():
    answer = None
    for _attempt in range(3):
        answer = ask()
        if answer:
            break

    if not answer:
        print("сервер не ответил, полоска на сайте будет скрыта")
        if os.path.exists(TARGET):
            os.remove(TARGET)
        return 0

    answer["checked"] = int(time.time())
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with open(TARGET, "w", encoding="utf-8", newline="\n") as f:
        f.write(PREFIX + json.dumps(answer, ensure_ascii=True, separators=(",", ":")) + ";\n")
    print("игроков %d из %d, карта %s" % (answer["players"], answer["max"], answer["map"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
