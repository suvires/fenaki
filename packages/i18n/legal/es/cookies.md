# Política de cookies

Última actualización: 28 de octubre de 2026

## 1. Cookies y tecnologías similares

Una cookie es un pequeño archivo que una web guarda en tu navegador para recordar información. Esta política cubre también tecnologías parecidas, como el almacenamiento local del navegador (`localStorage`), porque la ley las trata igual (art. 22.2 de la LSSI).

## 2. Uso de cookies en FENAKI

- **Sin cookies de analítica ni de publicidad.** Medimos las visitas con Umami, que no usa cookies.
- **Solo usamos lo técnicamente necesario** para que FENAKI funcione, sea seguro y recuerde tus elecciones. No necesita consentimiento (art. 22.2 LSSI).
- **Los reproductores de YouTube y Vimeo solo se cargan si aceptas.** Al pulsar «reproducir», una ventana te explica qué recibe el proveedor y qué guarda su reproductor, y solo se carga si pulsas «Aceptar y reproducir».

## 3. Consentimiento

FENAKI no muestra un banner de cookies porque no usa cookies que lo requieran. Solo los reproductores de YouTube y Vimeo (apartado 4.3) requieren tu consentimiento, que se solicita en el momento de reproducir, con dos botones del mismo nivel: «Cancelar» y «Aceptar y reproducir». Si cancelas, puedes seguir navegando por el catálogo con normalidad.

En esa ventana puedes marcar «Recordar mi elección» para que los cortos de ese proveedor se carguen sin volver a solicitar tu consentimiento. Si no la marcas, se solicitará cada vez. Sin sesión iniciada, tu elección se guarda solo en ese navegador; con la sesión iniciada, se guarda en tu cuenta y vale en todos los dispositivos donde inicies sesión. Puedes darla o retirarla en cualquier momento, con un clic, desde «Preferencias de reproducción», en el pie de página.

## 4. Cookies y tecnologías utilizadas

### 4.1 Técnicas (no requieren consentimiento)

| Nombre                     | Proveedor | Finalidad                                                                      | Duración                                                                                | Tipo                                                                                                                                                                                     |
| -------------------------- | --------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fenaki:player-consent:v1` | FENAKI    | Recordar qué reproductores (YouTube, Vimeo) has autorizado de forma permanente | Hasta que lo retires en «Preferencias de reproducción» o borres los datos del navegador | Propia, `localStorage`. Solo existe si lo eliges sin sesión iniciada; no se envía a nuestros servidores. Con la sesión iniciada, tu elección se guarda en tu cuenta, no en el navegador  |
| `fenaki:my-list:v1`        | FENAKI    | Guardar en tu navegador los cortos que añades a «Mi lista»                     | Hasta que la quites o borres los datos del navegador                                    | Propia, `localStorage`. La guardas tú al pulsar «Añadir a mi lista»; no se envía a nuestros servidores. Si tienes cuenta e inicias sesión, se añade a tu cuenta y se borra del navegador |
| `fenaki:my-ratings:v1`     | FENAKI    | Guardar en tu navegador las valoraciones que das a los cortos                  | Hasta que la quites o borres los datos del navegador                                    | Propia, `localStorage`. La guardas tú al valorar un corto; no se envía a nuestros servidores. Si tienes cuenta e inicias sesión, se añade a tu cuenta y se borra del navegador           |
| `__Host-fenaki-session`    | FENAKI    | Mantener tu sesión iniciada cuando tienes cuenta                               | 30 días como máximo; se borra al cerrar sesión o al borrar la cuenta                    | Propia, solo se instala si inicias sesión                                                                                                                                                |

Cloudflare, que protege FENAKI frente a ataques, puede instalar una cookie técnica de seguridad (como `__cf_bm` o `cf_clearance`) si detecta tráfico sospechoso o te muestra una verificación. Más información en la [documentación de Cloudflare sobre sus cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/).

### 4.2 Analítica sin cookies

Umami, instalado en nuestro propio servidor, cuenta visitas, páginas vistas y eventos (por ejemplo, «reproducción iniciada») de forma agregada. No instala nada en tu navegador ni guarda tu IP.

### 4.3 Reproductores de YouTube y Vimeo (requieren consentimiento)

Estos datos los instala y controla el proveedor del reproductor, no FENAKI, y solo después de que pulses «Aceptar y reproducir». Para YouTube usamos el modo de privacidad mejorada (`youtube-nocookie.com`) y para Vimeo la opción que desactiva su seguimiento (`dnt=1`). Al cargarse el reproductor, el proveedor recibe además tu dirección IP y datos técnicos de tu navegador (ver la [política de privacidad](/es/privacidad)).

La tabla recoge lo que medimos el 26 de octubre de 2026 al reproducir un corto en un navegador sin sesión en Google ni en Vimeo. Si tienes sesión iniciada en sus servicios, o si cambian sus reproductores, pueden instalar otras.

| Nombre                                                                                  | Proveedor              | Finalidad (según el proveedor)                                              | Duración    | Tipo                        |
| --------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- | ----------- | --------------------------- |
| `yt-player-caption-persistence`, `yt-icons-last-purged`, `ytidb::LAST_RESULT_ENTRY_KEY` | Google (YouTube)       | Preferencias y funcionamiento del reproductor (por ejemplo, los subtítulos) | Persistente | De terceros, `localStorage` |
| `YtIdbMeta`                                                                             | Google (YouTube)       | Base de datos interna del reproductor                                       | Persistente | De terceros, `IndexedDB`    |
| `__cf_bm`                                                                               | Vimeo (vía Cloudflare) | Protección frente a bots en el dominio de Vimeo                             | 30 minutos  | De terceros, cookie         |
| `__cf_ob`                                                                               | Vimeo (vía Cloudflare) | Protección frente a bots en el dominio de Vimeo                             | Sesión      | De terceros, cookie         |
| `cf_clearance`                                                                          | Vimeo (vía Cloudflare) | Recordar que el navegador superó la verificación de seguridad de Cloudflare | 1 año       | De terceros, cookie         |

Más información: [cómo usa Google las cookies](https://policies.google.com/technologies/cookies?hl=es) y [política de cookies de Vimeo](https://vimeo.com/cookie_policy).

## 5. Modificaciones de esta política

Si algún día usamos cookies de analítica o de publicidad, actualizaremos antes esta política y solo se activarán con tu consentimiento.

## 6. Configuración del navegador

También puedes bloquear o borrar las cookies y el almacenamiento local desde la configuración de tu navegador. Si bloqueas los técnicos, algunas partes de FENAKI pueden no funcionar.

- [Chrome](https://support.google.com/chrome/answer/95647?hl=es)
- [Firefox](https://support.mozilla.org/es/kb/Borrar%20cookies)
- [Safari](https://support.apple.com/es-es/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/es-es/microsoft-edge)

## 7. Responsable y contacto

El responsable y la forma de ejercer tus derechos se indican en la [política de privacidad](/es/privacidad). Contacto: hola@fenaki.tv.
