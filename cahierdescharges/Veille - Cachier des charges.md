# The ultimate personal SEO editor stack for 2025–2026

**Plate + Claude Sonnet 4.5 + a handful of free APIs form the most powerful, zero-bloat stack for a solo developer building a personal SEO blog editor.** The entire toolchain costs under $15/month to operate, runs on your existing Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui stack without friction, and rivals commercial tools like Surfer SEO and Clearscope in capability. This report distills 360° of research into the exact picks for each layer — one choice per category, no fluff.

---

## 1. LLM strategy: a two-model cascade beats any single model

The most cost-effective architecture for a personal SEO editor is a **multi-model cascade** — routing tasks by complexity to the cheapest model that delivers acceptable quality. Newer "reasoning" models (Claude Opus 4.5, GPT-5.1 Thinking) actually perform *worse* at SEO tasks according to Search Engine Land benchmarks, so stick with the mid-tier workhorses.

**Primary writer — Claude Sonnet 4.5** ($3/$15 per 1M input/output tokens). Claude produces the most natural, human-like long-form content and demonstrates superior semantic understanding for keyword optimization. It handles content rewriting without keyword stuffing, generates cleaner JSON-LD schema (only 1 non-critical issue vs. 5 for GPT-4o in Rich Results testing), and maintains tonal consistency across 1,500–3,000 word articles. Use Anthropic's **prompt caching** to save up to 90% on repeated SEO system prompts. The **200K context window** easily accommodates article draft + competitor content + keyword data in a single prompt.

**Fast workhorse — GPT-4.1-mini** ($0.40/$1.60 per 1M tokens). This model matches or exceeds GPT-4o quality at 83% lower cost and handles **80% of your total API calls**: outline generation, meta title/description variants, JSON-LD generation, keyword suggestions, and basic content scoring. At ~108 tokens/second with 0.82s time-to-first-token, it feels instant in a streaming editor. The **1M context window** is overkill for most tasks but useful for analyzing competitor content at scale.

**Optional budget tier — Gemini 2.5 Flash** ($0.30/$2.50 per 1M tokens). Google offers a generous free tier (100–1,000 requests/day) that's perfect for development and prototyping. Use it for bulk processing, first-pass drafts, or as a fallback. The **1M context window** and built-in thinking capabilities make it surprisingly capable for the price.

| Sub-task | Model | Cost per article |
|---|---|---|
| Outline generation | GPT-4.1-mini | ~$0.008 |
| Long-form writing (2,000 words) | Claude Sonnet 4.5 | ~$0.07 |
| Meta title/description (3 variants) | GPT-4.1-mini | ~$0.003 |
| Content rewriting for SEO | Claude Sonnet 4.5 | ~$0.07 |
| JSON-LD schema | GPT-4.1-mini | ~$0.002 |
| Content scoring | GPT-4.1-mini | ~$0.005 |

**Total per article: ~$0.15–$0.20. Monthly cost for 50 articles: ~$8–$10.** Cost is negligible. OpenAI's Batch API offers an additional 50% discount for non-urgent generation — perfect for producing drafts overnight.

**SDK choice: Vercel AI SDK** (`ai` package, 20M+ monthly downloads). This is the only SDK you need. It provides a unified TypeScript-first API across all providers — switch between Claude, GPT, and Gemini with a single line change. Key features: `streamText()` for real-time editor streaming, `generateObject()` with Zod schemas for type-safe JSON-LD generation, and `useChat()` React hook for chat-based editor interactions. Install with:

```
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

LangChain.js is overkill for this use case. The Vercel AI SDK reduces implementation from 100+ lines to ~20 lines for equivalent functionality.

---

## 2. Plate is the only editor that fits this stack natively

After comparing Tiptap, Lexical, Plate, Novel, and BlockNote across every dimension, **Plate** (platejs.org) wins decisively for one reason the others can't match: it is literally built on shadcn/ui.

Plate uses the `shadcn` CLI (`npx shadcn@latest add @plate/editor-ai`), Radix UI primitives, and Tailwind CSS utility classes. Every other editor requires building UI from scratch or fighting against an opinionated styling system. Plate's components follow the same open-code philosophy as shadcn — you own and modify all component code. It has **confirmed React 19 + Tailwind v4 compatibility** in its official templates, while Tiptap explicitly warns of React 19 rough edges and BlockNote's compatibility remains undocumented.

**AI integration is free and excellent.** Unlike Tiptap (paid subscription required for AI features) or BlockNote (GPL-licensed AI), Plate's `@platejs/ai` plugin is MIT-licensed and provides streaming text insertion, an AI menu with accept/reject/retry workflow, loading indicators, and native Vercel AI SDK integration. It even supports MCP (Model Context Protocol) for advanced AI tool integration. The 50+ headless plugins cover everything an SEO editor needs: headings, lists, tables, slash commands, floating menus, drag-and-drop, markdown serialization, and block selection.

| Criterion | Plate | Tiptap | Lexical |
|---|---|---|---|
| shadcn/ui native | ✅ Built-in | ❌ Build from scratch | ❌ Build from scratch |
| React 19 confirmed | ✅ Official template | ⚠️ Partial | ✅ Good |
| Free AI integration | ✅ MIT licensed | ❌ Paid only | ❌ None |
| TypeScript quality | ✅ Excellent | Good | ✅ Excellent |
| Plugin count | 50+ | 100+ | ~15 |
| Learning curve | Moderate | Moderate | Steep |

Tiptap remains the runner-up — choose it only if you need its larger extension ecosystem and don't mind paying for AI features. Lexical is best reserved for engineers who want total control and the smallest possible bundle (**22KB** gzipped). Novel is a product, not a framework — too opinionated for a custom SEO editor.

---

## 3. The SEO analysis layer: yoastseo as the foundation, five packages total

Real-time SEO analysis requires a lean set of npm packages working together. The `yoastseo` open-source library provides **80% of the scoring** you need in a single dependency, with additional packages filling specific gaps.

**Core: `yoastseo`** (GPL, ~1,820 GitHub stars). This is the actual JavaScript library that powers Yoast SEO. It runs standalone outside WordPress and provides SEO analysis (keyphrase density, keyword in title/URL/meta/H1, internal/external link counting), readability analysis (sentence length, paragraph length, passive voice detection, transition word usage, subheading distribution), and snippet preview — all via Web Workers for non-blocking real-time analysis. Run it debounced at 500ms–1s intervals. The latest published version is v3.3.0 (late 2025). **For personal use, the GPL license is irrelevant.**

**Readability: `text-readability-ts`** — a TypeScript-native rewrite of `text-readability` providing Flesch Reading Ease, Flesch-Kincaid Grade, Gunning Fog, SMOG, ARI, Coleman-Liau, Dale-Chall, and a composite `textStandard()` function. Supplements Yoast's readability scores with additional metrics.

**NLP and keywords: `wink-nlp`** — processes **650,000 tokens/second**, ships at ~10KB minified+gzipped, and provides full TypeScript support. Use it for tokenization, POS tagging, named entity recognition, sentiment analysis, and bag-of-words frequency tables. For TF-IDF specifically, use `natural`'s built-in `TfIdf` module — it lets you add competitor documents as a corpus and compute term importance gaps.

**Structured data: `schema-dts`** (Google-maintained, ~1.49M weekly downloads). Provides the complete Schema.org vocabulary as TypeScript discriminated unions with zero runtime cost — it's types only. Pair with `react-schemaorg` for rendering JSON-LD `<script>` tags. This gives you type-safe `BlogPosting`, `FAQPage`, `HowTo`, and `BreadcrumbList` schema generation.

**Internal linking: `@huggingface/transformers`** (Transformers.js v3.8+). Run the `all-MiniLM-L6-v2` embedding model locally in Node.js to generate 384-dimension vectors for all your blog posts, then compute cosine similarity to suggest the most related posts as internal link candidates. The model handles ~256 tokens per chunk — use article excerpts. Store embeddings as a JSON file and recompute on content save.

Custom keyword density is a ~10-line function (tokenize, count target keyword occurrences, divide by total words). Title tag pixel-width measurement is another ~10 lines using the Canvas API against Google's ~580px SERP threshold. No packages needed for either.

**Implementation priority:**
1. `yoastseo` in a Web Worker — gives you SEO + readability scoring immediately
2. `wink-nlp` + custom keyword density — real-time NLP analysis
3. `schema-dts` + `react-schemaorg` — type-safe JSON-LD generation
4. `text-readability-ts` — supplemental readability metrics
5. `@huggingface/transformers` — internal linking suggestions (Phase 2 feature)

---

## 4. What SEO knowledge to inject into your system prompts

The system prompt is the most important lever for content quality. Embed these rules as a layered prompt architecture so each LLM call gets only the context it needs.

**Google's current stance is clear: AI content is fine if it's genuinely helpful.** John Mueller stated in November 2025 that Google's systems "don't care if content is created by AI or humans." However, the January 2025 Quality Rater Guidelines update explicitly defines generative AI and instructs raters to flag AI content as "lowest quality" when it lacks originality or value. The trigger signals are phrases like "As an AI language model," generic summaries, unnatural repetition, and filler that inflates content without substance. Your editor should strip these artifacts and enforce quality, not merely generate volume.

**E-E-A-T is now applied across all competitive searches**, not just YMYL topics. The December 2025 core update elevated "Experience" as the strongest differentiation signal — content with first-hand anecdotes, original data, testing results, and personal photos outranks technically thorough but generic coverage. **The editor should prompt authors to add personal experience markers** and flag content that reads as surface-level summarization.

**The content scoring rubric** should weight six dimensions. Topical completeness (25%) measures coverage of key subtopics and entities versus top-ranking competitors — this is what Surfer SEO and Clearscope primarily score. E-E-A-T signals (20%) check for author bio, citations, first-hand experience indicators, and sourced claims. On-page SEO (20%) validates title tag (50–60 characters, keyword in first 40), meta description (140–160 characters with CTA), H1 alignment, keyword in first 100 words, heading hierarchy, and URL slug. Readability and structure (15%) target Flesch-Kincaid grade 7–9, paragraphs of 2–4 sentences, headings every 200–300 words, and transition word usage. Search intent match (10%) ensures the content format aligns with the SERP (informational, transactional, navigational). Technical quality (10%) covers image alt text, internal links (2–6 per article), external links (2–5 to authoritative sources), schema markup, and content length versus competitor average.

**On-page rules to hardcode** into your validation layer: primary keyword density of **0.5–0.8%** (never exceeding 1%), exactly one H1 per page, no skipped heading levels, keyword present in H1 and at least one H2, title tag under 600 pixels (≈60 characters), meta description under 920 pixels (≈155 characters), and descriptive image alt text under 125 characters. For featured snippet optimization, include a **40–60 word direct answer** within the first 100 words and use question-format H2/H3 headings matching PAA queries.

**Schema.org essentials** for every blog post: `BlogPosting` with `headline`, `author` (as `Person` with `url` to a dedicated author page and `sameAs` linking social profiles), `publisher` (as `Organization` with `logo`), `datePublished`, `dateModified`, `image` (at least **1,200px wide**, provide 16:9, 4:3, and 1:1 ratios), and `mainEntityOfPage`. Add `FAQPage` schema for any FAQ section and `HowTo` for step-by-step guides. `BreadcrumbList` schema aids navigation context. All schema must match visible on-page content.

---

## 5. Supporting tools: a $0/month stack that covers everything

The most valuable external integrations are all free at personal-use scale. Here are the five that matter, in priority order.

**Google Search Console API** — free, essential, your single most valuable data source. It provides real clicks, impressions, CTR, and average position per query and page. The goldmine strategy: filter for queries where position is **5–20** with high impressions but low CTR — these are low-hanging-fruit keywords where small content improvements yield the largest traffic gains. Quota is 2,000 requests/day, far more than a solo blogger needs. Use the `googleapis` npm package with a service account for OAuth 2.0 authentication (30-minute setup).

**Serper.dev** — **2,500 free queries** with no credit card, enough for months of competitor SERP analysis. It returns clean JSON with organic results (titles, URLs, snippets, position), People Also Ask questions, featured snippets, and related searches for any keyword. After the free tier, it's $0.30–$1.00 per 1K queries. This enables the core Surfer/Clearscope workflow: fetch top-10 URLs for a keyword, then analyze their content structure.

**Jina Reader API** — prepend `https://r.jina.ai/` to any URL to get clean Markdown, no API key needed. The free tier includes 10 million tokens for new signups and 100 requests per minute. This is how you extract competitor content: get top-10 URLs from Serper.dev, fetch each through Jina Reader, then analyze headings, word count, keyword density, and entity coverage locally with `wink-nlp` and `natural`. Open-source under Apache-2.0.

**Google Cloud Natural Language API** — first **5,000 units/month per feature are free**. A typical 2,000-word article is ~10 units, meaning ~500 article analyses per month at zero cost. Use it for entity extraction (identifying people, products, organizations, concepts in competitor content) and content classification. Install via `@google-cloud/language`.

**PageSpeed Insights API** — completely free, **25,000 requests/day**. Returns Lighthouse scores (Performance, Accessibility, SEO, Best Practices) plus Core Web Vitals (LCP, CLS, TBT) for any URL. Use it as a post-publish quality check to ensure blog posts meet the LCP < 2.5s threshold — sites above 3s experienced ~23% more traffic loss in the December 2025 core update.

For keyword research without paid APIs, combine **GSC data** (real queries you already rank for), **Google Autocomplete scraping** (long-tail keyword discovery via the public suggest endpoint), and **Google Trends** (via the `google-trends-api` npm package for trend analysis). When you need volume data, **DataForSEO** ($50 minimum deposit) covers keyword volume, CPC, difficulty, and SERP data from a single account at ~$0.05 per keyword lookup. For image processing, **Sharp** is the gold standard Node.js library (free, Apache-2.0, 4–5× faster than ImageMagick) and **Gemini 2.5 Flash** generates 500 free images per day for featured images.

---

## Conclusion: the complete architecture at a glance

The entire stack converges around a minimal set of choices that integrate without friction. **Plate** is the editor because it's the only one natively built on your shadcn/ui stack with free AI integration. **Claude Sonnet 4.5** writes the content; **GPT-4.1-mini** handles everything else at 83% lower cost. The **Vercel AI SDK** unifies all LLM calls with a single TypeScript API. **Yoastseo** provides battle-tested SEO scoring in a Web Worker, supplemented by `wink-nlp` for NLP and `schema-dts` for type-safe structured data. The external data layer — GSC, Serper.dev, Jina Reader, Google NLP, and PageSpeed Insights — is entirely free at personal scale.

The most non-obvious insight from this research: **the content scoring layer matters more than the LLM choice.** The best raw LLM output scores only 72.8/100 on SEO metrics (per PageOptimizer Pro benchmarks). The delta between a good and great SEO article comes from your deterministic analysis layer — keyword density validation, heading structure enforcement, semantic term gap analysis against competitors, E-E-A-T signal checks — not from switching between models. Build the scoring engine first, then use the LLM as a drafting tool that the scoring engine guides.