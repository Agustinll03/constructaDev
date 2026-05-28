"""Unit tests for Pydantic schema validators (pure validation, no DB)."""
import pytest
from datetime import date
from pydantic import ValidationError

from app.schemas.obra import ObraCreate, ObraUpdate
from app.schemas.responsible import ResponsibleCreate


# ── ObraCreate ────────────────────────────────────────────────────────────────

def test_obra_create_valid_dates():
    o = ObraCreate(name="Mi obra", start_date=date(2024, 1, 1), expected_end_date=date(2024, 6, 1))
    assert o.start_date < o.expected_end_date


def test_obra_create_no_dates_is_valid():
    o = ObraCreate(name="Mi obra")
    assert o.start_date is None
    assert o.expected_end_date is None


def test_obra_create_reversed_dates_raises():
    with pytest.raises(ValidationError):
        ObraCreate(name="Mi obra", start_date=date(2024, 6, 1), expected_end_date=date(2024, 1, 1))


def test_obra_create_same_date_raises():
    with pytest.raises(ValidationError):
        ObraCreate(name="Mi obra", start_date=date(2024, 3, 1), expected_end_date=date(2024, 2, 28))


def test_obra_create_name_too_short_raises():
    with pytest.raises(ValidationError):
        ObraCreate(name="A")


# ── ObraUpdate ────────────────────────────────────────────────────────────────

def test_obra_update_reversed_expected_end_raises():
    with pytest.raises(ValidationError):
        ObraUpdate(start_date=date(2024, 6, 1), expected_end_date=date(2024, 1, 1))


def test_obra_update_reversed_actual_end_raises():
    with pytest.raises(ValidationError):
        ObraUpdate(start_date=date(2024, 6, 1), actual_end_date=date(2024, 5, 31))


def test_obra_update_all_none_is_valid():
    o = ObraUpdate()
    assert o.name is None


def test_obra_update_valid_dates_pass():
    o = ObraUpdate(start_date=date(2024, 1, 1), expected_end_date=date(2024, 12, 31))
    assert o.expected_end_date > o.start_date


# ── ResponsibleCreate ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("number", [
    "+5491112345678",
    "+1234567890",
    "+441234567890",
])
def test_responsible_valid_e164(number):
    r = ResponsibleCreate(full_name="Juan García", whatsapp_number=number)
    assert r.whatsapp_number == number


@pytest.mark.parametrize("number", [
    "5491112345678",    # missing +
    "+549",            # too short
    "+54abc1234567",   # non-digits
    "0011 1234 5678",  # spaces
    "",
])
def test_responsible_invalid_phone_raises(number):
    with pytest.raises(ValidationError):
        ResponsibleCreate(full_name="Juan García", whatsapp_number=number)
