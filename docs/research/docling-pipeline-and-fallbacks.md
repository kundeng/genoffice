# Docling pipeline and fallback design

**Status:** research note, 2026-09-09

**Question:** how Docling handles different document formats, OCR, and blocks it cannot process; what role should it play in notebay?

## Finding

Docling is a format-routed document model with deterministic backends, format-specific pipelines, and optional enrichment stages. It is not a universal agent that automatically sends every unknown block to an LLM.

DOCX and PPTX are read from their native package structure. PDF and image inputs use a page pipeline that can combine native PDF text with OCR. Visual models are optional stages: the VLM pipeline can replace the normal PDF pipeline, while picture description, formula, chart, and classification models enrich items that already exist in the `DoclingDocument`.

For notebay, the right abstraction is therefore:

```text
source
  -> format backend + pipeline
  -> canonical DoclingDocument with provenance and assets
  -> quality / coverage checks
  -> targeted fallback on original object or page crop
  -> merge reviewed result into the canonical document
  -> Markdown, retrieval, notes, slides, audio or video adapters
```

The fallback and coverage policy belongs to notebay. It should not assume that an omitted block will be recovered by a later Docling enrichment pass.

## Format routing

`DocumentConverter` detects the input format and chooses a `FormatOption`. The default mapping is approximately:

| Input | Default backend | Default pipeline | OCR by default? |
|---|---|---|---|
| DOCX | native Word backend | `SimplePipeline` | No |
| PPTX | native PowerPoint backend | `SimplePipeline` | No |
| HTML, Markdown, CSV and similar | native format backend | `SimplePipeline` | No |
| PDF | PDF parser backend | `StandardPdfPipeline` | Configurable |
| Image | image backend | standard page pipeline | Configurable |
| PDF/image with `VlmPipeline` selected | PDF/image backend | VLM pipeline | The VLM performs page conversion |

The `SimplePipeline` asks a declarative backend to construct a `DoclingDocument` directly. It does not rasterize a DOCX or PPTX and run OCR over it.

## Native Office parsing

The Word backend reads paragraphs, headings, lists, comments, embedded pictures and Office Math XML. Native Word equations can be converted to LaTeX through the OMML converter. The PowerPoint backend reads slide text, tables, notes, comments, pictures and chart data, retaining slide-space provenance. Some legacy or special objects require LibreOffice conversion or rasterization.

An embedded screenshot inside DOCX is still a `PictureItem`; it is not automatically converted into a structured table. Optional picture-description enrichment can add a description. Exact OCR or screenshot-to-table recovery needs an explicit custom enrichment or an external fallback.

## PDF OCR and native-text merge

The standard PDF path is staged and page-oriented:

1. Parse the PDF backend for text cells, geometry, bitmap regions and page metadata.
2. Render or decode page imagery as required.
3. Detect layout regions.
4. Select OCR rectangles. In PDF-aware mode, regions containing only native visible text are usually excluded; regions with no native text or with bitmap/vector content remain candidates.
5. Run the configured OCR model on those rectangles.
6. Merge OCR cells and PDF cells by bounding-box overlap. PDF-first mode keeps native visible cells and adds non-overlapping OCR cells; OCR-first mode gives OCR priority; full-page mode uses OCR cells instead of native cells.
7. Run layout post-processing, table-structure recognition, assembly, reading-order and heading-hierarchy stages.
8. Run enabled enrichments and export the resulting document.

This is a spatial merge, not a semantic truth test. If the native PDF text is wrong but present, PDF-first behavior can preserve the wrong text. A notebay quality gate should inspect coverage and confidence rather than assuming OCR was used everywhere.

## Enrichment and plugin boundaries

Enrichments iterate over existing document items and only process items for which their `is_processable` predicate returns true. Current examples include:

- formula understanding, which adds LaTeX for formula items;
- code understanding;
- picture classification;
- picture description from a local VLM or API;
- chart extraction.

Docling also has plugin factories for OCR, layout, table-structure, picture-description and related model implementations. External plugins are loaded through package entry points when external plugins are explicitly allowed.

The important invariant is **item existence**: an enrichment can improve or annotate a `PictureItem` or formula item that reached the document model, but it cannot recover an object that a native backend dropped before the enrichment pass.

## Handling unsupported or malformed content

Behavior is backend-specific:

- a recognized item with a disabled enrichment remains structurally present but unenriched;
- an image may remain as an image with no description;
- a malformed picture or unknown shape may generate a warning and be skipped;
- a conversion can finish with partial success and errors;
- a stage or backend can fail the conversion.

There is no universal automatic escalation from “unrecognized block” to a frontier vision model. A robust notebay adapter should retain the source artifact, record the missing or degraded item, and explicitly route the original object or rendered crop to a fallback model.

## Recommended notebay adapter contract

Keep Docling behind a parser adapter, but preserve more than Markdown:

```text
ParsedDocument {
  canonical_document: DoclingDocument or equivalent
  blocks: stable block IDs + type + text/latex/table/image payload
  assets: original images and rendered crops
  provenance: source, page/slide, coordinates, method, confidence
  warnings: omitted, malformed, or low-confidence regions
}
```

The quality gate can then ask:

```text
if warnings contain missing/low-confidence visual content
   or expected coverage is below threshold:
       send original object/page crop to configured capable vision model
       validate returned structure
       merge with provenance and keep the original asset
```

This gives notebay a universal pipeline shape without pretending that Docling itself provides universal recovery.

## Sources inspected

- Docling `DocumentConverter`, format options and default routing: <https://github.com/docling-project/docling/blob/main/docling/document_converter.py>
- Docling standard PDF pipeline: <https://github.com/docling-project/docling/blob/main/docling/pipeline/standard_pdf_pipeline.py>
- OCR cell selection and native/OCR merge: <https://github.com/docling-project/docling/blob/main/docling/models/base_ocr_model.py>
- Word backend: <https://github.com/docling-project/docling/blob/main/docling/backend/msword_backend.py>
- PowerPoint backend: <https://github.com/docling-project/docling/blob/main/docling/backend/mspowerpoint_backend.py>
- Enrichment documentation: <https://docling-project.github.io/docling/usage/enrichments/>
- VLM pipeline documentation: <https://docling-project.github.io/docling/usage/vision_models/>

