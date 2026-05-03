# Hunter B. Franklin
# CS361-400, Spring 2026

# Assignment #5: Main Program Implementation
# State: Sprint #1 implemented
# Due: 05/04/2026

# Flask: framework that lets us define URL routes,
# jsonify: converts Python dicts/lists into JSON responses,
# request: lets us read data sent from the frontend.
from flask import Flask, jsonify, request

# CORS: allows the frontend (port 3000) to talk to this server (port 5001).
from flask_cors import CORS
import json
import os
import uuid

# Create the Flask app and apply CORS.
app = Flask(__name__)
CORS(app)

# This file is created automatically the first time a habit is saved.
DATA_FILE = "habits.json"

# Helpers (reading and writing of habit data):
def read_habits():
    # If the file doesn't exist yet, return an empty list.
    if not os.path.exists(DATA_FILE):
        return []
    # Open the file and parse the JSON text into a Python list
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def write_habits(habits):
    # Convert the Python list back into JSON text and save it to the file.
    # indent=2 makes the file human-readable with indentation.
    with open(DATA_FILE, "w") as f:
        json.dump(habits, f, indent=2)

# ---------------------------------------------------------------------------
# Routes
# A "route" is a URL path that the server listens for.
# The @app.route decorator tells Flask which function to run for each URL.
# ---------------------------------------------------------------------------

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

    # Same check for category (to be implemented).
    # if not data.get("category") or data["category"].strip() == "":
    #     return jsonify({"error": "Category is required."}), 400

    # Build the new habit object:
    new_habit = {
        "id":        str(uuid.uuid4()),        # Random unique ID so we can find it later
        "name":      data["name"].strip(),
        # "category":  data["category"].strip(), # To be implemented.
        "frequency": data.get("frequency", "daily"),
        "duration":  data.get("duration", "1 month"),
        "done":      False                     
    }
    habits = read_habits()
    habits.append(new_habit)
    write_habits(habits)
    return jsonify(new_habit), 201


# DELETE /habits/<habit_id>:
# Called when the user clicks the Delete button on a habit card.
# <habit_id> is pulled automatically from the URL by Flask.
# To be implemented:
@app.route("/habits/<habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    habits = read_habits()

    # Rebuild the list keeping every habit EXCEPT the one with the matching id:
    habits = [h for h in habits if h["id"] != habit_id]
    write_habits(habits)
    return jsonify({"message": "Deleted."})


# PUT /habits/<habit_id>:
# Called when the user edits a habit in the edit modal on the dashboard.
# Updates name, frequency, and duration for the matching habit.
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
            write_habits(habits)
            return jsonify(habit)

    return jsonify({"error": "Habit not found."}), 404

# PATCH /habits/<habit_id>/done:
# Marks a single habit as completed for today.
# To be implemented:
@app.route("/habits/<habit_id>/done", methods=["PATCH"])
def mark_done(habit_id):
    habits = read_habits()

    # Loop through all habits to find the one with the matching id:
    for habit in habits:
        if habit["id"] == habit_id:
            habit["done"] = True 
            write_habits(habits)
            return jsonify(habit) 

    return jsonify({"error": "Habit not found."}), 404


# Start the server:
if __name__ == "__main__":
    app.run(debug=True, port=5001)