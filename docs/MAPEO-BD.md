# Mapeo del sistema Progress (Movimientos de Personal) a PostgreSQL

Origen: `ProPersonal/` (CAP-MOP.p, CIN-MOP.W, COR-MOP.W, MCONS-AC/TO.W, MUE-MOV/MOVB.W, REP-MPFT-C.p, MENU-MP.P).
Las tablas Progress **no vienen en la carpeta** (falta el `.df`); el mapeo sale del uso de campos en el código,
así que los tipos y longitudes son una propuesta que debe confirmarse contra el esquema real.

## Tablas

| Progress | PostgreSQL | Notas |
|---|---|---|
| `MOV-PER` | `movimientos` + `movimiento_percepciones` | `CVES[7]`/`IMP[7]` pasan a filas (orden 1..7). `TIP-MOV` (4 car.) se divide en `tipo_mov` (1) y `subtipo_mov` (3). |
| `AUX` (temp-table) | — | Desaparece: el formulario edita un solo documento y el servidor valida y guarda en transacción. |
| `IMP-MP`, `IMP-W` | — | Tablas temporales del reporte; no se migran. |
| `EMPLEADO` | `empleados` | Solo lectura desde este módulo. Llave = CURP. |
| `PAG-DES` (`T-M='C'`) | `pagos_descuentos` | Percepciones vigentes por CURP. |
| `HORARIO` | `horarios` | `H-MAT`, `H-VES`, `TARJ`. |
| `CATA-ADSC` | `cat_adscripciones` | `ADSCRIP` → `id`, `DESC-ADSC` → `descripcion`. |
| `CATA-PUES` | `cat_puestos` | `PUESTO` → `clave`; `nivel` = `INTE(SUBSTRING(puesto,6,2))` guardado como columna. |
| `TABLA-RANG` | `tabla_niveles` + `tabla_rangos` | `Imp-Nivel` por nivel; `Imp-Rang[]`/`Imp-Comp[]` pasan a filas por (nivel, rango). |
| `CATA-PD` | `cat_percepciones` | Única por (`cve`, `tipo_nomina`). |
| combos fijos de CAP-MOP | `cat_tipos_movimiento`, `cat_subtipos_movimiento` | Sembrados en `20261117110000-tipos-subtipos-movimiento.js`. |
| — (nuevo) | `movimientos_bitacora` | Auditoría: quién creó/modificó/transmitió/eliminó cada folio. |
| — (existente en SIPresupuesto) | `roles`, `usuario_roles` | Roles: `administrador`, `capturista`, `consulta`, `usuario` (sin acceso). |

## Campos de `MOV-PER`

| Progress | `movimientos` | Tipo | Regla |
|---|---|---|---|
| `FOLIO` | `folio` PK | `varchar(6)` | `NNNNAA` (4 dígitos + año). CHECK `^[0-9]{6}$`. |
| `FEC-MOV` | `fec_mov` | `date` | El año debe ser el actual (regla de CAP-MOP). |
| `NO-QNA` | `no_qna` | `smallint` | CHECK 1..24. |
| `TIP-MOV` | `tipo_mov` + `subtipo_mov` | `varchar(1)` + `varchar(3)` | FK compuesta a `cat_subtipos_movimiento`. |
| `RFC` / `CURP` / `NOMBRE` / `SEXO` | `rfc`, `curp`, `nombre`, `sexo` | | El original compara solo `SUBSTRING(curp,1,10)`; hay índice por esa expresión. |
| `ADS-ANT` / `ADS-ACT` | `ads_ant` / `ads_act` | `integer` FK | |
| `PUESTO` | `puesto_clave` | `varchar(10)` FK | |
| `RANGO` | `rango` | `smallint` | |
| `PERCEP-A` | `percep_a` | `numeric(12,2)` | Percepciones anteriores (promoción/transferencia). |
| `TIP-CON` | `tip_con` | `varchar(1)` | C confianza, B base, S supernumerario, T tiempo determinado, O obra terminada. |
| `TIPO` | `tipo_nomina` | `varchar(1)` | D y P = central, H = honorarios. En pantalla solo P/H; D se conserva de nómina heredada. |
| `F-ALTA` / `F-TERM` | `f_alta` / `f_term` | `date` | |
| `REEMP` | `reemp` | `varchar(60)` | "En sustitución de". |
| `HORARIO` | `horario` | `varchar(1)` | O, E, V. |
| `H-MAT` / `H-VES` / `TARJ` | `h_mat` / `h_ves` / `tarj` | | `tarj`: 0 = NO, 1 = SÍ. |
| `CTA-BAN` | `cta_ban` | `varchar(20)` | |
| `OBS` | `obs` | `varchar(250)` | |
| `DOCUM_OK` | `docum_ok` | `varchar(1)` | S completa, N incompleta, **T transmitido a nómina (ya no se modifica)**. |

## Reglas de negocio trasladadas (CAP-MOP.p → `movimientos.service.ts`)

- Guardar exige adscripción, CURP, puesto, rango y tipo de nómina; el tipo de contrato es obligatorio en altas.
- Alta nueva: la CURP no debe existir en `empleados` (excepto reingreso `AREI` y reincorporación `ARIN`).
- Baja, promoción, transferencia y licencia: la CURP debe existir en `empleados`.
- Un movimiento con `docum_ok = 'T'` no se modifica ni se elimina.
- Transferencia: el subtipo es siempre `TRA`.
- Percepciones: máximo 7, sin claves repetidas, y cada clave debe existir en `cat_percepciones` para el tipo de nómina.
- En altas, promociones y transferencias los importes de las claves 01/05 (sueldo), 12 (gratificación) y 11 (compensación) se **recalculan desde el tabulador** (nivel/rango) × 2.
- Al cambiar la nómina de central a honorarios la clave de sueldo cambia de 01 a 05, y al revés.
- Percepciones anteriores = suma de `pagos_descuentos` (`t_m='C'`, claves 1, 5, 11, 12, 14, 17, 34) × 2.
- Folio consecutivo por año: `siguiente-folio`.

## Diferencias deliberadas respecto al original

- La validación de `gratif` en `veri-niv-ran` aplicaba un criterio global (si alguna clave era 12, todas las claves 1/5/12 posteriores usaban `Imp-Rang`). Aquí cada clave usa su propio importe: 01/05 → `imp_nivel`, 12 → `imp_rango`, 11 → `imp_comp`.
- El total de percepciones ya no se captura a mano: se calcula como la suma de los importes.
- Se agrega bitácora de cambios.

## Pendiente / por confirmar

1. Esquema real (`.df`) de MOV-PER, EMPLEADO, PAG-DES, CATA-*, TABLA-RANG: confirmar tipos, longitudes y nombres.
2. `passmp.r` y `disponible.p` no están en la carpeta (password y "movimientos por periodo"); el login usa ahora el de SIPresupuesto (RFC + usuarios de `adminplem_saf`).
3. Reporte de Word por folio (`REP-MPFT-C.p`, plantilla `FCMPP-BN.dotm`): falta la plantilla para replicarlo.
4. Carga inicial: exportar las tablas desde Progress (`EXPORT DELIMITER ","`) y cargarlas con `COPY`; falta el script de importación.
