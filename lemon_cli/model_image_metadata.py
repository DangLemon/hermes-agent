"""Image-model metadata normalization and selection helpers.

Discovery keeps provider catalog metadata here without making routing guesses: a model is
image-generating only when the catalog explicitly declares image output and a supported image
protocol.
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping, Optional

SUPPORTED_IMAGE_PROTOCOLS: frozenset[str] = frozenset({"images", "chat_completions", "responses"})
_IMAGE_OUTPUT_MODALITY = "image"


def _string_list(value: Any) -> Optional[list[str]]:
    if not isinstance(value, list):
        return None
    items: list[str] = []
    for item in value:
        if not isinstance(item, str):
            return None
        cleaned = item.strip()
        if cleaned:
            items.append(cleaned)
    return items


def _model_id_from_row(row: Mapping[str, Any]) -> str:
    for key in ("id", "name", "model"):
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def normalize_image_metadata(row: Mapping[str, Any]) -> dict[str, Any]:
    """Return canonical model metadata fields from a provider catalog row.

    Preserves only the metadata the runtime understands (plus raw ``kind`` for diagnostics) and
    validates field shapes. Unknown or malformed values are omitted rather than guessed.
    """
    if not isinstance(row, Mapping):
        return {}

    normalized: dict[str, Any] = {}
    model_id = _model_id_from_row(row)
    if model_id:
        normalized["id"] = model_id

    kind = row.get("kind")
    if isinstance(kind, str) and kind.strip():
        normalized["kind"] = kind.strip()

    input_modalities = _string_list(row.get("input_modalities"))
    if input_modalities is not None:
        normalized["input_modalities"] = input_modalities

    output_modalities = _string_list(row.get("output_modalities"))
    if output_modalities is not None:
        normalized["output_modalities"] = output_modalities

    image_generation = row.get("image_generation")
    if isinstance(image_generation, Mapping):
        image_meta: dict[str, Any] = {}
        protocol = image_generation.get("protocol")
        if isinstance(protocol, str) and protocol.strip():
            image_meta["protocol"] = protocol.strip()
        default = image_generation.get("default")
        if isinstance(default, bool):
            image_meta["default"] = default
        priority = image_generation.get("priority")
        if isinstance(priority, int) and not isinstance(priority, bool):
            image_meta["priority"] = priority
        request_model = image_generation.get("request_model")
        if isinstance(request_model, str) and request_model.strip():
            image_meta["request_model"] = request_model.strip()
        if image_meta:
            normalized["image_generation"] = image_meta

    return normalized


def catalog_from_models_config(models: Any) -> dict[str, dict[str, Any]]:
    """Normalize a config/cache ``models`` value into ``{model_id: metadata}``.

    Accepts Lemon AI's supported shapes: mapping keyed by model id, list of ids, list of dict rows,
    or a single id string. ID-only entries intentionally carry no image-generation support.
    """
    if isinstance(models, str):
        cleaned = models.strip()
        return {cleaned: {}} if cleaned else {}
    if isinstance(models, Mapping):
        catalog: dict[str, dict[str, Any]] = {}
        for model_id, metadata in models.items():
            if not isinstance(model_id, str) or not model_id.strip() or model_id.startswith("__"):
                continue
            if isinstance(metadata, Mapping):
                row = {"id": model_id.strip(), **dict(metadata)}
                normalized = normalize_image_metadata(row)
                normalized.pop("id", None)
                catalog[model_id.strip()] = normalized
            else:
                catalog[model_id.strip()] = {}
        return catalog
    if isinstance(models, list):
        catalog = {}
        for item in models:
            if isinstance(item, str):
                cleaned = item.strip()
                if cleaned:
                    catalog[cleaned] = {}
                continue
            if isinstance(item, Mapping):
                normalized = normalize_image_metadata(item)
                model_id = str(normalized.pop("id", "") or "").strip()
                if model_id:
                    catalog[model_id] = normalized
        return catalog
    return {}


def _iter_catalog_entries(models: Any) -> Iterable[tuple[int, str, dict[str, Any]]]:
    if isinstance(models, Mapping):
        for index, (model_id, metadata) in enumerate(catalog_from_models_config(models).items()):
            yield index, model_id, metadata
        return
    if isinstance(models, list):
        for index, item in enumerate(models):
            if isinstance(item, str):
                model_id = item.strip()
                if model_id:
                    yield index, model_id, {}
                continue
            if isinstance(item, Mapping):
                normalized = normalize_image_metadata(item)
                model_id = str(normalized.pop("id", "") or "").strip()
                if model_id:
                    yield index, model_id, normalized
        return
    if isinstance(models, str) and models.strip():
        yield 0, models.strip(), {}


def select_image_model(models: Any) -> Optional[dict[str, Any]]:
    """Pick the best image-generation model from stored catalog metadata.

    Selection requires BOTH explicit image output and a supported declared wire protocol. ``kind`` is
    diagnostic only: ``kind: image`` without protocol/output metadata is not enough.
    """
    candidates: list[tuple[int, int, int, int, str, dict[str, Any]]] = []
    for index, model_id, metadata in _iter_catalog_entries(models):
        output_modalities = [m.strip().lower() for m in metadata.get("output_modalities", []) if isinstance(m, str)]
        image_generation = metadata.get("image_generation") if isinstance(metadata.get("image_generation"), dict) else {}
        protocol = image_generation.get("protocol") if isinstance(image_generation, dict) else None
        if _IMAGE_OUTPUT_MODALITY not in output_modalities or protocol not in SUPPORTED_IMAGE_PROTOCOLS:
            continue
        if protocol == "responses" and not image_generation.get("request_model"):
            continue
        default_rank = 0 if image_generation.get("default") is True else 1
        priority = image_generation.get("priority")
        priority_missing = 0 if isinstance(priority, int) and not isinstance(priority, bool) else 1
        priority_rank = priority if priority_missing == 0 else 0
        candidates.append((default_rank, priority_missing, priority_rank, index, model_id, image_generation))

    if not candidates:
        return None
    _, _, _, _, model_id, image_generation = min(candidates, key=lambda item: item[:4])
    selected = {"model": model_id, "protocol": image_generation["protocol"]}
    request_model = image_generation.get("request_model")
    if isinstance(request_model, str) and request_model.strip():
        selected["request_model"] = request_model.strip()
    return selected
