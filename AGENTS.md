# Repository Guidelines

## Project Structure & Module Organization

The repository root is a static landing page: `index.html` contains the markup, `css/main.css` the styles, `js/main.js` the browser behavior, `locales/{tr,en}.json` the translations, and `assets/` the icons. `HolyCitizenDCBot/` is a separate Node.js Discord bot, with commands in `src/commands/`, event handlers in `src/events/`, services in `src/services/`, and tests in `test/`. `HolyCitizenKickChatBot/` is a Python Kick bot; its server is `server.py`, its standalone panel preview is `bot-panel.html`, and its tests are in `tests/`.

## Build, Test, and Development Commands

- From the root, run `python3 -m http.server 8000` and open `http://localhost:8000` to preview the landing page. Serve it over HTTP so locale JSON requests work.
- In `HolyCitizenDCBot/`, run `npm install`, then `npm test` for the Node test suite or `npm start` to connect the bot. Node.js 18+ is required.
- In `HolyCitizenKickChatBot/`, run `python3 -m unittest discover -s tests -v` for tests or `python3 server.py` to start the server. Python 3.10+ is required; no third-party packages are needed.

There is no root build step, lint script, or configured coverage threshold.

## Coding Style & Naming Conventions

Follow the surrounding file's style: two-space indentation in HTML, CSS, and JavaScript; four spaces in Python. Keep the landing page dependency-free and browser code in `js/main.js`. Discord code uses ES modules, double quotes, and `camelCase` functions; name new command and event modules for the feature they handle. Use `snake_case` for Python functions and `test_*.py` files. Add translation keys to both locale JSON files. Keep CSS colors and spacing in the existing custom properties.

## Testing Guidelines

Add Discord tests as `test/*.test.js` using `node:test`; add Kick tests as `tests/test_*.py` using `unittest`. Run the relevant suite before submitting changes. For landing-page changes, check language switching, keyboard navigation, and mobile layout in a browser.

## Commit & Pull Request Guidelines

The nested repositories have mixed commit styles, including `feat:` and `fix:` prefixes and short descriptive subjects. Use a concise, imperative subject, preferably `feat: ...` or `fix: ...`. In pull requests, describe the change and verification, link any related issue, and include screenshots for visual changes.

## Security & Configuration

Use each bot's `.env.example` to set up a local `.env`; never commit tokens, secrets, or runtime databases. The two bot directories are separate Git repositories, so commit changes in the repository that owns them.
