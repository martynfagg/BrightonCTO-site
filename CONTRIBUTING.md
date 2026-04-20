# Contributing to Brighton CTO

Thanks for being part of the Brighton CTO community! This guide explains how to add yourself to the member directory.

---

## Adding yourself to the member directory

The member directory lives in [`data/members.json`](data/members.json). You can add an entry by submitting a GitHub pull request — no coding experience needed.

### Option A: Edit directly on GitHub (easiest)

1. Open [`data/members.json`](data/members.json) on GitHub.
2. Click the **pencil icon** (✏️ Edit this file) in the top-right corner.
3. GitHub will automatically fork the repository for you.
4. Scroll to the end of the JSON array (before the final `]`) and add a comma after the last entry, then paste your new entry using the template below.
5. Click **"Propose changes"**, then **"Create pull request"**.
6. One of the maintainers will review and merge it, usually within a day or two.

### Option B: Fork & clone (if you prefer working locally)

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR-USERNAME/brightoncto.github.io.git
cd brightoncto.github.io

# Create a branch
git checkout -b add-yourname

# Edit data/members.json, then:
git add data/members.json
git commit -m "feat: add [Your Name] to member directory"
git push origin add-yourname

# Open a pull request on GitHub
```

---

## Member entry format

```json
{
  "name": "Your Full Name",
  "role": "CTO",
  "company": "Your Company Name",
  "bio": "A sentence or two about you, your background and what you work on.",
  "tags": ["Leadership", "Platform Engineering", "SaaS"],
  "linkedin": "https://linkedin.com/in/yourhandle",
  "website": "https://yoursite.com",
  "github": "https://github.com/yourhandle",
  "avatar": "",
  "joined": "2025-03"
}
```

### Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Your full name |
| `role` | ✅ | Your job title (e.g. CTO, VP Engineering, Head of Engineering) |
| `company` | ✅ | Your current employer |
| `bio` | ✅ | One or two sentences about you |
| `tags` | Optional | Up to 5 keywords describing your interests/specialisms |
| `linkedin` | Optional | Full URL to your LinkedIn profile |
| `website` | Optional | Personal or company website |
| `github` | Optional | Full URL to your GitHub profile |
| `avatar` | Optional | URL to a profile photo (leave blank to use initials) |
| `joined` | Optional | When you joined the community, in `YYYY-MM` format |

### Tips

- Keep your bio friendly and professional — think of it as your conference badge bio.
- Tags should be broad topics (not company-specific jargon).
- All fields are optional except `name`, `role`, `company` and `bio`.
- You can leave `avatar` blank — the site will display your initials instead.

---

## Guidelines

- **Only add yourself** — do not add entries for other people without their explicit consent.
- Keep content professional and relevant to engineering leadership.
- No promotional or advertising content.
- You can update or remove your own entry at any time by submitting another PR.

---

## Questions?

Open an [issue](https://github.com/brightoncto/brightoncto.github.io/issues).
