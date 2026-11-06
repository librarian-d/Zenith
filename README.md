# Zenith

A responsive, space-themed schedule and roadmap planner.

**Live app:** https://zenith-planner.dg361810.workers.dev/

## Features

- Create, schedule, prioritize, complete, and remove missions
- Save tasks and roadmaps in browser storage
- Generate a four-phase roadmap and dated starter tasks from a goal, target date, and weekly time budget
- Run a 25-minute focus timer
- Optional browser notifications for scheduled tasks
- Installable progressive web app shell with basic offline caching
- Layout adapts to phones, tablets, and desktop screens

The roadmap planner runs locally in your browser and uses goal-aware templates; it does not call a hosted AI model. Task reminders are delivered while the app is open. Background reminders while the browser is closed need a push-notification service. Your tasks and roadmaps stay in the browser where you use Zenith.

## Local preview

Open `index.html` in a browser. For service-worker and install support, use a local static server or the published HTTPS site.

## Publishing

The static app is deployed to Cloudflare at the live URL above. The GitHub repository stores the source files. Browser data is not synced between devices.
