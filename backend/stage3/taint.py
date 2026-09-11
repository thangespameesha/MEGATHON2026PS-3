from .contracts import Chunk


UNTRUSTED_SOURCE_TYPES = {
    "retrieved_context",
    "document",
    "web",
    "file",
    "external",
}


def is_tainted(chunk: Chunk) -> bool:
    """
    Determine whether a retrieved chunk should be treated
    as untrusted content.
    """
    if chunk.taint:
        return True

    return chunk.source_type.lower() in UNTRUSTED_SOURCE_TYPES


def wrap_as_untrusted_data(chunk: Chunk) -> str:
    """
    Explicitly fence retrieved content as untrusted data
    before it is placed into the LLM context.
    """
    return (
        f"[UNTRUSTED CONTENT | "
        f"chunk_id={chunk.id} | "
        f"tenant={chunk.tenant}]\n"
        f"{chunk.text}\n"
        f"[/UNTRUSTED CONTENT]"
    )


def prepare_context(chunks: list[Chunk]) -> str:
    """
    Convert retrieved chunks into a safely fenced LLM context.
    """
    if not chunks:
        return ""

    return "\n\n".join(
        wrap_as_untrusted_data(chunk)
        for chunk in chunks
    )


def get_tainted_chunks(chunks: list[Chunk]) -> list[Chunk]:
    """
    Return only chunks considered untrusted.
    """
    return [
        chunk
        for chunk in chunks
        if is_tainted(chunk)
    ]