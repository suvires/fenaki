# Política de cookies

Última actualización: [FECHA DE PUBLICACIÓN]

## 1. Qué son las cookies y tecnologías similares

Una cookie es un pequeño archivo que un sitio web guarda en tu navegador para recordar información. Esta política también cubre tecnologías parecidas, como el almacenamiento local del navegador (`localStorage`) y los píxeles, porque la ley las trata igual (art. 22.2 de la LSSI). La seguimos conforme a la [Guía sobre el uso de las cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf).

## 2. Cómo usa Shortix las cookies, en resumen

- **Sin cookies de analítica ni de publicidad.** Medimos las visitas con Umami, que no usa cookies.
- **Solo usamos las cookies técnicas** necesarias para que el sitio funcione, sea seguro y recuerde tu elección sobre cookies. No necesitan consentimiento (art. 22.2 LSSI).
- **Los reproductores de YouTube y Vimeo solo se cargan si das tu consentimiento.** Hasta entonces, cada ficha muestra una imagen del corto con un aviso; el reproductor y sus cookies no se cargan.

Si en el futuro usamos herramientas con cookies de analítica o publicidad, solo se activarán con tu consentimiento y actualizaremos esta política antes.

## 3. Tu consentimiento

La primera vez que entras, un banner te permite **aceptar todo, rechazar todo o configurar** por categorías, con botones del mismo nivel. Rechazar no te impide navegar por el catálogo: solo verás los cortos de YouTube y Vimeo tras aceptar sus cookies, ya sea en el banner o en el propio reproductor de cada ficha.

**Cambiar o retirar tu consentimiento.** En cualquier momento, desde el enlace «Configurar cookies» del pie de página. Retirar el consentimiento es tan fácil como darlo.

Recordamos tu elección durante [12 meses]; pasado ese plazo, o si cambiamos las cookies que usamos, te volveremos a preguntar.

## 4. Cookies y tecnologías que usamos

### 4.1 Técnicas (necesarias, sin consentimiento)

| Nombre                                          | Proveedor                          | Finalidad                                                                 | Duración                                                  | Tipo                                                                                                                                                                |
| ----------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookieyes-consent`                             | Shortix (gestionada por CookieYes) | Guardar tu elección sobre cookies y el identificador de tu consentimiento | 1 año                                                     | Propia, persistente                                                                                                                                                 |
| `__cf_bm`                                       | Cloudflare                         | Distinguir personas de bots y proteger el sitio                           | 30 minutos                                                | Propia (dominio de Shortix), de sesión corta. Solo si se activa la gestión de bots [COMPLETAR]                                                                      |
| `cf_clearance`                                  | Cloudflare                         | Recordar que has superado una verificación de seguridad                   | Según configuración (por defecto, 30 minutos) [COMPLETAR] | Propia, solo si se muestra una verificación                                                                                                                         |
| `_cfuvid`                                       | Cloudflare                         | Limitar el número de peticiones por visitante (protección)                | Sesión                                                    | Propia. Solo si se activan reglas de limitación [COMPLETAR]                                                                                                         |
| [COMPLETAR: por ejemplo, preferencia de idioma] | Shortix                            | Recordar el idioma elegido, cuando haya más de uno                        | [COMPLETAR]                                               | Propia, `localStorage` o cookie                                                                                                                                     |
| [COMPLETAR: sesión de usuario]                  | Shortix                            | Mantener la sesión iniciada (cuando haya cuentas, fase 3)                 | [COMPLETAR]                                               | Propia                                                                                                                                                              |
| `__stripe_mid`, `__stripe_sid`                  | Stripe                             | Prevención del fraude en el pago                                          | 1 año y 30 minutos                                        | De terceros. Solo si el pago se integra en una página de Shortix; con enlaces de pago, estas cookies se instalan en el dominio de Stripe, no en Shortix [COMPLETAR] |

Fuente de las cookies de Cloudflare: [documentación de Cloudflare sobre sus cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/). Fuente de la cookie de CookieYes: [documentación de CookieYes](https://www.cookieyes.com/documentation/record-user-consent-for-cookies/).

### 4.2 Analítica sin cookies (no instala nada en tu dispositivo)

| Herramienta | Proveedor                                 | Qué hace                                                                                          | Cookies o almacenamiento                                                                                                 |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Umami       | Shortix (autoalojado en nuestro servidor) | Cuenta visitas, páginas vistas y eventos (por ejemplo, «reproducción iniciada») de forma agregada | Ninguno. Calcula en el servidor un identificador anónimo y rotatorio a partir de la IP y el navegador, sin guardar la IP |

### 4.3 Contenido de terceros: reproductores de YouTube y Vimeo (requieren consentimiento)

Estas cookies las instala y controla el proveedor del reproductor, no Shortix. Solo se cargan después de que aceptes la categoría «Contenido de terceros» (o el aviso del reproductor). Para YouTube usamos el modo de privacidad mejorada (`youtube-nocookie.com`), que no instala cookies hasta que reproduces el vídeo. Para Vimeo usamos el parámetro `dnt=1`, que desactiva el seguimiento del reproductor.

| Nombre                                                       | Proveedor              | Finalidad (según el proveedor)                                       | Duración                                                 | Tipo        |
| ------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| `YSC`                                                        | Google (YouTube)       | Estadísticas de reproducción y seguridad                             | Sesión                                                   | De terceros |
| `VISITOR_INFO1_LIVE`                                         | Google (YouTube)       | Estimar el ancho de banda y recordar preferencias del reproductor    | ~6 meses                                                 | De terceros |
| `VISITOR_PRIVACY_METADATA`                                   | Google (YouTube)       | Guardar el estado de consentimiento del usuario en YouTube           | ~6 meses                                                 | De terceros |
| `yt-remote-*`, `ytidb::LAST_RESULT_ENTRY_KEY`, `yt-player-*` | Google (YouTube)       | Preferencias del reproductor y de reproducción en otros dispositivos | Persistente / sesión (`localStorage` y `sessionStorage`) | De terceros |
| [COMPLETAR: otras de YouTube detectadas en el escaneo]       | Google (YouTube)       | [COMPLETAR]                                                          | [COMPLETAR]                                              | De terceros |
| `vuid`                                                       | Vimeo                  | Analítica de Vimeo (sin `dnt=1`)                                     | ~2 años                                                  | De terceros |
| `player`                                                     | Vimeo                  | Preferencias del reproductor                                         | ~1 año                                                   | De terceros |
| `__cf_bm`                                                    | Vimeo (vía Cloudflare) | Protección frente a bots en el dominio de Vimeo                      | 30 minutos                                               | De terceros |
| [COMPLETAR: otras de Vimeo detectadas en el escaneo]         | Vimeo                  | [COMPLETAR]                                                          | [COMPLETAR]                                              | De terceros |

Más información: [cómo usa Google las cookies](https://policies.google.com/technologies/cookies?hl=es), [política de cookies de Vimeo](https://vimeo.com/cookie_policy).

### 4.4 Gestor de consentimiento

| Herramienta                     | Proveedor                       | Qué hace                                                                                                 | Cookies                                                                                                |
| ------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Banner y centro de preferencias | CookieYes Limited (Reino Unido) | Muestra el banner, bloquea las cookies sujetas a consentimiento hasta que aceptas y registra tu elección | `cookieyes-consent` (ver 4.1). El registro de consentimientos se guarda en los servidores de CookieYes |

### 4.5 Analítica con cookies y publicidad

No se usan. Si se incorporan (por ejemplo, Google Analytics 4 con el modo de consentimiento o píxeles de campañas), se añadirá aquí cada cookie y se activará solo con tu consentimiento.

## 5. Desactivar las cookies desde el navegador

Además del banner, puedes bloquear o borrar las cookies desde la configuración de tu navegador. Si bloqueas las técnicas, algunas partes del sitio pueden no funcionar.

- [Chrome](https://support.google.com/chrome/answer/95647?hl=es)
- [Firefox](https://support.mozilla.org/es/kb/Borrar%20cookies)
- [Safari](https://support.apple.com/es-es/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/es-es/microsoft-edge)

## 6. Más información

Responsable y derechos: consulta la [política de privacidad](/es/privacidad). Contacto: [CORREO DE CONTACTO].
