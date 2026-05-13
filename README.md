# ```Habit-at: CS361 Assignment #5```

Habit-at is a habit-tracking web application built for Sprint 1 of the CS361 Software Engineering course at Oregon State University. 
The app allows users to create habits, track progress, and view them on a unified dashboard.
## Stack

- **Backend:** Python / Flask; REST API, data stored in a local JSON file
- **Frontend:** Plain HTML, CSS, and JavaScript
- **Server:** Node.js; serves frontend pages and proxies API requests to Flask

## Current Version Demo Video

![Demo Video](https://github.com/user-attachments/assets/8abf5eff-dcb3-4b5a-b141-bf4cdfd2060c)

## Features (Sprint 1)

- Landing page with app introduction
- 3-step onboarding guide for first-time users
- Add a new habit with name, frequency, and duration
- Dashboard displaying all habits with progress bars
- Edit habits via a modal popup
- Alternating habit card colors, familiar UI icons (IH#4)
- Back-out confirmation when leaving an unsaved form (IH#5)
- Validation with red error messages on required fields (IH#8)
- Greyed-out placeholders for Sprint 2 features (category, mark complete, delete)

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

Open **http://localhost:3000** in your browser.

## Project Structure
```
Assignment_5/
├── backend/
│   ├── app.py            Flask REST API
│   ├── habits.json       Auto-generated habit data store
│   └── requirements.txt  Python dependencies
└── frontend/
├── server.js         Node.js static server + API proxy
└── public/
├── index.html        Landing page
├── onboarding.html   3-step onboarding
├── onboarding.js
├── dashboard.html    Main habit list
├── dashboard.js
├── addHabit.html     Add habit form
├── add-habit.js
└── style.css         All visual styles
```
## Inclusivity Heuristics Reflected
| # | Heuristic | Where |
|---|-----------|-------|
| 1 | Explain benefits | Landing page, onboarding step 1 |
| 2 | Explain costs | "60 seconds" notice, privacy statement |
| 3 | Info control | Optional feature sidebar, completed section |
| 4 | Familiar features | + icon, chevron, progress bar |
| 5 | Undo/backtracking | Back-out confirmation modal |
| 6 | Explicit path | 3-step onboarding with progress bar |
| 7 | Multiple approaches | Three ways to reach Add Habit |
| 8 | Mindful tinkering | Required fields, red errors, modal warning |
---

## Sprint 2 (Upcoming)

- User authentication (Login / Create Account)
- Category selection for habits
- Mark Complete functionality
- Delete confirmation and undo
- Category filter on dashboard
- Habit streaks
- Search
