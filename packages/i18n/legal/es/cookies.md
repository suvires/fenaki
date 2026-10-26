# Política de cookies

Última actualización: 26 de octubre de 2026

## 1. Qué son las cookies y tecnologías similares

Una cookie es un pequeño archivo que un sitio web guarda en tu navegador para recordar información. Esta política también cubre tecnologías parecidas, como el almacenamiento local del navegador (`localStorage`) y los píxeles, porque la ley las trata igual (art. 22.2 de la LSSI). La seguimos conforme a la [Guía sobre el uso de las cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf).

## 2. Cómo usa Fenaki las cookies, en resumen

- **Sin cookies de analítica ni de publicidad.** Medimos las visitas con Umami, que no usa cookies.
- **Solo usamos las cookies técnicas** necesarias para que el sitio funcione, sea seguro y recuerde tus elecciones (como «Mi lista» o los reproductores que cargas sin preguntar). No necesitan consentimiento (art. 22.2 LSSI).
- **Los reproductores de YouTube y Vimeo solo se cargan si aceptas.** Hasta entonces, cada ficha muestra una imagen del corto con un aviso. Al pulsar «reproducir», una ventana te explica qué recibe el proveedor y qué guarda su reproductor en tu navegador, y el reproductor solo se carga si pulsas «Aceptar y reproducir».

Si en el futuro usamos herramientas con cookies de analítica o publicidad, solo se activarán con tu consentimiento y actualizaremos esta política antes.

## 3. Tu consentimiento

Fenaki no muestra un banner de cookies porque no usa cookies que lo necesiten: las propias son técnicas (apartado 4.1) y Umami no usa cookies (4.2). El único contenido que requiere tu consentimiento son los reproductores de YouTube y Vimeo (4.3). Lo pedimos en el momento en que lo necesitas: al pulsar «reproducir» en un corto, una ventana te explica qué ocurre al cargarlo, con dos botones del mismo nivel, «Cancelar» y «Aceptar y reproducir». Cancelar no te impide seguir navegando por el catálogo. [REVISAR: consulta 7b]

**Recordar o retirar tu consentimiento.** En esa ventana puedes marcar «Recordar mi elección» para que los cortos de ese proveedor se carguen sin preguntar. Lo guardamos solo en tu navegador (`fenaki:player-consent:v1`, apartado 4.1). Puedes retirarlo en cualquier momento desde «Preferencias de reproducción», en el pie de página, con un solo clic. Retirar el consentimiento es tan fácil como darlo.

Si no marcas «Recordar mi elección», te preguntamos cada vez que cargas un reproductor.

## 4. Cookies y tecnologías que usamos

### 4.1 Técnicas (necesarias, sin consentimiento)

| Nombre                                          | Proveedor  | Finalidad                                                                   | Duración                                                                                | Tipo                                                                                                                                                                                     |
| ----------------------------------------------- | ---------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fenaki:player-consent:v1`                      | Fenaki     | Recordar qué reproductores (YouTube, Vimeo) has pedido cargar sin preguntar | Hasta que lo retires en «Preferencias de reproducción» o borres los datos del navegador | Propia, `localStorage`. Solo existe si marcas «Recordar mi elección»; no se envía a nuestros servidores                                                                                  |
| `__cf_bm`                                       | Cloudflare | Distinguir personas de bots y proteger el sitio                             | 30 minutos                                                                              | Propia (dominio de Fenaki), de sesión corta. Solo si se activa la gestión de bots [COMPLETAR]                                                                                            |
| `cf_clearance`                                  | Cloudflare | Recordar que has superado una verificación de seguridad                     | Según configuración (por defecto, 30 minutos) [COMPLETAR]                               | Propia, solo si se muestra una verificación                                                                                                                                              |
| `_cfuvid`                                       | Cloudflare | Limitar el número de peticiones por visitante (protección)                  | Sesión                                                                                  | Propia. Solo si se activan reglas de limitación [COMPLETAR]                                                                                                                              |
| [COMPLETAR: por ejemplo, preferencia de idioma] | Fenaki     | Recordar el idioma elegido, cuando haya más de uno                          | [COMPLETAR]                                                                             | Propia, `localStorage` o cookie                                                                                                                                                          |
| `fenaki:my-list:v1`                             | Fenaki     | Guardar en tu navegador los cortos que añades a «Mi lista»                  | Hasta que la quites o borres los datos del navegador                                    | Propia, `localStorage`. La guardas tú al pulsar «Añadir a mi lista»; no se envía a nuestros servidores. Si tienes cuenta e inicias sesión, se añade a tu cuenta y se borra del navegador |
| `fenaki:my-ratings:v1`                          | Fenaki     | Guardar en tu navegador las valoraciones que das a los cortos               | Hasta que la quites o borres los datos del navegador                                    | Propia, `localStorage`. La guardas tú al valorar un corto; no se envía a nuestros servidores. Si tienes cuenta e inicias sesión, se añade a tu cuenta y se borra del navegador           |
| `__Host-fenaki-session`                         | Fenaki     | Mantener tu sesión iniciada cuando tienes cuenta                            | 30 días como máximo; se borra al cerrar sesión o al borrar la cuenta                    | Propia, solo se instala si inicias sesión. Es `HttpOnly` (los scripts no la leen), `Secure` y `SameSite=Lax`                                                                             |
| `__stripe_mid`, `__stripe_sid`                  | Stripe     | Prevención del fraude en el pago                                            | 1 año y 30 minutos                                                                      | De terceros. Solo si el pago se integra en una página de Fenaki; con enlaces de pago, estas cookies se instalan en el dominio de Stripe, no en Fenaki [COMPLETAR]                        |

Fuente de las cookies de Cloudflare: [documentación de Cloudflare sobre sus cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/).

### 4.2 Analítica sin cookies (no instala nada en tu dispositivo)

| Herramienta | Proveedor                                | Qué hace                                                                                          | Cookies o almacenamiento                                                                                                 |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Umami       | Fenaki (autoalojado en nuestro servidor) | Cuenta visitas, páginas vistas y eventos (por ejemplo, «reproducción iniciada») de forma agregada | Ninguno. Calcula en el servidor un identificador anónimo y rotatorio a partir de la IP y el navegador, sin guardar la IP |

### 4.3 Contenido de terceros: reproductores de YouTube y Vimeo (requieren consentimiento)

Estas cookies y datos los instala y controla el proveedor del reproductor, no Fenaki. Solo se cargan después de que pulses «Aceptar y reproducir» en el aviso del reproductor. Para YouTube usamos el modo de privacidad mejorada (`youtube-nocookie.com`) y para Vimeo el parámetro `dnt=1`, que desactiva su seguimiento. Además de lo que guardan en tu navegador, al cargarse el reproductor el proveedor recibe tu dirección IP y datos técnicos de tu navegador, como al visitar cualquier web (ver la política de privacidad).

Lo que figura en la tabla es lo que medimos el 26 de octubre de 2026 al reproducir un corto en un navegador sin sesión en Google ni en Vimeo. Si tienes sesión iniciada en sus servicios, o según cambien sus reproductores, pueden instalar otras.

| Nombre                                                                                  | Proveedor              | Finalidad (según el proveedor)                                                       | Duración    | Tipo                        |
| --------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ | ----------- | --------------------------- |
| `yt-player-caption-persistence`, `yt-icons-last-purged`, `ytidb::LAST_RESULT_ENTRY_KEY` | Google (YouTube)       | Preferencias y funcionamiento del reproductor (por ejemplo, los subtítulos)          | Persistente | De terceros, `localStorage` |
| `YtIdbMeta`                                                                             | Google (YouTube)       | Base de datos interna del reproductor                                                | Persistente | De terceros, `IndexedDB`    |
| Ninguna cookie                                                                          | Google (YouTube)       | En nuestra medición, el modo de privacidad mejorada no instaló cookies al reproducir | —           | —                           |
| `__cf_bm`                                                                               | Vimeo (vía Cloudflare) | Protección frente a bots en el dominio de Vimeo                                      | 30 minutos  | De terceros                 |
| `__cf_ob`                                                                               | Vimeo (vía Cloudflare) | Protección frente a bots en el dominio de Vimeo                                      | Sesión      | De terceros                 |
| `cf_clearance`                                                                          | Vimeo (vía Cloudflare) | Recordar que el navegador superó la verificación de seguridad de Cloudflare          | 1 año       | De terceros                 |

Más información: [cómo usa Google las cookies](https://policies.google.com/technologies/cookies?hl=es), [política de cookies de Vimeo](https://vimeo.com/cookie_policy).

### 4.4 Gestor de consentimiento

No usamos un gestor de consentimiento externo: el aviso del reproductor es propio y no instala nada hasta que respondes. Si en el futuro usamos cookies de analítica o de publicidad, añadiremos un banner de consentimiento y lo explicaremos aquí.

### 4.5 Analítica con cookies y publicidad

No se usan. Si se incorporan (por ejemplo, Google Analytics 4 con el modo de consentimiento o píxeles de campañas), se añadirá aquí cada cookie y se activará solo con tu consentimiento.

## 5. Desactivar las cookies desde el navegador

También puedes bloquear o borrar las cookies desde la configuración de tu navegador. Si bloqueas las técnicas, algunas partes del sitio pueden no funcionar.

- [Chrome](https://support.google.com/chrome/answer/95647?hl=es)
- [Firefox](https://support.mozilla.org/es/kb/Borrar%20cookies)
- [Safari](https://support.apple.com/es-es/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/es-es/microsoft-edge)

## 6. Más información

Responsable y derechos: consulta la [política de privacidad](/es/privacidad). Contacto: hola@fenaki.tv.
