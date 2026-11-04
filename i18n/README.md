# Internationalization rollout

This directory is the source of truth for locale rollout.

## Current state
- English (`en`) is the only published locale.
- The other 49 entries are planned only. They are not public routes and must not be added to the sitemap or hreflang tags yet.
- Locale URL convention: lowercase language prefix (for example `/fr/`); region-specific codes retain a normalized URL slug (for example `zh-CN` -> `/zh-cn/`).
- English remains at the root URL.

## Release checklist for each locale
1. Translate all visible UI strings, errors, loading states, accessibility labels, metadata, FAQ and structured data.
2. Review translations with a fluent speaker; machine translation alone is not a quality sign-off.
3. Keep transcript/source language separate from interface language. Never rewrite transcript content to match the UI locale.
4. Set the document `lang` and `dir` correctly. RTL locales: ar, ur, he, fa.
5. Give every translated page a self-referencing canonical URL and unique localized title/description.
6. Add reciprocal `hreflang` alternates only among equivalent pages that are actually published; include `x-default` to the English page.
7. Add only live, indexable locale URLs to the sitemap.
8. Test navigation, form validation, API errors, AI states, downloads, mobile layout, keyboard access and no mixed-language strings.
9. Confirm routes resolve to static HTML before publishing.

## Browser language behavior
Do not redirect visitors to an untranslated or planned locale. Once translated routes exist, browser language may select a supported published locale on the first root visit only. A manual locale selection must take precedence over browser preferences. Unsupported languages fall back to English.

## Adding a locale
Change its status to `published` only after the checklist passes. Never treat a locale as published merely because a route or language code exists.
