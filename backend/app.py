# Hunter B. Franklin
# CS361-400, Spring 2026
# Assignment #9: Main Program, Big Pool Implementation
# Date: 06/03/2026

# Flask: framework that lets us define URL routes,
# jsonify: converts Python dicts/lists into JSON responses,
# request: lets us read data sent from the frontend.
from flask import Flask, jsonify, request

# CORS: allows the frontend (port 3000) to talk to this server (port 5001).
from flask_cors import CORS
import json
import os
import uuid

# urllib: used to call the four microservices over HTTP without third-party libs.
import urllib.request
import urllib.parse
import urllib.error

# date: used to stamp start_date and completion timestamps.
from datetime import date

# Create the Flask app and apply CORS.
app = Flask(__name__)
CORS(app)

# habits.json is created automatically the first time a habit is saved.
# deleted_habits.json holds soft-deleted habits for the trash panel and undo toast.
DATA_FILE    = "habits.json"
DELETED_FILE = "deleted_habits.json"

# Microservice base URLs (each runs in its own process on a separate port):
PROGRESS_URL = "http://localhost:3006"  # progress-calculator
STREAK_URL   = "http://localhost:3004"  # streak-calculator
REMINDER_URL = "http://localhost:3002"  # reminder-service
QUOTE_URL    = "http://localhost:3001"  # random-quote-generator

def read_habits():
    # If the file doesn't exist yet, return an empty list.
    if not os.path.exists(DATA_FILE):
        return []
    # Open the file and parse the JSON text into a Python list.
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def write_habits(habits):
    # Convert the Python list back into JSON text and save it to the file.
    # indent=2 makes the file human-readable with indentation.
    with open(DATA_FILE, "w") as f:
        json.dump(habits, f, indent=2)

def read_deleted():
    # If the trash file doesn't exist yet, return an empty list.
    if not os.path.exists(DELETED_FILE):
        return []
    with open(DELETED_FILE, "r") as f:
        return json.load(f)

def write_deleted(deleted):
    # Save the deleted habits list back to deleted_habits.json.
    with open(DELETED_FILE, "w") as f:
        json.dump(deleted, f, indent=2)

def goal_total(frequency, duration):
    # Maps frequency + duration to expected completion count.
    # Used by the progress-calculator proxy to set the target value.
    map = {
        "hourly":  {"1 day": 24,  "1 week": 168, "1 month": 720,  "1 year": 8760},
        "daily":   {"1 day": 1,   "1 week": 7,   "1 month": 30,   "1 year": 365},
        "weekly":  {"1 day": 1,   "1 week": 1,   "1 month": 4,    "1 year": 52},
        "monthly": {"1 day": 1,   "1 week": 1,   "1 month": 1,    "1 year": 12},
    }
    freq = frequency.lower()
    if freq in map and duration in map[freq]:
        return map[freq][duration]
    return 30  # Fallback for custom frequencies.

def call_microservice(url, method="GET", body=None):
    # Makes an HTTP request to a microservice and returns parsed JSON.
    # Returns None if the service is unreachable, so callers can fall back gracefully.
    data    = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    req     = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"[microservice error] {url}: {e}")
        return None

# GET /habits:
# Called by the dashboard when it needs to display all habits.
# Returns the full list of habits as JSON.
@app.route("/habits", methods=["GET"])
def get_habits():
    habits = read_habits()
    return jsonify(habits)

# POST /habits:
# Called when the user fills out the Add Habit form and clicks Save.
# Reads the submitted data, validates it, then saves the new habit.
@app.route("/habits", methods=["POST"])
def add_habit():
    data = request.get_json()

    # If name is missing or blank, reject the request with a 400 error.
    if not data.get("name") or data["name"].strip() == "":
        return jsonify({"error": "Habit name is required."}), 400

    # Category validation: required now that the field is live.
    if not data.get("category") or data["category"].strip() == "":
        return jsonify({"error": "Category is required."}), 400

    # Build the new habit object:
    new_habit = {
        "id":          str(uuid.uuid4()),        # Random unique ID so we can find it later.
        "name":        data["name"].strip(),
        "category":    data["category"].strip(), # Stored on every habit going forward.
        "frequency":   data.get("frequency", "daily"),
        "duration":    data.get("duration", "1 month"),
        "start_date":  date.today().isoformat(), # Set once on creation, used by progress-calculator.
        "completions": [],                        # Timestamped history, used by all four microservices.
        "done":        False,
    }
    habits = read_habits()
    habits.append(new_habit)
    write_habits(habits)
    return jsonify(new_habit), 201

# DELETE /habits/<habit_id>:
# Called when the user clicks Delete on a habit card.
# Moves the habit to deleted_habits.json instead of permanently removing it,
# so the trash panel and the 20-second undo timer can restore it.
@app.route("/habits/<habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    habits  = read_habits()
    deleted = read_deleted()

    # Find the habit being deleted.
    target = next((h for h in habits if h["id"] == habit_id), None)
    if target:
        deleted.append(target)
        write_deleted(deleted)
        habits = [h for h in habits if h["id"] != habit_id]
        write_habits(habits)

    return jsonify({"message": "Moved to trash."})

# POST /habits/<habit_id>/restore:
# Called by the undo toast (within 20 seconds) or the trash panel restore button.
# Moves the habit back from deleted_habits.json to habits.json.
@app.route("/habits/<habit_id>/restore", methods=["POST"])
def restore_habit(habit_id):
    deleted = read_deleted()
    habits  = read_habits()

    target = next((h for h in deleted if h["id"] == habit_id), None)
    if not target:
        return jsonify({"error": "Habit not found in trash."}), 404

    habits.append(target)
    deleted = [h for h in deleted if h["id"] != habit_id]
    write_habits(habits)
    write_deleted(deleted)
    return jsonify(target)

# GET /deleted_habits:
# Called by the trash panel on the dashboard to list all soft-deleted habits.
@app.route("/deleted_habits", methods=["GET"])
def get_deleted():
    return jsonify(read_deleted())

# PUT /habits/<habit_id>:
# Called when the user edits a habit in the edit modal on the dashboard.
# Updates name, frequency, duration, and category for the matching habit.
@app.route("/habits/<habit_id>", methods=["PUT"])
def update_habit(habit_id):
    data   = request.get_json()
    habits = read_habits()

    for habit in habits:
        if habit["id"] == habit_id:
            # Name validation:
            if not data.get("name") or data["name"].strip() == "":
                return jsonify({"error": "Habit name is required."}), 400
            habit["name"]      = data["name"].strip()
            habit["frequency"] = data.get("frequency", habit["frequency"])
            habit["duration"]  = data.get("duration",  habit["duration"])
            # Update category if provided; keep existing value if omitted.
            if data.get("category"):
                habit["category"] = data["category"].strip()
            write_habits(habits)
            return jsonify(habit)

    return jsonify({"error": "Habit not found."}), 404

# PATCH /habits/<habit_id>/done:
# Called when the user clicks Complete on a habit card.
# Appends a timestamped entry to completions[] instead of just flipping done:True,
# so streak-calculator, reminder-service, and progress-calculator all have history.
@app.route("/habits/<habit_id>/done", methods=["PATCH"])
def mark_done(habit_id):
    habits = read_habits()

    # Loop through all habits to find the one with the matching id:
    for habit in habits:
        if habit["id"] == habit_id:
            # Ensure legacy habits without completions[] still work.
            if "completions" not in habit:
                habit["completions"] = []
            # Record the completion timestamp (noon UTC avoids date-boundary issues).
            habit["completions"].append({"timestamp": date.today().isoformat() + "T12:00:00.000Z"})
            habit["done"] = True
            write_habits(habits)
            return jsonify(habit)

    return jsonify({"error": "Habit not found."}), 404

# PATCH /habits/<habit_id>/undo_done:
# Called when the user clicks Undo on the completion toast.
# Only removes today's completion entry — will not roll back older completions.
@app.route("/habits/<habit_id>/undo_done", methods=["PATCH"])
def undo_done(habit_id):
    habits = read_habits()
    today  = date.today().isoformat()

    for habit in habits:
        if habit["id"] == habit_id:
            completions = habit.get("completions", [])
            # Remove only entries timestamped today.
            new_completions = [c for c in completions if not c["timestamp"].startswith(today)]
            if len(new_completions) == len(completions):
                return jsonify({"error": "No completion for today to undo."}), 400
            habit["completions"] = new_completions
            # Flip done back to False only if no completions remain for today.
            habit["done"] = any(c["timestamp"].startswith(today) for c in new_completions)
            write_habits(habits)
            return jsonify(habit)

    return jsonify({"error": "Habit not found."}), 404

# GET /api/quote:
# Called by the landing page and dashboard empty state on load.
# Fetches a single random quote from random-quote-generator and returns it.
@app.route("/api/quote", methods=["GET"])
def get_quote():
    result = call_microservice(f"{QUOTE_URL}/quotes/random")
    if result:
        return jsonify(result)
    # Fallback quote if the service is unreachable.
    return jsonify({"quote": "Small steps every day lead to big results.", "author": ""}), 200

# POST /api/habits/<habit_id>/streak:
# Called once per habit card on dashboard load.
# Passes the habit's full completions[] to streak-calculator and returns
# current_streak, longest_streak, and last_active.
@app.route("/api/habits/<habit_id>/streak", methods=["POST"])
def get_streak(habit_id):
    habits = read_habits()
    habit  = next((h for h in habits if h["id"] == habit_id), None)
    if not habit:
        return jsonify({"error": "Habit not found."}), 404

    completions = habit.get("completions", [])
    result = call_microservice(
        f"{STREAK_URL}/streak",
        method="POST",
        body={"events": completions}
    )
    if result:
        return jsonify(result)
    # Fallback if streak-calculator is unreachable.
    return jsonify({"current_streak": 0, "longest_streak": 0, "last_active": None}), 200

# GET /api/habits/<habit_id>/schedule:
# Called once per habit card on dashboard load.
# Uses the habit's frequency and last completion time to determine next_due
# and overdue status via reminder-service.
@app.route("/api/habits/<habit_id>/schedule", methods=["GET"])
def get_schedule(habit_id):
    habits = read_habits()
    habit  = next((h for h in habits if h["id"] == habit_id), None)
    if not habit:
        return jsonify({"error": "Habit not found."}), 404

    completions = habit.get("completions", [])
    frequency   = habit.get("frequency", "daily")
    start_date  = habit.get("start_date", date.today().isoformat())

    if completions:
        # Use last completion time to check overdue status.
        last_completed = completions[-1]["timestamp"]
        url = (
            f"{REMINDER_URL}/schedule/status"
            f"?frequency={urllib.parse.quote(frequency)}"
            f"&last_completed={urllib.parse.quote(last_completed)}"
        )
        result = call_microservice(url)
        if result:
            return jsonify(result)
    else:
        # No completions yet: get next_due from the habit's start date instead.
        result = call_microservice(
            f"{REMINDER_URL}/schedule",
            method="POST",
            body={"frequency": frequency, "start": start_date + "T00:00:00Z"}
        )
        if result:
            return jsonify({"overdue": False, "next_due": result.get("next_due"), "checked_at": date.today().isoformat()})

    return jsonify({"overdue": False, "next_due": None, "checked_at": date.today().isoformat()}), 200

# POST /api/habits/<habit_id>/progress:
# Called once per habit card on dashboard load.
# Sends completion count vs. goal total to progress-calculator and returns
# percent_complete, projected_completion, and status ("on track" / "behind" / "complete").
@app.route("/api/habits/<habit_id>/progress", methods=["POST"])
def get_progress(habit_id):
    habits = read_habits()
    habit  = next((h for h in habits if h["id"] == habit_id), None)
    if not habit:
        return jsonify({"error": "Habit not found."}), 404

    completions  = habit.get("completions", [])
    current      = len(completions)                                               # How many times completed so far.
    target       = goal_total(habit.get("frequency", "daily"), habit.get("duration", "1 month"))  # Expected total.
    start_date   = habit.get("start_date", date.today().isoformat())
    current_date = date.today().isoformat()

    result = call_microservice(
        f"{PROGRESS_URL}/progress",
        method="POST",
        body={
            "target":       target,
            "current":      current,
            "start_date":   start_date,
            "current_date": current_date,
        }
    )
    if result:
        # Attach raw counts so the frontend can display "X of Y" without recalculating.
        result["target"]   = target
        result["current"]  = current
        # Round percent_complete to two decimal places for consistent display.
        if result.get("percent_complete") is not None:
            result["percent_complete"] = round(float(result["percent_complete"]), 2)
        return jsonify(result)
    # Fallback if progress-calculator is unreachable.
    return jsonify({"percent_complete": 0.00, "projected_completion": None, "status": "behind", "target": target, "current": current}), 200

# Start the server:
if __name__ == "__main__":
    app.run(debug=True, port=5001)