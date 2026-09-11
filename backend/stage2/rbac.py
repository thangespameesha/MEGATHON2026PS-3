"""
Derive an authorized Scope from an authenticated Identity.

This is the ONLY place a Scope should be constructed from scratch.
Every function here takes an `Identity` -- never a request body field,
never retrieved text, never a chat message -- so there is no path by
which a document or a prompt can hand itself a bigger scope than the
logged-in user actually has.
"""

from __future__ import annotations

from .contracts import Identity, Role, Scope


def build_scope(identity: Identity) -> Scope:
    """
    Map an authenticated identity to its authorized retrieval scope.

    Employee        -> own tenant, restricted to permitted documents
                        (if the identity carries an explicit allow-list;
                        otherwise the whole tenant).
    Security Lead   -> own tenant, no per-document narrowing (broader
                        access within the tenant for security review).
    Main Head       -> organization-wide scope (all tenants).
    """
    if identity.role == Role.MAIN_HEAD:
        return Scope(tenant=identity.tenant, allowed_document_ids=None, org_wide=True)

    if identity.role == Role.SECURITY_LEAD:
        return Scope(tenant=identity.tenant, allowed_document_ids=None, org_wide=False)

    if identity.role == Role.EMPLOYEE:
        return Scope(
            tenant=identity.tenant,
            allowed_document_ids=identity.permitted_document_ids if identity.permitted_document_ids is not None else frozenset(),
            org_wide=False,
        )

    # Unknown role: fail closed to the narrowest possible scope
    # (own tenant, zero documents) rather than guessing.
    return Scope(tenant=identity.tenant, allowed_document_ids=frozenset(), org_wide=False)


def narrow_scope(base: Scope, requested: Scope) -> Scope:
    """
    Apply an additional, caller-requested restriction (e.g. "just search
    this folder") on top of the identity-derived base scope.

    This can only ever narrow `base` -- it is a thin, explicit wrapper
    around Scope.intersect() so call sites can't accidentally swap the
    argument order and widen instead.
    """
    return base.intersect(requested)
