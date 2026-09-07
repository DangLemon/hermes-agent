"""Regression coverage for queue-mode text debounce FIFO preservation."""

import asyncio

import pytest

from gateway.platforms.base import (
    BasePlatformAdapter,
    MessageEvent,
    MessageType,
    Platform,
    PlatformConfig,
    SessionSource,
)


class _Adapter(BasePlatformAdapter):
    def __init__(self):
        super().__init__(PlatformConfig(enabled=True, token="test"), Platform.TELEGRAM)
        self._busy_text_mode = "queue"
        self._busy_text_debounce_seconds = 60.0
        self._busy_text_hard_cap_seconds = 60.0

    async def connect(self, *, is_reconnect: bool = False) -> bool:
        return True

    async def disconnect(self) -> None:
        self._mark_disconnected()

    async def send(self, chat_id, content, reply_to=None, metadata=None):
        raise AssertionError("not used")

    async def get_chat_info(self, chat_id):
        return {"id": chat_id, "type": "group"}


def _event(text: str, sender: str) -> MessageEvent:
    return MessageEvent(
        text=text,
        message_type=MessageType.TEXT,
        source=SessionSource(
            platform=Platform.TELEGRAM,
            chat_id="group-1",
            chat_type="group",
            user_id=sender,
            user_name=sender,
        ),
        message_id=f"{sender}-{text}",
    )


@pytest.mark.asyncio
async def test_queue_text_debounce_preserves_third_sender_behind_pending_and_buffer():
    adapter = _Adapter()
    session_key = "agent:main:telegram:group:group-1"
    a = _event("A", "alice")
    b = _event("B", "bob")
    c = _event("C", "carol")

    adapter._pending_messages[session_key] = a
    await adapter._queue_text_debounce(session_key, b)
    await adapter._queue_text_debounce(session_key, c)

    assert adapter._pending_messages[session_key] is a
    state = adapter._text_debounce_store().get(session_key)
    overflow = getattr(adapter, "_pending_text_overflow", {}).get(session_key, [])
    queued_texts = [event.text for event in overflow]
    if state is not None:
        queued_texts.append(state.event.text)
    assert queued_texts == ["B", "C"]
    assert [event.source.user_id for event in overflow] in (["bob"], ["bob", "carol"])

    adapter._pending_messages.pop(session_key)
    await adapter._flush_text_debounce_now(session_key)
    adapter._promote_pending_overflow_now(session_key)
    assert adapter._pending_messages[session_key].text == "B"
    assert adapter._pending_messages[session_key].source.user_id == "bob"

    adapter._pending_messages.pop(session_key)
    await adapter._flush_text_debounce_now(session_key)
    adapter._promote_pending_overflow_now(session_key)
    assert adapter._pending_messages[session_key].text == "C"
    assert adapter._pending_messages[session_key].source.user_id == "carol"



async def _drain_one(adapter: _Adapter, session_key: str) -> MessageEvent:
    event = adapter._pending_messages.pop(session_key)
    await adapter._flush_text_debounce_now(session_key)
    adapter._promote_pending_overflow_now(session_key)
    return event


@pytest.mark.asyncio
async def test_queue_text_debounce_does_not_merge_later_matching_sender_ahead_of_fifo():
    adapter = _Adapter()
    session_key = "agent:main:telegram:group:group-1"
    first_a = _event("A1", "alice")

    adapter._pending_messages[session_key] = first_a
    await adapter._queue_text_debounce(session_key, _event("B", "bob"))
    await adapter._queue_text_debounce(session_key, _event("C", "carol"))
    await adapter._queue_text_debounce(session_key, _event("A2", "alice"))

    assert adapter._pending_messages[session_key].text == "A1"

    drained = []
    while session_key in adapter._pending_messages:
        event = await _drain_one(adapter, session_key)
        drained.append((event.text, event.source.user_id))

    assert drained == [
        ("A1", "alice"),
        ("B", "bob"),
        ("C", "carol"),
        ("A2", "alice"),
    ]


def test_get_pending_message_promotes_idle_overflow_head():
    adapter = _Adapter()
    session_key = "agent:main:telegram:group:group-1"
    adapter._pending_text_overflow_store()[session_key] = [
        _event("B", "bob"),
        _event("C", "carol"),
    ]

    assert adapter.get_pending_message(session_key).text == "B"
    assert adapter.get_pending_message(session_key).text == "C"
    assert adapter.get_pending_message(session_key) is None


@pytest.mark.asyncio
async def test_cancel_background_tasks_flushes_debounce_and_overflow_to_shutdown_spool(monkeypatch):
    adapter = _Adapter()
    session_key = "agent:main:telegram:group:group-1"
    adapter._pending_messages[session_key] = _event("A", "alice")
    await adapter._queue_text_debounce(session_key, _event("B", "bob"))
    await adapter._queue_text_debounce(session_key, _event("C", "carol"))

    flushed_pending = []
    flushed_overflow = []

    def fake_flush_pending(pending, *, reason):
        flushed_pending.extend(event.text for event in pending.values())
        return len(pending)

    def fake_flush_overflow(overflow, *, reason):
        for events in overflow.values():
            flushed_overflow.extend(event.text for event in events)
        return len(flushed_overflow)

    monkeypatch.setattr("gateway.shutdown_flush.flush_pending_to_file", fake_flush_pending)
    monkeypatch.setattr("gateway.shutdown_flush.flush_overflow_to_file", fake_flush_overflow)

    await adapter.cancel_background_tasks()

    assert flushed_pending == ["A"]
    assert flushed_overflow == ["B", "C"]
    assert adapter._pending_messages == {}
    assert adapter._pending_text_overflow_store() == {}


def test_discard_text_debounce_clears_overflow_tail():
    adapter = _Adapter()
    session_key = "agent:main:telegram:group:group-1"
    adapter._pending_text_overflow_store()[session_key] = [_event("B", "bob")]

    adapter._discard_text_debounce(session_key)

    assert adapter._pending_text_overflow_store().get(session_key) is None


def test_pending_text_overflow_is_bounded(caplog):
    adapter = _Adapter()
    session_key = "agent:main:telegram:group:group-1"
    adapter._pending_messages[session_key] = _event("A", "alice")
    adapter._pending_text_overflow_store()[session_key] = [
        _event(f"B-{i}", f"bob-{i}") for i in range(31)
    ]

    accepted = adapter._append_pending_text_overflow(session_key, _event("C", "carol"))

    assert accepted is False
    assert len(adapter._pending_text_overflow_store()[session_key]) == 31
    assert "pending text FIFO at cap" in caplog.text


@pytest.mark.asyncio
async def test_public_handle_message_drains_shared_group_bursts_in_sender_order():
    adapter = _Adapter()
    adapter.config.extra["group_sessions_per_user"] = False
    adapter.config.typing_indicator = False
    entered = asyncio.Event()
    release = asyncio.Event()
    processed = []

    async def handler(event):
        processed.append((event.text, event.source.user_id))
        if event.text == "running":
            entered.set()
            await release.wait()

    adapter._message_handler = handler
    try:
        await adapter.handle_message(_event("running", "initial"))
        await asyncio.wait_for(entered.wait(), timeout=5)
        for text, sender in [("A1", "alice"), ("B", "bob"), ("C", "carol"), ("A2", "alice")]:
            await adapter.handle_message(_event(text, sender))
        assert processed == [("running", "initial")]
        release.set()

        async def finish_drains():
            while adapter._background_tasks:
                await asyncio.gather(*tuple(adapter._background_tasks))

        await asyncio.wait_for(finish_drains(), timeout=5)
        assert processed == [
            ("running", "initial"), ("A1", "alice"), ("B", "bob"),
            ("C", "carol"), ("A2", "alice"),
        ]
        assert not adapter._active_sessions
        assert not adapter._pending_messages
    finally:
        release.set()
        await adapter.cancel_background_tasks()
