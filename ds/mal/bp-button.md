# bp-button · Botón de Acción

Botón versátil del Solar Design System con soporte para múltiples variantes, estados y tamaños.

## Características

- ✅ **5 variantes** de estilo (primary, secondary, tertiary, accent, destructive)
- ✅ **6 estados** (default, hover, focus, pressed, disabled, loading)
- ✅ **3 tamaños** (default, small, large)
- ✅ **Ícono opcional** integrado
- ✅ **Accesibilidad completa** (focus-visible, aria-busy, aria-disabled)
- ✅ **Respeta prefers-reduced-motion**
- ✅ **Responsive** (se adapta a móviles)

## Uso Básico

```html
<button class="bp-button" data-variant="primary">
  <span class="bp-button__label">Aceptar</span>
</button>
```

## Variantes

### Primary (Amarillo)
CTA principal de la pantalla. Úsalo para confirmar, continuar o enviar.

```html
<button class="bp-button" data-variant="primary">
  <span class="bp-button__label">Continuar</span>
</button>
```

**Colores:**
- Fondo: `#fd0` (amarillo brillante)
- Texto: `#0f265c` (azul oscuro)
- Hover: `#ffcb00`
- Presionado: `#ffb705`

### Secondary (Gris)
Acción secundaria, menos prominente que primary. Úsalo para cancelar o volver.

```html
<button class="bp-button" data-variant="secondary">
  <span class="bp-button__label">Cancelar</span>
</button>
```

**Colores:**
- Fondo: `#f5f5f5` (gris claro)
- Texto: `#0f265c` (azul oscuro)
- Hover: `#ececec`
- Presionado: `#e0e0e0`

### Tertiary (Link)
Estilo de enlace con subrayado. Úsalo para acciones menos importantes o "Más información".

```html
<button class="bp-button" data-variant="tertiary">
  <span class="bp-button__label">Ver más</span>
</button>
```

**Colores:**
- Fondo: `transparent`
- Texto: `#0f265c` (azul oscuro)
- Hover: `#fafafa`

### Accent (Azul Oscuro)
Acción especial o destacada que requiere atención. Contrasta con primary.

```html
<button class="bp-button" data-variant="accent">
  <span class="bp-button__label">Favorito</span>
</button>
```

**Colores:**
- Fondo: `#030c2d` (azul oscuro)
- Texto: `white`
- Hover: `#061239`
- Presionado: `#091944`

### Destructive (Rojo)
Acción destructiva como eliminar o borrar. Requiere confirmación del usuario.

```html
<button class="bp-button" data-variant="destructive">
  <span class="bp-button__label">Eliminar</span>
</button>
```

**Colores:**
- Fondo: `#fceded` (rojo muy claro)
- Texto: `#980101` (rojo oscuro)
- Hover: `#d50707` (rojo brillante, texto blanco)
- Presionado: `#d50707`

## Estados

Los estados se aplican automáticamente con CSS `:hover`, `:focus-visible`, `:active` y `:disabled`. No requieren props adicionales.

### Default
Estado normal del botón.

```html
<button class="bp-button" data-variant="primary">
  <span class="bp-button__label">Normal</span>
</button>
```

### Hover
Se activa automáticamente al pasar el mouse.

```html
<!-- Se aplica automáticamente con :hover -->
<button class="bp-button" data-variant="primary">
  <span class="bp-button__label">Hover</span>
</button>
```

### Focus
Se activa al tabular o hacer click. Muestra un ring de foco azul.

```html
<!-- Se aplica automáticamente con :focus-visible -->
```

### Pressed / Active
Se activa al presionar el botón.

```html
<!-- Se aplica automáticamente con :active -->
```

También puedes forzar este estado para demostración:

```html
<button class="bp-button" data-variant="primary" data-state="pressed">
  <span class="bp-button__label">Presionado</span>
</button>
```

### Disabled
Deshabilita el botón completamente.

```html
<button class="bp-button" data-variant="primary" disabled>
  <span class="bp-button__label">Deshabilitado</span>
</button>
```

### Loading
Muestra un spinner giratorio. El texto desaparece.

```html
<button class="bp-button" data-variant="primary" aria-busy="true">
  <span class="bp-button__label">Guardando...</span>
</button>
```

**Con JavaScript:**
```javascript
// Iniciar carga
button.setAttribute('aria-busy', 'true');
button.disabled = true;

// Terminar carga
button.removeAttribute('aria-busy');
button.disabled = false;
```

## Tamaños

### Default (56px)
El tamaño estándar para la mayoría de casos.

```html
<button class="bp-button">
  <span class="bp-button__label">Default</span>
</button>
```

### Small (40px)
Para espacios compactos o acciones secundarias.

```html
<button class="bp-button" data-size="small">
  <span class="bp-button__label">Pequeño</span>
</button>
```

### Large (64px)
Para CTAs principales que requieren más presencia visual.

```html
<button class="bp-button" data-size="large">
  <span class="bp-button__label">Grande</span>
</button>
```

### Icon Only
Solo ícono, sin texto. Útil para acciones compactas.

```html
<button class="bp-button" data-size="icon" title="Más opciones">
  <svg class="bp-button__icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2zm0 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 6c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z"/>
  </svg>
</button>
```

## Con Ícono

Combina ícono y texto para acciones más claras.

```html
<button class="bp-button" data-variant="primary">
  <svg class="bp-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 5v14M5 12h14"/>
  </svg>
  <span class="bp-button__label">Agregar</span>
</button>
```

**Notas:**
- El ícono va ANTES del texto
- Usa `currentColor` para que herede el color del botón
- Los ícono SVG se redimensionan automáticamente

## Ancho

### Default (inline)
Ancho automático según el contenido.

```html
<button class="bp-button">
  <span class="bp-button__label">Auto</span>
</button>
```

### Full Width
Ocupa todo el ancho disponible.

```html
<button class="bp-button" data-width="full">
  <span class="bp-button__label">Ancho completo</span>
</button>
```

Útil en formularios o modales.

## Grupo de Botones

### Horizontal

```html
<div class="bp-button-group">
  <button class="bp-button" data-variant="secondary">
    <span class="bp-button__label">Cancelar</span>
  </button>
  <button class="bp-button" data-variant="primary">
    <span class="bp-button__label">Aceptar</span>
  </button>
</div>
```

### Vertical

```html
<div class="bp-button-group vertical">
  <button class="bp-button" data-variant="primary" data-width="full">
    <span class="bp-button__label">Acción 1</span>
  </button>
  <button class="bp-button" data-variant="secondary" data-width="full">
    <span class="bp-button__label">Acción 2</span>
  </button>
</div>
```

## Accesibilidad

### Focus Visible
El botón muestra un ring azul cuando se enfoca con el teclado:

```html
<button class="bp-button">
  <!-- El ring se muestra automáticamente -->
</button>
```

### Aria Attributes

```html
<!-- Para estado de carga -->
<button class="bp-button" aria-busy="true">
  <span class="bp-button__label">Cargando...</span>
</button>

<!-- Para deshabilitado -->
<button class="bp-button" disabled aria-disabled="true">
  <span class="bp-button__label">Deshabilitado</span>
</button>

<!-- Para describir acción destructiva -->
<button class="bp-button" data-variant="destructive" aria-label="Eliminar este elemento">
  <span class="bp-button__label">Eliminar</span>
</button>
```

### Respeta Preferencias de Movimiento

Si el usuario tiene `prefers-reduced-motion: reduce`, el spinner se detiene:

```css
@media (prefers-reduced-motion: reduce) {
  .bp-button[aria-busy="true"]::after {
    animation: none;
  }
}
```

## Ejemplo Completo

```html
<!-- Botones de formulario -->
<form>
  <input type="email" placeholder="tu@email.com" required />
  
  <div class="bp-button-group">
    <button type="reset" class="bp-button" data-variant="secondary">
      <span class="bp-button__label">Limpiar</span>
    </button>
    <button type="submit" class="bp-button" data-variant="primary" id="submit-btn">
      <span class="bp-button__label">Enviar</span>
    </button>
  </div>
</form>

<script>
const form = document.querySelector('form');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Mostrar estado de carga
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.disabled = true;
  
  try {
    // Simular envío
    await new Promise(r => setTimeout(r, 2000));
    console.log('¡Enviado!');
  } finally {
    // Ocultar estado de carga
    submitBtn.removeAttribute('aria-busy');
    submitBtn.disabled = false;
  }
});
</script>
```

## Variables CSS Personalizables

Puedes personalizar los colores en tu `:root`:

```css
:root {
  /* Colores primary */
  --bp-button-primary-bg: #fd0;
  --bp-button-primary-bg-hover: #ffcb00;
  --bp-button-primary-bg-active: #ffb705;
  --bp-button-primary-fg: #0f265c;
  
  /* Tamaños */
  --bp-button-height: 56px;
  --bp-button-padding-x: 24px;
  --bp-button-radius: 8px;
}
```

## Limitaciones Conocidas

- El componente NO es un Web Component, es HTML semántico + CSS
- El estado de carga se controla con `aria-busy`, no con un prop de React
- Los ícono deben ser SVG o IMG dentro de `.bp-button__icon`
- No hay soporte para dropdown o split buttons (son componentes separados)

## Notas de Implementación

- **Sin JavaScript obligatorio**: Funciona con CSS puro para todos los estados
- **Semántica HTML**: Usa elementos `<button>` reales, no `<div>` estilizados
- **Mobile-first**: Se adapta automáticamente a pantallas pequeñas
- **Token-based**: Usa variables CSS para fácil personalización
- **Tested**: Funciona en todos los navegadores modernos

## Evolución desde Figma

Este componente está basado en el diseño `bp-button` del archivo Figma:
https://www.figma.com/design/Q8Xzu4JzCGv5OnXANT04WA/03.-Components-4--Beta-?node-id=649-6787

**Diferencias implementación vs. Figma:**
- ✅ Implementado en HTML/CSS/JS puro (sin React)
- ✅ Estados se aplican automáticamente (sin props de `state`)
- ✅ Spinner optimizado con CSS puro
- ✅ Personalización mediante CSS variables
- ✅ Accesibilidad mejorada con ARIA
