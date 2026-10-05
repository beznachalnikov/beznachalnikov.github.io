#!/usr/bin/env python3
"""Собирает английскую страницу public/en/index.html из русской public/index.html и словаря en в i18n.js.

Запускается при каждой выкладке сайта из .github/workflows/site.yml (после простановки версии файлов).
Готовая страница в репозиторий не сохраняется. У каждого языка свой адрес — так поисковик видит обе версии.
Если в словаре en не хватает ключа, который есть в разметке, сборка падает: иначе на английской
странице остался бы русский текст.
"""
import html
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
SOURCE = os.path.join(ROOT, "index.html")
DICTIONARY = os.path.join(ROOT, "assets", "js", "i18n.js")
TARGET = os.path.join(ROOT, "en", "index.html")
SITE = "https://beznachalnikov.github.io/"

ENTRY = re.compile(r'^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$')
NODE = re.compile(r'(<(\w+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)(.*?)(</\2>)', re.S)


def read_dictionary(lang):
    """Словарь одного языка: строки вида "ключ": "текст" между «lang: {» и закрывающей скобкой."""
    words, inside = {}, False
    with open(DICTIONARY, encoding="utf-8") as f:
        for line in f:
            if not inside:
                inside = re.match(r"\s*%s:\s*\{" % lang, line) is not None
                continue
            if re.match(r"\s*\}", line):
                break
            entry = ENTRY.match(line)
            if entry:
                words[entry.group(1)] = json.loads('"%s"' % entry.group(2))
    return words


def replace_once(page, old, new):
    if page.count(old) != 1:
        sys.exit("build_en: в index.html ожидалось ровно одно вхождение: %s" % old)
    return page.replace(old, new)


def main():
    en, ru = read_dictionary("en"), read_dictionary("ru")
    with open(SOURCE, encoding="utf-8") as f:
        page = f.read()

    missing = []

    def translate(node):
        key = node.group(3)
        if key not in en:
            missing.append(key)
            return node.group(0)
        if ru.get(key) != node.group(4):
            print("build_en: текст в разметке расходится со словарём ru: %s" % key)
        return node.group(1) + en[key] + node.group(5)

    page, count = NODE.subn(translate, page)
    if missing:
        sys.exit("build_en: в словаре en нет ключей: %s" % ", ".join(missing))
    if count != page.count("data-i18n="):
        sys.exit("build_en: переведено %d мест из %d" % (count, page.count("data-i18n=")))

    page = replace_once(page, '<html lang="ru">', '<html lang="en" data-root="../">')
    page = re.sub(r"<title>.*?</title>", lambda _: "<title>%s</title>" % html.escape(en["meta.title"], quote=False), page, count=1, flags=re.S)
    page = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(en["meta.desc"]) + m.group(2), page, count=1)
    page = replace_once(page, '<link rel="canonical" href="%s">' % SITE, '<link rel="canonical" href="%sen/">' % SITE)
    page = replace_once(page, '<meta property="og:url" content="%s">' % SITE, '<meta property="og:url" content="%sen/">' % SITE)
    page = replace_once(page, 'aria-label="Разделы"', 'aria-label="Sections"')

    # страница лежит на папку глубже: свои файлы и русская версия — уровнем выше
    page = page.replace('href="assets/', 'href="../assets/').replace('src="assets/', 'src="../assets/')
    page = replace_once(page, '<a href="./" data-lang="ru"', '<a href="../" data-lang="ru"')
    page = replace_once(page, '<a href="en/" data-lang="en"', '<a href="./" data-lang="en"')

    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with open(TARGET, "w", encoding="utf-8", newline="\n") as f:
        f.write(page)
    print("английская страница собрана: переведено мест — %d" % count)
    return 0


if __name__ == "__main__":
    sys.exit(main())
