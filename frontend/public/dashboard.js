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

// Module-level state: persists across renderHabits() calls without re-fetching.
let allHabits         = [];   // Full habit list from the server.
let activeCategory    = "All"; // Currently selected category filter tab.
let searchQuery       = "";    // Live search string from the search bar.
let pendingDeleteId   = null;  // Habit id waiting in the delete confirmation modal.
let pendingDeleteName = "";    // Habit name shown in the delete modal.

// Dashboard load: fetches habits and kicks off microservice calls per card.
async function loadDashboard() {
  document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
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
  allHabits = await response.json();

  renderHabits();
}

// Renders only the cards that match the active category + search query.
// Called by loadDashboard(), filterHabits(), and selectCategory() so all three
// paths go through the same logic without re-fetching from the server.
function renderHabits() {
  const list    = document.getElementById("habit-list");
  const emptyEl = document.getElementById("empty-state");
  const bar     = document.getElementById("daily-bar");
  const countEl = document.getElementById("daily-count");

  list.innerHTML = "";

  // Filter by category first, then narrow by search query.
  let visible = allHabits;
  if (activeCategory !== "All") {
    visible = visible.filter(h => (h.category || "Other") === activeCategory);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    visible = visible.filter(h => h.name.toLowerCase().includes(q));
  }

  if (allHabits.length === 0) {
    emptyEl.hidden = false;
    list.hidden    = true;
    bar.max   = 1;
    bar.value = 0;
    countEl.textContent = "0 of 0";
    return;
  }

  emptyEl.hidden = true;
  list.hidden    = false;

  // Daily progress counts the full unfiltered list so the bar stays accurate.
  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  let completedToday = 0;
  allHabits.forEach(h => {
    if ((h.completions || []).some(c => c.timestamp.startsWith(today))) completedToday++;
  });
  bar.max   = allHabits.length;
  bar.value = completedToday;
  countEl.textContent = `${completedToday} of ${allHabits.length}`;

  // Soft "no results" message when search/filter produces an empty visible set.
  if (visible.length === 0) {
    const li = document.createElement("li");
    li.className   = "no-results";
    li.textContent = "No habits match your search.";
    list.appendChild(li);
    return;
  }

  visible.forEach(habit => {
    const li = document.createElement("li");
    li.className  = "habit-card";
    li.dataset.id = habit.id;

    // Calculation for goal.
    const goalTotal   = getGoalTotal(habit.frequency, habit.duration);
    const currentProg = (habit.completions || []).length;
    const percent     = goalTotal > 0 ? Math.round((currentProg / goalTotal) * 100) : 0;

    // Check if already completed today using local date (avoids UTC offset mismatches).
    const doneToday = (habit.completions || []).some(c => c.timestamp.startsWith(today));
    const categoryLabel = habit.category || "";

    // Habit card HTML. Microservice fields (streak, next due, overdue, status)
    // start with placeholder values and are populated asynchronously below.
    li.innerHTML = `
      <div class="habit-card-info">
        <div class="habit-card-top-row">
          <span class="habit-name">${habit.name}</span>
          <span class="badge-overdue" id="overdue-${habit.id}" hidden>OVERDUE</span>
        </div>
        <span class="habit-meta">${habit.frequency} &bull; ${habit.duration}${categoryLabel ? " &bull; " + categoryLabel : ""}</span>
        <div class="habit-microservice-row">
          <span class="badge-streak"  id="streak-${habit.id}">🔥 —</span>
          <span class="badge-nextdue" id="nextdue-${habit.id}">Next due: —</span>
          <span class="badge-status"  id="status-${habit.id}">—</span>
        </div>
        <div class="habit-progress-row">
          <progress class="habit-progress-bar" id="progress-bar-${habit.id}" value="${currentProg}" max="${goalTotal}"></progress>
          <span class="habit-progress-label" id="progress-label-${habit.id}">${currentProg} of ${goalTotal} (${percent}%)</span>
        </div>
      </div>
      <div class="habit-card-actions">
        <button class="btn-complete ${doneToday ? "btn-complete-done" : ""}"
          id="btn-complete-${habit.id}"
          onclick="markDone('${habit.id}')" ${doneToday ? "disabled" : ""}>
          ${doneToday ? "✓ Done" : "✓ Complete"}
        </button>
        ${doneToday ? `<button class="btn-undo-complete" onclick="undoComplete('${habit.id}')">Undo</button>` : ""}
        <button class="btn-delete" onclick="openDeleteModal('${habit.id}', '${habit.name.replace(/'/g, "\\'")}')">Delete</button>
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
}

// Called by oninput on the search bar — updates query state and re-renders.
function filterHabits(value) {
  searchQuery = value;
  renderHabits();
}

// Called when a category tab is clicked — updates active tab and re-renders.
function selectCategory(btn) {
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeCategory = btn.dataset.cat;
  renderHabits();
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
// Updates the progress bar, count label (X of Y (Z%)), and status badge on the card.
async function fetchProgressData(habitId, goalTotal) {
  try {
    const res  = await fetch(`/api/habits/${habitId}/progress`, { method: "POST" });
    const data = await res.json();

    const barEl    = document.getElementById(`progress-bar-${habitId}`);
    const labelEl  = document.getElementById(`progress-label-${habitId}`);
    const statusEl = document.getElementById(`status-${habitId}`);

    const pct = data.percent_complete != null ? Math.round(data.percent_complete) : 0;
    if (barEl)   { barEl.max = data.target || goalTotal; barEl.value = data.current || 0; }
    if (labelEl)  labelEl.textContent = `${data.current || 0} of ${data.target || goalTotal} (${pct}%)`;
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

// Removes today's completion only — will not roll back any earlier entries.
async function undoComplete(habitId) {
  const res = await fetch(`/habits/${habitId}/undo_done`, { method: "PATCH" });
  if (res.ok) loadDashboard();
}

// Delete confirmation modal:

function openDeleteModal(habitId, habitName) {
  pendingDeleteId   = habitId;
  pendingDeleteName = habitName;
  document.getElementById("delete-modal-name").textContent = `"${habitName}"`;
  document.getElementById("delete-modal-overlay").hidden = false;
}

function closeDeleteModal() {
  document.getElementById("delete-modal-overlay").hidden = true;
  pendingDeleteId = null;
}

// Moves the habit to deleted_habits.json on the backend, then starts the
async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  await fetch(`/habits/${id}`, { method: "DELETE" });
  loadDashboard();
}

// Undo delete toast:

function startUndoTimer(habitName) {
  clearInterval(undoTimer);
  undoSecondsLeft = 20;

  const toast       = document.getElementById("undo-toast");
  const msgEl       = document.getElementById("undo-toast-msg");
  const countdownEl = document.getElementById("undo-countdown");

  msgEl.textContent       = `"${habitName}" deleted.`;
  countdownEl.textContent = `${undoSecondsLeft}s`;
  toast.hidden            = false;

  undoTimer = setInterval(() => {
    undoSecondsLeft--;
    countdownEl.textContent = `${undoSecondsLeft}s`;
    if (undoSecondsLeft <= 0) {
      clearInterval(undoTimer);
      toast.hidden = true;
      undoDeleteId = null;
    }
  }, 1000);
}

// Restores the last deleted habit from deleted_habits.json within the 20s window.
async function undoDelete() {
  if (!undoDeleteId) return;
  clearInterval(undoTimer);
  document.getElementById("undo-toast").hidden = true;
  await fetch(`/habits/${undoDeleteId}/restore`, { method: "POST" });
  undoDeleteId = null;
  loadDashboard();
}

// Trash panel:

// Toggles the deleted habits side drawer open or closed.
async function toggleTrash() {
  const panel = document.getElementById("trash-panel");
  if (!panel.hidden) {
    panel.hidden = true;
    return;
  }
  await refreshTrashPanel();
  panel.hidden = false;
}

async function refreshTrashPanel() {
  const res     = await fetch("/deleted_habits");
  const deleted = await res.json();
  const list    = document.getElementById("trash-list");
  const emptyEl = document.getElementById("trash-empty");
  list.innerHTML = "";

  if (deleted.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  deleted.forEach(habit => {
    const li = document.createElement("li");
    li.className = "trash-item";
    li.innerHTML = `
      <span class="trash-item-name">${habit.name}</span>
      <span class="trash-item-meta">${habit.category || ""} &bull; ${habit.frequency}</span>
      <button class="btn-restore" onclick="restoreFromTrash('${habit.id}')">Restore</button>
    `;
    list.appendChild(li);
  });
}

// Restores a habit from the trash panel back into the active habit list.
async function restoreFromTrash(habitId) {
  await fetch(`/habits/${habitId}/restore`, { method: "POST" });
  await refreshTrashPanel();
  loadDashboard();
}

// Edit modal:

let habitCache = [];

async function openEditModal(habitId) {
  const response = await fetch("/habits");
  habitCache = await response.json();

  const habit = habitCache.find(h => h.id === habitId);
  if (!habit) return;

  document.getElementById("modal-id").value        = habit.id;
  document.getElementById("modal-name").value      = habit.name;
  document.getElementById("modal-category").value  = habit.category || "";

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
  const id       = document.getElementById("modal-id").value;
  const name     = document.getElementById("modal-name").value.trim();
  const category = document.getElementById("modal-category").value;
  const errorEl  = document.getElementById("modal-error");

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
  }

  errorEl.hidden = true;

  // PUT request for Flask JSON:
  const response = await fetch("/habits/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, frequency, duration, category }),
  });

  if (response.ok) {
    closeEditModal();
    loadDashboard();
  } else {
    const data = await response.json();
    errorEl.textContent = data.error || "Something went wrong.";
    errorEl.hidden = false;
  }
}

// Tooltip overlay:

// Shows icon labels when the ? button is hovered.
// Toggles icon label overlay on ? button click.
// Toggles icon label overlay on ? button click. Closes when clicking outside.
function toggleTooltips() {
  const el = document.getElementById("tooltip-overlay");
  el.hidden = !el.hidden;
}

document.addEventListener("click", function(e) {
  const tooltip = document.getElementById("tooltip-overlay");
  const helpBtn = document.getElementById("btn-help");
  if (!tooltip.hidden && !tooltip.contains(e.target) && e.target !== helpBtn) {
    tooltip.hidden = true;
  }
});

// Runs page on load.
window.onload = function () {
  loadDashboard();
};