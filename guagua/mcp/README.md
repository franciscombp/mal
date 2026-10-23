# Guagua de pan · servidor MCP

Un servidor [MCP](https://modelcontextprotocol.io) para que una IA, desde un chat, amase,
hornee y decore una guagua de pan con lo que sabe de la persona, y devuelva el enlace que la
abre en 3D en el juego. Sirve para regalarla, para dedicarla a quien ya no está, o para que la
persona la termine de decorar a mano.

No dibuja nada: la receta es solo datos (`../masa.js`, el mismo módulo que usa el juego). La
imagen y el 3D los hace el navegador de quien abre el enlace.

## Herramientas

- **`despensa`** — qué hay: moldes, cremas, vales, cocciones y mensajes sugeridos.
- **`crear_guagua`** — amasa una guagua y devuelve `enlace`, `resumen` y la `receta`.
  - `molde`: `guagua`, `tradicional`, `guaguau` (perrito), `caballito`, `chanchito`, `gallinita`.
  - `nombre`, `para`, `de`, `mensaje` (≤ 160 caracteres, en español).
  - `dedicada: true` para alguien que ya no está (sale con velita y «En memoria de…»).
  - `vale`: `1` vale por una guagua de verdad · `2` invitación a colada morada · `3` pásala.
  - `coccion`: `blanquita`, `punto`, `tostada`, `quemada`.
  - `decoracion`: `panaderia` (glaseado fino y carita, como «Sorpréndeme») o `ninguna`.
  - `colores`: cremas preferidas por nombre, p. ej. `["Rosa", "Celeste"]`.
  - `semilla`: para repetir exactamente la misma decoración.
- **`leer_guagua`** — abre un enlace y cuenta qué trae.

## Usarlo

```sh
cd guagua/mcp && npm install
node servidor.mjs          # habla MCP por stdio
npm test                   # prueba de humo: crea y lee una guagua
```

Con Claude Code:

```sh
claude mcp add guagua -- node /ruta/al/repo/guagua/mcp/servidor.mjs
```

Con Claude Desktop u otro cliente, en su configuración de servidores MCP:

```json
{ "mcpServers": { "guagua": { "command": "node", "args": ["/ruta/al/repo/guagua/mcp/servidor.mjs"] } } }
```

La variable `GUAGUA_URL` cambia la dirección del juego en los enlaces (por defecto,
`https://franciscombp.github.io/mal/guagua/`).

## Un ejemplo de conversación

> «Hazle una guagua a mi abuela Rosa, que ya no está. Le encantaba la colada morada.»

La IA llama a `crear_guagua` con `molde: "tradicional"`, `para: "mi abuela Rosa"`,
`dedicada: true` y un mensaje corto, y responde con el enlace. Quien lo abre ve la guagua en 3D,
con su velita, y puede compartirla en sus redes o dedicar una también.
