/**
 * matrixHighlighter.js
 *
 * This file now handles both holiday and task highlighting in the schedule matrix.
 * Holidays are processed first; the number of holiday rows is stored in window.holidayRowsCount.
 * Tasks are then highlighted using rows offset by that holiday count.
 *
 * Tasks requirements:
 *  - Each task type is given a distinct background color.
 *  - In each task period, the first cell gets a label formatted as: [CourseName][Task Title] (with text aligned left)
 *  - The cell corresponding to the suggested date and the last cell of the task period, if in the past,
 *    have their text appended with the number of days elapsed and text aligned to right.
 *
 * Improvements:
 *  - Tasks are assigned to rows starting after holiday rows (using window.holidayRowsCount as an offset).
 *  - The text in the first cell (which shows [CourseName][Task Title]) is now centered and confined within the cell.
 *  - The cells corresponding to the task's suggested date and the last cell always show the day difference relative to today:
 *      • "today" if equal,
 *      • "X days ago" if in the past, or
 *      • "in X days" if in the future.
 *  - All such text is centered.
 */

(function () {
  // ───────────────────────────────────────────────
  // HELPER FUNCTION: Convert a Date object to "YYYY-MM-DD"
  function dateToYMD(date) {
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  // ───────────────────────────────────────────────
  // HOLIDAY HIGHLIGHTING (existing code)
  function clearHolidayCellHighlights() {
    const matrixRows = document.querySelectorAll(".schd-body .schd-matrix .matrix-row");
    matrixRows.forEach(row => {
      Array.from(row.children).forEach(cell => {
        cell.classList.remove("holiday-cell-yes");
        cell.classList.remove("holiday-cell-no");
      });
    });
  }

  function highlightHolidayRows(holidays) {
    if (!holidays || !holidays.length) {
      console.log("No holidays to highlight.");
      return;
    }
    if (!window.startDateForMatrix) {
      console.error("Global start date (window.startDateForMatrix) is not set.");
      return;
    }

    clearHolidayCellHighlights();

    const matrixRows = document.querySelectorAll(".schd-body .schd-matrix .matrix-row");
    if (!matrixRows || matrixRows.length === 0) {
      console.error("No matrix rows found in .schd-body .schd-matrix.");
      return;
    }

    holidays.forEach((holiday, index) => {
      // Assign each holiday to a row based on its index.
      const rowIndex = index % matrixRows.length;
      console.log(`Highlighting row ${rowIndex} for holiday "${holiday.title}"`);
      let holidayTitleInserted = false;
      Array.from(matrixRows[rowIndex].children).forEach((cell, colIndex) => {
        const cellDate = addDays(window.startDateForMatrix, colIndex);
        const cellDateStr = dateToYMD(cellDate);
        if (cellDateStr >= holiday.from_date && cellDateStr <= holiday.to_date) {
          if (holiday.courses) {
            cell.classList.add("holiday-cell-yes");
          } else {
            cell.classList.add("holiday-cell-no");
          }
          // Insert the holiday title into the first qualifying cell.
          if (!holidayTitleInserted) {
            cell.textContent = holiday.title;
            holidayTitleInserted = true;
          }
        }
      });
    });
    // Save the number of holiday rows used.
    window.holidayRowsCount = Math.min(holidays.length, matrixRows.length);
  }

  // ───────────────────────────────────────────────
  // TASK HIGHLIGHTING CODE
  //

  // Clear any previously applied task-cell highlighting
  function clearTaskCellHighlights() {
    const matrixRows = document.querySelectorAll(".schd-body .schd-matrix .matrix-row");
    matrixRows.forEach(row => {
      Array.from(row.children).forEach(cell => {
        if (cell.classList.contains("task-cell")) {
          cell.classList.remove("task-cell");
          cell.style.backgroundColor = "";
          cell.style.border = "";
          cell.style.overflow = "";
          cell.style.whiteSpace = "";
          cell.style.textAlign = "";
        }
      });
    });
  }

  // Main function: highlight task periods in the matrix.
  // Expects "tasks" to be an array of task objects with properties:
  //    from_date, to_date, suggested_date, title, task_type, course_id, etc.
  // (It also uses window.courseMap to resolve course names.)
  function highlightTaskRows(tasks) {
    if (!tasks || tasks.length === 0) {
      console.log("No tasks to highlight.");
      return;
    }
    if (!window.startDateForMatrix) {
      console.error("Global start date (window.startDateForMatrix) is not set.");
      return;
    }

    const matrixRows = document.querySelectorAll(".schd-body .schd-matrix .matrix-row");
    if (!matrixRows || matrixRows.length === 0) {
      console.error("No matrix rows found for task highlighting.");
      return;
    }

    // Clear any previous task highlighting.
    clearTaskCellHighlights();

    const today = new Date();
    const totalColumns = matrixRows[0].children.length;
    // Use an offset so tasks start on rows after holiday rows.
    const holidayOffset = window.holidayRowsCount || 0;

    // Helper: Convert a Date object to a string "YYYY-MM-DD"
    function dateToYMD(date) {
      const year = date.getFullYear();
      const month = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return `${year}-${month}-${day}`;
    }

    tasks.forEach((task, index) => {
      // TODO: fix delay in calculating date for current week, and days difference of haighlighted cells
      // TODO: fix the issue of suggested date's cell style not being applied correctly

      // Compute the course name once for the task.
      const courseName = (window.courseMap && window.courseMap[task.course_id]) ? window.courseMap[task.course_id] : "";

      // Get task date strings.
      const fromDateStr = task.from_date;
      const toDateStr = task.to_date;
      const suggestedStr = task.suggested_date;
      const actualStartStr = task.actual_start_date;
      const actualEndStr = task.actual_end_date;

      // Find the column indexes that exactly match the task's date strings.
      let fromCol = -1, toCol = -1, suggestedCol = -1, actualStartCol = -1, actualEndCol = -1;
      for (let col = 0; col < totalColumns; col++) {
        const cellDate = addDays(window.startDateForMatrix, col);
        const cellDateStr = dateToYMD(cellDate);
        if (cellDateStr === fromDateStr) { fromCol = col; }
        if (cellDateStr === toDateStr) { toCol = col; }
        if (cellDateStr === suggestedStr) { suggestedCol = col; }
        if (cellDateStr === actualStartStr) { actualStartCol = col; }
        if (cellDateStr === actualEndStr) { actualEndCol = col; }
      }

      // Validate task date strings.
      if (fromCol === -1 || toCol === -1 || toCol < fromCol || toCol >= totalColumns) {
        console.warn(`Task "${task.title}" has a from_date or to_date out of matrix range.`);
        return;
      }

      // Use a row offset so tasks appear after holiday rows.
      const row = matrixRows[(holidayOffset + index) % matrixRows.length];


      // ✅ NEW: Store task period cells to float them together
      let taskPeriodCells = [];


      // Loop over the columns in the task's period.
      for (let col = fromCol; col <= toCol; col++) {
        const cell = row.children[col];
        if (!cell) continue;

        taskPeriodCells.push(cell); // ✅ Track only task period cells

        // Apply styling for the period between actual_start_date and actual_end_date
        if (col >= actualStartCol && col <= actualEndCol && actualEndCol >= todayCol) {
          cell.classList.add('actual-date-cell');
        }

        // Set a background color based on the task type.
        let bgColor = "";
        switch (task.task_type.toLowerCase()) {
          case "assignment":
            bgColor = "#38798f"; // Light Blue-greenish
            break;
          case "quiz":
            bgColor = "#67a167"; // Light Green
            break;
          case "project":
            bgColor = "#3c57d0"; // Light blue
            break;
          case "mt":
            bgColor = "#FFB6C1"; // Light Pink
            break;
          case "final":
            bgColor = "#d87070"; // Light Gray
            break;
          default:
            bgColor = "#FFFFFF";
        }
        cell.style.backgroundColor = bgColor;
        // Ensure text is contained and can wrap if needed.
        cell.style.overflow = "hidden";
        cell.style.whiteSpace = "normal";
        cell.style.wordWrap = "break-word";
        cell.style.position = "relative";
        cell.style.zIndex = 10;
        // For consistency, we'll set the text color here.
        cell.style.color = "black";
        cell.style.border = "none";
        // Set the tooltip to show the task and course names.
        cell.title = ` ${task.title} - ${courseName} `;

        // Add marginTop and marginBottom to the task period cells
        taskPeriodCells.forEach(taskCell => taskCell.style.marginTop = "2px");
        taskPeriodCells.forEach(taskCell => taskCell.style.marginBottom = "2px");

        // ✅ Ensure entire task period style
        cell.addEventListener("mouseenter", () => {
          // add border top and bottom to the task period cells
          taskPeriodCells.forEach(taskCell => taskCell.style.borderTop = "2px solid white");
          taskPeriodCells.forEach(taskCell => taskCell.style.borderBottom = "2px solid white");
          // add border left to first cell of the task period
          taskPeriodCells[0].style.borderLeft = "2px solid white";
          // add top-left, bottom-left border radius to first cell of the task period
          taskPeriodCells[0].style.borderTopLeftRadius = "5px";
          taskPeriodCells[0].style.borderBottomLeftRadius = "5px";
          // add border right to last cell of the task period
          taskPeriodCells[taskPeriodCells.length - 1].style.borderRight = "2px solid white";
          // add top-right, bottom-right border radius to last cell of the task period
          taskPeriodCells[taskPeriodCells.length - 1].style.borderTopRightRadius = "5px";
          taskPeriodCells[taskPeriodCells.length - 1].style.borderBottomRightRadius = "5px";

          // taskPeriodCells.forEach(taskCell => taskCell.classList.add("sellected-task-period"));
        });
        cell.addEventListener("mouseleave", () => {
          // remove border top and bottom to the task period cells
          taskPeriodCells.forEach(taskCell => taskCell.style.borderTop = "");
          taskPeriodCells.forEach(taskCell => taskCell.style.borderBottom = "");
          // remove border left to first cell of the task period
          taskPeriodCells[0].style.borderLeft = "";
          // remove top-left, bottom-left border radius to first cell of the task period
          taskPeriodCells[0].style.borderTopLeftRadius = "";
          taskPeriodCells[0].style.borderBottomLeftRadius = "";
          // remove border right to last cell of the task period
          taskPeriodCells[taskPeriodCells.length - 1].style.borderRight = "";
          // remove top-right, bottom-right border radius to last cell of the task period
          taskPeriodCells[taskPeriodCells.length - 1].style.borderTopRightRadius = "";
          taskPeriodCells[taskPeriodCells.length - 1].style.borderBottomRightRadius = "";

          // taskPeriodCells.forEach(taskCell => taskCell.classList.remove("sellected-task-period"));
        });

        // Compute the days difference for this cell.
        const cellDate = addDays(window.startDateForMatrix, col);
        let diff = Math.floor((today - cellDate) / (1000 * 60 * 60 * 24));
        let diffText = "";
        if (diff === 0) { // today
          cell.style.color = "red";
          cell.style.fontWeight = "bold";
          diffText = "0";
        } else if (diff > 0) {  // past days (after today, negative)
          diffText = `-${diff}`; // after today
        } else {
          diffText = `${Math.abs(diff)}`; // future days (before today)
          if (Math.abs(diff) <= 2) {
            cell.style.color = "red";
            cell.style.fontWeight = "bold";
            cell.style.fontsize = "25px";
          } else if (col === suggestedCol && Math.abs(diff) < today) {  // suggested date cell
            cell.classList.add("pre-suggested-day"); // Apply pre suggested date texture course
            if (Math.abs(diff) >= 1 && Math.abs(diff) <= 5) {
              cell.classList.add("suggested-day"); // Apply suggested date texture course
              cell.style.color = "black";
            }
          }
        }

        // --- First cell of the task period ---
        if (col === fromCol) {
          // Set the tooltip to show the task and course names.
          cell.title = ` ${task.title} - ${courseName} `;
          // Center the text.
          cell.style.textAlign = "center";
          // Optionally adjust width.
          // cell.style.width = "50px";
          cell.style.zIndex = 50;


          // Calculate the difference in days between today and the task's end date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // If last cell of the task period is larger than and equal to today
          if (diff >= 0 && toCol <= today) {
            // Show the days difference in the cell.
            cell.textContent = diffText;
          } else {
            // don't wrap text
            // cell.style.whiteSpace = "nowrap";
            // Optionally adjust width.
            // cell.style.width = "100px";
            cell.textContent = "";
          }
        }

        // --- 3rd cell of the task period ---
        if (toCol - fromCol >= 5 && col === fromCol + 2) {
          // don't wrap text
          cell.style.whiteSpace = "nowrap";
          // Set the tooltip to show the task and course names.
          cell.title = ` ${task.title} - ${courseName} `;
          // Center the text.
          cell.style.textAlign = "center";
          // Optionally adjust width.
          cell.style.width = "150px";
          cell.style.zIndex = 50;
          // If last cell of the task period is larger than and equal to today
          if (toCol <= today) {
            cell.textContent = ` ${task.title} - ${courseName} `;
          } else {
            cell.textContent = "";
            taskPeriodCells.forEach(taskCell => taskCell.style.border = "none");
          }
        }

        // --- For cells matching the suggested date ---
        if (col === suggestedCol) {
          // Set the tooltip to show the task and course names.
          cell.title = ` ${task.title} - ${courseName} `;
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;

          // Calculate the difference in days between today and the task's suggested date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // Display the days difference
          cell.textContent = diffText;
        }

        // --- For cells matching the last cell ---
        if (col === toCol) {
          // Set the tooltip to show the task and course names.
          cell.title = ` ${task.title} - ${courseName} `;
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;

          // Calculate the difference in days between today and the task's end date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // If last cell of the task period is larger than and equal to today
          if (diff <= 0) {
            taskPeriodCells.forEach(taskCell => taskCell.style.backgroundColor = "rgba(196, 196, 196, 0.1)");
            taskPeriodCells.forEach(taskCell => taskCell.style.color = "rgba(255, 255, 255, 0.5)");
            taskPeriodCells.forEach(taskCell => taskCell.style.fontSize = "12px");
            cell.textContent = `${task.title} | ${courseName}`;
          } else {
            // Append the days difference.
            cell.textContent = diff;
          }
        }

        // --- For cells matching the actual start date ---
        if (col === actualStartCol && actualEndCol >= todayCol) {
          // Set the tooltip to show the task and course names.
          cell.title = ` ${task.title} - ${courseName} `;
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;

          // Calculate the difference in days between today and the task's start date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // Display the days difference
          cell.textContent = diffText;

          // Add a class for styling actual date cells
          cell.classList.add('actual-start-date-cell');
        }

        // --- For cells matching the actual end date ---
        if (col === actualEndCol && actualEndCol >= todayCol) {
          // Set the tooltip to show the task and course names.
          cell.title = ` ${task.title} - ${courseName} `;
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;

          // Calculate the difference in days between today and the task's end date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // Display the days difference
          cell.textContent = diffText;

          // Add a class for styling actual date cells
          cell.classList.add('actual-end-date-cell');
        }

        // Add a class for styling actual date cells
        if ((col === actualStartCol || col === actualEndCol) && actualEndCol >= todayCol) {
          cell.classList.add('actual-date-cell');
        }
      }

      // Add console logs to verify date processing
      console.log(`Processing task: ${task.title}`);
      console.log(`Suggested Date: ${suggestedStr}, Actual Start Date: ${actualStartStr}, Actual End Date: ${actualEndStr}`);
    });

    // CSS for pulse animation, glow effect, and unified background color
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      .actual-date-cell {
        animation: pulse 2s infinite;
        box-shadow: 0 0 10px rgba(0, 150, 136, 0.5);
        background: linear-gradient(45deg,rgba(153, 120, 110, 0.4) 90%,rgb(168, 168, 168) 5%); // Lighter gradient background
      }
      .actual-start-date-cell {
        background-color: #b3e5fc; // Light blue for start date
      }
      .actual-end-date-cell {
        background-color: #ffccbc; // Light orange for end date
      }
      .slider {
        position: fixed;
        right: -300px; /* Hidden by default */
        width: 300px;
        transition: right 0.3s;
        /* Add more styling as needed */
      }
    `;
    document.head.appendChild(style);
  }

  // ───────────────────────────────────────────────
  // Expose the functions globally so they can be called from elsewhere.
  window.highlightHolidayRows = highlightHolidayRows;
  window.highlightTaskRows = highlightTaskRows;
})();