# Brighton CTO – Static Website

The official website for [Brighton CTO](https://brightoncto.com) — a community for engineering leaders in Brighton & Hove.

## Stack

Pure static HTML, CSS and JavaScript. No build step, no framework, no dependencies. Hosted on **GitHub Pages**.

```
brightoncto.github.io/
├── index.html            # Homepage
├── events.html           # Events page
├── members.html          # Member directory
├── css/
│   └── styles.css        # All styles (CSS custom properties)
├── js/
│   ├── nav.js            # Mobile nav
│   ├── events.js         # Renders events from data/events.json
│   └── members.js        # Renders & filters member directory
├── data/
│   ├── events.json       # Auto-updated by GitHub Actions daily
│   └── members.json      # Community-maintained member directory
├── scripts/
│   └── fetch-events.js   # Node script run by GitHub Actions
└── .github/
    └── workflows/
        ├── deploy.yml        # GitHub Pages deployment
        └── fetch-events.yml  # Daily Meetup event sync
```

## Deployment

The site deploys automatically to GitHub Pages on every push to `main`.

### Setup (first time)

1. Create a new GitHub repository named `brightoncto.github.io` (or your preferred name).
2. Push this code to `main`.
3. Go to **Settings → Pages** and set the source to **GitHub Actions**.
4. The site will be live at `https://brightoncto.github.io` (or your custom domain).

### Custom domain

1. Add a `CNAME` file to the root with your domain (e.g. `brightoncto.com`).
2. Configure your DNS to point to GitHub Pages (`185.199.108.153` etc.).
3. Enable HTTPS in **Settings → Pages**.

## Meetup events sync

Events are fetched from the Meetup.com API by a GitHub Actions workflow that runs daily at 06:00 UTC and writes the results to `data/events.json`.

### Meetup API key (optional but recommended)

Meetup's public REST API works for basic unauthenticated requests from GitHub Actions, but may be rate-limited. For reliable access:

1. Create a Meetup OAuth application at [meetup.com/api/oauth/list/](https://www.meetup.com/api/oauth/list/).
2. Add the access token as a repository secret named `MEETUP_API_KEY`:
   - Go to **Settings → Secrets and variables → Actions → New repository secret**.
3. The workflow will automatically use it.

You can also trigger a manual sync from the **Actions** tab → **Fetch Meetup Events** → **Run workflow**.

## Member directory

Members add themselves by editing `data/members.json` and submitting a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Local development

Since this is plain static HTML, you can use any local server:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .

# VS Code
# Install the "Live Server" extension and click "Go Live"
```

Then open [http://localhost:8080](http://localhost:8080).

> **Note:** The events page reads from `data/events.json`. Run the fetch script once locally to populate it, or manually add test data.

```bash
# Populate events.json locally (requires internet access)
MEETUP_GROUP=Brighton-CTO-Meetup node scripts/fetch-events.js
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Content © Brighton CTO. Code released under the [MIT Licence](LICENSE).
