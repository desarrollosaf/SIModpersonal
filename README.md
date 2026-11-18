# SIModpersonal

Módulo de **Movimientos de Personal** (H. Poder Legislativo del Estado de México). Reescritura en Angular + NestJS
del sistema Progress 4GL de `ProPersonal/`, sobre la plantilla de SIPresupuesto. Base de datos: **PostgreSQL**.

- Frontend: Angular 22 (`src/`), `npm start` → http://localhost:4200
- Backend: NestJS 11 + Sequelize (`backend/`), `npm run start:dev` en `backend/`
- Mapeo Progress → PostgreSQL y reglas de negocio: [docs/MAPEO-BD.md](docs/MAPEO-BD.md)

## Puesta en marcha

```bash
cp backend/.env.example backend/.env      # captura Postgres, BD externa de usuarios y JWT_SECRET
cd backend && npm install
npm run migrate && npm run seed           # crea tablas y siembra roles, tipos y subtipos de movimiento
npm run start:dev
# en otra terminal, en la raíz:
npm install && npm start
```

Login: RFC + contraseña contra `adminplem_saf` (MySQL, solo lectura), igual que SIPresupuesto. Los permisos viven en
`roles` / `usuario_roles` (Postgres): `administrador`, `capturista`, `consulta`; sin rol = `usuario` (sin acceso).
