"""
parsers/rubric_parser.py

Extracts structured grading criteria from rubric text.
Uses heuristics to identify criterion rows, weights, and descriptions.
"""

import re
from typing import Any


class RubricParser:
    """
    Lightweight rule-based rubric extractor.
    Passes structured criteria to InstructionAnalysisAgent for deeper reasoning.
    """

    # Match patterns like "20%", "20 marks", "(20)"
    WEIGHT_PATTERN = re.compile(r"(\d+)\s*(?:%|marks?|pts?|points?)", re.IGNORECASE)

    def parse(self, text: str) -> list[dict[str, Any]]:
        """
        Returns a list of extracted criteria dicts:
        [{ "criterion": str, "weight_raw": str, "description": str }]
        """
        criteria = []
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        for i, line in enumerate(lines):
            weight_match = self.WEIGHT_PATTERN.search(line)
            if weight_match:
                weight = int(weight_match.group(1))
                # Use the line before as criterion title if available
                criterion_title = lines[i - 1] if i > 0 else line
                criteria.append({
                    "criterion": criterion_title,
                    "weight_raw": weight_match.group(0),
                    "weight_value": weight,
                    "description": line,
                })

        return criteria


rubric_parser = RubricParser()