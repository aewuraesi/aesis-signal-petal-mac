# Aesi's Signal Petal for macOS

A private, local browser app for tracking issues, follow-ups, actions, outcomes, and delivery health. Everything stays on this Mac in its browser storage.

## What you need

- A Mac running macOS
- **Node.js 22 LTS or newer**, available from [nodejs.org](https://nodejs.org/)
- An internet connection for the first setup only

## Start the app

1. On this repository's GitHub page, choose **Code** then **Download ZIP**.
2. Double-click the downloaded ZIP file to extract it, then open the extracted folder.
3. Double-click **Start Aesi's Signal Petal.command**.
4. If macOS blocks it, Control-click the file, choose **Open**, then choose **Open** again.
5. On its first run, the app installs what it needs and opens at [http://localhost:3000](http://localhost:3000).

Keep the Terminal window open while you use the app. Press `Control + C` in that window when you want to stop it.

## Terminal option

Open **Terminal**, then move to the extracted app folder. For example:

```bash
cd ~/Downloads/aesis-signal-petal-mac
```

Install and start the app:

```bash
corepack pnpm install
corepack pnpm dev
```

Open the local address printed in Terminal—normally [http://localhost:3000](http://localhost:3000).

## Everyday use

After the first setup, simply double-click **Start Aesi's Signal Petal.command** again. It opens the app locally in your browser.

## Your data

- Issues, updates, themes, and your profile stay in this browser on this Mac.
- Sharing this repository or ZIP does **not** share your logged work.
- Clearing browser data for `localhost` removes this app's local records, so keep important long-term notes elsewhere as well.

## Troubleshooting

- **Node.js is missing:** install Node.js 22 LTS or newer from [nodejs.org](https://nodejs.org/), then start the app again.
- **The `.command` file will not open:** Control-click it and choose **Open**. If needed, in Terminal run `chmod +x "Start Aesi's Signal Petal.command"` from the app folder, then open it again.
- **The page does not open:** make sure the Terminal window remains open and use the exact local address it displays.
- **Port 3000 is busy:** use the alternate local address shown in Terminal.
