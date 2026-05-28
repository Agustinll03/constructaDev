"""Unit tests for conversation service pure helper functions (no DB)."""
import pytest
from datetime import date

from app.services.conversation_service import (
    _is_cancel,
    _is_back,
    _is_menu,
    _parse_option,
    _parse_date,
    _has_meta,
    _page_of,
    _all_tasks,
    _page_tasks,
    _has_more,
    _remaining,
    _with_meta,
    _next_page,
    _make_task_options,
)

_TASKS_PER_PAGE = 5


# ── Navigation commands ───────────────────────────────────────────────────────

@pytest.mark.parametrize("body", ["x", "X", "cancelar", "CANCELAR", "salir"])
def test_is_cancel_true(body):
    assert _is_cancel(body) is True


@pytest.mark.parametrize("body", ["menu", "hola", "0", None, ""])
def test_is_cancel_false(body):
    assert _is_cancel(body) is False


def test_is_back_true():
    assert _is_back("0") is True


@pytest.mark.parametrize("body", ["1", "x", None, ""])
def test_is_back_false(body):
    assert _is_back(body) is False


@pytest.mark.parametrize("body", ["menu", "menú", "inicio", "hola", "start"])
def test_is_menu_true(body):
    assert _is_menu(body) is True


@pytest.mark.parametrize("body", ["cancelar", "x", "0", None])
def test_is_menu_false(body):
    assert _is_menu(body) is False


# ── _parse_option ─────────────────────────────────────────────────────────────

def test_parse_option_valid():
    assert _parse_option("3", 5) == 3


def test_parse_option_boundary_1():
    assert _parse_option("1", 5) == 1


def test_parse_option_boundary_max():
    assert _parse_option("5", 5) == 5


def test_parse_option_out_of_range_returns_none():
    assert _parse_option("6", 5) is None


def test_parse_option_zero_returns_none():
    assert _parse_option("0", 5) is None


def test_parse_option_none_body_returns_none():
    assert _parse_option(None, 5) is None


def test_parse_option_non_digit_returns_none():
    assert _parse_option("abc", 5) is None


# ── _parse_date ───────────────────────────────────────────────────────────────

def test_parse_date_none_returns_none():
    assert _parse_date(None) is None


def test_parse_date_empty_returns_none():
    assert _parse_date("") is None


def test_parse_date_invalid_format_returns_none():
    assert _parse_date("2024-03-15") is None


def test_parse_date_ddmm_returns_date():
    result = _parse_date("15/06")
    assert result is not None
    assert result.day == 15
    assert result.month == 6


def test_parse_date_ddmmyyyy_returns_date():
    result = _parse_date("15/06/2025")
    assert result is not None
    assert result == date(2025, 6, 15)


def test_parse_date_ddmmyy_short_year():
    result = _parse_date("15/06/25")
    assert result is not None
    assert result.year == 2025


def test_parse_date_invalid_day_returns_none():
    assert _parse_date("32/06/2025") is None


# ── Pagination helpers ────────────────────────────────────────────────────────

def _tasks(n: int) -> list[dict]:
    return [{"id": i} for i in range(n)]


def test_has_meta_false_on_plain_list():
    assert _has_meta(_tasks(3)) is False


def test_has_meta_true_after_with_meta():
    wrapped = _with_meta(_tasks(3), 0)
    assert _has_meta(wrapped) is True


def test_page_of_plain_list_returns_0():
    assert _page_of(_tasks(3)) == 0


def test_all_tasks_strips_meta():
    tasks = _tasks(6)
    wrapped = _with_meta(tasks, 0)
    assert len(_all_tasks(wrapped)) == 6


def test_page_tasks_first_page():
    tasks = _tasks(8)
    wrapped = _with_meta(tasks, 0)
    assert len(_page_tasks(wrapped)) == _TASKS_PER_PAGE


def test_page_tasks_second_page():
    tasks = _tasks(8)
    wrapped = _next_page(_with_meta(tasks, 0))
    assert len(_page_tasks(wrapped)) == 3  # 8 - 5


def test_has_more_true_when_tasks_exceed_page():
    tasks = _tasks(6)
    wrapped = _with_meta(tasks, 0)
    assert _has_more(wrapped) is True


def test_has_more_false_on_last_page():
    tasks = _tasks(5)
    wrapped = _with_meta(tasks, 0)
    assert _has_more(wrapped) is False


def test_remaining_counts_tasks_after_current_page():
    tasks = _tasks(8)
    wrapped = _with_meta(tasks, 0)
    assert _remaining(wrapped) == 3  # 8 - 5


def test_make_task_options_wraps_only_when_exceeds_page():
    assert not _has_meta(_make_task_options(_tasks(4)))
    assert _has_meta(_make_task_options(_tasks(6)))
