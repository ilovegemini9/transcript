# Localized URL and SEO contract

## URL structure
- Default English stays at `/` and `/blog/`.
- Every other language uses a language prefix: `/fr/`, `/es/`, `/ar/`, `/it/`, etc.
- Localized blog indexes use the locale's translated blog slug, e.g. `/fr/blog/`, `/it/blog/`, and `/ar/المدونة/`.
- Localized article slugs are translated too. The English source slug is only an internal content key and must never leak into a localized public URL.
- Use UTF-8 percent-encoded URLs for non-Latin slugs in generated links and sitemap XML. Browsers display the decoded localized slug.

## SEO invariants
- Each page has a unique translated title, meta description, visible H1, body copy, navigation, buttons, form validation/loading/error messages, footer and accessibility labels.
- Each page's canonical points to itself.
- `hreflang` values use valid language-region tags (e.g. `fr`, `it`, `ar`, `en-CA`), never country-only tags such as `us`.
- Only publish reciprocal alternate clusters when every listed equivalent URL is live, indexable and self-canonical. Include `x-default` to the default English equivalent.
- Sitemap contains only live localized URLs; use localized slugs, not English source slugs.
- Internal links must stay within the active locale whenever an equivalent localized destination exists.
- Do not translate platform/product trademarks or video source content automatically.
- Transcript language is independent of UI locale.

## Current release status
English is the published default. French, Spanish, Arabic, Portuguese, German and Italian currently have homepage preview routes; these previews are noindex and are not included in the sitemap or hreflang clusters. All remaining locales are planning metadata only. Do not expose planned URLs in navigation, sitemap, canonical or hreflang until their translated pages and route rewrites pass QA.
