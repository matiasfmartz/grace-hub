# Grace Hub - Gestión Integral para Comunidades Eclesiales

Bienvenido a Grace Hub, una aplicación web diseñada para facilitar la administración y conexión dentro de las comunidades eclesiales. Construida con tecnologías modernas, Grace Hub busca ofrecer una plataforma intuitiva y eficiente para miembros, líderes y administradores.

## Propósito

Grace Hub tiene como objetivo principal centralizar y simplificar las diversas actividades y la gestión de información de una iglesia, permitiendo:

*   Una comunicación más fluida entre los miembros.
*   Una organización eficiente de grupos, ministerios y eventos.
*   Un acceso fácil a recursos y materiales relevantes.
*   Un seguimiento detallado de la participación y el crecimiento de la comunidad.

## Características Principales

La aplicación se organiza en varias secciones clave:

### 1. Inicio (Home)
Página de bienvenida que ofrece una visión general de la aplicación y accesos directos a las secciones más importantes.

### 2. Miembros (Members)
*   **Directorio de Miembros**: Visualiza, busca y filtra la lista de todos los miembros de la iglesia.
*   **Agregar Miembros**: Permite añadir nuevos miembros individualmente o mediante una herramienta de carga masiva.
*   **Detalles del Miembro**: Muestra información completa de cada miembro, incluyendo datos de contacto, fechas importantes (nacimiento, ingreso, bautismo), estado, roles, GDI y áreas de ministerio asignadas.
*   **Edición de Miembros**: Facilita la actualización de la información de los miembros.
*   **Gestión de Roles**: Los roles (Asistente General, Obrero, Líder) se calculan y asignan automáticamente basados en la participación en GDIs y Ministerios.

### 3. Grupos (Groups)
Esta sección permite administrar dos tipos principales de agrupaciones:
*   **Áreas de Ministerio (Ministry Areas)**:
    *   Crea y gestiona áreas de servicio o ministerio (ej. Alabanza, Jóvenes, Misiones).
    *   Asigna un líder y miembros a cada área.
    *   Actualiza detalles como nombre, descripción e imagen.
*   **GDIs (Grupos de Integración)**:
    *   Crea y gestiona grupos pequeños de integración y discipulado.
    *   Asigna un guía y miembros a cada GDI.
    *   Actualiza el nombre del GDI.

### 4. Eventos (Events)
*   **Definición de Series de Reuniones**: Permite crear "tipos" o series de reuniones recurrentes (ej. Servicio Dominical, Estudio Bíblico Semanal, Reunión Mensual de Líderes) o de única vez.
    *   Configura nombre, descripción, hora, lugar e imagen predeterminados.
    *   Define la frecuencia (Única Vez, Semanal, Mensual) y las reglas de recurrencia.
    *   Especifica los grupos de asistentes objetivo (Asistentes Generales, Obreros, Líderes).
    *   Las instancias se generan automáticamente para series recurrentes o para la fecha especificada en series de "Única Vez".
*   **Gestión de Instancias de Reunión**:
    *   Visualiza todas las instancias de reunión programadas, filtrables por serie y rango de fechas.
    *   Agrega instancias ocasionales a una serie existente.
    *   Edita o elimina instancias individuales de reunión.
*   **Registro de Asistencia**:
    *   Para cada instancia de reunión, permite marcar la asistencia de los miembros esperados.
    *   Guarda un historial de asistencia.
*   **Toma de Minutas**: Permite registrar y guardar minutas para cada reunión.

### 5. Recursos (Resources)
Una sección para compartir materiales útiles como artículos, devocionales, anuncios y notas de sermones.

### 6. Acerca de (About)
Proporciona información sobre la misión, visión y valores detrás de Grace Hub.

## Tecnologías Utilizadas

*   **Frontend**: Next.js (con App Router), React, TypeScript.
*   **UI**: ShadCN UI Components, Tailwind CSS.
*   **Gestión de Estado (Cliente)**: React Hooks (`useState`, `useEffect`, `useContext`).
*   **IA (Opcional/Futuro)**: Genkit (para funcionalidades de IA generativa).
*   **Persistencia de Datos**: Archivos JSON locales (`members-db.json`, `gdis-db.json`, etc.) para simular una base de datos en este prototipo.

## Cómo Empezar

### Prerrequisitos

*   Node.js (versión 18.x o superior recomendada)
*   npm o yarn

### Instalación

1.  Clona este repositorio:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```

2.  Instala las dependencias:
    ```bash
    npm install
    # o
    # yarn install
    ```

### Ejecutar la Aplicación

1.  Para iniciar el servidor de desarrollo de Next.js:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002` (o el puerto que se indique).

2.  (Opcional) Si se utilizan funcionalidades de Genkit para IA, se puede iniciar el servidor de desarrollo de Genkit:
    ```bash
    npm run genkit:dev
    # o para auto-recarga
    # npm run genkit:watch
    ```

### Scripts Disponibles

*   `npm run dev`: Inicia la aplicación en modo de desarrollo.
*   `npm run build`: Compila la aplicación para producción.
*   `npm run start`: Inicia la aplicación en modo de producción (después de `build`).
*   `npm run lint`: Ejecuta el linter de Next.js.
*   `npm run typecheck`: Verifica los tipos de TypeScript.

## Estructura del Proyecto (Simplificada)

*   `src/app/`: Contiene las rutas y páginas principales de la aplicación (usando Next.js App Router).
*   `src/components/`: Componentes reutilizables de React.
    *   `src/components/ui/`: Componentes de UI de ShadCN.
    *   `src/components/layout/`: Componentes de la estructura principal (Header, Footer).
    *   Otros subdirectorios para componentes específicos de cada sección (members, groups, events).
*   `src/lib/`: Lógica de negocio, tipos, utilidades y "bases de datos" JSON.
    *   `types.ts`: Definiciones de tipos e interfaces TypeScript, y esquemas Zod para validación.
    *   `*-db.json`: Archivos JSON que actúan como almacenamiento de datos.
    *   `placeholder-data.ts`: Datos iniciales de ejemplo.
    *   `db-utils.ts`: Funciones para leer y escribir en los archivos JSON.
    *   `roleUtils.ts`: Lógica para calcular roles de miembros.
*   `src/services/`: Funciones de "servicio" que interactúan con los archivos JSON (simulando llamadas a una API o base de datos).
*   `src/ai/`: (Opcional) Configuración y flujos de Genkit para funcionalidades de IA.
*   `public/`: Archivos estáticos.

## Próximos Pasos y Mejoras Potenciales

*   Integración con una base de datos real (Firebase Firestore, PostgreSQL, etc.).
*   Autenticación y autorización de usuarios.
*   Notificaciones en tiempo real.
*   Mejoras en la interfaz de usuario y experiencia de usuario (UX/UI).
*   Funcionalidades de IA más avanzadas con Genkit.
*   Despliegue en una plataforma de hosting (Firebase App Hosting, Vercel, etc.).

¡Gracias por explorar Grace Hub!
