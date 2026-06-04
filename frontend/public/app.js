// Hunter B. Franklin
// CS361-400, Spring 2026
// Assignment #9: Main Program, Big Pool Implementation
// Date: 06/03/2026

// Config (strict JS & base path):
"use strict";
const API = "/api";

// View Router (lists all view IDs in the app):
const VIEWS = ["startup", "onboarding", "dashboard", "add-habit"];

// Hides all views besides the one matching the given name (ID).
function showView(name) {
  VIEWS.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.hidden = (v !== name);
  }); // True for every view that doesn't match.
}

// Fetch wrapper (for correct headers and object returns):
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// Global state object (all values for all functions, for visibility):
const state = {
  habits:           [], 
  selectedFreq:     "daily",
  selectedDuration: "1 month",
  obFreq:           "daily",  
  obDuration:       "1 month",
  obStep:           1,        
  formDirty:        false,   
};

// Start-up View (picks motivational quote, attaches click handlers for two buttons):
function initStartup() {
  const quotes = [
    '"We are a product of what we repeatedly do."',
    '"It does not matter how slowly you go as long as you do not stop." — Confucius',
    '"Motivation is what gets you started. Habit is what keeps you going."',
  ]; // Where microservice will be implemented.
  const el = document.getElementById("startup-motivational");
  if (el) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  document.getElementById("btn-startup-login")?.addEventListener("click", async () => {
    await checkOnboarding();
  });
  document.getElementById("btn-startup-new")?.addEventListener("click", async () => {
    await checkOnboarding();
  });
}

// Asks Flask if it's the User's first launch (login microservice to be implemented):
async function checkOnboarding() {
  const { ok, data } = await apiFetch("/onboarding/status");
  if (ok && data.first_launch) {
    initOnboarding();
    showView("onboarding");
  } else {
    await loadDashboard();
    showView("dashboard");
  }
}

// Onboarding View (Story #2) (sets onboarding step back to 1, sets up directionals,
// and click handlers. Binds frequency and duration buttons for saving):
function initOnboarding() {
  state.obStep = 1;
  renderOnboardingStep();

  document.getElementById("btn-ob-next")?.addEventListener("click", onboardingNext);
  document.getElementById("btn-ob-back")?.addEventListener("click", onboardingBack);
  document.getElementById("btn-ob-dashboard")?.addEventListener("click", async () => {
    await apiFetch("/onboarding/complete", { method: "POST" });
    await loadDashboard();
    showView("dashboard");
  }); // Dashboard button onlys shows on Step 3.

  bindToggleButtons("#onboarding-step-2 .freq-btn", (val) => (state.obFreq     = val));
  bindToggleButtons("#onboarding-step-2 .dur-btn",  (val) => (state.obDuration = val));
} // Button binding for saving status.

function renderOnboardingStep() {
  [1, 2, 3].forEach((n) => {
    const el = document.getElementById(`onboarding-step-${n}`);
    if (el) el.hidden = (n !== state.obStep);
  }); // Shows current step div only, updates footer handling.

  const progress = document.getElementById("onboarding-progress");
  const label    = document.getElementById("onboarding-step-label");
  const nextBtn  = document.getElementById("btn-ob-next");
  const dashBtn  = document.getElementById("btn-ob-dashboard");

  // Progress bar updates (to be properly implemented).
  if (progress) progress.value = state.obStep;
  if (label)    label.textContent = `Step ${state.obStep} of 3`;
  if (nextBtn)  nextBtn.hidden = (state.obStep === 3);
  if (dashBtn)  dashBtn.hidden = (state.obStep !== 3);
}

// Handles next button during onboarding.
async function onboardingNext() {
  if (state.obStep === 2) {
    const saved = await submitOnboardingHabit();
    if (!saved) return;
  }
  if (state.obStep < 3) {
    state.obStep++;
    renderOnboardingStep();
  }
}

// Handles back button during onboarding.
function onboardingBack() {
  if (state.obStep > 1) {
    state.obStep--;
    renderOnboardingStep();
  }
}

// POST request for adding the onboarding habit to the habit list on dash.
async function submitOnboardingHabit() {
  const name     = document.getElementById("ob-habit-name")?.value.trim();
  const category = document.getElementById("ob-category")?.value;
  const unit     = document.getElementById("ob-unit")?.value;
  const start    = document.getElementById("ob-start-tracker")?.value;
  const errEl    = document.getElementById("ob-error-msg");

  const { ok, data } = await apiFetch("/habits", {
    method: "POST",
    body: JSON.stringify({
      name,
      category,
      frequency:     state.obFreq,
      goal_duration: state.obDuration,
      unit,
      start_tracker: parseInt(start || "0", 10),
    }),
  });

  if (!ok) {
    if (errEl) {
      errEl.textContent = data.messages ? data.messages.join(" ") : "Please fix errors above.";
      errEl.hidden = false;
    }
    return false;
  }

  if (errEl) errEl.hidden = true;
  return true; // Same aforementioned handling of the request.
}

// Dashboard View (Story #3):
async function loadDashboard() {
  const { ok, data } = await apiFetch("/habits");
  if (!ok) return;

  state.habits = data.habits || [];
  renderDashboard();
}

// Builds dashboard UI from current state.habits generated array. Shows
// empty state (if there are no habits added).
// To be implemented: Separates habits into active and completed, and
// updates progress bar.
function renderDashboard() {
  const dateEl = document.getElementById("nav-date");
  if (dateEl) dateEl.textContent = formatDate(new Date());

  const habits    = state.habits;
  // To be fully implemented, completion split.
  const active    = habits.filter((h) => !h.completed_today);
  const completed = habits.filter((h) =>  h.completed_today);

  const listEl    = document.getElementById("habit-list");
  const emptyEl   = document.getElementById("dashboard-empty");
  const compSect  = document.getElementById("completed-section");

  // Initialization.
  if (listEl)   listEl.innerHTML   = "";
  if (emptyEl)  emptyEl.hidden     = habits.length > 0;
  if (listEl)   listEl.hidden      = habits.length === 0;

  // Builds and appends a card element for each active habit.
  active.forEach((habit) => {
    if (listEl) listEl.appendChild(buildHabitCard(habit));
  });

  // Only displays completed section if one habit is done today.
  if (compSect) compSect.hidden = completed.length === 0;
  const compList = document.getElementById("completed-list");
  if (compList) {
    compList.innerHTML = "";
    completed.forEach((habit) => compList.appendChild(buildHabitCard(habit, true)));
  }

  // Daily progress bar updating (to be implemented).
  const totalHabits     = habits.length;
  const completedCount  = completed.length;
  const bar   = document.getElementById("daily-progress-bar");
  const label = document.getElementById("daily-progress-label");
  if (bar)   { bar.max = totalHabits || 1; bar.value = completedCount; }
  if (label)  label.textContent = `${completedCount} of ${totalHabits}`;

  // * Placeholder: To be replaced by Quote Generator Microservice:
  const quotes = [
    '"It does not matter how slowly you go as long as you do not stop." — Confucius',
    '"Small steps every day lead to big results."',
  ];
  const quoteEl = document.getElementById("empty-quote");
  if (quoteEl) quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

// Builds and returns a single habit card element using <template> tag in HTML.
function buildHabitCard(habit, isCompleted = false) {
  const tmpl = document.getElementById("tmpl-habit-card");
  const card = tmpl.content.cloneNode(true).querySelector(".habit-card");

  // Stores habit id on element for delete and complete (to be implemented).
  card.dataset.id = habit.id;
  if (isCompleted) card.classList.add("is-completed");

  card.querySelector(".habit-card-name").textContent  = habit.name;
  card.querySelector(".habit-card-desc").textContent  =
    `${habit.frequency} — ${habit.goal_duration}${habit.unit ? " (" + habit.unit + ")" : ""}`;

  // For progress bar range and value.
  const progress = card.querySelector(".habit-card-progress");
  progress.max   = habit.goal_total  || 1;
  progress.value = habit.progress    || 0;

  card.querySelector(".habit-card-progress-label").textContent =
    `${habit.progress || 0} of ${habit.goal_total || 1}`;

  card.querySelector(".btn-habit-chevron").addEventListener("click", () => {
    console.log("Habit detail:", habit.id);
  }); // Chevron is clickable for habit details.

  // Checks checkbox (to be implemented).
  const checkbox = card.querySelector(".habit-select");
  checkbox.checked = isCompleted;
  checkbox.addEventListener("change", async () => {
    await apiFetch(`/habits/${habit.id}/complete`, { method: "POST" });
    await loadDashboard();
  });

  return card;
}

// Add Habit View (Story #1) (resets the form, sets the date, binds the buttons, 
// and sets up the back button / form submission handlers):
function initAddHabit() {
  state.formDirty = false;

  const dateEl = document.getElementById("add-nav-date");
  if (dateEl) dateEl.textContent = formatDate(new Date());

  // Button binds for status updates after clicking:
  bindToggleButtons("#add-habit-form .freq-btn", (val) => { state.selectedFreq = val; });
  bindToggleButtons("#add-habit-form .dur-btn",  (val) => { state.selectedDuration = val; });

  // Marks form as having unsaved changes for modals (to be implemented):
  document.getElementById("add-habit-form")?.addEventListener("input", () => {
    state.formDirty = true;
  });

  // Displays confirmation options when form has unsaved changes (to be implemented):
  document.getElementById("btn-add-back")?.addEventListener("click", () => {
    if (state.formDirty) {
      document.getElementById("modal-back-confirm")?.showModal();
    } else {
      showView("dashboard");
    }
  });

  // Back modal (to be implemented):
  document.getElementById("btn-modal-yes")?.addEventListener("click", () => {
    document.getElementById("modal-back-confirm")?.close();
    state.formDirty = false;
    showView("dashboard");
  });

  // Return to habit modal (to be implemented):
  document.getElementById("btn-modal-no")?.addEventListener("click", () => {
    document.getElementById("modal-back-confirm")?.close();
  });

  // Full form submission:
  document.getElementById("add-habit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveHabit();
  });
}

// Reads the Add Habit form, sends to Flask (for JSON storage) and navigates to dash.
async function saveHabit() {
  const name     = document.getElementById("add-habit-name")?.value.trim();
  const category = document.getElementById("add-category")?.value;
  const unit     = document.getElementById("add-unit")?.value;
  const start    = document.getElementById("add-start-tracker")?.value;
  const errEl    = document.getElementById("add-error-msg");

  const { ok, data } = await apiFetch("/habits", {
    method: "POST",
    body: JSON.stringify({
      name,
      category,
      frequency:     state.selectedFreq,
      goal_duration: state.selectedDuration,
      unit,
      start_tracker: parseInt(start || "0", 10),
    }),
  });

  if (!ok) {
    if (errEl) {
      errEl.textContent = data.messages ? data.messages.join(" ") : "Please fix errors.";
      errEl.hidden = false;
    }
    return;
  }

  // Clears error, resets the dirty flag, reloads/shows dashboard.
  if (errEl) errEl.hidden = true;
  state.formDirty = false;
  document.getElementById("add-habit-form")?.reset();
  await loadDashboard();
  showView("dashboard");
}

// Toggle Group Buttons (shared) (used to cahnge CSS active state for coloration):
function bindToggleButtons(selector, onChange) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(selector).forEach((b) => b.removeAttribute("data-active"));
      btn.setAttribute("data-active", "true");
      onChange(btn.dataset.value);
    });
  });
}

// Bindings For Dashboard Nav. Events (to be implemented fully (2/4 present)):
function bindDashboardNav() {
  const goAdd = () => {
    initAddHabit();
    showView("add-habit");
  };
  document.getElementById("btn-nav-add-icon")?.addEventListener("click", goAdd);
  document.getElementById("btn-nav-add")?.     addEventListener("click", goAdd);
  document.getElementById("btn-empty-add")?.   addEventListener("click", goAdd);
  document.getElementById("btn-fab-add")?.     addEventListener("click", goAdd);

  // Delete Selected Habits (to be implemented):
  document.getElementById("btn-nav-delete")?.addEventListener("click", async () => {
    const checked = document.querySelectorAll(".habit-select:checked");
    for (const cb of checked) {
      const id = cb.closest(".habit-card")?.dataset.id;
      if (id) await apiFetch(`/habits/${id}`, { method: "DELETE" });
    }
    await loadDashboard();
  });
}

// Utility (JS date object -> readable string):
function formatDate(d) {
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// Boot (runs once DOm is loaded, initializes start-up, binds nav buttons,
// shows start-up first):
document.addEventListener("DOMContentLoaded", () => {
  initStartup();
  bindDashboardNav();
  showView("startup");
});