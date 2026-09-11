from .contracts import Chunk, GuardDecision
from .taint import is_tainted
from .url_guard import inspect_output_for_exfiltration
from .sanitizer import sanitize_output
from .action_guard import ActionRequest, authorize_action


def run_egress_guard(
    output: str,
    retrieved_chunks: list[Chunk],
    action: ActionRequest | None = None,
    injection_detected: bool = False,
) -> GuardDecision:
    """
    House rule for this whole function: any unexpected internal error
    fails closed (BLOCK + escalate), never open. A crash in a detector
    must never be mistaken for "nothing suspicious found".
    """

    reasons: list[str] = []
    evidence: list[dict] = []

    # --------------------------------------------------
    # 1. Prepare retrieved context
    # --------------------------------------------------
    try:
        retrieved_text = "\n".join(chunk.text for chunk in retrieved_chunks)
        context_tainted = any(is_tainted(chunk) for chunk in retrieved_chunks)
    except Exception as exc:
        return GuardDecision(
            allow=False,
            escalate=True,
            reasons=[f"Fail-closed: error preparing retrieved context ({exc.__class__.__name__})."],
            evidence=[],
        )

    # --------------------------------------------------
    # 2. URL / Exfiltration Guard
    # --------------------------------------------------
    try:
        url_result = inspect_output_for_exfiltration(output, retrieved_text)
    except Exception as exc:
        return GuardDecision(
            allow=False,
            escalate=True,
            reasons=[f"Fail-closed: URL/exfiltration inspection raised an error ({exc.__class__.__name__})."],
            evidence=[],
        )

    if url_result["blocked"]:
        reasons.append("Potential data exfiltration detected in outbound URL.")
        evidence.extend(url_result["results"])

    # --------------------------------------------------
    # 3. Sanitize the generated answer
    # --------------------------------------------------
    try:
        sanitized_output = sanitize_output(output)
    except Exception as exc:
        return GuardDecision(
            allow=False,
            escalate=True,
            reasons=[f"Fail-closed: sanitization raised an error ({exc.__class__.__name__})."],
            evidence=[],
        )

    if sanitized_output is None:
        # sanitize_output() itself failed closed internally.
        return GuardDecision(
            allow=False,
            escalate=True,
            reasons=["Fail-closed: rendering/sanitization could not verify the output was safe."],
            evidence=evidence,
        )

    if sanitized_output != output:
        reasons.append("Unsafe rendering content was sanitized.")

    # --------------------------------------------------
    # 4. Action Authorization
    # --------------------------------------------------
    action_result = None

    if action is not None:
        try:
            action_result = authorize_action(
                action=action,
                context_tainted=context_tainted,
                injection_detected=injection_detected,
            )
        except Exception as exc:
            return GuardDecision(
                allow=False,
                escalate=True,
                reasons=[f"Fail-closed: action authorization raised an error ({exc.__class__.__name__})."],
                evidence=evidence,
            )

        if not action_result["allowed"]:
            reasons.append(action_result["reason"])
        elif action_result["escalate"]:
            # Allowed but flagged (e.g. explicitly authorized action
            # taken while context was tainted) -- still surface why.
            reasons.append(action_result["reason"])

    # --------------------------------------------------
    # 5. Final Decision
    # --------------------------------------------------
    if url_result["blocked"]:
        return GuardDecision(allow=False, escalate=True, reasons=reasons, evidence=evidence)

    if injection_detected:
        reasons.append("Prompt injection or adversarial instruction detected in generation or context.")
        return GuardDecision(allow=False, escalate=True, reasons=reasons, evidence=evidence)

    if action_result is not None and not action_result["allowed"]:
        return GuardDecision(
            allow=False,
            escalate=action_result["escalate"],
            reasons=reasons,
            evidence=evidence,
        )

    # Allowed path: propagate any escalate flag raised by the action
    # guard (e.g. authorized-but-tainted) instead of always False.
    escalate = bool(action_result and action_result.get("escalate"))

    return GuardDecision(allow=True, escalate=escalate, reasons=reasons, evidence=evidence)
