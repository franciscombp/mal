/* Prueba de humo: levanta el servidor por stdio y le pide una guagua. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const cliente = new Client({ name: 'prueba', version: '1.0.0' });
await cliente.connect(new StdioClientTransport({ command: process.execPath, args: [join(aqui, 'servidor.mjs')] }));

const { tools } = await cliente.listTools();
console.log('herramientas:', tools.map((t) => t.name).join(', '));

const r = await cliente.callTool({ name: 'crear_guagua', arguments: {
  molde: 'guaguau', nombre: 'Lobita', para: 'Lobita', de: 'Francisco', dedicada: true, semilla: 7,
} });
const d = JSON.parse(r.content[0].text);
console.log('resumen:', d.resumen);
console.log('enlace:', d.enlace.slice(0, 90) + '… (' + d.enlace.length + ' caracteres)');

const l = await cliente.callTool({ name: 'leer_guagua', arguments: { enlace: d.enlace } });
console.log('leída:', JSON.parse(l.content[0].text).resumen);

const v = await cliente.callTool({ name: 'crear_guagua', arguments: { molde: 'guagua', para: 'Ana', de: 'Pancho', vale: 2, colores: ['Rosa', 'Celeste'] } });
console.log('regalo:', JSON.parse(v.content[0].text).resumen);
await cliente.close();
