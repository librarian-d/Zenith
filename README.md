# Zenith

Zenith is a responsive, space-themed schedule and roadmap planner built as a static web app.

## Features

- Create, schedule, prioritize, complete, and remove missions
- Save tasks and roadmaps in browser storage
- Generate a four-phase roadmap and dated starter tasks from a goal, target date, and weekly time budget
- Run a 25-minute focus timer
- Optional browser notifications for scheduled tasks
- Installable progressive web app shell with basic offline caching
- Layout adapts to phones, tablets, and desktop screens

The roadmap planner runs locally in your browser and uses goal-aware templates. It does not call a hosted AI model. Task reminders are delivered while the app is open; a closed browser needs a push-notification service for background delivery.

## Local preview

Open `index.html` in a browser. For service-worker and install support, use a local static server or the published HTTPS site.

## Publish

A GitHub Actions workflow deploys the repository root to GitHub Pages on pushes to `main`. Browser data stays on the device where the app is used.
