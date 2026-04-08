# video-converter-be

Backend REST API + WebSocket para **Web-Utils** — una plataforma de utilidades web.

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | — | Runtime |
| Express | ^5.2.1 | Servidor HTTP |
| Socket.io | ^4.8.3 | Tiempo real (WebSockets) |
| fluent-ffmpeg + ffmpeg-static | ^2.1.3 / ^5.3.0 | Conversión de video |
| Multer | ^2.1.1 | Upload de archivos |
| Axios | ^1.x | Peticiones HTTP a APIs externas |
| NodeCache | — | Caché en memoria |
| Zod | — | Validación de schemas |
| dotenv | — | Variables de entorno |

---

## Arquitectura de módulos

```
src/
├── config/
│   └── features.js                            # Config global parseada desde FEATURES_SETTINGS
├── modules/
│   ├── video-format-converter/
│   │   ├── lib/ffmpeg.lib.js                  # Wrapper de fluent-ffmpeg
│   │   ├── util/file-cleanup.util.js          # safeDelete helper
│   │   ├── uploads/raw/ + processed/          # Temporales (auto-creadas)
│   │   ├── video-format-converter.middleware.js
│   │   ├── video-format-converter.route.js
│   │   ├── video-format-converter.controller.js
│   │   └── video-format-converter.service.js
│   └── music-search/
│       ├── lib/jamendo.lib.js                 # Wrapper de la API Jamendo
│       ├── music-search.model.js              # Schemas Zod
│       ├── music-search.route.js
│       ├── music-search.controller.js
│       └── music-search.service.js
└── server.js                                  # Composition root
```

---

## API Reference

### Módulo: `video-format-converter`

#### `POST /api/convert/upload`

Acepta lote de archivos `.mov`, responde `202` inmediatamente y convierte en background.

| Campo | Tipo | Descripción |
|---|---|---|
| `videos` | `File[]` | Archivos MOV (`multipart/form-data`) |
| `socketId` | `string` | ID del socket del cliente (requerido) |

**Respuesta `202`:**
```json
{ "message": "Files accepted for processing", "count": 2 }
```

#### `GET /api/convert/download/:filename`

Sirve el archivo MP4 convertido. Lo elimina del disco solo si la transferencia es exitosa.

---

#### Eventos WebSocket (Socket.io)

| Evento | Payload |
|---|---|
| `conversion:progress` | `{ file, status: "processing" }` |
| `conversion:success` | `{ originalName, resultName, downloadUrl }` |
| `conversion:error` | `{ file, error }` |
| `conversion:complete` | `{ message, summary: [{name, status}] }` |

---

### Módulo: `music-search`

#### `GET /api/v1/music/search`

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `q` | string | — | Término de búsqueda |
| `genre` | string | — | Filtro por género |
| `order` | `popular\|latest` | `popular` | Orden de resultados |
| `per_page` | number | `20` | Resultados por página (3–200) |
| `page` | number | `1` | Página |

**Respuesta `200`:**
```json
{
  "total": 500,
  "results": [
    {
      "id": "12345",
      "title": "Ambient Nature",
      "duration": 185,
      "tags": ["calm", "relaxing"],
      "user": "artist_name",
      "previewUrl": "https://api.example.com/api/v1/music/preview/12345",
      "downloadUrl": "https://jamendo.com/music/download/..."
    }
  ]
}
```

#### `GET /api/v1/music/preview/:id`

Proxy/túnel del stream de audio hacia el cliente. No expone credenciales ni URLs de Jamendo.

- Soporta caché de URL de preview (10 min por defecto)
- Fallback: consulta Jamendo por ID si no está en caché
- Memoria baja: usa `res.pipe()`, sin buffering del archivo completo

---

#### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-04-06T..." }
```

---

## Configuración — `FEATURES_SETTINGS`

Variable de entorno con un JSON que centraliza toda la configuración:

```json
{
  "feats": {
    "converter": {
      "fileMaxSize": 500
    },
    "musicSearch": {
      "cacheTTL": 600,
      "requestTimeout": 5000
    }
  },
  "keys": {
    "jamendo": {
      "clientId": "ASD-123"
    }
  }
}
```

En el `.env` debe ser una línea:
```
FEATURES_SETTINGS={"feats":{"converter":{"fileMaxSize":500},"musicSearch":{"cacheTTL":600,"requestTimeout":5000}},"keys":{"jamendo":{"clientId":"TU_KEY"}}}
```

---

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor |
| `FRONTEND_URL` | `*` | Origen permitido en CORS y Socket.io |
| `FEATURES_SETTINGS` | (ver arriba) | Config JSON de featutas y API keys |

---

## Setup

```bash
npm install
npm run dev     # nodemon — desarrollo
npm run start   # producción
```

> Obtén tu API key de Jamendo en: https://devportal.jamendo.com/apis/v3_0/oauth_client
