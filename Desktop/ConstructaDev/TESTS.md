# Guía de Tests — Constructa

Este documento describe qué testa cada archivo, por qué existe y cómo correrlo.

---

## Cómo correr los tests

```bash
# Backend — solo unitarios (sin base de datos)
cd backend
pytest tests/unit/ -v

# Backend — solo integración (requiere TEST_DATABASE_URL)
TEST_DATABASE_URL="postgresql+asyncpg://..." pytest tests/integration/ -v

# Backend — todo
pytest -v

# Frontend
cd frontend
npm test
```

En CI, los tests de integración corren automáticamente contra un container de PostgreSQL efímero. No requieren configuración adicional.

---

## Backend — Tests unitarios (`tests/unit/`)

Los tests unitarios no necesitan base de datos ni red. Corren en ~2 segundos.

---

### `test_security.py`

Testa las funciones criptográficas del sistema de autenticación (`app/core/security.py`).

| Test | Qué verifica |
|------|-------------|
| `test_hash_password_returns_bcrypt_hash` | El hash empieza con el prefijo bcrypt `$2b$` |
| `test_verify_password_correct` | Una contraseña correcta pasa la verificación |
| `test_verify_password_wrong` | Una contraseña incorrecta falla la verificación |
| `test_hash_is_unique_each_call` | Dos hashes del mismo texto son distintos (salt aleatorio) |
| `test_create_and_decode_token` | Un JWT creado puede ser decodificado y recupera el `sub` original |
| `test_decode_invalid_token_raises` | Un JWT inválido lanza excepción |

---

### `test_message_interpreter.py`

Testa el intérprete de mensajes de WhatsApp (`app/services/message_interpreter.py`), que detecta intenciones en texto libre.

| Test | Qué verifica |
|------|-------------|
| `test_completion_keywords[terminado/finalizado/listo/completado]` | Las palabras clave de finalización son detectadas |
| `test_block_phrases[no podemos avanzar/falta material/...]` | Las frases de bloqueo son detectadas |
| `test_no_match_returns_none_action` | Un mensaje sin keywords no genera ninguna acción |
| `test_empty_string_returns_none` | String vacío no genera acción |
| `test_none_input_returns_none` | `None` no genera acción |
| `test_completion_keyword_case_insensitive` | La detección es case-insensitive |
| `test_result_to_dict` | El resultado se serializa correctamente a dict |

---

### `test_task_helpers.py`

Testa las funciones auxiliares de tareas (`app/services/task_service.py`): serialización, formateo de campos y la máquina de estados.

| Test | Qué verifica |
|------|-------------|
| `test_to_json_date_returns_string` | `date` se convierte a string ISO |
| `test_to_json_int_passthrough` | Los enteros pasan sin cambio |
| `test_to_json_none_passthrough` | `None` pasa sin cambio |
| `test_format_date_field` | Las fechas se formatean a DD/MM/AAAA |
| `test_format_date_null` | Fecha nula muestra "Sin fecha" |
| `test_format_progress` | El progreso se muestra con `%` |
| `test_format_progress_null` | Progreso nulo muestra "Sin definir" |
| `test_format_depends_on` | Dependencia muestra "Tarea #N" |
| `test_format_unknown_field` | Campos desconocidos se devuelven tal cual |
| `test_pendiente_can_start` | `PENDIENTE → EN_PROGRESO` es una transición válida |
| `test_pendiente_cannot_complete_directly` | `PENDIENTE → COMPLETADA` no está permitido |
| `test_en_progreso_can_complete` | `EN_PROGRESO → COMPLETADA` es una transición válida |
| `test_completada_has_no_transitions` | Una tarea completada no tiene transiciones posibles |
| `test_cancelada_has_no_transitions` | Una tarea cancelada no tiene transiciones posibles |

---

### `test_schemas.py`

Testa los validadores de los schemas Pydantic (`app/schemas/`), que son la primera línea de defensa contra datos inválidos.

| Test | Qué verifica |
|------|-------------|
| `test_obra_create_valid_dates` | Fecha de inicio < fecha estimada de fin es válido |
| `test_obra_create_no_dates_is_valid` | Crear una obra sin fechas es permitido |
| `test_obra_create_reversed_dates_raises` | Fecha de fin antes de inicio lanza `ValidationError` |
| `test_obra_create_same_date_raises` | Fin antes de inicio también rechazado |
| `test_obra_create_name_too_short_raises` | Nombre de 1 caracter rechazado (mínimo 2) |
| `test_obra_update_reversed_expected_end_raises` | `expected_end_date < start_date` en update lanza error |
| `test_obra_update_reversed_actual_end_raises` | `actual_end_date < start_date` en update lanza error |
| `test_obra_update_all_none_is_valid` | Update sin ningún campo es válido |
| `test_obra_update_valid_dates_pass` | Fechas correctas en update no lanzan error |
| `test_responsible_valid_e164[+54...]` | Números en formato E.164 son aceptados |
| `test_responsible_invalid_phone_raises[sin +/...]` | Números con formato incorrecto son rechazados |

---

### `test_message_templates.py`

Testa las funciones de formateo de mensajes de WhatsApp (`app/services/message_templates.py`). Todo el texto que ve el usuario final sale de este módulo.

| Test | Qué verifica |
|------|-------------|
| `test_status_line_known_status` | `en_progreso` genera línea con emoji 🟡 y label |
| `test_status_line_completada` | `completada` genera línea con emoji 🟢 |
| `test_status_line_unknown_returns_fallback_emoji` | Estado desconocido usa emoji ⚪ como fallback |
| `test_n_returns_keycap_for_1` | El número 1 se convierte en el emoji keycap "1️⃣" |
| `test_n_returns_keycap_for_5` | El número 5 se convierte en "5️⃣" |
| `test_n_fallback_for_out_of_range` | Número fuera del rango incluye el dígito como texto |
| `test_fmt_date_none_returns_sin_fecha` | `None` devuelve "sin fecha" |
| `test_fmt_date_iso_string` | `"2024-03-15"` → `"15/03"` |
| `test_fmt_date_date_object` | Objeto `date` también se formatea como `"15/03"` |
| `test_fmt_date_non_iso_passthrough` | Texto que no es ISO se devuelve sin cambio |
| `test_fmt_date_full_none_returns_sin_fecha` | `None` → "sin fecha" |
| `test_fmt_date_full_iso_string` | `"2024-03-15"` → `"15/03/2024"` |
| `test_fmt_date_full_date_object` | Objeto `date` → `"15/03/2024"` |
| `test_build_no_tasks_message_contains_name` | El mensaje de sin-tareas incluye el nombre del usuario |
| `test_build_obra_list_message_contains_obra_names` | El listado de obras incluye todos los nombres |
| `test_build_obra_list_message_is_numbered` | El listado está numerado |

---

### `test_conversation_helpers.py`

Testa las funciones auxiliares del bot de WhatsApp (`app/services/conversation_service.py`): detección de comandos, parseo de inputs y paginación de tareas.

#### Comandos de navegación

| Test | Qué verifica |
|------|-------------|
| `test_is_cancel_true[x/cancelar/salir]` | Las palabras de cancelación son detectadas (case-insensitive) |
| `test_is_cancel_false[menu/hola/None]` | Otras palabras no son cancel |
| `test_is_back_true` | "0" es el comando de volver |
| `test_is_back_false[1/x/None]` | Otros valores no son back |
| `test_is_menu_true[menu/hola/inicio/start]` | Las palabras de menú son detectadas |
| `test_is_menu_false[cancelar/x/0]` | Otras palabras no son menú |

#### Parseo de opciones y fechas

| Test | Qué verifica |
|------|-------------|
| `test_parse_option_valid` | "3" con max=5 devuelve 3 |
| `test_parse_option_boundary_1` | "1" es válido |
| `test_parse_option_boundary_max` | El valor máximo es válido |
| `test_parse_option_out_of_range_returns_none` | "6" con max=5 devuelve None |
| `test_parse_option_zero_returns_none` | "0" no es una opción válida del menú |
| `test_parse_option_none_body_returns_none` | Body nulo devuelve None |
| `test_parse_option_non_digit_returns_none` | Texto no numérico devuelve None |
| `test_parse_date_none_returns_none` | None devuelve None |
| `test_parse_date_empty_returns_none` | String vacío devuelve None |
| `test_parse_date_invalid_format_returns_none` | Formato ISO (YYYY-MM-DD) no es aceptado por el bot |
| `test_parse_date_ddmm_returns_date` | "15/06" parsea día y mes correctamente |
| `test_parse_date_ddmmyyyy_returns_date` | "15/06/2025" parsea la fecha completa |
| `test_parse_date_ddmmyy_short_year` | "15/06/25" interpreta el año como 2025 |
| `test_parse_date_invalid_day_returns_none` | "32/06/2025" es una fecha inválida |

#### Paginación de tareas

| Test | Qué verifica |
|------|-------------|
| `test_has_meta_false_on_plain_list` | Una lista sin meta no está paginada |
| `test_has_meta_true_after_with_meta` | `_with_meta` agrega el marcador de paginación |
| `test_page_of_plain_list_returns_0` | Sin meta, la página es 0 |
| `test_all_tasks_strips_meta` | `_all_tasks` devuelve solo las tareas, sin el header de meta |
| `test_page_tasks_first_page` | Primera página tiene hasta 5 tareas |
| `test_page_tasks_second_page` | Segunda página tiene el resto (8 - 5 = 3) |
| `test_has_more_true_when_tasks_exceed_page` | 6 tareas en página 0 → hay más |
| `test_has_more_false_on_last_page` | 5 tareas en página 0 → no hay más |
| `test_remaining_counts_tasks_after_current_page` | 8 tareas en página 0 → quedan 3 |
| `test_make_task_options_wraps_only_when_exceeds_page` | Solo pagina cuando hay más de 5 tareas |

---

## Backend — Tests de integración (`tests/integration/`)

Los tests de integración levantan el servidor completo de FastAPI con una base de datos real de PostgreSQL. Verifican que los endpoints HTTP funcionen de punta a punta.

**Requieren:** `TEST_DATABASE_URL` apuntando a una base de datos dedicada para tests (en CI se usa un container efímero; en local se recomienda `constructa_test` en Neon o PostgreSQL local).

---

### `test_auth_integration.py`

Testa el ciclo completo de autenticación a través de la API (`/api/v1/auth/`).

| Test | Qué verifica |
|------|-------------|
| `test_register_returns_user` | `POST /auth/register` crea el usuario y devuelve 201 sin exponer `hashed_password` |
| `test_register_duplicate_email_returns_409` | Registrar el mismo email dos veces devuelve 409 Conflict |
| `test_login_returns_token` | `POST /auth/login` con credenciales correctas devuelve un `access_token` |
| `test_login_wrong_password_returns_401` | Contraseña incorrecta devuelve 401 Unauthorized |
| `test_login_unknown_email_returns_401` | Email inexistente devuelve 401 Unauthorized |

---

### `test_obras_integration.py`

Testa el CRUD de obras a través de la API (`/api/v1/obras/`), incluyendo la autenticación requerida.

| Test | Qué verifica |
|------|-------------|
| `test_list_obras_requires_auth` | `GET /obras` sin token devuelve 403 |
| `test_list_obras_returns_list` | Con token válido devuelve un array JSON |
| `test_create_obra_returns_201` | `POST /obras` con datos mínimos devuelve 201 con el id asignado |
| `test_create_obra_appears_in_list` | Una obra recién creada aparece en el listado |
| `test_get_obra_by_id` | `GET /obras/{id}` devuelve la obra correcta |
| `test_get_nonexistent_obra_returns_404` | `GET /obras/999999` devuelve 404 Not Found |

---

## Frontend — Tests unitarios (`src/lib/__tests__/`)

Los tests de frontend no necesitan un servidor ni una base de datos. Corren en jsdom.

---

### `utils.test.ts`

Testa la función `cn()` de `src/lib/utils.ts`, que combina clases de Tailwind evitando conflictos.

| Test | Qué verifica |
|------|-------------|
| `joins class names` | Dos strings se unen con espacio |
| `ignores falsy values` | `false`, `undefined` y `null` son ignorados |
| `merges conflicting tailwind classes` | `p-2` + `p-4` resulta en solo `p-4` (última gana) |
| `returns empty string when no args` | Sin argumentos devuelve string vacío |

---

### `tokenStorage.test.ts`

Testa el módulo de almacenamiento de tokens (`src/lib/tokenStorage.ts`), que maneja la sesión del usuario en el browser usando `sessionStorage` y `localStorage`.

| Test | Qué verifica |
|------|-------------|
| `setToken stores in sessionStorage` | El token queda en `sessionStorage` para la tab actual |
| `setToken stores in localStorage` | El token queda en `localStorage` para que nuevas tabs lo hereden |
| `getToken returns the stored token` | `getToken()` devuelve el último token guardado |
| `getToken returns null when nothing is stored` | Sin token previo devuelve `null` |
| `clearToken removes token from both storages` | `clearToken()` limpia tanto `sessionStorage` como `localStorage` |

---

### `permissions.test.ts`

Testa las reglas de permisos por rol (`src/hooks/usePermission.ts`), que determinan qué acciones puede ejecutar cada tipo de usuario en la UI.

| Test | Qué verifica |
|------|-------------|
| `admin has all permissions` | El rol `admin` tiene acceso a todos los permisos definidos |
| `collaborator can edit obras` | El colaborador puede editar obras |
| `collaborator can create tareas` | El colaborador puede crear tareas |
| `collaborator can move tareas` | El colaborador puede mover tareas |
| `collaborator can upload documents` | El colaborador puede subir documentos |
| `collaborator cannot create obras` | El colaborador **no** puede crear obras |
| `collaborator cannot delete obras` | El colaborador **no** puede eliminar obras |
| `collaborator cannot delete tareas` | El colaborador **no** puede eliminar tareas |
| `collaborator cannot invite members` | El colaborador **no** puede invitar miembros |
| `collaborator cannot remove members` | El colaborador **no** puede eliminar miembros |
| `collaborator cannot edit configuracion` | El colaborador **no** puede cambiar configuración |
| `ROLE_PERMISSIONS covers all roles` | Cada rol definido tiene un array de permisos |

---

## Resumen de cobertura

| Capa | Archivos de test | Tests |
|------|-----------------|-------|
| Backend unitarios | 6 archivos | 115 tests |
| Backend integración | 2 archivos | 11 tests |
| Frontend unitarios | 3 archivos | 21 tests |
| **Total** | **11 archivos** | **147 tests** |
