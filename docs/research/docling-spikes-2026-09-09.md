# Docling spikes: backends, local VLMs, the document IR

**Status:** research note with measurements, 2026-09-09. Follows [docling-pipeline-and-fallbacks.md](docling-pipeline-and-fallbacks.md), which covers routing, native Office parsing and OCR merging.

Four questions, each answered by running Docling 2.x on this machine (Apple M3 Max, 128 GB), not from its docs.

## 1. Can Docling take a Mathpix backend, or the TypeScript html-to-markdown, as a backend?

**Mathpix: yes, at the PDF plug point, proven.** A backend is a class with four methods; a
`DeclarativeDocumentBackend` returns a `DoclingDocument` directly and the recognition pipeline
never runs:

```python
class MathpixPdfBackend(DeclarativeDocumentBackend):
    def __init__(self, in_doc, path_or_stream, options=None): ...   # call /v3/pdf here, keep the .mmd
    def is_valid(self): return True
    @classmethod
    def supports_pagination(cls): return False
    @classmethod
    def supported_formats(cls): return {InputFormat.PDF}
    def convert(self):
        return MarkdownDocumentBackend(self.in_doc, BytesIO(normalised_mmd)).convert()

DocumentConverter(format_options={InputFormat.PDF: FormatOption(pipeline_cls=SimplePipeline, backend=MathpixPdfBackend)})
```

Run on a 12,000-word Mathpix chapter (stood in by its `.mmd` sidecar): status `success`, 67 section
headers with levels, 11 pictures, 1 table, 725 KB of DoclingDocument JSON. Two limits surfaced:

- `InputFormat` is a closed enum. A backend must claim an existing format; a `.mmd` file is
  refused outright ("format None does not match any allowed format"), so Mathpix output enters
  either as `.md` or through a PDF-format backend that calls Mathpix itself. The second is the
  honest shape: PDF in, Mathpix as the parser, Docling as the container.
- Docling's Markdown backend produced **0 formula items from 218 `$$` blocks** and no captions
  or image bytes on the 11 pictures. Maths survives only as text. So a Mathpix backend that
  wants the IR to know what a formula is must build the items itself, not delegate to the
  Markdown backend (see §3).

**The TypeScript html-to-markdown: not as a backend.** Backends are Python classes inside the
process. It can run in front of Docling as a converter that emits `.md`, or Docling's own HTML
backend can be used, which is the same Readability-style parse. There is nothing to gain from
wrapping the TS in a Python shim.

**So yes, the architecture is a file-type choice at the outset.** `DocumentConverter` detects
the format from extension and magic, looks up `format_options[format]`, and that pair of
(pipeline, backend) is fixed for the document. Branching by content, "this PDF is scanned, that
one has maths", is not Docling's decision to make; it is a pipeline you write, or a policy above
Docling that picks the `format_options` per document. The routing table in the earlier note is
the whole mechanism.

## 2. How good and how fast is Docling's VLM path with a local model?

Measured on the benchmark's 16 Goodfellow pages against the Mathpix reference, Docling's
`VlmPipeline` with its own MLX presets. Full table and reproduction in
`pdf-to-md-benchmark` §4.8 — a **live** repo outside this fork, at
`~/Dropbox/Projects/pdf-to-md-benchmark/analysis/report.md`. It is the scorer for the ingestion
work and is deliberately not vendored here; see `.kiro/specs/01-consolidate-and-retire` R2.

| engine | math agreement | content | steady s/page |
|---|---:|---:|---:|
| frontier (claude-vlm, cloud, for scale) | 88.8% | 98.3% | 4.0 |
| **GLM-OCR on MLX** | **85.3%** | 90.6% | **5.0** |
| Qwen2.5-VL-3B on MLX | 80.3% | 90.6% | 14.9 |
| LightOnOCR on MLX | 79.0% | 91.9% | 6.9 |
| granite-docling on MLX | 28.8% | 88.6% | 3.2 |
| SmolDocling on MLX | 24.9% | 80.5% | 3.2 |

**Yes, a small accurate local VLM is a real use case now, and its name is GLM-OCR.** Three
points of maths under the frontier model, no network, no per-page cost, 5 s a page on a laptop.
The docs' own models, granite-docling and SmolDocling, are fast and remain unusable for maths:
they emit half the equations. The earlier CPU verdict on granite was about speed as much as
quality; on MLX speed is solved and quality is unchanged.

Two caveats from reading the output rather than the score: GLM-OCR drops running headers and
figure captions on the page checked, so figures need the crop-and-caption route regardless; and
the pipeline is one page per call with a 90 s model load per process, so it wants a resident
worker, not a per-document subprocess.

## 3. What does the DoclingDocument IR look like, and can source-to-artifact borrow it?

It is a Pydantic model, versioned JSON (`schema_name: DoclingDocument`, `version`), with flat
typed lists and one tree:

```
texts[]     TitleItem | SectionHeaderItem(level) | TextItem | ListItem | CodeItem(code_language) | FormulaItem
tables[]    TableItem(data: rows/cols/cells with spans)
pictures[]  PictureItem(image: ImageRef, captions: [$ref], annotations)
groups[]    ListGroup | InlineGroup | GroupItem
body        GroupItem whose children are $refs like "#/texts/3", in reading order
prov        per item: page_no, bbox, charspan       (empty for non-paged sources)
meta        per node: free field for a producer's own data
```

Every item has a stable `self_ref` JSON pointer, a `parent`, `children`, and a `label` from a
closed enum. Serialisers go to Markdown, HTML, DocTags and back from JSON. A hand-built
document exported cleanly: a formula item comes out as `$$…$$`, a code item as a fence, a
captioned picture as caption text plus placeholder or embedded image, headings by level.

**What it holds that our Markdown loses, and what it cannot hold:**

| ours today | in DoclingDocument | note |
|---|---|---|
| `##`/`###` inferred back from the source by title match | `SectionHeaderItem.level`, stable `self_ref` | the seam problem becomes a lookup |
| `$$…$$` with `\tag` | `FormulaItem.text` | tags stay inside the text |
| ```` ```{mermaid} ```` with `%%\| label` | `CodeItem`, `code_language` has no `mermaid` value | label must go in `meta` |
| `![alt](assets/fig-6-1.png)` plus caption line | `PictureItem.image` + `captions[$ref]` | identity travels with the item |
| `::: {#def-x}` environments | nothing | `meta` or a text item with a custom `meta.kind` |
| chunk index, source line range | `prov` needs page and bbox | `meta` again |

So the IR is worth borrowing as a **schema and a contract**, and not as something Docling would
produce for us from our Markdown, since its Markdown reader keeps none of the above. The
producer would be our own parser (`liftMath`, `liftDiagrams`, the outline, the figure manifest
already give every item), writing `DoclingDocument` JSON beside the Markdown.

## 4. A standard artifact IR beside picobay's workflow IR

picobay's IR describes the graph. The thing the graph passes between nodes is today a Markdown
string, and every node that reads it re-parses it and every node that writes it loses whatever
its regex did not know about. That is the "reify the block output multiple times" you named:
merge, splice, preflight, fix, verify all rebuild block identity from text.

The alternative that the spikes support:

- **State between nodes is `DoclingDocument` JSON.** Blocks have `self_ref` ids, levels,
  labels, captions and our own `meta` (chapter, chunk, source lines, figure id, environment).
- **An LLM node reads a Markdown serialisation of the blocks it is given and writes Markdown
  back**, which is re-parsed into items and diffed against the ids it was given. A heading the
  writer promoted is a level change on a known item, not a title to fuzzy-match; a dropped
  block is an id that did not come back, which is the omission check for free.
- **Engines serialise from the IR**: Quarto Markdown, Quarkdown, the in-page HTML, DocTags for a
  VLM round-trip, each a serializer over the same items, so the "which engine" branch stops
  needing the writer to know the dialect.
- **Docling becomes one producer** of that IR, for PDFs through GLM-OCR or Mathpix, DOCX and
  PPTX natively; our Markdown parser is another; Mathpix `.mmd` a third.

Cost: one serializer per engine and one parser for our Markdown into items, both mechanical;
the `mermaid` and `:::` cases live in `meta` until the enum grows. Not measured here: whether the
writer's output quality changes when it is handed a block range instead of a chunk of prose.
That is the next spike, and it is the one that decides whether this is a refactor or a rewrite.

## Evidence

- Local VLM runs and scores: `pdf-to-md-benchmark/results/goodfellow/{glmocr,lightonocr,nanonets-ocr2,qwen25-vl-3b,granite-docling,smoldocling}-mlx/`, runner `runners/run_docling_mlx.py`, report §4.8.
- Backend and IR probes were run from a scratch venv (`docling[vlm]`, `mlx-vlm`, Python 3.12); the Mathpix backend sketch is reproduced in §1 in full.
