from dataclasses import dataclass


@dataclass
class ActionRequest:
    action_type: str
    description: str
    source: str = "llm"

    # Out-of-band signals that MUST be supplied by the application layer
    # from a real, authenticated human/policy decision -- never derived
    # from the LLM's output or from retrieved content. Defaults are the
    # safe (unauthorized) values, so a caller that forgets to set them
    # gets a deny, not an accidental allow.
    role_permitted: bool = False
    user_authorized: bool = False


PRIVILEGED_ACTIONS = {
    "send_email",
    "send_message",
    "external_request",
    "delete_data",
    "modify_data",
    "execute_command",
}


def is_privileged_action(action_type: str) -> bool:
    """
    Determine whether an action requires additional authorization.
    """
    return action_type.lower() in PRIVILEGED_ACTIONS


def authorize_action(
    action: ActionRequest,
    context_tainted: bool,
    injection_detected: bool = False,
) -> dict:
    """
    Decide whether an action proposed by the LLM can proceed.

    Central invariant: retrieved/generated content can PROPOSE an
    action, but it can never AUTHORIZE one. Authorization can only come
    from two out-of-band signals carried on the ActionRequest itself:
    `role_permitted` (the identity's role is allowed to perform this
    class of action -- decided by server-side policy) and
    `user_authorized` (a real human explicitly confirmed this specific
    action through a channel the model doesn't control, e.g. a
    confirmation dialog showing the action and its source data).

    Neither flag is ever set from the LLM's own output or from
    retrieved chunks; if a caller wires those signals from anything the
    model can influence, that caller -- not this function -- has
    broken the invariant.
    """

    if not is_privileged_action(action.action_type):
        return {
            "allowed": True,
            "escalate": False,
            "reason": "Non-privileged action.",
        }

    if injection_detected:
        # A hard stop: detected prompt injection means the proposal
        # itself is suspect, so no authorization flag can override it.
        return {
            "allowed": False,
            "escalate": True,
            "reason": (
                "Privileged action blocked: prompt injection detected "
                "in the pipeline. No authorization override is honored "
                "in this state."
            ),
        }

    if not action.role_permitted:
        return {
            "allowed": False,
            "escalate": True,
            "reason": (
                "Privileged action blocked: the caller's role does not "
                "permit this action type."
            ),
        }

    if not action.user_authorized:
        return {
            "allowed": False,
            "escalate": True,
            "reason": (
                "Privileged action requires explicit, out-of-band user "
                "authorization; an LLM or document proposing the action "
                "is not sufficient authority on its own."
            ),
        }

    if context_tainted:
        # Explicitly authorized by a real user AND permitted by role,
        # but the context that informed it was untrusted. Allow, but
        # force escalation so this always leaves an audit trail /
        # human-review flag even though it proceeds.
        return {
            "allowed": True,
            "escalate": True,
            "reason": (
                "Privileged action explicitly authorized, but untrusted "
                "content was present in context; flagged for mandatory "
                "review."
            ),
        }

    return {
        "allowed": True,
        "escalate": False,
        "reason": "Privileged action explicitly authorized.",
    }
