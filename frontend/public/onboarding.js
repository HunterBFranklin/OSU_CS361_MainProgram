// Hunter B. Franklin
// CS361-400, Spring 2026
// Assignment #9: Main Program, Big Pool Implementation
// Date: 06/03/2026

// Step initialization.
let currentStep = 1;

// Global vars for header.
const STEP_TITLES = {
  1: "Welcome to Habit-at!",
  2: "Step 2 of 3: Add Your First Habit",
  3: "Step 3 of 3: Navigating Habit-at",
};

// Onboarding specific step logic.
function showStep(stepNumber) {
  document.getElementById("step-1").hidden = (stepNumber !== 1);
  document.getElementById("step-2").hidden = (stepNumber !== 2);
  document.getElementById("step-3").hidden = (stepNumber !== 3);

  document.getElementById("ob-step-title").textContent = STEP_TITLES[stepNumber];
  document.getElementById("ob-progress-bar").value = stepNumber;
  document.getElementById("btn-back").hidden = (stepNumber === 1);
  const nextBtn = document.getElementById("btn-next");
  nextBtn.textContent = (stepNumber === 3) ? "Dashboard" : "Next \u203a";

  currentStep = stepNumber;
}

// Next button logic.
async function goNext() {
  if (currentStep === 1) {
    showStep(2);

  } else if (currentStep === 2) {
    const saved = await saveOnboardingHabit();
    if (saved) showStep(3);

  } else if (currentStep === 3) {
    localStorage.setItem("onboarding_done", "true");
    window.location.href = "dashboard.html";
  }
}

// Back button logic.
function goBack() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// Saving the added habit in step 2 of onboarding.
async function saveOnboardingHabit() {
  const name     = document.getElementById("ob-name").value.trim();
  const category = document.getElementById("ob-category").value;
  const errorEl  = document.getElementById("ob-error");

  // Read frequency: custom text input or hidden pill value.
  const freqCustomEl = document.getElementById("ob-frequency-custom");
  const frequency = freqCustomEl.hasAttribute("hidden")
    ? document.getElementById("ob-frequency").value
    : freqCustomEl.value.trim();

  // Read duration: custom text input or hidden pill value.
  const durCustomEl = document.getElementById("ob-duration-custom");
  const duration = durCustomEl.hasAttribute("hidden")
    ? document.getElementById("ob-duration").value
    : durCustomEl.value.trim();

  // Name validation.
  if (!name) {
    errorEl.textContent = "Please enter a habit name.";
    errorEl.hidden = false;
    return false;
  }

  // Category validation.
  if (!category) {
    errorEl.textContent = "Please select a category.";
    errorEl.hidden = false;
    return false;
  }

  errorEl.hidden = true;

  // POST request to Flask to save habit during onboarding.
  const response = await fetch("/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, frequency, duration, category }),
  });

  if (response.ok) {
    return true;
  } else {
    const data = await response.json();
    errorEl.textContent = data.error || "Something went wrong.";
    errorEl.hidden = false;
    return false;
  } // Same handling as in other cases.
}

// Frequency and duration 'Custom' button behavior.
function selectFreq(clickedBtn) {
  clickedBtn.closest(".pill-group").querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
  clickedBtn.classList.add("active");

  const customEl = document.getElementById("ob-frequency-custom");
  if (clickedBtn.dataset.value === "custom") {
    customEl.removeAttribute("hidden");
    document.getElementById("ob-frequency").value = "";
  } else {
    customEl.setAttribute("hidden", "");
    document.getElementById("ob-frequency").value = clickedBtn.dataset.value;
  }
}

function selectDuration(clickedBtn) {
  clickedBtn.closest(".pill-group").querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
  clickedBtn.classList.add("active");

  const customEl = document.getElementById("ob-duration-custom");
  if (clickedBtn.dataset.value === "custom") {
    customEl.removeAttribute("hidden");
    document.getElementById("ob-duration").value = "";
  } else {
    customEl.setAttribute("hidden", "");
    document.getElementById("ob-duration").value = clickedBtn.dataset.value;
  }
}

// Runs on page load.
window.onload = function () {
  showStep(1);
};