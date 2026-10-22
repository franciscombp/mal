# Guagua de pan

Una guagua de pan en 3D, en tres actos, para regalar por el Día de Difuntos:

1. **Amasar.** Bolitas (arrastrar hacia el lado las hace anchas; hacia arriba, altas) y chorizos
   (se estiran con el dedo). Lo que cae encima de otra pieza se pega. Hay moldes: guagua,
   caballito, chanchito, gallinita y la lata vacía.
2. **Hornear.** La masa se infla y se dora en seis segundos; hay que sacarla en su punto. Antes
   queda blanca, después se quema, y la panadera lo comenta.
3. **Decorar.** Manga de crema con pincel y tres boquillas, rosetas, grageas, pasas, carita de
   yeso en blanco y mordiscos. La cara no viene hecha: se dibuja.

Vive en `franciscombp.github.io/mal/guagua/` y la carpeta se basta sola: Three.js va en
`vendor/` (r170, licencia MIT en `vendor/LICENSE-three.txt`) y el sistema de diseño se pide
con ruta relativa desde `../ds/`.

## Cómo se toca

Con un dedo se amasa y se decora; con dos dedos se gira y se acerca a la vez. El primer dedo
espera un instante antes de pintar: si en ese rato llega el segundo, era un gesto y no se mancha
nada. En la computadora, el clic derecho gira y la rueda acerca. La cámara encuadra la figura en
el hueco que dejan la barra de arriba y el dock de herramientas (abajo; a la derecha si el
teléfono está de lado). Hay botón de pantalla completa y un manifiesto para instalarla como app.

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
  style="width:100%;height:min(88vh, 820px);border:0;border-radius:16px"
  allow="web-share; clipboard-write; fullscreen"></iframe>
```

El juego ocupa todo el iframe (es una pantalla de juego, no una página), así que conviene darle
un alto fijo. `allow="web-share; clipboard-write; fullscreen"` hace falta para que, desde dentro del
iframe, funcionen el botón de compartir del teléfono, el de copiar enlace y el de pantalla completa. Los enlaces que se regalan llevan
la piel (`?marca=mercio`) pero no el `embed`: quien los recibe abre la guagua a pantalla entera.

## Cómo viaja una guagua

No hay servidor. La guagua son tres cosas: la masa (`a`, una lista de bolitas y chorizos), la
cocción (`k`) y la decoración (`o`, trazos de manga, rosetas, grageas, pasas, caritas y
mordiscos), todo en centésimas de unidad. Los enlaces de la versión anterior (`v: 2`) se
traducen solos al formato de ahora (`v: 3`). La receta se comprime con `deflate-raw` y va en el enlace, después
del `#`, así que tampoco llega a GitHub. La vitrina vive en el `localStorage` de cada navegador.
