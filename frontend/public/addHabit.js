// Hunter B. Franklin
// CS361-400, Spring 2026
// Assignment #9: Main Program, Big Pool Implementation
// Date: 06/03/2026

// Save Habit function:
async function saveHabit() {
  const name    = document.getElementById("add-name").value.trim();
  const errorEl = document.getElementById("add-error");

  // Read frequency: 'Custom' text or hidden button:
  const freqCustomEl = document.getElementById("add-frequency-custom");
  const frequency = freqCustomEl.hasAttribute("hidden")
    ? document.getElementById("add-frequency").value
    : freqCustomEl.value.trim();

  // Read duration: 'Custom' text or hidden button:
  const durCustomEl = document.getElementById("add-duration-custom");
  const duration = durCustomEl.hasAttribute("hidden")
    ? document.getElementById("add-duration").value
    : durCustomEl.value.trim();

  // To be implemented: 
  // const category = document.getElementById("add-category").value;

  // Name validation:
  if (!name) {
    errorEl.textContent = "Habit name is required.";
    errorEl.hidden = false;
    return;
  }

  // To be implemented:
  // if (!category) {
  //   errorEl.textContent = "Please select a category.";
  //   errorEl.hidden = false;
  //   return;
  // }

  errorEl.hidden = true;

  // HTTP request to Flask (backend).
  const response = await fetch("/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      frequency,
      duration,
      // category,  // To be implemented.
    }),
  });

  // If Flask returned success code, proceed to dash. Else, if message 
  // given by Flask, displays it, if not displays message. Displayed
  // in red block.
  if (response.ok) {
    window.location.href = "dashboard.html";
  } else {
    const data = await response.json();
    errorEl.textContent = data.error || "Something went wrong.";
    errorEl.hidden = false;
  }
}

// Back button, warns if 'Name' has content present:
function goBack() {
  const name = document.getElementById("add-name").value.trim();
  if (name) {
    document.getElementById("back-confirm").hidden = false;
  } else {
    window.location.href = "dashboard.html";
  }
}

function confirmGoBack() {
  window.location.href = "dashboard.html";
}
function cancelGoBack() {
  document.getElementById("back-confirm").hidden = true;
}

// Custom pill buttons (hiding if custom is not clicked, or showing if clicked):
// Frequency button:
function selectFreq(clickedBtn) {
  clickedBtn.closest(".pill-group").querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
  clickedBtn.classList.add("active");

  const customEl = document.getElementById("add-frequency-custom");
  if (clickedBtn.dataset.value === "custom") {
    customEl.removeAttribute("hidden");
    document.getElementById("add-frequency").value = "";
  } else {
    customEl.setAttribute("hidden", "");
    document.getElementById("add-frequency").value = clickedBtn.dataset.value;
  }
}

// Duration button:
function selectDuration(clickedBtn) {
  clickedBtn.closest(".pill-group").querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
  clickedBtn.classList.add("active");

  const customEl = document.getElementById("add-duration-custom");
  if (clickedBtn.dataset.value === "custom") {
    customEl.removeAttribute("hidden");
    document.getElementById("add-duration").value = "";
  } else {
    customEl.setAttribute("hidden", "");
    document.getElementById("add-duration").value = clickedBtn.dataset.value;
  }
}