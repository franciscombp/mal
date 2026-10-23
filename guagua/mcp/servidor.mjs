#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   Guagua de pan · servidor MCP
   Deja que una IA amase, hornee y decore una guagua de pan desde
   un chat, con lo que sabe de la persona: el molde, el nombre, a
   quién va, unas palabras, un vale o una dedicatoria a quien ya no
   está. Devuelve el enlace que abre la guagua en 3D en el juego.

   No dibuja nada: la receta es solo datos (ver ../masa.js). La imagen
   la hace el navegador de quien abre el enlace.

   Se habla por stdio:  node servidor.mjs
   ══════════════════════════════════════════════════════════════ */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  DIRECCION, NOMBRES, MENSAJES, MENSAJES_MEMORIA, MENSAJE_GUAGUAU, VALES, CREMAS,
  COCCION, amasarReceta, codificar, decodificar, tieneCara, queEs, nombreDe, punto,
} from '../masa.js';

const BASE = process.env.GUAGUA_URL || 'https://' + DIRECCION + '/';

const DESCRIPCION_MOLDE = {
  guagua: 'la guagua de siempre: cuerpo de huevo y cabeza redonda, de pie',
  tradicional: 'la de panadería: más larga, con colita cónica',
  guaguau: 'un perrito de pan echado, que se mira desde arriba',
  dormilon: 'un perrito dormido hecho un ovillo: el cuerpo es una media dona, con la cabeza apoyada, orejitas caídas y ojos cerrados',
  caballito: 'un caballito de perfil',
  chanchito: 'un chanchito gordito',
  gallinita: 'una gallinita con su cresta',
};
/* Amasa, hornea y decora, todo sin pantalla (ver amasarReceta en ../masa.js). */
async function amasar(args) {
  const e = amasarReceta(args);
  return { e, url: BASE + '#r=' + await codificar(e) };
}

function describir(e) {
  const v = punto(e.k / 100);
  const partes = [
    `${queEs(e).charAt(0).toUpperCase() + queEs(e).slice(1)} de pan que se llama «${nombreDe(e)}»`,
    `horneada: ${v.t.toLowerCase()}`,
    `${e.o.length} decoraciones` + (tieneCara(e) ? ', con carita pintada' : ', sin carita'),
  ];
  if (e.t === 'm') partes.push(`dedicada en memoria de ${e.p || 'quien ya no está'}`);
  else if (e.p) partes.push(`para ${e.p}`);
  if (e.d) partes.push(`de ${e.d}`);
  if (e.l && VALES[e.l]) partes.push(VALES[e.l].titulo.toLowerCase());
  if (e.m) partes.push(`mensaje: «${e.m}»`);
  return partes.join(' · ');
}

const server = new McpServer({ name: 'guagua-de-pan', version: '1.0.0' });

server.registerTool('despensa', {
  title: 'Qué hay en la panadería',
  description: 'Lista los moldes, las cremas, los vales y los mensajes sugeridos para armar una guagua de pan. Úsala antes de crear una si no sabes qué pedir.',
  inputSchema: {},
}, async () => ({
  content: [{ type: 'text', text: JSON.stringify({
    moldes: Object.keys(DESCRIPCION_MOLDE).map((k) => ({ id: k, es: DESCRIPCION_MOLDE[k], nombresTipicos: (NOMBRES[k] || []).slice(0, 6) })),
    cremas: CREMAS.map((c) => c.n).filter((n) => n !== 'Chocolate'),
    coccion: Object.keys(COCCION),
    vales: VALES.map((v, i) => (v ? { id: i, es: v.titulo } : { id: 0, es: 'Nada más' })),
    mensajes: { regalo: MENSAJES, memoria: MENSAJES_MEMORIA, guaguau: MENSAJE_GUAGUAU },
    juego: BASE,
  }, null, 1) }],
}));

server.registerTool('crear_guagua', {
  title: 'Amasar una guagua de pan',
  description: [
    'Amasa, hornea y decora una guagua de pan para el Día de Difuntos (2 de noviembre, Ecuador) y devuelve el enlace para abrirla en 3D, compartirla o regalarla.',
    'Elige el molde según la persona (un perrito, «guaguau», si tenía o quería a un perro). Pon su nombre en `para`, el de quien la manda en `de` y unas palabras breves y cariñosas en `mensaje`.',
    'Si es para recordar a alguien que ya no está, usa `dedicada: true`: la guagua sale con una velita y «En memoria de…».',
    'Si es un regalo, puede llevar un vale: 1 = vale por una guagua de verdad, 2 = invitación a una colada morada, 3 = «pásala» (quien la recibe le amasa una a alguien más).',
  ].join(' '),
  inputSchema: {
    molde: z.enum(Object.keys(DESCRIPCION_MOLDE)).default('guagua').describe('La forma del pan'),
    nombre: z.string().max(40).optional().describe('Cómo se llama la guagua (si no, se elige un nombre de panadería)'),
    para: z.string().max(40).optional().describe('Para quién es, o a quién se dedica'),
    de: z.string().max(40).optional().describe('Quién la manda'),
    mensaje: z.string().max(160).optional().describe('Unas palabras, en español, cortas'),
    dedicada: z.boolean().default(false).describe('true si es en memoria de alguien que ya no está'),
    vale: z.number().int().min(0).max(3).default(0).describe('0 nada, 1 guagua de verdad, 2 colada morada, 3 pásala'),
    coccion: z.enum(Object.keys(COCCION)).default('punto').describe('Cuánto horno'),
    decoracion: z.enum(['panaderia', 'carita', 'ninguna']).default('panaderia').describe('«panaderia» la decora con glaseado y carita; «carita» solo le pinta la cara; «ninguna» la deja lisa para decorarla en el juego'),
    colores: z.array(z.string()).optional().describe('Cremas preferidas, por nombre de la despensa (p. ej. ["Rosa", "Celeste"])'),
    semilla: z.number().int().optional().describe('Para repetir exactamente la misma decoración'),
  },
}, async (args) => {
  const { e, url } = await amasar(args);
  return {
    content: [{ type: 'text', text: JSON.stringify({ enlace: url, resumen: describir(e), receta: e }, null, 1) }],
  };
});

server.registerTool('leer_guagua', {
  title: 'Abrir un enlace de guagua',
  description: 'Lee un enlace de guagua de pan (con #r=… o la parte después de #r=) y cuenta qué trae: molde, nombre, para quién, mensaje, vale, cocción y decoraciones.',
  inputSchema: { enlace: z.string().describe('El enlace completo o solo el código después de #r=') },
}, async ({ enlace }) => {
  const m = enlace.match(/#r=([^&\s]+)/);
  const cod = m ? m[1] : enlace.trim();
  try {
    const e = await decodificar(cod);
    return { content: [{ type: 'text', text: JSON.stringify({ resumen: describir(e), receta: e }, null, 1) }] };
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: 'No se pudo abrir esa guagua: ' + (err && err.message) }] };
  }
});

const transporte = new StdioServerTransport();
await server.connect(transporte);
