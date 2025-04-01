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
    const matrixRows = document.querySelectorAll(".schd-body .schd-matrix .matrix-row:not(.schd-header)");

    // Calculate today's column index
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = window.startDateForMatrix;
    const todayCol = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    matrixRows.forEach(row => {
      Array.from(row.children).forEach((cell, colIndex) => {
        // Skip holiday cells completely
        if (cell.classList.contains('holiday-cell-yes') ||
          cell.classList.contains('holiday-cell-no')) {
          return;
        }

        // For current day cells, apply ONLY the current day styling
        if (colIndex === todayCol) {
          cell.className = 'matrix-cell current-day';
          cell.style.cssText = `
            border-left: 2px solid rgba(255, 0, 0, 0.3);
            border-right: 2px solid rgba(255, 0, 0, 0.3);
            border-top: none;
            border-bottom: none;
            color: rgb(255, 0, 0);
            background-color: rgba(255, 0, 0, 0.3);
            pointer-events: none;
            min-height: 34px;
            height: 34px;
            margin: 0;
            padding: 0;
            width: 40px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 1;
          `;
          cell.textContent = '';
          return;
        }

        // For regular cells, reset to default state
        cell.className = 'matrix-cell';
        cell.style.cssText = `
          border: 1px solid #46464632;
          min-height: 28px;
          max-height: 32px;
          height: 30px;
          width: 40px;
          margin: 2px 0;
          padding: 2px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: transparent;
          position: relative;
          z-index: 2;
        `;
        cell.textContent = '';

        // Remove task-related attributes
        cell.removeAttribute('data-task-id');
        cell.removeAttribute('data-task-type');
        cell.removeAttribute('data-task-title');
        cell.removeAttribute('data-status');
      });

      // Reset row attributes but keep matrix-row class
      row.className = 'matrix-row';
      row.style.display = '';
      row.removeAttribute('data-task-status');
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

    // Normalize today's date to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalColumns = matrixRows[0].children.length;
    const holidayOffset = window.holidayRowsCount || 0;

    // Helper: Convert a Date object to a string "YYYY-MM-DD"
    function dateToYMD(date) {
      const year = date.getFullYear();
      const month = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return `${year}-${month}-${day}`;
    }

    // Calculate today's column
    const todayCol = (() => {
      const startDate = new Date(window.startDateForMatrix);
      startDate.setHours(0, 0, 0, 0);
      return Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    })();

    tasks.sort((a, b) => new Date(a.from_date) - new Date(b.from_date));

    tasks.forEach((task, index) => {
      console.log('Processing task:', task);

      const taskType = ((task.task_type || task.type || "").toString()).toLowerCase();
      console.log('Task type determined:', taskType);

      const courseName = (window.courseMap && window.courseMap[task.course_id]) ? window.courseMap[task.course_id] : "";

      // Get task date strings
      const fromDateStr = task.from_date;
      const toDateStr = task.to_date;
      const suggestedStr = task.suggested_date;
      const actualStartStr = task.actual_start_date;
      const actualEndStr = task.actual_end_date;

      // Find column indexes with normalized date comparison
      let fromCol = -1, toCol = -1, suggestedCol = -1, actualStartCol = -1, actualEndCol = -1;
      for (let col = 0; col < totalColumns; col++) {
        const cellDate = addDays(window.startDateForMatrix, col);
        cellDate.setHours(0, 0, 0, 0);
        const cellDateStr = dateToYMD(cellDate);

        if (cellDateStr === fromDateStr) fromCol = col;
        if (cellDateStr === toDateStr) toCol = col;
        if (cellDateStr === suggestedStr) suggestedCol = col;
        if (cellDateStr === actualStartStr) actualStartCol = col;
        if (cellDateStr === actualEndStr) actualEndCol = col;
      }

      if (fromCol === -1 || toCol === -1 || toCol < fromCol || toCol >= totalColumns) {
        console.warn(`Task "${task.title}" has a from_date or to_date out of matrix range.`);
        return;
      }

      const row = matrixRows[(holidayOffset + index) % matrixRows.length];
      let taskPeriodCells = [];

      for (let col = fromCol; col <= toCol; col++) {
        const cell = row.children[col];
        taskPeriodCells.push(cell);

        // Compute days difference with normalized dates
        const cellDate = addDays(window.startDateForMatrix, col);
        cellDate.setHours(0, 0, 0, 0);
        const diff = Math.floor((cellDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let diffText = "";
        if (diff === 0) {
          cell.style.color = "red";
          cell.style.fontWeight = "bold";
          diffText = "0";
        } else if (diff < 0) {
          diffText = `${diff}`; // past days
        } else {
          diffText = `+${diff}`; // future days
          if (diff <= 2) {
            cell.style.color = "red";
            cell.style.fontWeight = "bold";
            cell.style.fontSize = "25px";
          }
        }

        // Add task-related attributes to the cell and row
        cell.classList.add('task-cell', taskType);
        cell.setAttribute('data-task-id', task.id);
        cell.setAttribute('data-task-type', taskType);
        cell.setAttribute('data-task-title', task.title);
        cell.setAttribute('data-status', task.status);
        row.setAttribute('data-task-status', task.status);

        // Set background color based on task type
        let bgColor = "";
        let textColor = "";
        let fontSize = "";
        let fontWeight = "";
        let zIndex = "";
        switch (taskType) {
          case "assignment":
            bgColor = "rgba(56, 121, 143, 0.8)"; // Light Blue-greenish with transparency
            textColor = "#FFFFFF";
            fontSize = "12px";
            fontWeight = "normal";
            zIndex = "10";
            break;
          case "quiz":
            bgColor = "rgba(103, 161, 103, 0.8)"; // Light Green with transparency
            textColor = "#FFFFFF";
            fontSize = "12px";
            fontWeight = "normal";
            zIndex = "10";
            break;
          case "project":
            bgColor = "rgba(60, 87, 208, 0.8)"; // Light blue with transparency
            textColor = "#FFFFFF";
            fontSize = "12px";
            fontWeight = "normal";
            zIndex = "10";
            break;
          case "mt":
            bgColor = "rgba(255, 182, 193, 0.8)"; // Light Pink with transparency
            textColor = "#000000";
            fontSize = "12px";
            fontWeight = "normal";
            zIndex = "10";
            break;
          case "final":
            bgColor = "rgba(216, 112, 112, 0.8)"; // Light Gray with transparency
            textColor = "#000000";
            fontSize = "12px";
            fontWeight = "normal";
            zIndex = "10";
            break;
          default:
            bgColor = "rgba(255, 255, 255, 0.8)";
            textColor = "#000000";
            fontSize = "12px";
            fontWeight = "normal";
            zIndex = "10";
            console.warn(`Unknown task type: ${taskType} for task:`, task);
        }

        // Check visibility setting for submitted tasks
        const showSubmittedTasks = localStorage.getItem('showSubmittedTasks') !== 'false';
        if (task.status === 'submitted' && !showSubmittedTasks) {
          row.style.display = 'none'; // Hide the entire row
          cell.style.backgroundColor = 'transparent';
          return;
        }

        // Apply base styles to the cell
        cell.style.cssText = `
          background-color: ${bgColor};
          color: ${textColor};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          z-index: ${zIndex};
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-height: 28px;
          max-height: 32px;
          height: 30px;
          width: 40px;
          margin: 2px 0;
          padding: 2px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          white-space: normal;
          word-wrap: break-word;
          position: relative;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        `;

        // Apply border radius only to outer corners of first and last cells
        if (col === fromCol) {
          cell.style.borderTopLeftRadius = '3px';
          cell.style.borderBottomLeftRadius = '3px';
        } else if (col === toCol) {
          cell.style.borderTopRightRadius = '3px';
          cell.style.borderBottomRightRadius = '3px';
        }

        // Add hover effects using event delegation
        const handleMouseEnter = () => {
          taskPeriodCells.forEach((taskCell, idx) => {
            taskCell.style.backgroundColor = bgColor.replace('0.8)', '1)');
            taskCell.style.borderTop = "2px solid rgba(255, 255, 255, 0.8)";
            taskCell.style.borderBottom = "2px solid rgba(255, 255, 255, 0.8)";
            taskCell.style.transform = "translateY(-1px)";
            taskCell.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
            taskCell.style.filter = "brightness(1.1)";

            // Maintain border radius on hover
            if (idx === 0) {
              taskCell.style.borderTopLeftRadius = '3px';
              taskCell.style.borderBottomLeftRadius = '3px';
            } else if (idx === taskPeriodCells.length - 1) {
              taskCell.style.borderTopRightRadius = '3px';
              taskCell.style.borderBottomRightRadius = '3px';
            }
          });
          taskPeriodCells[0].style.borderLeft = "2px solid rgba(255, 255, 255, 0.8)";
          taskPeriodCells[taskPeriodCells.length - 1].style.borderRight = "2px solid rgba(255, 255, 255, 0.8)";

          // Add glow effect
          taskPeriodCells.forEach((taskCell, idx) => {
            if (idx === 0) {
              taskCell.style.boxShadow = "0 4px 8px rgba(255, 255, 255, 0.2), -2px 0 4px rgba(255, 255, 255, 0.1)";
            } else if (idx === taskPeriodCells.length - 1) {
              taskCell.style.boxShadow = "0 4px 8px rgba(255, 255, 255, 0.2), 2px 0 4px rgba(255, 255, 255, 0.1)";
            } else {
              taskCell.style.boxShadow = "0 4px 8px rgba(255, 255, 255, 0.2)";
            }
          });
        };

        const handleMouseLeave = () => {
          taskPeriodCells.forEach((taskCell, idx) => {
            taskCell.style.backgroundColor = bgColor;
            taskCell.style.borderTop = "1px solid rgba(255, 255, 255, 0.1)";
            taskCell.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
            taskCell.style.transform = "translateY(0)";
            taskCell.style.filter = "brightness(1)";

            // Reset box shadow but maintain border radius
            if (idx === 0) {
              taskCell.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
              taskCell.style.borderTopLeftRadius = '3px';
              taskCell.style.borderBottomLeftRadius = '3px';
            } else if (idx === taskPeriodCells.length - 1) {
              taskCell.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
              taskCell.style.borderTopRightRadius = '3px';
              taskCell.style.borderBottomRightRadius = '3px';
            } else {
              taskCell.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
              taskCell.style.borderRadius = '0';
            }
          });
          taskPeriodCells[0].style.borderLeft = "1px solid rgba(255, 255, 255, 0.1)";
          taskPeriodCells[taskPeriodCells.length - 1].style.borderRight = "1px solid rgba(255, 255, 255, 0.1)";
        };

        cell.addEventListener("mouseenter", handleMouseEnter);
        cell.addEventListener("mouseleave", handleMouseLeave);

        // Set cell title for tooltip
        cell.title = `${task.title} - ${courseName}`;

        // Apply styling for the period between actual_start_date and actual_end_date
        if (col >= actualStartCol && col <= actualEndCol && actualEndCol >= todayCol) {
          cell.classList.add('actual-date-cell');
        }

        // --- First cell of the task period ---
        if (col === fromCol) {
          cell.style.textAlign = "center";
          cell.style.zIndex = 50;

          // Calculate the difference in days between today and the task's end date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // If last cell of the task period is larger than and equal to today
          if (diff >= 0 && toCol <= today) {
            cell.textContent = diffText;
          } else {
            cell.textContent = "";
          }
        }

        // --- 3rd cell of the task period ---
        if (toCol - fromCol >= 5 && col === fromCol + 2) {
          cell.style.whiteSpace = "nowrap";
          cell.style.textAlign = "center";
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
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;
          cell.textContent = diffText;
        }

        // --- For cells matching the last cell ---
        if (col === toCol) {
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;

          // Calculate the difference in days between today and the task's end date
          const cellDate = addDays(window.startDateForMatrix, col);
          let diff = Math.floor((cellDate - today) / (1000 * 60 * 60 * 24));

          // If last cell of the task period is larger than and equal to today
          if (diff <= 0) {
            taskPeriodCells.forEach(taskCell => {
              taskCell.style.backgroundColor = "rgba(196, 196, 196, 0.1)";
              taskCell.style.color = "rgba(255, 255, 255, 0.5)";
              taskCell.style.fontSize = "12px";
            });
            cell.textContent = `${task.title} | ${courseName}`;
          } else {
            cell.textContent = diff;
          }
        }

        // --- For cells matching the actual start/end dates ---
        if ((col === actualStartCol || col === actualEndCol) && actualEndCol >= todayCol) {
          cell.classList.add('actual-date-cell');
          if (col === actualStartCol) {
            cell.classList.add('actual-start-date-cell');
          }
          if (col === actualEndCol) {
            cell.classList.add('actual-end-date-cell');
          }
          cell.style.textAlign = "center";
          cell.style.padding = "2px";
          cell.style.zIndex = 50;
          cell.textContent = diffText;
        }
      }

      console.log(`Highlighted ${taskPeriodCells.length} cells for task "${task.title}" (${taskType})`);
      console.log(`Suggested Date: ${suggestedStr}, Actual Start Date: ${actualStartStr}, Actual End Date: ${actualEndStr}`);
    });
  }

  function calculateTodayColumn() {
    // Logic to calculate the column index for today
    // This is a placeholder function, replace with actual logic
    return 0; // Example: return the index of today's column
  }

  // ───────────────────────────────────────────────
  // Expose the functions globally so they can be called from elsewhere.
  window.clearHolidayCellHighlights = clearHolidayCellHighlights;
  window.clearTaskCellHighlights = clearTaskCellHighlights;
  window.highlightHolidayRows = highlightHolidayRows;
  window.highlightTaskRows = highlightTaskRows;
})();