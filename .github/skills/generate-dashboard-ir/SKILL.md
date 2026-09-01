---
name: generate-dashboard-ir
description: Generate valid low-level Dashboard Language YAML from user intent using the provided dashboard specification and validate.js.
---

# Generate Dashboard IR

Generate one complete Dashboard Language YAML document from the user's dashboard intent. Use the provided Dashboard Language specification as the semantic authority and `validate.js` as the syntax and structural validation authority.

Do not introduce a new intermediate language. Do not output an intermediate semantic plan unless explicitly requested.

## Inputs

The working context provides:

- user intent;
- a Dashboard Language specification file;
- `validate.js`;
- optionally, an existing dashboard YAML document.

Read the specification before generating or modifying dashboard YAML. Do not rely on remembered Dashboard Language syntax when the provided specification defines it.

## Output

Produce one complete Dashboard Language YAML document that:

- represents the user's intent;
- conforms to the provided specification;
- passes `validate.js`;
- contains only supported Dashboard Language vocabulary;
- contains no unresolved placeholders or speculative fields.

## Procedure

1. Read the specification and identify the relevant root structure, logical sources and grains, fields, dimensions, measures, aggregates, marks, encodings, pages, filters, links, routing, data-state semantics, defaults, and validation constraints. When prior knowledge differs, follow the provided specification.
2. Interpret the minimum information necessary to satisfy the intent: purpose, questions, entities, measures, dimensions, time range, filters, comparisons, rankings, trends, and drilldown needs. Prefer a small set of views that directly answers the requested questions.
3. Prefer a built-in page when it satisfies the intent. Use a custom page only when the requested analysis is not built in, requires a specific combination of measures or dimensions, or explicitly requests a custom presentation.
4. For every custom view, select the logical source whose grain matches the analysis. Do not choose a source only because it has a similarly named field, and do not fabricate joins or combine sources unless the specification supports it.
5. Map user terminology to canonical fields from the specification. Verify every field name, semantic, and enum value; never invent fields, aliases, dimensions, or measures.
6. Use only aggregates allowed for the selected fields. Respect non-additive measures and use explicit output aliases when required for correctness or later references such as ordering.
7. Select the simplest valid view. Prefer a metric for a single aggregate, a table for inventory or records, a table or bar chart for rankings, a line chart for time trends, and a bar chart for categorical comparisons when the specification supports them.
8. Generate explicit low-level Dashboard Language YAML. Resolve all applicable sources, scopes, time ranges, filters, ordering, limits, marks, chart types, encodings, field types, aggregates, aliases, time units, layouts, sections, links, routes, disclosure, and units. Do not leave values such as `auto`, `TODO`, or `TBD`.
9. Run the provided `validate.js` against the complete document. Repair every reported error and rerun validation until it passes. If the intent cannot be represented with supported vocabulary, report that constraint instead of inventing syntax.

Return only the validated complete Dashboard Language YAML document unless the user explicitly requests an explanation.
