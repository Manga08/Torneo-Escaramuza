# El Rey de la Escaramuza – Edición #1

Landing estática estilo broadcast esports para sortear los mapas del modo Escaramuza / Team Deathmatch de VALORANT. Lista para desplegar en GitHub Pages.

## Características principales

- Animación tipo slot machine + glitch + destellos al revelar los mapas del modo Escaramuza (identificados como Mapa A, B o C).
- Botón "Randomizar mapa" con efecto neón, modo sin repetición, historial (últimos 5) y reinicio rápido.
- Toggle de sonido con fallback Web Audio, confetti ligero vía CDN y modo streamer con botón flotante/Escape para salir.
- Persistencia en `localStorage` del último mapa, historial, estado del modo sin repetición, tema alternativo y sonido.
- Diseño responsive con tipografías Orbitron + Rajdhani, scanlines, partículas y dos temas (verde neón y azul/púrpura).

## Estructura

```
/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── assets/
│   ├── crown.svg
│   └── sfx.mp3  ← placeholder (ver nota)
└── README.md
```

## Uso local

1. Clona el repositorio o descarga el ZIP.
2. Abre `index.html` en tu navegador (no requiere servidor para funcionar).
3. Activa/desactiva sonido, modo sin repetición, modo streamer o el tema alterno según necesites.

> Si prefieres servir la página con hot reload, un comando rápido es `npx serve` (o cualquier servidor estático).

## Publicar en GitHub Pages

1. Haz push al repositorio en GitHub.
2. Ve a **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona la rama (`main`) y la carpeta raíz `/`.
5. Guarda. En unos minutos la landing estará disponible.

## Personalización

- **Colores:** ajusta las variables CSS en `:root` dentro de `css/styles.css` (`--bg`, `--neon`, `--accent`, `--text`, etc.).
- **Tipografías:** edita los `<link>` de Google Fonts en `index.html` si prefieres otras fuentes.
- **Animaciones:** los keyframes (`slotSpin`, `neonFlicker`, `glitch`, etc.) están en `css/styles.css` bajo la sección correspondiente.
- **Audio:** reemplaza `assets/sfx.mp3` por un efecto de sonido breve libre de derechos. El script detecta fallos de reproducción y genera un beep con Web Audio como respaldo.
- **Logos / branding extra:** coloca assets adicionales en `assets/` y referencia desde el HTML.

## Accesibilidad y rendimiento

- Contrastes AA en textos clave, foco visible en botones y toggles accesibles con teclado.
- La tecla espacio/enter lanza el sorteo (se ignora cuando se escribe en un control).
- Animaciones respetan `prefers-reduced-motion`.
- Dependencias externas mínimas (`canvas-confetti` via CDN). Lighthouse desktop ≥ 90 al usar assets optimizados.

## Trabajo futuro sugerido

1. Reemplazar `assets/sfx.mp3` por audio propio y ajustar `playSound` si deseas múltiples efectos.
2. Añadir analytics o contador de sorteos si se transmite en vivo.
3. Integrar más mapas o modos extendiendo el arreglo `MAPS` en `js/app.js`.

¡Disfruta la experiencia de broadcast para tus sorteos de Escaramuza!
