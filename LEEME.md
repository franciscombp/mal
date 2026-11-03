# mal — una.red

El sitio de **MAL** (nombre legal: Mal S.A.S.), la casa matriz de Francisco Maldonado: [una.red](https://una.red).
Lo sirve Cloudflare (`workers/una-red/`) desde el GitHub Pages de este repo.

## Qué vive dónde

| Marca | Qué es | Dónde está el código |
|---|---|---|
| **Quesf** | Estudio de videojuegos: juegos y tradiciones del Ecuador y de América Latina | [quesf-ec](https://github.com/quesf-ec) (coches, boliche, guaguas, fanesca, perfil) |
| **EL MERCIO.** | Sátira y política, desde 2009 | [elmercio](https://github.com/elmercio) (estadodecepcion, verdad); el periódico es WordPress |
| **Modo Inc** | Solo el juego Modo Incógnito | `modo-inc` (por ahora en franciscombp/modo-incognito) |
| **Acolita** | Colectas y regalos entre panas | acolita.org, WordPress en el hosting |
| Laboratorio | Las pruebas de concepto de Fran | aquí y en [franciscombp](https://github.com/franciscombp) |
| mal-ds | El sistema de diseño | [franciscombp/ds](https://github.com/franciscombp/ds), en `una.red/ds/` |

## Este repo

- `index.html`: la portada de MAL, por marcas.
- `apps/`: la ficha de cada proyecto, que incrusta el juego o la app desde su repo.
- `lamparometro/`, `leyendas/`, `umbral/`, `renuncia/`: pruebas de concepto que viven aquí
  hasta que pasan a su marca.
- `perfil/`: copia del perfil compartido mientras `quesf-ec/perfil` no publique en Pages.
- `portafolio/`: el portafolio de Fran, que se sirve en [maldonado.pro](https://maldonado.pro).
- `workers/`: el código de los Workers de Cloudflare de una.red y maldonado.pro.

Cuando un proyecto madura y pasa a su organización, sale de aquí con su historial
(`git filter-repo`) y el Worker de una.red lo sigue sirviendo en la misma ruta.
