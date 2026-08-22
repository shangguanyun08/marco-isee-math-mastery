"""Export the verified QR/MA miss list as browser-ready metadata.

The public practice site uses original, parameterized practice questions.  This
script preserves the one-to-one link to each verified missed source question
without publishing scans or screenshots from the test booklets.
"""

from __future__ import annotations

import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
SOURCE_SCRIPT = PROJECT.parent / "tmp" / "pdfs" / "build_math_pdfs.py"


def load_verified_entries():
    source = SOURCE_SCRIPT.read_text(encoding="utf-8")
    start = source.index("CATEGORIES = [")
    end = source.index("\ndef source_path")
    namespace: dict[str, object] = {}
    exec(source[start:end], namespace)
    return namespace


def family_for(category: str, explanation: str) -> str:
    text = explanation.lower()

    if category == "Data Analysis & Statistics":
        if "median" in text:
            return "median"
        if "mode" in text:
            return "mode"
        if "range" in text:
            return "range"
        if "mean" in text or "average" in text:
            return "mean"
        if "best-fit" in text or "scatter" in text or "steepest" in text or "hourly increase" in text:
            return "line_rate"
        return "data_reading"

    if category == "Ratios, Rates & Percents":
        if "speed" in text or "mph" in text or "catches" in text or "time" in text:
            return "speed"
        if "revenue" in text or "costs" in text:
            return "revenue"
        if "ratio" in text:
            return "ratio"
        if "percent" in text or "%" in text or "discount" in text or "tax" in text or "increase" in text or "decrease" in text:
            return "percent_change"
        if "fraction" in text or "/" in text:
            return "part_fraction"
        return "proportion"

    if category == "Number Sense & Operations":
        if "scientific" in text:
            return "scientific"
        if "sqrt" in text or "square root" in text:
            return "roots"
        if "estimate" in text:
            return "estimate"
        if "improper fraction" in text or "multiply before adding" in text or "divide" in text:
            return "fraction_ops"
        if "coin" in text or "pack" in text or "carton" in text or "purchase" in text:
            return "grouping"
        if "factor" in text or "^" in text or "exponent" in text or "multiplier" in text:
            return "powers"
        return "arithmetic"

    if category == "Algebra & Functions":
        if "slope" in text or "intercept" in text or "perpendicular" in text:
            return "slope"
        if "pattern" in text or "repeats" in text or "doubles" in text or "increases are" in text or "each new group" in text:
            return "sequence"
        if "expression" in text or "rearrange" in text or "simplifies" in text or "factor" in text:
            return "expression"
        if "greater" in text and ("a + b" in text or "a - b" in text or "positive" in text or "negative" in text):
            return "algebra_compare"
        return "linear_solve"

    if category == "Geometry & Measurement":
        if "volume" in text or "surface area" in text or "cube" in text or "rectangular prism" in text:
            return "volume"
        if "angle" in text or "isosceles" in text or "altitude" in text:
            return "angles"
        if "reflection" in text or "x-axis" in text or "coordinate" in text:
            return "coordinate"
        if "route" in text or "grid segment" in text or "side ratio" in text or "distance" in text:
            return "scale_distance"
        return "area"

    if category == "Probability & Counting":
        if "complement" in text:
            return "complement"
        if "outfit" in text or "shirts" in text or "pants" in text:
            return "counting"
        if "ordered pair" in text or "table" in text or "outcome" in text or "sum" in text:
            return "sample_space"
        return "probability"

    raise ValueError(category)


def main():
    module = load_verified_entries()
    rows = []
    identifier = 1
    for subject, entries in (("QR", module["QR"]), ("MA", module["MA"])):
        for category in module["CATEGORIES"]:
            for entry in sorted(
                (item for item in entries if item["category"] == category),
                key=lambda item: (item["mock"], item["q"]),
            ):
                rows.append(
                    {
                        "id": identifier,
                        "subject": subject,
                        "mock": entry["mock"],
                        "question": entry["q"],
                        "category": category,
                        "family": family_for(category, entry["explanation"]),
                    }
                )
                identifier += 1

    assert len(rows) == 123
    assert sum(row["subject"] == "QR" for row in rows) == 57
    assert sum(row["subject"] == "MA" for row in rows) == 66

    payload = "window.MARCO_MATH_SOURCES = " + json.dumps(rows, indent=2) + ";\n"
    (PROJECT / "sources.js").write_text(payload, encoding="utf-8")
    print(f"Exported {len(rows)} verified misses to {PROJECT / 'sources.js'}")


if __name__ == "__main__":
    main()
