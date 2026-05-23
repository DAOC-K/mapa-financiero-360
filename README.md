# Mapa Financiero 360

Mapa Financiero 360 es una web app para organizar ingresos, gastos, metas, mapas financieros personales o compartidos y decisiones mensuales de dinero.

## Estado del proyecto

MVP inicial funcional.

## Funciones actuales

- Landing principal.
- Registro de usuarios con Supabase Auth.
- Login de usuarios con Supabase Auth.
- Protección de páginas internas.
- Cierre de sesión.
- Perfil de usuario.
- Creación de mapas financieros personales o compartidos.
- Registro de ingresos y gastos.
- Creación de metas financieras.
- Decisión del mes para distribuir dinero disponible.
- Dashboard financiero conectado a Supabase.
- Mapa visual del flujo de dinero.
- Base de datos con RLS activo.

## Tecnologías

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security

## Variables de entorno

Crear un archivo .env.local en la raíz del proyecto con:

NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_publica_de_supabase

## Ejecutar en local

npm install
npm run dev

Abrir:

http://localhost:3000

## Build de producción

npm run build

## Próximas mejoras

- Invitar a otra persona a un mapa compartido.
- Roles de miembros: owner/member.
- Aportes proporcionales por ingresos.
- Filtros por mes.
- Reportes mensuales.
- Exportar PDF o Excel.
- Simulador financiero.
- IA financiera más adelante.
- Deploy en Vercel.
