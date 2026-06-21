# Habit-at: A Habit Tracker
Habit-at is a habit-tracking web application built across two sprints for the CS361 Software Engineering course at Oregon State University. The app allows users to create and categorize habits, track daily completions, monitor streaks and progress, and manage their habit history through a unified dashboard backed by four independent microservices.

## Demo Video
[Watch the Demo on YouTube](https://youtu.be/sHrBmASYyk0)

## Stack
- **Backend:** Python / Flask; REST API, data stored in local JSON files
- **Frontend:** Plain HTML, CSS, and JavaScript
- **Server:** Node.js; serves frontend pages and proxies API requests to Flask
- **Microservices:** Four independent Node.js services handling quotes, reminders, streaks, and progress

## Overview
Habit-at guides users through a 3-step onboarding flow before landing on a dashboard that displays all active habits as cards. Each card shows the habit's category, frequency, duration, current streak, next due date, overdue status, and a progress bar displaying completions as a percentage of the goal total. Users can mark habits complete for the day, undo a completion, edit any habit's details, or delete it — deleted habits are soft-removed to a trash panel where they can be restored. A real-time search bar and category filter tabs allow users to narrow the visible list instantly. Four microservices run alongside the main program to compute streaks, schedule reminders, calculate progress, and serve motivational quotes; each is non-blocking, so the dashboard degrades gracefully if one is unavailable.

## Microservices
Each microservice runs as a separate process. All four should be running for full dashboard functionality. Start each in its own terminal before launching the main program.

---

### Random Quote Generator
[github.com/hunterbfranklin/random-quote-generator](https://github.com/HunterBFranklin/random-quote-generator)

Serves a random motivational quote to the landing page and dashboard empty state on load.

```bash
cd random-quote-generator
node server.js
```

Runs on `http://localhost:3001`

---

### Reminder Service
[github.com/hunterbfranklin/reminder-service](https://github.com/HunterBFranklin/reminder-service)

Calculates the next due date and overdue status for each habit based on its frequency and last completion time.

```bash
cd reminder-service
node server.js
```

Runs on `http://localhost:3002`

---

### Streak Calculator
[github.com/hunterbfranklin/streak-calculator](https://github.com/HunterBFranklin/streak-calculator)

Computes the current and longest completion streak for each habit from its completion history.

```bash
cd streak-calculator
node server.js
```

Runs on `http://localhost:3004`

---

### Progress Calculator
[github.com/hunterbfranklin/progress-completion-calculator](https://github.com/HunterBFranklin/progress-completion-calculator)

Returns percent complete, on-track/behind status, and projected completion date for each habit given its completion count vs. goal total.

```bash
cd progress-completion-calculator
node server.js
```

Runs on `http://localhost:3006`

---

## How to Run

**Terminal 1 — Start the Flask backend:**
```bash
cd backend
pip3 install -r requirements.txt
python3 app.py
```

**Terminal 2 — Start the Node frontend:**
```bash
cd frontend
node server.js
```

**Terminals 3–6 — Start each microservice** (see Microservices section above).

Open `http://localhost:3000` in your browser.

> Microservices are non-blocking — if one is unavailable the dashboard falls back to placeholder values and continues to function.

## Project Structure
```
Habit-at/
├── backend/
│   ├── app.py                Flask REST API
│   ├── habits.json           Auto-generated habit data store
│   ├── deleted_habits.json   Soft-deleted habits for trash panel
│   └── requirements.txt      Python dependencies
└── frontend/
    ├── server.js             Node.js static server + API proxy
    └── public/
        ├── index.html        Landing page
        ├── onboarding.html   3-step onboarding
        ├── onboarding.js
        ├── dashboard.html    Main habit list
        ├── dashboard.js
        ├── addHabit.html     Add habit form
        ├── addHabit.js
        └── style.css         All visual styles
```

## Inclusivity Heuristics Reflected
| # | Heuristic | Where |
|---|-----------|-------|
| 1 | Explain benefits | Landing page, onboarding step 1 |
| 2 | Explain costs | "60 seconds" notice, privacy statement |
| 3 | Info control | Category filter, search, trash panel |
| 4 | Familiar features | + icon, chevron, progress bar, 🗑️ |
| 5 | Undo/backtracking | Back-out confirmation, undo completion, trash restore |
| 6 | Explicit path | 3-step onboarding with progress bar |
| 7 | Multiple approaches | Three ways to reach Add Habit |
| 8 | Mindful tinkering | Required fields, red errors, delete confirmation modal |
