# Guagua de pan

Una guagua de pan en 3D para decorar con crema y regalar por el Día de Difuntos.
Vive en `franciscombp.github.io/mal/guagua/` y la carpeta se basta sola: Three.js va en
`vendor/` (r170, licencia MIT en `vendor/LICENSE-three.txt`) y el sistema de diseño se pide
con ruta relativa desde `../ds/`.

## Incrustarla en otro sitio

Dos parámetros en la URL:

| Parámetro | Qué hace |
|---|---|
| `?marca=mercio` | viste la página con el tema de EL MERCIO. (también `mal` y `apps`; sin nada, el de juegos) |
| `?embed` | quita la cabecera, el pie y la nota del final, para meterla en un iframe |

Para EL MERCIO., en un bloque HTML de WordPress:

```html
<iframe src="https://franciscombp.github.io/mal/guagua/?embed&marca=mercio"
  title="Decora tu guagua de pan" loading="lazy"
  style="width:100%;height:1500px;border:0"
  allow="web-share; clipboard-write"></iframe>
```

`allow="web-share; clipboard-write"` hace falta para que, desde dentro del iframe, funcionen
el botón de compartir del teléfono y el de copiar enlace. Los enlaces que se regalan llevan
la piel (`?marca=mercio`) pero no el `embed`: quien los recibe abre la guagua a pantalla entera.

## Cómo viaja una guagua

No hay servidor. La guagua es una lista de operaciones (trazos de manga, rosetas, grageas,
mordiscos) en centésimas de unidad; se comprime con `deflate-raw` y va en el enlace, después
del `#`, así que tampoco llega a GitHub. La vitrina vive en el `localStorage` de cada navegador.
