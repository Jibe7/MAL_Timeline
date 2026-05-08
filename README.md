# MAL Anime Timeline

A static GitHub Pages app that turns a MyAnimeList anime XML export into a beautiful interactive timeline.

## Features

- Upload a MAL XML export directly in the browser
- XML is parsed locally; it is not uploaded anywhere
- Chronological timeline grouped by year and month
- Search, score filter, status filter, year filter, and sorting
- MAL links for every anime
- Live cover thumbnails from the public Jikan API
- This app uses Jikan for cover images. Jikan may rate-limit requests. If some covers fail to load, use the built-in retry buttons.

## How to use locally

Open `index.html` in your browser.

## How users get your MAL XML

1. Log in to MyAnimeList.
2. Go to: https://myanimelist.net/panel.php?go=export
3. Export the anime list XML.
4. Upload that XML into this app.