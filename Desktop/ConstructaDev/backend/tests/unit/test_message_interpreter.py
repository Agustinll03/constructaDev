import pytest
from app.services.message_interpreter import interpret
from app.models.task import TaskStatus


@pytest.mark.parametrize("text", ["terminado", "finalizado", "listo", "completado"])
def test_completion_keywords(text):
    result = interpret(text)
    assert result.action == "complete"
    assert result.status == TaskStatus.COMPLETADA
    assert result.progress == 100


@pytest.mark.parametrize("text", [
    "no podemos avanzar",
    "falta material",
    "demorado",
    "demora",
    "bloqueado",
])
def test_block_phrases(text):
    result = interpret(text)
    assert result.action == "block"
    assert result.status == TaskStatus.BLOQUEADA


def test_no_match_returns_none_action():
    result = interpret("todo bien por acá")
    assert result.action == "none"
    assert result.status is None
    assert result.progress is None


def test_empty_string_returns_none():
    assert interpret("").action == "none"


def test_none_input_returns_none():
    assert interpret(None).action == "none"


def test_completion_keyword_case_insensitive():
    result = interpret("TERMINADO")
    assert result.action == "complete"


def test_result_to_dict():
    result = interpret("listo")
    d = result.to_dict()
    assert d["action"] == "complete"
    assert d["status"] == TaskStatus.COMPLETADA.value
    assert d["progress"] == 100
