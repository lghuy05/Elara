import json
import re
from json_repair import repair_json
from fastapi import HTTPException
from app.openrouter_client import chat_completion

PATIENT_RX_BLOCK = re.compile(
    r"\b(take|start|increase|decrease)\b.*\b(mg|tablet|capsule|ml)\b", re.I
)


def parse_or_repair(raw: str) -> dict:
    """Strict parse; if fails, attempt repair; else raise 502 with preview."""
    raw = (raw or "").strip()
    if not raw:
        raise HTTPException(502, "LLM returned empty response")

    # strip triple-backtick fences if present
    if raw.startswith("```"):
        # Remove surrounding backticks
        raw = raw.strip("`")
        # Remove a leading 'json' language tag if present
        if raw.lower().startswith("json"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else ""

    # Attempt strict parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Attempt repair
    try:
        fixed = repair_json(raw)
        return json.loads(fixed)
    except Exception:
        raise HTTPException(
            status_code=502, detail=f"Model did not return valid JSON: {raw[:300]}"
        )


# def require_json_with_retry(build_messages_fn) -> dict:
#     """Call LLM -> parse; if fail, one-shot 'convert to JSON' retry; else raise."""
#     # 1st try
#     raw = chat_completion(build_messages_fn())
#     try:
#         return parse_or_repair(raw)
#     except HTTPException:
#         # Retry: ask the model to convert exactly this text to valid JSON
#         fixer_msgs = [
#             {
#                 "role": "system",
#                 "content": "Convert the user's text into valid, minified JSON ONLY. No prose, no markdown.",
#             },
#             {"role": "user", "content": raw or ""},
#         ]
#         raw2 = chat_completion(fixer_msgs, temperature=0.0)
#         # will raise HTTPException if still invalid
#         return parse_or_repair(raw2)


def _resolve_messages(message):
    return message() if callable(message) else message


def require_json_with_retry(
    message,
    *,
    defaults: dict | None = None,
    required_keys: list[str] | None = None,
    model: str | None = None,
    max_tokens: int | None = None,
    temperature: float = 0.0,
) -> dict:
    """Call LLM -> parse/repair -> enforce required fields; one retry on failure."""
    messages = _resolve_messages(message)
    try:
        raw = chat_completion(
            messages, model=model, max_tokens=max_tokens, temperature=temperature
        )
        parsed = parse_or_repair(raw)
    except HTTPException:
        fixer_msgs = [
            {
                "role": "system",
                "content": "Convert the user's text into valid, minified JSON ONLY. No prose, no markdown.",
            },
            {"role": "user", "content": raw or ""},
        ]
        raw2 = chat_completion(
            fixer_msgs, model=model, max_tokens=max_tokens, temperature=0.0
        )
        parsed = parse_or_repair(raw2)

    if not isinstance(parsed, dict):
        raise HTTPException(502, "Model returned non-object JSON.")

    if defaults:
        for key, value in defaults.items():
            if key not in parsed:
                parsed[key] = value

    if required_keys:
        missing = [key for key in required_keys if key not in parsed]
        if missing:
            raise HTTPException(
                status_code=502, detail=f"Model missing JSON fields: {missing}"
            )

    return parsed
