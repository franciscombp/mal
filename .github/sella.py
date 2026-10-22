"""Sella el CSS y el JS del sitio con el commit que se publica.

Lo corre el workflow de Pages antes de subir el sitio, sobre la copia que
se publica (no toca el repo). Cada `href`/`src` que apunta a un .css o un
.js de este mismo sitio sale con `?v=<commit>`, cambie o no el archivo: así
cada despliegue estrena URLs y ningún navegador ni borde se queda con la
hoja o el guion de la versión anterior. Si ya llevaba un `?v=` a mano (el
del sistema de diseño, `datos.js?v=2`), se reemplaza.

El sprite de iconos no hace falta sellarlo aquí: mal.js lo pide con el
mismo sello que trae su propio <script>.

Uso: python3 .github/sella.py <sello> [raíz]
"""
import pathlib
import re
import sys

PROPIO = 'https://franciscombp.github.io/mal/'
# href="…​.css" o src="…​.js", con o sin ?v= y con o sin #fragmento.
PATRON = re.compile(r'''((?:href|src)=")([^"?#]+\.(?:css|js))(?:\?v=[^"#]*)?((?:#[^"]*)?")''')


def es_propio(url):
    if url.startswith(PROPIO):
        return True
    return '://' not in url and not url.startswith('//')


def main():
    sello = sys.argv[1]
    raiz = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '.')
    tocados = 0
    for html in sorted(raiz.rglob('*.html')):
        if '.git' in html.parts:
            continue
        texto = html.read_text(encoding='utf-8')

        def cambia(m):
            if not es_propio(m.group(2)):
                return m.group(0)
            return f'{m.group(1)}{m.group(2)}?v={sello}{m.group(3)}'

        nuevo = PATRON.sub(cambia, texto)
        if nuevo != texto:
            html.write_text(nuevo, encoding='utf-8')
            tocados += 1
    print(f'sello {sello}: {tocados} páginas')


if __name__ == '__main__':
    main()
