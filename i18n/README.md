# Internationalization rollout

## Architecture
- English default stays at `/` and `/blog/`.
- Localized languages use a locale prefix and translated page slugs, for example `/fr/blog/`, `/it/blog/`, and `/ar/المدونة/`.
- The registry in `locales.json` defines 75 language entries, directions, and localized blog/article slug dictionaries.
- Localized routes are not live yet. English and French have homepage files; Spanish now has a functional homepage preview and clean route. Spanish remains noindex until full QA and supporting content are complete. Other entries remain roadmap locales and must stay unavailable until translated pages, routes and QA are complete.

## Non-negotiable release rules
1. Translate every visible string: navigation, headings, body copy, form labels, placeholders, validation, processing states, errors, AI states, buttons, footer, accessibility labels, metadata, FAQ and structured data.
2. Keep internal links in the current locale and use translated human-readable slugs. Never leak an English slug into a localized URL.
3. Keep transcript/source language separate from interface language. Never rewrite transcript content to match the UI locale.
4. Set document `lang` and `dir` correctly. RTL locales: ar, ur, he, fa.
5. Give every translated page a unique localized title/description and self-referencing canonical URL.
6. Add reciprocal `hreflang` alternates only among equivalent pages that are actually published, indexable and self-canonical. Include `x-default` to the default English equivalent.
7. Add only live, indexable localized URLs to the sitemap, using translated slugs.
8. Test navigation, form validation, API errors, AI states, downloads, mobile layout, keyboard access, canonical/hreflang reciprocity and absence of mixed-language UI.
9. Have fluent speakers review translations before publication; machine translation alone is not final QA.
10. Do not redirect a visitor to an untranslated locale. Browser language selection must only choose a supported published locale on the first root visit; manual selection takes precedence.

## Transcript language
The selected website language controls only the interface. The language detected in a video transcript is independent and must remain as returned by the transcript provider.
