"""
Centralized WhatsApp message templates for the Constructa chatbot.

All user-facing text lives here. To change wording, emojis, or
layout, edit this file — no business logic needs to be touched.
"""
from datetime import date

# ── Constants ──────────────────────────────────────────────────────────────────

STATUS_LABELS: dict[str, str] = {
    "pendiente":   "Pendiente",
    "en_progreso": "En curso",
    "bloqueada":   "Demorada",
    "en_revision": "En revisión",
    "completada":  "Finalizada",
    "cancelada":   "Cancelada",
}

_HEADER  = "🏗️ CONSTRUCTA"
_DIVIDER = "─────────────"

# Digit-keycap emojis for option numbers
_NUM: dict[int, str] = {
    1: "1️⃣", 2: "2️⃣", 3: "3️⃣", 4: "4️⃣", 5: "5️⃣",
    6: "6️⃣", 7: "7️⃣", 8: "8️⃣", 9: "9️⃣",
}


def _n(i: int) -> str:
    return _NUM.get(i, f"{i}.")


def _nav(back: bool = False) -> str:
    """Navigation footer line."""
    parts = []
    if back:
        parts.append("↩️ 0 · Volver")
    parts.append("❌ X · Cancelar")
    return "  |  ".join(parts)


# ── Date helpers ───────────────────────────────────────────────────────────────

def fmt_date(d: "date | str | None") -> str:
    """Format a date as DD/MM."""
    if d is None:
        return "sin fecha"
    s = str(d)
    if len(s) == 10 and s[4] == "-":
        _, m, day = s.split("-")
        return f"{day}/{m}"
    return s


def fmt_date_full(d: "date | str | None") -> str:
    """Format a date as DD/MM/AAAA."""
    if d is None:
        return "sin fecha"
    s = str(d)
    if len(s) == 10 and s[4] == "-":
        y, m, day = s.split("-")
        return f"{day}/{m}/{y}"
    return s


# ── Message builders ───────────────────────────────────────────────────────────

def build_no_tasks_message(name: str) -> str:
    return (
        f"{_HEADER}\n\n"
        f"Hola {name}. No tenés tareas activas asignadas en este momento."
    )


def build_task_list_message(
    name: str,
    page_tasks: list[dict],
    *,
    has_more: bool = False,
    remaining: int = 0,
    is_first_page: bool = True,
) -> str:
    """Multi-task selection menu with vertical card format and optional pagination."""
    lines = [f"{_HEADER}\n"]

    if is_first_page:
        lines.append(f"Hola {name}. Tus tareas activas:\n")
    else:
        lines.append("Más tareas activas:\n")

    for i, task in enumerate(page_tasks, 1):
        lines.append(f"{_n(i)} {task['title']}")
        lines.append(f"📍 {task['obra_name']}")
        lines.append(f"📅 Vence: {task['due_date']}\n")

    ver_mas_idx = len(page_tasks) + 1
    if has_more:
        lines.append(
            f"{_n(ver_mas_idx)} Ver más "
            f"({remaining} restante{'s' if remaining != 1 else ''})\n"
        )

    lines.append(_DIVIDER)
    lines.append("Respondé con el número de la tarea.")
    lines.append(_nav(back=not is_first_page))

    return "\n".join(lines)


def build_status_menu_message(
    name: str,
    task_name: str,
    obra_name: str,
    due_date: str,
    *,
    can_go_back: bool = False,
) -> str:
    """Status selection menu shown when the user selects a task."""
    return (
        f"{_HEADER}\n\n"
        f"Hola {name}.\n\n"
        f"📌 {task_name}\n"
        f"🏢 {obra_name}\n"
        f"📅 Vence: {due_date}\n\n"
        "¿Cuál es el estado actual?\n\n"
        f"{_n(1)} En curso\n"
        f"{_n(2)} Finalizada\n"
        f"{_n(3)} Demorada\n"
        f"{_n(4)} Reprogramar fecha\n\n"
        f"{_DIVIDER}\n"
        f"{_nav(back=can_go_back)}"
    )


def build_reminder_message(
    name: str,
    task_name: str,
    obra_name: str,
    due_date: str,
) -> str:
    """Proactive reminder sent by the notification service before the due date."""
    return (
        f"{_HEADER}\n\n"
        f"Hola {name}. Tenés una tarea próxima a vencer.\n\n"
        f"📌 {task_name}\n"
        f"🏢 {obra_name}\n"
        f"📅 Vence: {due_date}\n\n"
        "Respondé con el estado actual:\n\n"
        f"{_n(1)} En curso\n"
        f"{_n(2)} Finalizada\n"
        f"{_n(3)} Demorada\n"
        f"{_n(4)} Reprogramar fecha\n\n"
        f"{_DIVIDER}\n"
        f"{_nav(back=False)}"
    )


def build_reschedule_request_message(
    task_name: str,
    current_due_date: str,
    *,
    can_go_back: bool = True,
) -> str:
    """Ask the user for a new due date."""
    return (
        "📅 Reprogramar fecha\n\n"
        f"Tarea: {task_name}\n"
        f"Fecha actual: {current_due_date}\n\n"
        "Indicá la nueva fecha.\n"
        "Formato: DD/MM o DD/MM/AAAA\n"
        "Ejemplo: 15/06 o 15/06/2026\n\n"
        f"{_DIVIDER}\n"
        f"{_nav(back=can_go_back)}"
    )


def build_confirmation_message(name: str, task_name: str, status: str) -> str:
    """Confirm a status update."""
    label = STATUS_LABELS.get(status, status)
    return (
        "✅ Estado actualizado\n\n"
        f"Tarea: {task_name}\n"
        f"Nuevo estado: {label}\n\n"
        f"Gracias {name}, la información fue registrada en Constructa."
    )


def build_reschedule_confirmation_message(
    name: str, task_name: str, new_date: str
) -> str:
    """Confirm a date reschedule."""
    return (
        "✅ Fecha reprogramada\n\n"
        f"Tarea: {task_name}\n"
        f"Nueva fecha: {new_date}\n\n"
        f"Gracias {name}, la información fue registrada en Constructa."
    )


def build_already_in_status_message(name: str, task_name: str, status: str) -> str:
    """Tell the user the task is already in the requested status."""
    label = STATUS_LABELS.get(status, status)
    return (
        f"Hola {name}. La tarea «{task_name}» ya está en estado {label}.\n\n"
        "No se realizaron cambios."
    )


def build_cancelled_message() -> str:
    """Shown when the user cancels the conversation flow."""
    return (
        f"{_HEADER}\n\n"
        "Conversación cancelada.\n\n"
        "Enviá cualquier mensaje para comenzar de nuevo."
    )


def build_non_text_message(name: str) -> str:
    """Reply when a non-text message (image, audio, etc.) is received."""
    return (
        f"Hola {name}. Recibimos tu mensaje.\n\n"
        "Por favor respondé con el número de la opción deseada."
    )
