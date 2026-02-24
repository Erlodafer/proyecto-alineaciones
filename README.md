# Control de Alineaciones - Aplicación Web

Aplicación web desarrollada con Google Apps Script para gestionar alineaciones de equipos de fútbol, con integración a GitHub Gist para compartir datos con Singular.live.

## Características

- **Gestión de partidos**: Crear, renombrar y eliminar pestañas de partidos
- **Gestión de torneos**: Agregar, configurar y eliminar torneos
- **Gestión de equipos**: Crear equipos con hojas en Google Sheets
- **Alineaciones**: Seleccionar titulares y suplentes por dorsal
- **Director Técnico**: Agregar DT con formato configurable
- **Plantel completo**: Ver y gestionar todos los jugadores del equipo
- **Integración GitHub**: Publicar equipos en formato JSON para Singular.live
- **Diagnóstico**: Herramienta para verificar conexión con GitHub

## Estructura de archivos

- `Codigo.gs` - Backend en Google Apps Script
- `Index.html` - Interfaz principal
- `styles.css` - Estilos CSS separados
- `script.js` - JavaScript del frontend separado
- `README.md` - Este archivo

## Configuración

1. Crear un proyecto en Google Apps Script
2. Copiar el contenido de `Codigo.gs` en el editor de código
3. Crear archivos HTML con los nombres correspondientes:
   - `Index.html` con el contenido del archivo HTML
4. Configurar las variables en `Codigo.gs`:
   - `CONFIG_SHEET_ID`: ID del
