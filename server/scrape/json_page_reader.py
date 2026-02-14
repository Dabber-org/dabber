from __future__ import annotations

"""Reader for scraped JSON pages.

We store each crawled web page as one JSON file containing:
- url
- title
- text
- word_count
- char_count

This reader ensures we embed only the page text, while preserving useful
metadata for retrieval and debugging.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from llama_index.core.readers.base import BaseReader
from llama_index.core.schema import Document


class ScrapeJSONPageReader(BaseReader):
    """Read one scraped web-page JSON file as a single page-level Document."""

    def load_data(
        self, file: Path, extra_info: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        with open(file, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f) or {}

        text = data.get("text") or ""
        if not isinstance(text, str):
            text = str(text)

        metadata: Dict[str, Any] = {}
        if extra_info:
            metadata.update(extra_info)

        metadata.setdefault("file_name", file.name)
        metadata.setdefault("file_path", str(file))

        for key in ("url", "title", "word_count", "char_count"):
            if key in data:
                metadata[key] = data[key]

        return [Document(text=text, metadata=metadata)]

