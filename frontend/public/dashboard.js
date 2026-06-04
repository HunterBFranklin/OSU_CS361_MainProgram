// Hunter B. Franklin
// CS361-400, Spring 2026
// Assignment #9: Main Program, Big Pool Implementation
// Date: 06/03/2026

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
// Also kicks off one async microservice fetch per habit card after the list renders.
async function loadDashboard() {
  document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });

  // Fetch a live motivational quote from random-quote-generator (via Flask proxy).
  // Updates the empty-state quote if habits haven't been added yet.
  try {
    const qRes  = await fetch("/api/quote");
    const qData = await qRes.json();
    const emptyQuoteEl = document.getElementById("empty-quote");
    if (emptyQuoteEl && qData.quote) {
      const author = qData.author ? ` — ${qData.author}` : "";
      emptyQuoteEl.textContent = `"${qData.quote}"${author}`;
    }
  } catch (e) { /* Keep placeholder text if the service is down. */ }

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
    return;
  } else {
    emptyEl.hidden = true;
    list.hidden    = false;
  }

  // Track how many habits were completed today for the daily progress bar.
  let completedToday = 0;

  habits.forEach(habit => {
    const li = document.createElement("li");
    li.className  = "habit-card";
    li.dataset.id = habit.id;

    // Calculation for goal.
    const goalTotal   = getGoalTotal(habit.frequency, habit.duration);
    const currentProg = (habit.completions || []).length;

    // Check if already completed today using local date (avoids UTC offset mismatches).
    const now       = new Date();
    const today     = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const doneToday = (habit.completions || []).some(c => c.timestamp.startsWith(today));
    if (doneToday) completedToday++;

    // Habit card HTML. Microservice fields (streak, next due, overdue, status)
    // start with placeholder values and are populated asynchronously below.
    li.innerHTML = `
      <div class="habit-card-info">
        <div class="habit-card-top-row">
          <span class="habit-name">${habit.name}</span>
          <span class="badge-overdue" id="overdue-${habit.id}" hidden>OVERDUE</span>
        </div>
        <span class="habit-meta">${habit.frequency} &bull; ${habit.duration}</span>
        <div class="habit-microservice-row">
          <span class="badge-streak"  id="streak-${habit.id}">🔥 —</span>
          <span class="badge-nextdue" id="nextdue-${habit.id}">Next due: —</span>
          <span class="badge-status"  id="status-${habit.id}">—</span>
        </div>
        <div class="habit-progress-row">
          <progress class="habit-progress-bar" id="progress-bar-${habit.id}" value="${currentProg}" max="${goalTotal}"></progress>
          <span class="habit-progress-label" id="progress-label-${habit.id}">${currentProg} of ${goalTotal}</span>
        </div>
      </div>
      <div class="habit-card-actions">
        <button class="btn-complete ${doneToday ? "btn-complete-done" : ""}"
          onclick="markDone('${habit.id}')" ${doneToday ? "disabled" : ""}>
          ${doneToday ? "✓ Done" : "✓ Complete"}
        </button>
        <button class="btn-delete" onclick="deleteHabit('${habit.id}')">Delete</button>
      </div>
      <span class="chevron" onclick="event.stopPropagation(); openEditModal('${habit.id}')">&rsaquo;</span>
    `;

    list.appendChild(li);

    // Fire microservice calls for this card after it's in the DOM.
    // Each runs independently so a slow service doesn't block the others.
    fetchStreakData(habit.id);
    fetchScheduleData(habit.id);
    fetchProgressData(habit.id, goalTotal);
  });

  bar.max   = habits.length;
  bar.value = completedToday;
  countEl.textContent = `${completedToday} of ${habits.length}`;
}

// Fetches streak metrics from streak-calculator (via Flask /api/habits/:id/streak).
// Updates the streak badge on the card once the response arrives.
async function fetchStreakData(habitId) {
  try {
    const res  = await fetch(`/api/habits/${habitId}/streak`, { method: "POST" });
    const data = await res.json();
    const el   = document.getElementById(`streak-${habitId}`);
    if (el) {
      el.textContent = `🔥 ${data.current_streak} day streak (best: ${data.longest_streak})`;
    }
  } catch (e) { /* Service unavailable — leave placeholder. */ }
}

// Fetches overdue status and next due time from reminder-service
// (via Flask /api/habits/:id/schedule).
// Shows the OVERDUE badge and populates the next-due line on the card.
async function fetchScheduleData(habitId) {
  try {
    const res  = await fetch(`/api/habits/${habitId}/schedule`);
    const data = await res.json();

    const overdueEl = document.getElementById(`overdue-${habitId}`);
    const nextDueEl = document.getElementById(`nextdue-${habitId}`);

    // Show or hide the OVERDUE badge based on the service response.
    if (overdueEl) overdueEl.hidden = !data.overdue;

    if (nextDueEl && data.next_due) {
      const nextDue = new Date(data.next_due).toLocaleDateString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      nextDueEl.textContent = `Next due: ${nextDue}`;
    }
  } catch (e) { /* Service unavailable. */ }
}

// Fetches percent complete, status label, and projected completion date from
// progress-calculator (via Flask /api/habits/:id/progress).
// Updates the progress bar, count label, and status badge on the card.
async function fetchProgressData(habitId, goalTotal) {
  try {
    const res  = await fetch(`/api/habits/${habitId}/progress`, { method: "POST" });
    const data = await res.json();

    const barEl    = document.getElementById(`progress-bar-${habitId}`);
    const labelEl  = document.getElementById(`progress-label-${habitId}`);
    const statusEl = document.getElementById(`status-${habitId}`);

    if (barEl)   { barEl.max = data.target || goalTotal; barEl.value = data.current || 0; }
    if (labelEl)  labelEl.textContent = `${data.current || 0} of ${data.target || goalTotal}`;
    if (statusEl) {
      statusEl.textContent = data.status || "—";
      // Apply the correct color class based on status ("on track", "behind", "complete").
      statusEl.className   = `badge-status status-${(data.status || "").replace(" ", "-")}`;
    }
  } catch (e) { /* Service unavailable. */ }
}

// Marks a habit as complete for today and reloads the dashboard.
// PATCH request causes Flask to append a timestamped entry to completions[].
async function markDone(habitId) {
  await fetch(`/habits/${habitId}/done`, { method: "PATCH" });
  loadDashboard();
}

// Deletes a habit and reloads the dashboard.
async function deleteHabit(habitId) {
  await fetch(`/habits/${habitId}`, { method: "DELETE" });
  loadDashboard();
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

  // PUT request (category excluded currently) for Flask JSON:
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