// Hunter B. Franklin
// CS361-400, Spring 2026

// Assignment #5: Main Program Implementation
// State: Sprint #1 implemented
// Due: 05/04/2026

// Computation for goal count based on frequency vs. duration:
function getGoalTotal(frequency, duration) {
  const map = {
    "hourly":  { "1 day": 24,  "1 week": 168, "1 month": 720, "1 year": 8760 },
    "daily":   { "1 day": 1,   "1 week": 7,   "1 month": 30,  "1 year": 365  },
    "weekly":  { "1 day": 1,   "1 week": 1,   "1 month": 4,   "1 year": 52   },
    "monthly": { "1 day": 1,   "1 week": 1,   "1 month": 1,   "1 year": 12   },
  };

  if (map[frequency] && map[frequency][duration]) {
    return map[frequency][duration];
  }

  // Custom value: try to parse a number from the duration string, fallback to 30.
  return parseInt(duration) || 30;
}

// Dashboard load and render all habits.
async function loadDashboard() {
  document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });

  const response = await fetch("/habits");
  const habits   = await response.json();

  const list    = document.getElementById("habit-list");
  const emptyEl = document.getElementById("empty-state");
  const bar     = document.getElementById("daily-bar");
  const countEl = document.getElementById("daily-count");

  list.innerHTML = "";

  if (habits.length === 0) {
    emptyEl.hidden = false;
    list.hidden    = true;
  } else {
    emptyEl.hidden = true;
    list.hidden    = false;

    habits.forEach(habit => {
      const li = document.createElement("li");
      li.className = "habit-card";

      // Calculation for goal.
      const goalTotal   = getGoalTotal(habit.frequency, habit.duration);
      const currentProg = 0; // To be implemented.

      li.innerHTML = `
        <div class="habit-card-info">
          <span class="habit-name">${habit.name}</span>
          <span class="habit-meta">${habit.frequency} &bull; ${habit.duration}</span>
          <div class="habit-progress-row">
            <progress class="habit-progress-bar" value="${currentProg}" max="${goalTotal}"></progress>
            <span class="habit-progress-label">${currentProg} of ${goalTotal}</span>
          </div>
        </div>
        <div class="habit-card-actions">
          <button class="btn-complete" disabled title="Coming Sprint 2">&#10003; Complete</button>
          <button class="btn-delete" disabled title="Coming Sprint 2">Delete</button>
        </div>
        <span class="chevron" onclick="event.stopPropagation(); openEditModal('${habit.id}')">&rsaquo;</span>
      `; // Habit card HTML addition after complications, TS addition.

      list.appendChild(li);
    });

    bar.max   = habits.length;
    bar.value = 0;
    countEl.textContent = "0 of " + habits.length;
  }
}

// Edit modal full functionality.
let habitCache = [];

async function openEditModal(habitId) {
  const response = await fetch("/habits");
  habitCache = await response.json();

  const habit = habitCache.find(h => h.id === habitId);
  if (!habit) return;

  document.getElementById("modal-id").value   = habit.id;
  document.getElementById("modal-name").value = habit.name;

  // Frequency: set dropdown, show custom input if needed.
  const freqSelect   = document.getElementById("modal-frequency");
  const freqCustomEl = document.getElementById("modal-frequency-custom");
  const knownFreqs   = ["hourly", "daily", "weekly", "monthly"];

  if (knownFreqs.includes(habit.frequency)) {
    freqSelect.value = habit.frequency;
    freqCustomEl.setAttribute("hidden", "");
    freqCustomEl.value = "";
  } else {
    freqSelect.value   = "custom";
    freqCustomEl.removeAttribute("hidden");
    freqCustomEl.value = habit.frequency;
  }

  // Duration: set dropdown, show custom input if needed.
  const durSelect   = document.getElementById("modal-duration");
  const durCustomEl = document.getElementById("modal-duration-custom");
  const knownDurs   = ["1 day", "1 week", "1 month", "1 year"];

  if (knownDurs.includes(habit.duration)) {
    durSelect.value = habit.duration;
    durCustomEl.setAttribute("hidden", "");
    durCustomEl.value = "";
  } else {
    durSelect.value   = "custom";
    durCustomEl.removeAttribute("hidden");
    durCustomEl.value = habit.duration;
  }

  document.getElementById("modal-json").textContent = JSON.stringify(habit, null, 2);
  document.getElementById("modal-error").hidden = true;
  document.getElementById("edit-modal-overlay").hidden = false;
}

function closeEditModal() {
  document.getElementById("edit-modal-overlay").hidden = true;
}

// Show/hide custom frequency input when dropdown changes.
function toggleCustomFreq() {
  const select   = document.getElementById("modal-frequency");
  const customEl = document.getElementById("modal-frequency-custom");
  if (select.value === "custom") {
    customEl.removeAttribute("hidden");
  } else {
    customEl.setAttribute("hidden", "");
    customEl.value = "";
  }
}

// Show/hide custom duration input when dropdown changes.
function toggleCustomDuration() {
  const select   = document.getElementById("modal-duration");
  const customEl = document.getElementById("modal-duration-custom");
  if (select.value === "custom") {
    customEl.removeAttribute("hidden");
  } else {
    customEl.setAttribute("hidden", "");
    customEl.value = "";
  }
}

// Edit modal saving and updating of the JSON file.
async function saveEditModal() {
  const id      = document.getElementById("modal-id").value;
  const name    = document.getElementById("modal-name").value.trim();
  const errorEl = document.getElementById("modal-error");

  // Read frequency: custom text or dropdown value.
  const freqCustomEl = document.getElementById("modal-frequency-custom");
  const frequency = !freqCustomEl.hasAttribute("hidden")
    ? freqCustomEl.value.trim()
    : document.getElementById("modal-frequency").value;

  // Read duration: custom text or dropdown value.
  const durCustomEl = document.getElementById("modal-duration-custom");
  const duration = !durCustomEl.hasAttribute("hidden")
    ? durCustomEl.value.trim()
    : document.getElementById("modal-duration").value;

  if (!name) {
    errorEl.textContent = "Habit name is required.";
    errorEl.hidden = false;
    return;
  } // Error pop-up.

  errorEl.hidden = true;

  // PUT request (category exlcuded currently) for Flask JSON:
  const response = await fetch("/habits/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, frequency, duration }),
  });

  if (response.ok) {
    closeEditModal();
    loadDashboard();
  } else {
    const data = await response.json();
    errorEl.textContent = data.error || "Something went wrong.";
    errorEl.hidden = false; // Similar to other behavior that has been commented.
  }
}

// Runs page on load.
window.onload = function () {
  loadDashboard();
};