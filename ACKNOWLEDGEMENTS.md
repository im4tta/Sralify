# Acknowledgements

This project would not exist without the following open-source libraries and the people who maintain them. Huge thanks to all contributors.

## Core libraries

### [PDF.js](https://mozilla.github.io/pdf.js/)
- **Author:** Mozilla & contributors
- **License:** Apache License 2.0
- **Used for:** Parsing PDF files and rendering each page to an HTML canvas in the browser.
- **Repo:** https://github.com/mozilla/pdf.js

### [jsPDF](https://github.com/parallax/jsPDF)
- **Author:** James Hall, yWorks GmbH, and contributors
- **License:** MIT
- **Used for:** Building the output PDF from the rendered canvas images.
- **Repo:** https://github.com/parallax/jsPDF

### [JSZip](https://stuk.github.io/jszip/)
- **Author:** Stuart Knightley and contributors
- **License:** MIT or GPLv3 (dual-licensed)
- **Used for:** Bundling multiple compressed PDFs into a single ZIP download.
- **Repo:** https://github.com/Stuk/jszip

### [Tailwind CSS](https://tailwindcss.com/)
- **Author:** Tailwind Labs and contributors
- **License:** MIT
- **Used for:** Utility-first styling via the browser CDN build.
- **Repo:** https://github.com/tailwindlabs/tailwindcss

## CDNs

Third-party libraries are loaded from public CDNs at runtime:

- [cdnjs](https://cdnjs.com/) — for PDF.js, jsPDF, JSZip
- [jsDelivr](https://www.jsdelivr.com/) — for Tailwind CSS browser build

If you fork this project for offline-first or air-gapped use, you can vendor these libraries into the repo and update the `<script>` and `<link>` tags accordingly.

## Motivation

Truly free, no-strings-attached PDF tools are surprisingly hard to find online. Most options come with file-size limits, daily quotas, signup walls, intrusive ads, or upload your private documents to someone else's server. This project exists to give myself — and anyone else who wants it — a simple, fast, trustworthy PDF compressor that runs entirely in the browser and stays free forever.

---

If you maintain one of the libraries above and would like attribution adjusted, please open an issue.
