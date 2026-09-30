"""Automatic image route for main custom providers.

The selector consumes provider catalog metadata (``output_modalities`` plus
``image_generation.protocol``) discovered by ``lemon_cli``.  This module performs
only call-time runtime resolution and protocol dispatch; it never probes model
catalogs or credentials during schema/check gates.
"""

from __future__ import annotations


import base64
import binascii
import json
import logging
from typing import Any, Dict, Iterable, Optional

from agent.image_gen_provider import error_response, resolve_aspect_ratio, success_response
from plugins.image_gen._common import import_openai, materialize_image, size_for

logger = logging.getLogger(__name__)

_SUPPORTED_PROTOCOLS = {"images", "chat_completions", "responses"}


def model_config_from_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Small read-only mirror of runtime_provider._get_model_config for supplied configs."""
    model_cfg = cfg.get("model") if isinstance(cfg, dict) else None
    if isinstance(model_cfg, str) and model_cfg.strip():
        return {"default": model_cfg.strip()}
    if not isinstance(model_cfg, dict):
        return {}
    out = dict(model_cfg)
    if not out.get("default") and out.get("model"):
        out["default"] = out["model"]
    default = out.get("default")
    if isinstance(default, dict):
        try:
            from lemon_cli.config import split_model_config_default

            cfg_model, cfg_provider = split_model_config_default(default)
        except Exception:  # noqa: BLE001
            cfg_model, cfg_provider = "", ""
        cfg_provider = cfg_provider or str(model_cfg.get("provider") or "")
        out["default"] = cfg_model
        if cfg_provider and not out.get("provider"):
            out["provider"] = cfg_provider
    return out


def _entry_url(entry: Dict[str, Any]) -> str:
    return str(entry.get("api") or entry.get("url") or entry.get("base_url") or "").strip()


def _cache_valid_model_catalog(entry: Dict[str, Any], *, base_url: str, api_mode: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """Same-fingerprint cached metadata for this endpoint/key/headers, or {} without probing."""
    try:
        from lemon_cli import runtime_provider as rp
        from lemon_cli.models import cached_api_model_catalog

        key_env = str(entry.get("key_env") or entry.get("api_key_env") or "").strip()
        api_key = str(entry.get("api_key") or "").strip() or (rp._getenv(key_env, "").strip() if key_env else "")
        headers = entry.get("extra_headers") if isinstance(entry.get("extra_headers"), dict) else None
        catalog = cached_api_model_catalog(api_key, base_url, api_mode=api_mode, headers=headers) or {}
        from lemon_cli.model_switch import _models_config_is_allowlist, _declared_model_ids
        if _models_config_is_allowlist(entry.get("models"), entry.get("models_discovered") is True):
            allowed = set(_declared_model_ids(entry.get("models")))
            catalog = {model: meta for model, meta in catalog.items() if model in allowed}
        return catalog
    except Exception as exc:  # noqa: BLE001
        logger.debug("Could not read cached custom image metadata: %s", exc)
        return {}


def configured_main_custom_provider_entry(
    config: Optional[Dict[str, Any]] = None,
) -> Optional[tuple[str, Dict[str, Any], Dict[str, Any]]]:
    """Active custom provider and credential-scoped cached catalog, without network or token minting."""
    try:
        from lemon_cli import runtime_provider as rp
        from lemon_cli.config import is_provider_enabled
        from lemon_cli.providers import custom_provider_aliases
        from lemon_cli.runtime_provider_custom import _shadowed_by_builtin

        cfg = config if isinstance(config, dict) else rp.load_config()
        model_cfg = model_config_from_config(cfg)
        provider_name = str(model_cfg.get("provider") or "").strip()
        if not provider_name:
            return None
        requested = provider_name.lower().replace(" ", "-")
        if _shadowed_by_builtin(requested):
            return None
        providers = cfg.get("providers") if isinstance(cfg, dict) else None
        if isinstance(providers, dict):
            for key, entry in providers.items():
                if not isinstance(entry, dict) or not is_provider_enabled(entry):
                    continue
                if requested not in custom_provider_aliases(str(entry.get("name", "") or key), str(key)):
                    continue
                base_url = _entry_url(entry)
                if not base_url:
                    return None
                api_mode = str(entry.get("api_mode") or entry.get("transport") or "").strip() or None
                cached_catalog = _cache_valid_model_catalog(entry, base_url=base_url, api_mode=api_mode)
                if not cached_catalog:
                    return None
                resolved = {
                    "name": entry.get("name", key),
                    "base_url": base_url,
                    "model": entry.get("default_model", ""),
                }
                entry = {**entry, "models": cached_catalog}
                return provider_name, entry, resolved
        for entry in rp.get_compatible_custom_providers(cfg) or []:
            if not isinstance(entry, dict):
                continue
            aliases = custom_provider_aliases(str(entry.get("name", "")), str(entry.get("provider_key", "")))
            if requested not in aliases:
                continue
            base_url = _entry_url(entry)
            if not base_url:
                return None
            api_mode = str(entry.get("api_mode") or entry.get("transport") or "").strip() or None
            cached_catalog = _cache_valid_model_catalog(entry, base_url=base_url, api_mode=api_mode)
            if not cached_catalog:
                return None
            resolved = {
                "name": entry.get("name", provider_name),
                "base_url": base_url,
                "model": entry.get("model") or entry.get("default_model", ""),
            }
            entry = {**entry, "models": cached_catalog}
            return provider_name, entry, resolved
    except Exception as exc:  # noqa: BLE001
        logger.debug("Could not inspect main custom provider for image generation: %s", exc)
    return None

def image_error(aspect: str, model: str, prompt: str, message: str, error_type: str) -> Dict[str, Any]:
    return error_response(
        error=message, error_type=error_type, provider="custom", model=model,
        prompt=prompt, aspect_ratio=aspect)


def materialized_response(response: Any, *, model: str, prompt: str, aspect: str) -> Dict[str, Any]:
    data = getattr(response, "data", None) or []
    if not data:
        return image_error(aspect, model, prompt, "Custom image provider returned no image data", "empty_response")
    first = data[0]
    image_ref, err = materialize_image(
        getattr(first, "b64_json", None), getattr(first, "url", None),
        prefix="custom_image", label="Custom image provider", provider="custom",
        model=model, prompt=prompt, aspect=aspect, log=logger)
    if err:
        return err
    extra: Dict[str, Any] = {}
    if getattr(first, "revised_prompt", None):
        extra["revised_prompt"] = first.revised_prompt
    return success_response(
        image=image_ref, model=model, prompt=prompt, aspect_ratio=aspect,
        provider="custom", modality="text", extra=extra)


def resolve_api_key(value: Any, *, aspect: str, model: str, prompt: str) -> tuple[Optional[str], Optional[Dict[str, Any]]]:
    if callable(value) and not isinstance(value, str):
        try:
            value = value()
        except Exception as exc:  # noqa: BLE001
            return None, image_error(
                aspect, model, prompt, f"Custom image provider credential command failed: {exc}", "auth_required")
    return str(value or "no-key-required"), None


def openai_client_kwargs(runtime: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    client_kwargs: Dict[str, Any] = {
        "api_key": api_key,
        "base_url": str(runtime.get("base_url") or "").rstrip("/"),
        "timeout": 180,
        "max_retries": 0,
    }
    headers = runtime.get("extra_headers")
    if isinstance(headers, dict) and headers:
        client_kwargs["default_headers"] = dict(headers)
    return client_kwargs


def http_headers(runtime: Dict[str, Any], api_key: str) -> Dict[str, str]:
    headers: Dict[str, str] = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    extra_headers = runtime.get("extra_headers")
    if isinstance(extra_headers, dict):
        headers.update({str(k): str(v) for k, v in extra_headers.items()})
    return headers


def base_url(runtime: Dict[str, Any]) -> str:
    return str(runtime.get("base_url") or "").rstrip("/")


def dispatch_images_protocol(
    *, runtime: Dict[str, Any], model: str, prompt: str, aspect: str, api_key: str,
) -> Dict[str, Any]:
    openai, err = import_openai("custom", aspect)
    if err:
        return err
    request: Dict[str, Any] = {"model": model, "prompt": prompt, "size": size_for(aspect), "n": 1}
    try:
        with openai.OpenAI(**openai_client_kwargs(runtime, api_key)) as client:
            response = client.images.generate(**request)
    except Exception as exc:  # noqa: BLE001
        logger.debug("Automatic custom images.generate failed", exc_info=True)
        return image_error(aspect, model, prompt, f"Custom image provider generation failed: {exc}", "api_error")
    return materialized_response(response, model=model, prompt=prompt, aspect=aspect)


def _extract_data_url_b64(value: str) -> Optional[str]:
    header, sep, data = value.partition(",")
    if not sep or not header.lower().startswith("data:image/") or ";base64" not in header.lower():
        return None
    try:
        base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        return None
    return data


def _materialize_output_image(
    b64: Optional[str], url: Optional[str], *, model: str, prompt: str, aspect: str,
) -> Dict[str, Any]:
    if url and url.strip().lower().startswith("data:image/"):
        b64 = _extract_data_url_b64(url)
        url = None
    image_ref, err = materialize_image(
        b64, url, prefix="custom_image", label="Custom image provider", provider="custom",
        model=model, prompt=prompt, aspect=aspect, log=logger)
    if err:
        return err
    return success_response(
        image=image_ref, model=model, prompt=prompt, aspect_ratio=aspect,
        provider="custom", modality="text")


def _extract_chat_image(payload: Any) -> tuple[Optional[str], Optional[str]]:
    if not isinstance(payload, dict):
        return None, None
    for choice in payload.get("choices") or []:
        if not isinstance(choice, dict):
            continue
        message = choice.get("message")
        if not isinstance(message, dict):
            continue
        for image in message.get("images") or []:
            if not isinstance(image, dict):
                continue
            if isinstance(image.get("b64_json"), str):
                return image["b64_json"], None
            image_url = image.get("image_url")
            if isinstance(image_url, dict) and isinstance(image_url.get("url"), str):
                return None, image_url["url"]
            if isinstance(image_url, str):
                return None, image_url
            if isinstance(image.get("url"), str):
                return None, image["url"]
    return None, None


def _extract_responses_image(payload: Any, *, final_only: bool) -> tuple[Optional[str], Optional[str]]:
    if isinstance(payload, dict):
        node_type = payload.get("type")
        if node_type == "image_generation_call":
            result = payload.get("result")
            if isinstance(result, str) and result:
                return result, None
            if not final_only and isinstance(payload.get("partial_image_b64"), str):
                return payload["partial_image_b64"], None
            return None, None
        for child in payload.values():
            b64, url = _extract_responses_image(child, final_only=final_only)
            if b64 or url:
                return b64, url
    elif isinstance(payload, list):
        for child in payload:
            b64, url = _extract_responses_image(child, final_only=final_only)
            if b64 or url:
                return b64, url
    return None, None


def _materialize_chat_payload(payload: Any, *, model: str, prompt: str, aspect: str) -> Dict[str, Any]:
    b64, url = _extract_chat_image(payload)
    return _materialize_output_image(b64, url, model=model, prompt=prompt, aspect=aspect)


def _materialize_responses_payload(payload: Any, *, model: str, prompt: str, aspect: str) -> Dict[str, Any]:
    b64, url = _extract_responses_image(payload, final_only=True)
    return _materialize_output_image(b64, url, model=model, prompt=prompt, aspect=aspect)


def _post_json(runtime: Dict[str, Any], api_key: str, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    import requests

    response = requests.post(
        f"{base_url(runtime)}{path}", headers=http_headers(runtime, api_key),
        data=json.dumps(payload), timeout=180)
    response.raise_for_status()
    return response.json()


def dispatch_chat_completions_protocol(
    *, runtime: Dict[str, Any], model: str, prompt: str, aspect: str, api_key: str,
) -> Dict[str, Any]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        "modalities": ["image"],
    }
    try:
        data = _post_json(runtime, api_key, "/chat/completions", payload)
    except Exception as exc:  # noqa: BLE001
        logger.debug("Automatic custom chat-completions image generation failed", exc_info=True)
        return image_error(aspect, model, prompt, f"Custom image provider generation failed: {exc}", "api_error")
    return _materialize_chat_payload(data, model=model, prompt=prompt, aspect=aspect)


def _iter_sse_json_lines(response: Any) -> Iterable[Dict[str, Any]]:
    event_name: Optional[str] = None
    data_lines: list[str] = []

    def flush() -> Optional[Dict[str, Any]]:
        nonlocal event_name, data_lines
        if not data_lines:
            event_name = None
            return None
        raw = "\n".join(data_lines).strip()
        event, event_name, data_lines = event_name, None, []
        if not raw or raw == "[DONE]":
            return None
        payload = json.loads(raw)
        if isinstance(payload, dict) and event and "type" not in payload:
            payload["type"] = event
        return payload if isinstance(payload, dict) else None

    for line in response.iter_lines():
        if isinstance(line, bytes):
            line = line.decode("utf-8", errors="replace")
        line = str(line)
        if line == "":
            payload = flush()
            if payload is not None:
                yield payload
        elif line.startswith("event:"):
            event_name = line[len("event:"):].strip()
        elif line.startswith("data:"):
            data_lines.append(line[len("data:"):].lstrip())
    payload = flush()
    if payload is not None:
        yield payload


def _collect_responses_payload(runtime: Dict[str, Any], api_key: str, payload: Dict[str, Any]) -> Any:
    import requests

    response = requests.post(
        f"{base_url(runtime)}/responses", headers=http_headers(runtime, api_key),
        data=json.dumps(payload), timeout=300, stream=True)
    try:
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if "text/event-stream" in content_type:
            final_payload: Any = None
            last_payload: Any = None
            for event in _iter_sse_json_lines(response):
                if event.get("type") in {"response.failed", "response.incomplete", "error"}:
                    raise ValueError(f"Image response ended with {event['type']}")
                if _extract_responses_image(event, final_only=True) != (None, None):
                    final_payload = event
                last_payload = event
            return final_payload if final_payload is not None else last_payload
        return response.json()
    finally:
        response.close()


def dispatch_responses_protocol(
    *, runtime: Dict[str, Any], model: str, request_model: Optional[str], prompt: str, aspect: str, api_key: str,
) -> Dict[str, Any]:
    if not request_model:
        return image_error(
            aspect, model, prompt,
            "Custom image provider metadata for Responses image generation must declare image_generation.request_model; Lemon will not guess an orchestration model.",
            "provider_contract")
    payload = {
        "model": request_model,
        "store": False,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
        "tools": [{"type": "image_generation", "model": model, "size": size_for(aspect)}],
        "stream": True,
    }
    try:
        data = _collect_responses_payload(runtime, api_key, payload)
    except Exception as exc:  # noqa: BLE001
        logger.debug("Automatic custom Responses image generation failed", exc_info=True)
        return image_error(aspect, model, prompt, f"Custom image provider generation failed: {exc}", "api_error")
    return _materialize_responses_payload(data, model=model, prompt=prompt, aspect=aspect)


def dispatch_metadata_protocol(
    *, runtime: Dict[str, Any], binding: Dict[str, Any], prompt: str, aspect_ratio: str,
) -> Dict[str, Any]:
    aspect = resolve_aspect_ratio(aspect_ratio)
    model = str(binding.get("model") or runtime.get("model") or "").strip()
    protocol = str(binding.get("protocol") or "").strip()
    prompt = (prompt or "").strip()
    if not prompt:
        return image_error(aspect, model, prompt, "Prompt is required and must be a non-empty string", "invalid_argument")
    if protocol not in _SUPPORTED_PROTOCOLS:
        return image_error(aspect, model, prompt, f"Unsupported custom image protocol: {protocol}", "provider_contract")
    api_key, err = resolve_api_key(runtime.get("api_key"), aspect=aspect, model=model, prompt=prompt)
    if err:
        return err
    if protocol == "images":
        return dispatch_images_protocol(runtime=runtime, model=model, prompt=prompt, aspect=aspect, api_key=api_key or "")
    if protocol == "chat_completions":
        return dispatch_chat_completions_protocol(runtime=runtime, model=model, prompt=prompt, aspect=aspect, api_key=api_key or "")
    return dispatch_responses_protocol(
        runtime=runtime, model=model, request_model=binding.get("request_model"),
        prompt=prompt, aspect=aspect, api_key=api_key or "")
