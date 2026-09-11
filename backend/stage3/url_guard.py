import base64
import binascii
import math
import re
from urllib.parse import parse_qs, unquote, urlparse


URL_PATTERN = re.compile(
    r"https?://[^\s<>\"]+",
    re.IGNORECASE,
)

# Trailing characters that are almost never part of a URL itself but are
# commonly adjacent to one in prose/markdown, e.g. "(https://x.com/a)",
# "[link](https://x.com/a)", "https://x.com/a.", "https://x.com/a,".
# Left uncorrected, these get absorbed into the URL by the greedy pattern
# above and corrupt any base64/hex decoding of the trailing query value.
_TRAILING_PUNCTUATION = ").,]}\"'>*_"


def _strip_trailing_punctuation(url: str) -> str:
    """
    Strip trailing punctuation not meaningfully part of the URL, while
    preserving balanced parentheses/brackets that are genuinely part of it
    (e.g. Wikipedia-style URLs containing "(disambiguation)").
    """
    while url and url[-1] in _TRAILING_PUNCTUATION:
        if url[-1] == ")" and url.count("(") > url.count(")"):
            break
        if url[-1] == "]" and url.count("[") > url.count("]"):
            break
        url = url[:-1]
    return url


def extract_urls(text: str) -> list[str]:
    """
    Extract HTTP/HTTPS URLs from generated text.
    """
    raw_urls = URL_PATTERN.findall(text or "")
    return [_strip_trailing_punctuation(url) for url in raw_urls]


def decode_base64(value: str) -> str | None:
    """
    Try to decode a URL parameter as Base64.
    """
    try:
        padded = value + "=" * (-len(value) % 4)
        decoded = base64.b64decode(
            padded,
            validate=True,
        )
        return decoded.decode("utf-8", errors="ignore")
    except (ValueError, UnicodeDecodeError, binascii.Error):
        return None


def decode_hex(value: str) -> str | None:
    """
    Try to decode a hexadecimal value.
    """
    cleaned = value.strip()

    if len(cleaned) % 2 != 0:
        return None

    if not re.fullmatch(r"[0-9a-fA-F]+", cleaned):
        return None

    try:
        return bytes.fromhex(cleaned).decode(
            "utf-8",
            errors="ignore",
        )
    except (ValueError, UnicodeDecodeError):
        return None


def calculate_entropy(value: str) -> float:
    """
    Calculate Shannon entropy for a string.
    Higher entropy can indicate encoded/random-looking data.
    """
    if not value:
        return 0.0

    frequencies = {
        char: value.count(char)
        for char in set(value)
    }

    length = len(value)

    return -sum(
        (count / length) * math.log2(count / length)
        for count in frequencies.values()
    )


def contains_retrieved_data(
    candidate: str,
    retrieved_text: str,
) -> bool:
    """
    Check whether a URL value directly contains
    information present in retrieved context.
    """
    if not candidate or not retrieved_text:
        return False

    candidate_decoded = unquote(candidate).lower()
    retrieved_lower = retrieved_text.lower()

    # Direct substring match.
    if candidate_decoded in retrieved_lower and len(candidate_decoded) >= 8:
        return True

    # Check meaningful n-grams from the candidate.
    words = re.findall(r"[A-Za-z0-9@._-]{8,}", candidate_decoded)

    for word in words:
        if word.lower() in retrieved_lower:
            return True

    return False


def _inspect_value(
    parameter: str,
    raw_value: str,
    retrieved_text: str,
) -> list[dict]:
    """
    Run all detection heuristics against a single candidate value
    (a query param value, or a path/fragment segment) and return
    any evidence entries produced.
    """
    evidence = []
    decoded_value = unquote(raw_value)

    # 1. Direct retrieved-data match
    if contains_retrieved_data(decoded_value, retrieved_text):
        evidence.append({
            "type": "retrieved_data_match",
            "parameter": parameter,
            "value": decoded_value[:120],
        })

    # 2. Base64 decoding
    base64_value = decode_base64(decoded_value)

    if base64_value and contains_retrieved_data(base64_value, retrieved_text):
        evidence.append({
            "type": "base64_retrieved_data",
            "parameter": parameter,
            "decoded": base64_value[:120],
        })

    # 3. Hex decoding
    hex_value = decode_hex(decoded_value)

    if hex_value and contains_retrieved_data(hex_value, retrieved_text):
        evidence.append({
            "type": "hex_retrieved_data",
            "parameter": parameter,
            "decoded": hex_value[:120],
        })

    # 4. High entropy indicator. Long, high-entropy tokens are a real
    # signal of an encoded/opaque payload even when we can't tie it back
    # to retrieved text (e.g. compressed or encrypted exfiltration),
    # so this also counts as suspicious rather than being informational
    # evidence only.
    entropy = calculate_entropy(decoded_value)

    if len(decoded_value) >= 24 and entropy >= 4.0:
        evidence.append({
            "type": "high_entropy_parameter",
            "parameter": parameter,
            "entropy": round(entropy, 3),
        })

    return evidence


def inspect_url(
    url: str,
    retrieved_text: str = "",
) -> dict:
    """
    Inspect one URL for possible data exfiltration.

    Checks query parameters, the path, and the fragment: attackers can
    smuggle data through any of these, not just "?param=".
    """
    parsed = urlparse(url)

    evidence = []

    # Query parameters.
    query_params = parse_qs(parsed.query)

    for parameter, values in query_params.items():
        for value in values:
            evidence.extend(
                _inspect_value(f"query:{parameter}", value, retrieved_text)
            )

    # Path segments (e.g. https://evil.com/<base64-secret>).
    for index, segment in enumerate(parsed.path.split("/")):
        if not segment:
            continue
        evidence.extend(
            _inspect_value(f"path[{index}]", segment, retrieved_text)
        )

    # Fragment (e.g. https://evil.com/#<base64-secret>).
    if parsed.fragment:
        evidence.extend(
            _inspect_value("fragment", parsed.fragment, retrieved_text)
        )

    return {
        "url": url,
        "host": parsed.netloc,
        "suspicious": bool(evidence),
        "evidence": evidence,
    }


def inspect_output_for_exfiltration(
    output: str,
    retrieved_text: str = "",
) -> dict:
    """
    Inspect all URLs in an LLM-generated answer.
    """
    urls = extract_urls(output)

    results = [
        inspect_url(
            url,
            retrieved_text,
        )
        for url in urls
    ]

    suspicious_results = [
        result
        for result in results
        if result["suspicious"]
    ]

    return {
        "urls_found": len(urls),
        "suspicious_urls": len(suspicious_results),
        "blocked": bool(suspicious_results),
        "results": results,
    }