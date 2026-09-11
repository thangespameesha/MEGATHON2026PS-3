import re

# Invisible unicode characters attackers use to hide text from humans or bypass filters
# \u200B (Zero-width space), \u200C (ZW non-joiner), \u200D (ZW joiner), \uFEFF (BOM in body), \u2060 (word joiner)
ZERO_WIDTH_PATTERN = re.compile(r'[\u200B-\u200D\uFEFF\u2060]')

# Suspicious HTML comments or hidden tags attackers hide inside documents
HIDDEN_HTML_PATTERN = re.compile(r'<!--[\s\S]*?-->|<[^>]+style=[\'"][^\'"]*(?:display\s*:\s*none|font-size\s*:\s*0|opacity\s*:\s*0)[^\'"]*[\'"][^>]*>', re.IGNORECASE)

# Known prompt injection & jailbreak trigger phrases
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?(safety\s+)?protocols",
    r"disregard\s+(all\s+)?rules",
    r"system\s+(prompt\s+)?override",
    r"you\s+are\s+now\s+(in\s+)?developer\s+mode",
    r"you\s+are\s+now\s+(a\s+)?dan\b",
    r"bypass\s+(all\s+)?(security\s+)?filters",
    r"reveal\s+(the\s+)?(system\s+)?prompt",
    r"do\s+not\s+follow\s+(any\s+)?safety\s+guidelines",
    r"jailbreak\b",
    r"output\s+the\s+secret\b"
]


def detect_zero_width_characters(text: str) -> dict:
    """
    Scans for invisible characters that look blank to humans
    but are processed by computers (used for steganography or filter evasion).
    """
    matches = ZERO_WIDTH_PATTERN.findall(text)
    if matches:
        return {
            "is_flagged": True,
            "reasons": [f"Detected {len(matches)} invisible zero-width unicode characters."],
            "risk_points": 35
        }
    return {"is_flagged": False, "reasons": [], "risk_points": 0}


def detect_hidden_markup(text: str) -> dict:
    """
    Scans for hidden HTML comments (<!-- secret instruction -->)
    or hidden tags styled with display:none or zero font-size.
    """
    matches = HIDDEN_HTML_PATTERN.findall(text)
    if matches:
        return {
            "is_flagged": True,
            "reasons": [f"Detected {len(matches)} hidden HTML tags or comments."],
            "risk_points": 25
        }
    return {"is_flagged": False, "reasons": [], "risk_points": 0}


def detect_prompt_injection(text: str) -> dict:
    """
    Scans for instructions trying to hijack, override, or jailbreak the AI model.
    """
    reasons = []
    points = 0

    for pattern in INJECTION_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            reasons.append(f"Prompt injection phrase matched: '{match.group(0)}'")
            points += 45

    return {
        "is_flagged": len(reasons) > 0,
        "reasons": reasons,
        "risk_points": min(points, 75)  # Cap injection sub-score at 75
    }


def scan_for_injections(text: str) -> dict:
    """
    Master scanner for Step 2: Combines zero-width, hidden markup, and prompt injection checks.
    """
    zero_result = detect_zero_width_characters(text)
    hidden_result = detect_hidden_markup(text)
    injection_result = detect_prompt_injection(text)

    all_reasons = zero_result["reasons"] + hidden_result["reasons"] + injection_result["reasons"]
    total_risk = zero_result["risk_points"] + hidden_result["risk_points"] + injection_result["risk_points"]

    return {
        "detector": "injection_detector",
        "is_flagged": len(all_reasons) > 0,
        "reasons": all_reasons,
        "risk_points": min(total_risk, 100)
    }
