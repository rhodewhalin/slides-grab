# ppt-team-agent

Agent-first PPT framework.
Agents write HTML slides directly, and a Planning -> Design -> Conversion pipeline produces PPTX/PDF output.

## Setup (Copy/Paste)

Setup commands from `SETUP.md` are included below for convenience.

### 1) Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ppt_team_agent.git && cd ppt_team_agent
```

### 2) One-Liner Install by OS

macOS (Homebrew):

```bash
brew update && brew install node git && npm ci && npx playwright install chromium
```

Ubuntu (apt):

```bash
sudo apt-get update && sudo apt-get install -y curl git && curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs && npm ci && npx playwright install chromium
```

Windows (winget, PowerShell):

```powershell
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements; winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements; npm ci; npx playwright install chromium
```

### 3) Verify CLI

```bash
npm exec -- ppt-agent --help
```

## CLI

```bash
ppt-agent build-viewer
ppt-agent validate
ppt-agent convert
```

For local development you can also run directly:

```bash
node bin/ppt-agent.js --help
```

## npm Scripts

```bash
npm run build-viewer
npm run validate
npm run convert
npm run html2pptx
npm run codex:install-skills
```

## Codex Skills

This repository includes Codex-native skills under `skills/`:

- `ppt-plan-skill`
- `ppt-design-skill`
- `ppt-pptx-skill`

Install them into Codex skill home:

```bash
ppt-agent install-codex-skills --force
```

or:

```bash
node scripts/install-codex-skills.js --force
```

After installation, restart Codex to pick up the new skills.
