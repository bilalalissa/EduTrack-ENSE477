/**
 * script3.js
 * 
 * Main functionalities for the current user:
 *  - On page load, fetch the start date from the server, build the schedule matrix,
 *    and scroll the matrix one week before today.
 *  - When the Settings button is clicked, update the settings list (dates and holidays).
 *  - When adding, selecting, or deleting a date, update the matrix and refresh the holiday row highlighting.
 *  - Holiday management: add and delete holidays with validations.
 */

// Declare global variables for the start date:
// - window.startDateRaw: the raw start date string as returned by the server.
// - window.startDateForMatrix: an adjusted Date object for building the grid.
window.startDateRaw = null;
window.startDateForMatrix = null;

// Global addDays function (no extra "+1")
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);  // Remove the extra "+1"
  return result;
}
window.addDays = addDays; // Expose globally

console.log("Global start date (script3.js-0):", window.startDateForMatrix);

document.addEventListener("DOMContentLoaded", async function () {
  // Cached DOM elements
  const settingsForm = document.getElementById("settingsForm");
  const dateInput = document.getElementById("dateInput");
  const datesList = document.querySelector(".datesList");
  const settingsBtn = document.getElementById("settingsBtn");
  const addHolidayBtn = document.getElementById("addHolidayBtn");
  const holidayFormContainer = document.getElementById("holidayFormContainer");
  const holidayForm = document.getElementById("holidayForm");
  const holidayTitle = document.getElementById("holidayTitle");
  const holidayFrom = document.getElementById("holidayFrom");
  const holidayTo = document.getElementById("holidayTo");
  const holidayCourses = document.getElementById("holidayCourses");
  const cancelHolidayBtn = document.getElementById("cancelHoliday");
  const holidaysList = document.querySelector(".holidaysList");

  /* ------------------- Matrix Functions ------------------- */

  // Fetch the current start date from the server.
  // We store the raw value in window.startDateRaw and adjust it for building the grid.
  async function fetchStartDate() {
    try {
      const response = await fetch("fetchSettings.php?action=getStartDate");
      const data = await response.json();
      if (data.success && data.start_date) {
        // Save the raw value as returned by the server
        window.startDateRaw = data.start_date;

        // Create a Date object correctly by parsing the date components
        const [year, month, day] = data.start_date.split('-').map(Number);
        const startDate = new Date(year, month - 1, day); // month is 0-based in JS
        startDate.setHours(0, 0, 0, 0);
        window.startDateForMatrix = startDate;

        console.log("Global start date (after fetchStartDate):", {
          raw: window.startDateRaw,
          date: window.startDateForMatrix,
          isoString: window.startDateForMatrix.toISOString(),
          components: {
            year,
            month,
            day
          }
        });
        return data.start_date;
      } else {
        console.error("No start date found:", data.error || "Empty response");
        return null;
      }
    } catch (error) {
      console.error("Error fetching start date:", error);
      return null;
    }
  }

  // Build the schedule matrix (header and grid) using window.startDateForMatrix.
  function createScheduleMatrix() {
    const schdHeader = document.querySelector(".schd-header");
    const schdMatrix = document.querySelector(".schd-matrix");

    if (!window.startDateForMatrix) {
      console.error("Start date is not set. Cannot create matrix.");
      return;
    }
    if (!schdHeader || !schdMatrix) {
      console.error("Matrix containers not found.");
      return;
    }

    console.log("Creating schedule matrix with start date:", {
      raw: window.startDateRaw,
      date: window.startDateForMatrix,
      isoString: window.startDateForMatrix.toISOString()
    });

    // Clear existing matrix contents
    schdHeader.innerHTML = "";
    schdMatrix.innerHTML = "";

    const totalColumns = 120;
    const totalRows = 300;

    // Normalize today's date to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build header grid (4 rows)
    for (let row = 0; row < 4; row++) {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("matrix-row");

      for (let col = 0; col < totalColumns; col++) {
        const cell = document.createElement("div");
        cell.classList.add("header-cell");

        // Create a new date object for each column
        const currentDate = new Date(window.startDateForMatrix);
        currentDate.setDate(window.startDateForMatrix.getDate() + col);
        currentDate.setHours(0, 0, 0, 0);

        if (row === 0) {
          // First day of month or Sunday (for week numbers)
          if (currentDate.getDate() === 1) {
            cell.textContent = currentDate.toLocaleString("default", { month: "short" });
            cell.classList.add("month-highlight");
          } else if (currentDate.getDay() === 0) {
            // Calculate week number considering the offset from start date
            const startDayOffset = window.startDateForMatrix.getDay(); // 0 for Sunday, 1 for Monday, etc.
            const adjustedCol = col + startDayOffset;
            const weekNum = Math.floor(adjustedCol / 7) + 1;
            cell.textContent = `W${weekNum}`;
            cell.classList.add("week-highlight");
          }
        } else if (row === 1) {
          cell.textContent = col + 1;
        } else if (row === 2) {
          cell.textContent = currentDate.toLocaleDateString("en-US", { weekday: "short" });
        } else if (row === 3) {
          cell.textContent = currentDate.getDate();
        }

        // Highlight weekends in header only
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          cell.classList.add("weekend-cell");
        }

        // Highlight month start
        if ((row === 0 || row === 3) && cell.classList.contains("month-highlight")) {
          cell.style.backgroundColor = "rgba(255, 60, 0, 0.2)";
        }

        // Highlight current month
        if (row === 0 && currentDate.getMonth() === today.getMonth()) {
          cell.classList.add("current-month");
        }

        // Highlight current week
        if (getWeekNumber(currentDate) === getWeekNumber(today)) {
          cell.classList.add("current-week");
        }

        // Highlight current day
        if (currentDate.getTime() === today.getTime()) {
          cell.classList.add("current-day");
          cell.style.borderLeft = "2px solid rgba(255, 0, 0, 0.3)";
          cell.style.borderRight = "2px solid rgba(255, 0, 0, 0.3)";
          cell.style.borderTop = "none";
          cell.style.borderBottom = "none";
          cell.style.color = "rgb(255, 60, 0)";
          cell.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
          if (row === 0) {
            cell.textContent = `W${getWeekNumber(currentDate)}`;
          }
        }

        rowDiv.appendChild(cell);
      }
      schdHeader.appendChild(rowDiv);
    }

    // Build matrix grid (body)
    for (let row = 0; row < totalRows; row++) {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("matrix-row");

      for (let col = 0; col < totalColumns; col++) {
        const cell = document.createElement("div");
        cell.classList.add("matrix-cell");

        // Use the same date calculation method as header
        const currentDate = new Date(window.startDateForMatrix);
        currentDate.setDate(window.startDateForMatrix.getDate() + col);
        currentDate.setHours(0, 0, 0, 0);

        // Highlight current day
        if (currentDate.getTime() === today.getTime()) {
          if (!cell.classList.contains("holiday-cell")) {
            cell.classList.add("current-day");
            cell.style.borderLeft = "2px solid rgba(255, 0, 0, 0.3)";
            cell.style.borderRight = "2px solid rgba(255, 0, 0, 0.3)";
            cell.style.borderTop = "none";
            cell.style.borderBottom = "none";
            cell.style.color = "rgb(255, 0, 0)";
            cell.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
          }
        }

        rowDiv.appendChild(cell);
      }
      schdMatrix.appendChild(rowDiv);
    }
  }

  function getWeekNumber(date) {
    if (!window.startDateForMatrix) return 1;
    const startDate = new Date(window.startDateForMatrix);
    startDate.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - startDate.getTime();
    const weekNum = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, weekNum); // Ensure it never returns less than 1
  }

  function scrollMatrixOneWeekBeforeToday() {
    const schdMatrix = document.querySelector(".schd-matrix");
    if (schdMatrix) {
      schdMatrix.scrollTo({ left: schdMatrix.scrollLeft + 7 * 40, behavior: "smooth" });
    }
  }

  // refreshMatrix() fetches the start date and rebuilds the grid.
  // async function refreshMatrix() {
  //   await fetchStartDate();
  //   if (window.startDateForMatrix) {
  //     createScheduleMatrix();
  //     setTimeout(scrollMatrixOneWeekBeforeToday, 500);
  //   }
  // }
  // ----- Modified refreshMatrix function -----
  async function refreshMatrix() {
    await fetchStartDate();
    if (window.startDateForMatrix) {
      createScheduleMatrix();
      // Instead of calling a local scroll function, call the global one from script2.js
      setTimeout(function () {
        if (window.scrollMatrixToWeekBeforeToday) {
          window.scrollMatrixToWeekBeforeToday();
        }
      }, 500);
    }
  }

  /* ------------------- Settings Section Functions ------------------- */

  function fetchDatesList() {
    fetch("fetchSettings.php?action=getDatesList")
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          datesList.innerHTML = "";
          data.dates.forEach(dateObj => {
            const div = document.createElement("div");
            div.classList.add("dateItem");
            div.innerHTML = `
              <label>
                <input type="radio" name="startDate" value="${dateObj.date}" ${dateObj.is_start_date ? "checked" : ""}>
                ${dateObj.date}
              </label>
              <button class="deleteBtn" data-date="${dateObj.date}">Delete</button>
            `;
            div.querySelector("input").addEventListener("change", function () {
              if (confirm(`Select ${dateObj.date} as your new start date?`)) {
                setStartDate(dateObj.date);
              } else {
                fetchDatesList();
              }
            });
            div.querySelector(".deleteBtn").addEventListener("click", function () {
              if (confirm(`Delete ${dateObj.date}?`)) {
                deleteDate(dateObj.date);
              }
            });
            datesList.appendChild(div);
          });
        } else {
          console.error("Failed to load dates list:", data.error);
        }
      })
      .catch(error => console.error("Error fetching dates list:", error));
  }

  function setStartDate(selectedDate) {
    fetch("fetchSettings.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `action=setStartDate&date=${encodeURIComponent(selectedDate)}`
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Start date updated successfully!");
          // Chain: refresh matrix, then update dates list and holidays.
          refreshMatrix().then(() => {
            fetchDatesList();
            return fetchHolidays();
          }).then(holidaysData => {
            if (holidaysData.success && holidaysData.holidays) {
              // This function now highlights the appropriate cells in each assigned row
              highlightHolidayRows(holidaysData.holidays);
            }
          }).catch(error => {
            console.error("Initialization error:", error);
          });
        } else {
          alert("Failed to update start date: " + data.error);
        }
      })
      .catch(error => console.error("Error updating start date:", error));
  }

  settingsForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const newDate = dateInput.value;
    if (!newDate) {
      alert("Please enter a valid date.");
      return;
    }
    fetch("fetchSettings.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `action=addDate&date=${encodeURIComponent(newDate)}`
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Date added successfully and set as start date!");
          dateInput.value = "";
          refreshMatrix().then(() => {
            fetchDatesList();
            return fetchHolidays();
          }).then(holidaysData => {
            if (holidaysData.success && holidaysData.holidays) {
              // This function now highlights the appropriate cells in each assigned row
              highlightHolidayRows(holidaysData.holidays);
            }
          }).catch(error => {
            console.error("Initialization error:", error);
          });
        } else if (data.error === "Date already exists.") {
          alert("This date already exists. Please choose another.");
          dateInput.value = "";
        } else {
          alert("Error adding date: " + data.error);
          dateInput.value = "";
        }
      })
      .catch(error => console.error("Error adding date:", error));
  });

  function deleteDate(dateToDelete) {
    fetch("fetchSettings.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `action=deleteDate&date=${encodeURIComponent(dateToDelete)}`
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Date deleted successfully.");
          refreshMatrix().then(() => {
            fetchDatesList();
            return fetchHolidays();
          }).then(holidaysData => {
            if (holidaysData.success && holidaysData.holidays) {
              // This function now highlights the appropriate cells in each assigned row
              highlightHolidayRows(holidaysData.holidays);
            }
          }).catch(error => {
            console.error("Initialization error:", error);
          });
        } else {
          alert("Failed to delete date: " + data.error);
        }
      })
      .catch(error => console.error("Error deleting date:", error));
  }

  /* ------------------- Holiday Management Functions ------------------- */

  // When fetching holidays, use the raw start date (as returned by the server)
  // so that the query matches what is stored in the database.
  function fetchHolidays() {
    if (!window.startDateRaw) {
      console.error("Start date (raw) required to fetch holidays.");
      return Promise.resolve({ success: false, error: "Start date required" });
    }
    console.log("Fetching holidays with start date:", window.startDateRaw);
    return fetch(`fetchHolidays.php?action=getHolidays&start_date=${encodeURIComponent(window.startDateRaw)}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          holidaysList.innerHTML = "";
          if (data.holidays && data.holidays.length > 0) {
            data.holidays.forEach(holiday => {
              const li = document.createElement("li");
              li.innerHTML = `
                <span><strong>${holiday.title}</strong> (${holiday.from_date} - ${holiday.to_date}) - Classes: ${holiday.courses ? "Yes" : "No"}</span>
                <button class="deleteHolidayBtn" data-id="${holiday.h_id}">Delete</button>
              `;
              li.querySelector(".deleteHolidayBtn").addEventListener("click", function () {
                if (confirm(`Delete holiday "${holiday.title}"?`)) {
                  deleteHoliday(holiday.h_id);
                }
              });
              holidaysList.appendChild(li);
            });
          } else {
            holidaysList.innerHTML = "<li>No holidays found.</li>";
          }
        } else {
          console.error("Failed to fetch holidays:", data.error);
        }
        return data;
      })
      .catch(error => {
        console.error("Error fetching holidays:", error);
        throw error;
      });
  }

  holidayForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const title = holidayTitle.value.trim();
    const fromDate = holidayFrom.value;
    const toDate = holidayTo.value;
    const courses = holidayCourses.checked ? 1 : 0;
    fetch("fetchHolidays.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "addHoliday",
        title,
        from_date: fromDate,
        to_date: toDate,
        start_date: window.startDateRaw ? window.startDateRaw : "",
        courses
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Holiday added successfully!");
          holidayTitle.value = "";
          holidayFrom.value = "";
          holidayTo.value = "";
          holidayCourses.checked = false;
          holidayFormContainer.style.display = "none";

          // First refresh the matrix to ensure clean state
          refreshMatrix().then(() => {
            // Then fetch and highlight holidays
            return fetchHolidays();
          }).then(holidaysData => {
            if (holidaysData.success && holidaysData.holidays) {
              if (window.highlightHolidayRows) {
                window.highlightHolidayRows(holidaysData.holidays);
              } else {
                highlightHolidayRows(holidaysData.holidays);
              }
              // Finally fetch and highlight tasks to maintain their visibility
              return fetchTasksAndHighlight();
            }
          }).catch(error => {
            console.error("Error refreshing matrix after adding holiday:", error);
          });
        } else {
          alert("Error adding holiday: " + data.error);
        }
      })
      .catch(error => console.error("Error adding holiday:", error));
  });

  function deleteHoliday(holidayId) {
    fetch("fetchHolidays.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "deleteHoliday", h_id: holidayId })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Holiday deleted successfully.");
          // First refresh the matrix to ensure clean state
          refreshMatrix().then(() => {
            // Then fetch and highlight holidays
            return fetchHolidays();
          }).then(holidaysData => {
            if (holidaysData.success && holidaysData.holidays) {
              if (window.highlightHolidayRows) {
                window.highlightHolidayRows(holidaysData.holidays);
              } else {
                highlightHolidayRows(holidaysData.holidays);
              }
              // Finally fetch and highlight tasks to maintain their visibility
              return fetchTasksAndHighlight();
            }
          }).catch(error => {
            console.error("Error refreshing matrix after deleting holiday:", error);
          });
        } else {
          alert("Error deleting holiday: " + data.error);
        }
      })
      .catch(error => console.error("Error deleting holiday:", error));
  }

  addHolidayBtn.addEventListener("click", function () {
    holidayFormContainer.style.display = "block";
  });
  cancelHolidayBtn.addEventListener("click", function () {
    holidayFormContainer.style.display = "none";
  });

  if (settingsBtn) {
    settingsBtn.addEventListener("click", function () {
      fetchDatesList();
      fetchHolidays().then(holidaysData => {
        if (holidaysData.success && holidaysData.holidays) {
          highlightHolidayRows(holidaysData.holidays);
        }
      });
    });
  }

  function syncScrolling() {
    const schdHeader = document.querySelector(".schd-header");
    const schdMatrix = document.querySelector(".schd-matrix");
    if (schdHeader && schdMatrix) {
      schdMatrix.addEventListener("scroll", function () {
        schdHeader.scrollLeft = schdMatrix.scrollLeft;
      });
      schdHeader.addEventListener("scroll", function () {
        schdMatrix.scrollLeft = schdHeader.scrollLeft;
      });
    }
  }
  setTimeout(syncScrolling, 500);

  // -----------------------------------------
  // New: Fetch tasks from tasksHandler.php and highlight them in the matrix.
  // -----------------------------------------
  async function fetchTasksAndHighlight() {
    // -------------------- debugging --------------------
    console.log("\n\nscript3.js/\nfetchTasksAndHighlight: \n > Starting tasks fetch...");
    try {
      const response = await fetch('tasksHandler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=list&task_type=all'
      });
      const tasksData = await response.json();
      console.log("fetchTasksAndHighlight: Tasks data received:", tasksData);
      if (tasksData.status === "success" && tasksData.tasks && tasksData.tasks.length > 0) {
        window.highlightTaskRows(tasksData.tasks);
      } else {
        console.warn("fetchTasksAndHighlight: No tasks to highlight or tasksData.status is not 'success'.");
      }
    } catch (error) {
      console.error("fetchTasksAndHighlight: Error fetching tasks:", error);
    }

  }

  // Final initialization: chain refreshMatrix() so that the start date is set before fetching holidays and tasks.
  refreshMatrix().then(() => {
    fetchDatesList();
    return fetchHolidays();
  }).then(holidaysData => {
    if (holidaysData.success && holidaysData.holidays) {
      window.highlightHolidayRows(holidaysData.holidays);
    }
    // Now fetch tasks and highlight them.
    return fetchTasksAndHighlight();
  }).catch(error => {
    console.error("Initialization error:", error);
  });
});