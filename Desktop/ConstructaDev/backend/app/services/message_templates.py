"""
Centralized WhatsApp message templates for the Constructa chatbot.

All user-facing text lives here. To change wording, emojis, or
layout, edit this file — no business logic needs to be touched.
"""
from datetime import date

# ── Status labels ──────────────────────────────────────────────────────────────

STATUS_LABELS: dict[str, str] = {
    "pendiente":   "Pendiente",
    "en_progreso": "En curso",
    "bloqueada":   "Demorada",
    "en_revision": "En revisión",
    "completada":  "Finalizada",
    "cancelada":   "Cancelada",
}

_HEADER = "🏗️ CONSTRUCTA"

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


def build_task_list_message(name: str, options: list[dict]) -> str:
    """Numbered task selection menu sent when the user has multiple active tasks."""
    rows = "\n".join(
        f"{o['idx']}. {o['obra_name']} – {o['title']} – vence {o['due_date']}"
        for o in options
    )
    return (
        f"{_HEADER}\n\n"
        f"Hola {name}. Estas son tus tareas activas:\n\n"
        f"{rows}\n\n"
        "Respondé con el número de la tarea que querés actualizar."
    )


def build_status_menu_message(
    name: str, task_name: str, obra_name: str, due_date: str
) -> str:
    """Status selection menu shown when the user selects a task from a list."""
    return (
        f"{_HEADER}\n\n"
        f"Hola {name}.\n\n"
        f"📌 Tarea: {task_name}\n"
        f"🏢 Obra: {obra_name}\n"
        f"📅 Vencimiento: {due_date}\n\n"
        "¿Cuál es el estado actual?\n\n"
        "1. En curso\n"
        "2. Finalizada\n"
        "3. Demorada\n"
        "4. Reprogramar fecha"
    )


def build_reminder_message(
    name: str, task_name: str, obra_name: str, due_date: str
) -> str:
    """Proactive reminder sent by the notification service before the due date."""
    return (
        f"{_HEADER}\n\n"
        f"Hola {name}. Tenés una tarea próxima a vencer.\n\n"
        f"📌 Tarea: {task_name}\n"
        f"🏢 Obra: {obra_name}\n"
        f"📅 Vencimiento: {due_date}\n\n"
        "Respondé con el estado actual:\n\n"
        "1. En curso\n"
        "2. Finalizada\n"
        "3. Demorada\n"
        "4. Reprogramar fecha"
    )


def build_reschedule_request_message(task_name: str, current_due_date: str) -> str:
    """Ask the user for a new due date."""
    return (
        "📅 Reprogramar fecha\n\n"
        f"Tarea: {task_name}\n"
        f"Fecha actual: {current_due_date}\n\n"
        "Indicá la nueva fecha.\n"
        "Formato: DD/MM o DD/MM/AAAA\n"
        "Ejemplo: 15/06 o 15/06/2026"
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


def build_non_text_message(name: str) -> str:
    """Reply when a non-text message (image, audio, etc.) is received."""
    return (
        f"Hola {name}. Recibimos tu mensaje.\n\n"
        "Por favor respondé con el número de la opción deseada."
    )
