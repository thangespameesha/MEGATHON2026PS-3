"""
Ingestion-time injection scanning against the sample fixtures.

Replaces the old test_run.py, which was a manual/demo script with
hardcoded Windows paths (not collectible as a real test) and its own
inline regex instead of the shared injection_detector module. This
version runs as real pytest, uses the checked-in sample files via a
relative path, and asserts against the actual `ingestion` module so a
regression in the detector's patterns is caught by CI rather than
requiring someone to run the script and read stdout.
"""

from pathlib import Path

from ..ingestion.document_parser import extract_text, compute_sha256
from ..ingestion.injection_detector import scan_for_injections

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"


def test_clean_sample_is_not_flagged():
    text = extract_text(str(DATA_DIR / "sample_clean.txt"))
    result = scan_for_injections(text)
    assert result["is_flagged"] is False
    assert result["risk_points"] == 0


def test_attack_sample_is_flagged():
    text = extract_text(str(DATA_DIR / "sample_attack.txt"))
    result = scan_for_injections(text)
    assert result["is_flagged"] is True
    assert result["risk_points"] > 0
    assert any("injection" in reason.lower() or "instruction" in reason.lower() for reason in result["reasons"])


def test_hash_changes_with_content():
    clean_bytes = (DATA_DIR / "sample_clean.txt").read_bytes()
    attack_bytes = (DATA_DIR / "sample_attack.txt").read_bytes()
    assert compute_sha256(clean_bytes) != compute_sha256(attack_bytes)
