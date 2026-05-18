const EPSILON = 1e-9;
const BIG_M_SYMBOL = "M";
const NUMBER_FORMAT = "fraction";
const RELATION_SEQUENCE = ["<=", ">=", "="];
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const THEME = {
  graphConstraintColors: ["#a8a8a8", "#7f7f7f"],
  graphFaceColors: ["rgba(140, 140, 140, 0.18)", "rgba(90, 90, 90, 0.2)"],
  graphBindingColor: "#E8E8E8",
  graphGrid: "rgba(232, 232, 232, 0.14)",
  graphLabel: "#b6b6b6",
  graphAxis: "#E8E8E8",
  graphObjective: "#ff3b30",
  graphRegionFill: "rgba(68, 88, 204, 0.6)",
  graphRegionStroke: "rgba(225, 232, 255, 0.86)",
  graphFaceBinding: "rgba(232, 232, 232, 0.16)",
  graphFaceAxis: "rgba(255, 255, 255, 0.06)",
  graphFaceStroke: "rgba(232, 232, 232, 0.14)",
  graphEdge: "rgba(232, 232, 232, 0.5)",
  graphGuide: "rgba(232, 232, 232, 0.22)",
  graphVertexFill: "rgba(8, 13, 12, 0.98)",
  graphVertexOptimumFill: "#4a4a4a",
  exportBaseStart: "#262626",
  exportBaseEnd: "#212121",
  exportGlow: "#a0a0a0"
};

const assignmentState = {
  rowCount: 5,
  columnCount: 5,
  objectiveType: "min",
  activeExample: "minimum",
  costs: [
    [7, 3, 5, 2, 4],
    [2, 6, 3, 1, 5],
    [4, 1, 3, 2, 4],
    [3, 4, 1, 3, 6],
    [4, 5, 7, 4, 5]
  ]
};

const ASSIGNMENT_PRESETS = {
  minimum: {
    rowCount: 5,
    columnCount: 5,
    objectiveType: "min",
    costs: [
      [7, 3, 5, 2, 4],
      [2, 6, 3, 1, 5],
      [4, 1, 3, 2, 4],
      [3, 4, 1, 3, 6],
      [4, 5, 7, 4, 5]
    ]
  },
  maximum: {
    rowCount: 4,
    columnCount: 4,
    objectiveType: "max",
    costs: [
      [8, 9, 10, 3],
      [4, 6, 5, 3],
      [4, 5, 9, 3],
      [1, 2, 1, 3]
    ]
  }
};

const assignmentForm = document.getElementById("assignment-form");
const assignmentRowCountInput = document.getElementById("assignment-row-count");
const assignmentColumnCountInput = document.getElementById("assignment-column-count");
const assignmentModeButtons = Array.from(document.querySelectorAll("[data-assignment-mode]"));
const assignmentLoadMinimumButton = document.getElementById("assignment-load-minimum-button");
const assignmentLoadMaximumButton = document.getElementById("assignment-load-maximum-button");
const assignmentExampleButtons = Array.from(document.querySelectorAll("[data-assignment-example]"));
const assignmentClearButton = document.getElementById("assignment-clear-button");
const assignmentGrid = document.getElementById("assignment-grid");
const assignmentResults = document.getElementById("assignment-results");

const hasAssignmentPage = Boolean(
  assignmentRowCountInput &&
  assignmentColumnCountInput &&
  assignmentForm &&
  assignmentGrid &&
  assignmentResults
);

function scrollPageToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function resetInitialScrollPosition() {
  requestAnimationFrame(() => {
    scrollPageToTop();
    requestAnimationFrame(scrollPageToTop);
  });
}

window.addEventListener("pageshow", resetInitialScrollPosition);
window.addEventListener("load", resetInitialScrollPosition);

function formatNumber(value) {
  if (Math.abs(value) < EPSILON) {
    return "0";
  }

  const rounded = roundDecimal(value, 3);

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(3).replace(/\.?0+$/, "");
}

function roundDecimal(value, decimals = 3) {
  const factor = 10 ** decimals;
  const offset = Number.EPSILON * Math.sign(value || 1);
  return Math.round((value + offset) * factor) / factor;
}

function formatCompactDisplayNumber(value) {
  if (Math.abs(value) >= 1000000) {
    const compact = roundDecimal(value / 1000000, 2);

    if (Number.isInteger(compact)) {
      return `${compact}M`;
    }

    return `${compact.toFixed(2).replace(/\.?0+$/, "")}M`;
  }

  return formatNumber(value);
}

function computeGreatestCommonDivisor(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }

  return left || 1;
}

function isExactRationalValue(value) {
  return value != null && typeof value === "object" && (
    Object.prototype.hasOwnProperty.call(value, "numerator") &&
    Object.prototype.hasOwnProperty.call(value, "denominator")
  );
}

function createExactRational(numerator, denominator = 1) {
  if (denominator === 0) {
    throw new Error("No se puede crear una fraccion con denominador cero.");
  }

  const normalizedNumerator = Math.round(numerator);
  const normalizedDenominator = Math.round(denominator);
  const sign = normalizedDenominator < 0 ? -1 : 1;
  const divisor = computeGreatestCommonDivisor(normalizedNumerator, normalizedDenominator);

  return {
    numerator: sign * (normalizedNumerator / divisor),
    denominator: sign * (normalizedDenominator / divisor)
  };
}

function exactRationalFromNumber(value) {
  if (isExactRationalValue(value)) {
    return { ...value };
  }

  if (!Number.isFinite(value)) {
    return createExactRational(0, 1);
  }

  if (Number.isInteger(value)) {
    return createExactRational(value, 1);
  }

  const asString = String(value).includes("e") || String(value).includes("E")
    ? value.toFixed(12).replace(/0+$/, "").replace(/\.$/, "")
    : String(value);
  const sign = asString.startsWith("-") ? -1 : 1;
  const unsigned = asString.replace(/^[+-]/, "");
  const [integerPart, decimalPart = ""] = unsigned.split(".");

  if (!decimalPart) {
    return createExactRational(sign * Number(integerPart || "0"), 1);
  }

  const denominator = 10 ** decimalPart.length;
  const numerator = (Number(integerPart || "0") * denominator) + Number(decimalPart);
  return createExactRational(sign * numerator, denominator);
}

function exactRationalToNumber(value) {
  const rational = exactRationalFromNumber(value);
  return rational.numerator / rational.denominator;
}

function exactIsZeroRational(value) {
  return exactRationalFromNumber(value).numerator === 0;
}

function formatExactRational(value) {
  const rational = exactRationalFromNumber(value);

  if (NUMBER_FORMAT !== "fraction") {
    return formatCompactDisplayNumber(exactRationalToNumber(rational));
  }

  if (rational.denominator === 1) {
    return String(rational.numerator);
  }

  return `${rational.numerator}/${rational.denominator}`;
}

function formatFractionNumber(value) {
  if (Math.abs(value) < EPSILON) {
    return "0";
  }

  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const rounded = Math.round(absolute * 1000) / 1000;

  if (Number.isInteger(rounded)) {
    return `${sign}${rounded}`;
  }

  const scaledNumerator = Math.round(rounded * 1000);
  const scaledDenominator = 1000;
  const divisor = computeGreatestCommonDivisor(scaledNumerator, scaledDenominator);
  const numerator = scaledNumerator / divisor;
  const denominator = scaledDenominator / divisor;

  return `${sign}${numerator}/${denominator}`;
}

function formatDisplayNumber(value) {
  return NUMBER_FORMAT === "fraction"
    ? formatFractionNumber(value)
    : formatCompactDisplayNumber(value);
}

function isBigMValue(value) {
  return value != null && typeof value === "object" && (
    Object.prototype.hasOwnProperty.call(value, "constant") ||
    Object.prototype.hasOwnProperty.call(value, "bigM")
  );
}

function isExactBigMValue(value) {
  return value != null && typeof value === "object" && (
    Object.prototype.hasOwnProperty.call(value, "constant") &&
    Object.prototype.hasOwnProperty.call(value, "bigM") &&
    (isExactRationalValue(value.constant) || isExactRationalValue(value.bigM))
  );
}

function toBigMParts(value) {
  if (isBigMValue(value)) {
    return {
      constant: cleanNumber(Number(value.constant) || 0),
      bigM: cleanNumber(Number(value.bigM) || 0)
    };
  }

  return {
    constant: cleanNumber(Number(value) || 0),
    bigM: 0
  };
}

function formatBigMValue(value) {
  const parts = toBigMParts(value);
  const chunks = [];

  if (Math.abs(parts.bigM) > EPSILON) {
    const absBigM = Math.abs(parts.bigM);
    const coefficient = Math.abs(absBigM - 1) < EPSILON ? "" : formatDisplayNumber(absBigM);
    chunks.push(`${parts.bigM < 0 ? "-" : ""}${coefficient}${BIG_M_SYMBOL}`);
  }

  if (Math.abs(parts.constant) > EPSILON || !chunks.length) {
    const formattedConstant = formatDisplayNumber(Math.abs(parts.constant));

    if (!chunks.length) {
      chunks.push(parts.constant < 0 ? `-${formattedConstant}` : formattedConstant);
    } else {
      chunks.push(`${parts.constant < 0 ? "-" : "+"}${formattedConstant}`);
    }
  }

  return chunks.join("");
}

function toExactBigMParts(value) {
  if (isExactBigMValue(value)) {
    return {
      constant: exactRationalFromNumber(value.constant),
      bigM: exactRationalFromNumber(value.bigM)
    };
  }

  if (isBigMValue(value)) {
    return {
      constant: exactRationalFromNumber(value.constant),
      bigM: exactRationalFromNumber(value.bigM)
    };
  }

  return {
    constant: exactRationalFromNumber(value),
    bigM: createExactRational(0, 1)
  };
}

function formatExactBigMValue(value) {
  const parts = toExactBigMParts(value);
  const chunks = [];

  if (!exactIsZeroRational(parts.bigM)) {
    const sign = parts.bigM.numerator < 0 ? "-" : "";
    const absoluteBigM = createExactRational(Math.abs(parts.bigM.numerator), parts.bigM.denominator);
    const coefficient = absoluteBigM.numerator === absoluteBigM.denominator ? "" : formatExactRational(absoluteBigM);
    chunks.push(`${sign}${coefficient}${BIG_M_SYMBOL}`);
  }

  if (!exactIsZeroRational(parts.constant) || !chunks.length) {
    const sign = parts.constant.numerator < 0 ? "-" : "+";
    const absoluteConstant = createExactRational(Math.abs(parts.constant.numerator), parts.constant.denominator);
    const formattedConstant = formatExactRational(absoluteConstant);

    if (!chunks.length) {
      chunks.push(parts.constant.numerator < 0 ? `-${formattedConstant}` : formattedConstant);
    } else {
      chunks.push(`${sign}${formattedConstant}`);
    }
  }

  return chunks.join("");
}

function formatValue(value) {
  if (isExactBigMValue(value)) {
    return formatExactBigMValue(value);
  }

  if (isExactRationalValue(value)) {
    return formatExactRational(value);
  }

  return isBigMValue(value) ? formatBigMValue(value) : formatDisplayNumber(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseNumericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampDimension(value) {
  const parsed = parseInt(value, 10);
  return Math.min(10, Math.max(1, Number.isFinite(parsed) ? parsed : 1));
}

function countVisibleCharacters(value) {
  return Math.max(2, String(value ?? "").trim().length || 0);
}

function serializeAttributes(attributes) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");
}

function updateCompactInputWidth(input) {
  if (!(input instanceof HTMLInputElement) || !input.classList.contains("compact-number-input")) {
    return;
  }

  input.style.setProperty("--digits", String(countVisibleCharacters(input.value)));
}

function updateCompactInputWidths(root = assignmentForm) {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  root.querySelectorAll(".compact-number-input").forEach((input) => {
    updateCompactInputWidth(input);
  });
}


function bumpCompactInput(input, delta) {
  const isDimensionInput = input === assignmentRowCountInput || input === assignmentColumnCountInput;
  const currentValue = isDimensionInput ? clampAssignmentDimension(input.value) : parseNumericValue(input.value);
  const nextValue = isDimensionInput
    ? clampAssignmentDimension(currentValue + delta)
    : Math.round((currentValue + delta) * 1000) / 1000;

  input.value = formatNumber(nextValue);
  updateCompactInputWidth(input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}


function cleanNumber(value) {
  return Math.abs(value) < EPSILON ? 0 : value;
}

function clampAssignmentDimension(value) {
  const parsed = parseInt(value, 10);
  return Math.min(6, Math.max(1, Number.isFinite(parsed) ? parsed : 1));
}

function createAssignmentCostRow(columnCount) {
  return Array.from({ length: columnCount }, () => 0);
}

function resizeAssignmentState(nextRows, nextColumns) {
  assignmentState.rowCount = nextRows;
  assignmentState.columnCount = nextColumns;
  assignmentState.costs = Array.from({ length: nextRows }, (_, rowIndex) => {
    const source = assignmentState.costs[rowIndex] ?? createAssignmentCostRow(nextColumns);
    return Array.from({ length: nextColumns }, (_, columnIndex) => source[columnIndex] ?? 0);
  });
}

function clearAssignmentValues() {
  assignmentState.activeExample = null;
  assignmentState.costs = assignmentState.costs.map((row) => row.map(() => 0));
}

function syncAssignmentModeButtons() {
  assignmentModeButtons.forEach((button) => {
    const isActive = button.dataset.assignmentMode === assignmentState.objectiveType;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncAssignmentExampleButtons() {
  assignmentExampleButtons.forEach((button) => {
    const isActive = button.dataset.assignmentExample === assignmentState.activeExample;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setAssignmentObjectiveType(nextType, { refresh = true } = {}) {
  if (nextType !== "min" && nextType !== "max") {
    return;
  }

  if (assignmentState.objectiveType !== nextType) {
    assignmentState.activeExample = null;
  }

  assignmentState.objectiveType = nextType;
  syncAssignmentModeButtons();
  syncAssignmentExampleButtons();

  if (refresh) {
    refreshAssignmentResults();
  }
}

function applyAssignmentPreset(preset, exampleKey = null) {
  if (!preset) {
    return;
  }

  assignmentState.rowCount = preset.rowCount;
  assignmentState.columnCount = preset.columnCount;
  assignmentState.objectiveType = preset.objectiveType ?? assignmentState.objectiveType;
  assignmentState.activeExample = exampleKey;
  assignmentState.costs = preset.costs.map((row) => [...row]);

  assignmentRowCountInput.value = String(preset.rowCount);
  assignmentColumnCountInput.value = String(preset.columnCount);
  updateCompactInputWidth(assignmentRowCountInput);
  updateCompactInputWidth(assignmentColumnCountInput);
  syncAssignmentModeButtons();
  syncAssignmentExampleButtons();
  renderAssignmentGrid();
  refreshAssignmentResults();
}

function getAssignmentRowMinima(costs) {
  return costs.map((row) => (row.length ? Math.min(...row) : 0));
}

function getAssignmentColumnMinima(costs) {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length ?? 0;

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    let minimum = rowCount > 0 ? costs[0][columnIndex] : 0;

    for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
      minimum = Math.min(minimum, costs[rowIndex][columnIndex]);
    }

    return minimum;
  });
}

function getAssignmentMaximumValue(costs) {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length ?? 0;

  if (rowCount === 0 || columnCount === 0) {
    return 0;
  }

  let maximum = costs[0][0];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      maximum = Math.max(maximum, costs[rowIndex][columnIndex]);
    }
  }

  return maximum;
}

function prepareAssignmentWorkingMatrix(costs, objectiveType) {
  if (objectiveType !== "max") {
    return {
      objectiveType,
      workingCosts: cloneAssignmentMatrix(costs),
      transformed: false,
      maximumValue: null
    };
  }

  const maximumValue = getAssignmentMaximumValue(costs);

  return {
    objectiveType,
    workingCosts: costs.map((row) => row.map((value) => maximumValue - value)),
    transformed: true,
    maximumValue
  };
}

function getAssignmentMainDiagonalTotal(costs) {
  const limit = Math.min(costs.length, costs[0]?.length ?? 0);
  let total = 0;

  for (let index = 0; index < limit; index += 1) {
    total += costs[index][index];
  }

  return total;
}

function getAssignmentSecondaryDiagonalTotal(costs) {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length ?? 0;
  const limit = Math.min(rowCount, columnCount);
  let total = 0;

  for (let index = 0; index < limit; index += 1) {
    total += costs[index][columnCount - 1 - index];
  }

  return total;
}

function getAssignmentColumnMinimaPositions(costs, minima) {
  const positions = new Set();

  for (let columnIndex = 0; columnIndex < minima.length; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < costs.length; rowIndex += 1) {
      if (Math.abs((costs[rowIndex]?.[columnIndex] ?? 0) - minima[columnIndex]) < EPSILON) {
        positions.add(`${rowIndex}:${columnIndex}`);
        break;
      }
    }
  }

  return positions;
}

function getAssignmentRowMinimaPositions(costs, minima) {
  const positions = new Set();

  for (let rowIndex = 0; rowIndex < costs.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < (costs[rowIndex]?.length ?? 0); columnIndex += 1) {
      if (Math.abs(costs[rowIndex][columnIndex] - minima[rowIndex]) < EPSILON) {
        positions.add(`${rowIndex}:${columnIndex}`);
      }
    }
  }

  return positions;
}

function reduceAssignmentByColumns(costs) {
  const minima = getAssignmentColumnMinima(costs);
  return {
    minima,
    circledPositions: getAssignmentColumnMinimaPositions(costs, minima),
    reduced: costs.map((row) => row.map((value, columnIndex) => value - minima[columnIndex]))
  };
}

function reduceAssignmentByRows(costs) {
  const minima = getAssignmentRowMinima(costs);
  return {
    minima,
    circledPositions: getAssignmentRowMinimaPositions(costs, minima),
    reduced: costs.map((row, rowIndex) => row.map((value) => value - minima[rowIndex]))
  };
}

function buildAssignmentStartAttempt(costs, reductionKind, targetAssignments, startLabelNumber) {
  const reduction = reductionKind === "row"
    ? reduceAssignmentByRows(costs)
    : reduceAssignmentByColumns(costs);
  const procedureSourceLabel = formatAssignmentMatrixLabel(startLabelNumber);
  const reducedLabel = formatAssignmentMatrixLabel(startLabelNumber + 1);
  const initialMatching = getAssignmentZeroMatching(reduction.reduced);
  const iterationSequence = buildAssignmentIterationSequence(reduction.reduced, targetAssignments, startLabelNumber + 2);
  const finalMatching = getAssignmentZeroMatching(iterationSequence.finalMatrix);

  return {
    reductionKind,
    reduction,
    procedureSourceLabel,
    reducedLabel,
    initialMatchingSize: initialMatching.size,
    iterationSequence,
    finalMatchingSize: finalMatching.size
  };
}

function getAssignmentZeroMatching(costs) {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length ?? 0;
  const matchedColumns = Array.from({ length: columnCount }, () => -1);

  function tryMatch(rowIndex, visited) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      if (Math.abs(costs[rowIndex][columnIndex]) >= EPSILON || visited[columnIndex]) {
        continue;
      }

      visited[columnIndex] = true;

      if (matchedColumns[columnIndex] === -1 || tryMatch(matchedColumns[columnIndex], visited)) {
        matchedColumns[columnIndex] = rowIndex;
        return true;
      }
    }

    return false;
  }

  let size = 0;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    if (tryMatch(rowIndex, Array.from({ length: columnCount }, () => false))) {
      size += 1;
    }
  }

  const selectedPositions = new Set();

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    if (matchedColumns[columnIndex] !== -1) {
      selectedPositions.add(`${matchedColumns[columnIndex]}:${columnIndex}`);
    }
  }

  return { size, selectedPositions };
}

function computeAssignmentMinCover(costs) {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length ?? 0;
  const matchedColumns = Array.from({ length: columnCount }, () => -1);

  function tryMatch(rowIndex, visited) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      if (Math.abs(costs[rowIndex][columnIndex]) >= EPSILON || visited[columnIndex]) {
        continue;
      }

      visited[columnIndex] = true;

      if (matchedColumns[columnIndex] === -1 || tryMatch(matchedColumns[columnIndex], visited)) {
        matchedColumns[columnIndex] = rowIndex;
        return true;
      }
    }

    return false;
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    tryMatch(rowIndex, Array.from({ length: columnCount }, () => false));
  }

  const matchedRows = Array.from({ length: rowCount }, () => -1);

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    if (matchedColumns[columnIndex] !== -1) {
      matchedRows[matchedColumns[columnIndex]] = columnIndex;
    }
  }

  const visitedRows = Array.from({ length: rowCount }, () => false);
  const visitedColumns = Array.from({ length: columnCount }, () => false);
  const queue = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    if (matchedRows[rowIndex] === -1) {
      visitedRows[rowIndex] = true;
      queue.push({ type: "row", index: rowIndex });
    }
  }

  while (queue.length) {
    const current = queue.shift();

    if (current.type === "row") {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        if (Math.abs(costs[current.index][columnIndex]) >= EPSILON || visitedColumns[columnIndex] || matchedRows[current.index] === columnIndex) {
          continue;
        }

        visitedColumns[columnIndex] = true;
        queue.push({ type: "column", index: columnIndex });
      }

      continue;
    }

    const matchedRow = matchedColumns[current.index];

    if (matchedRow !== -1 && !visitedRows[matchedRow]) {
      visitedRows[matchedRow] = true;
      queue.push({ type: "row", index: matchedRow });
    }
  }

  return {
    rows: new Set(Array.from({ length: rowCount }, (_, rowIndex) => rowIndex).filter((rowIndex) => !visitedRows[rowIndex])),
    columns: new Set(Array.from({ length: columnCount }, (_, columnIndex) => columnIndex).filter((columnIndex) => visitedColumns[columnIndex]))
  };
}

function computeAssignmentSubmatrixData(costs, cover) {
  const uncovered = { label: "Sin tachar", key: "uncovered", cells: [], min: null };
  const uncoveredKeys = new Set();
  const uncoveredIslands = [];

  for (let rowIndex = 0; rowIndex < costs.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < (costs[rowIndex]?.length ?? 0); columnIndex += 1) {
      const hasRow = cover.rows.has(rowIndex);
      const hasColumn = cover.columns.has(columnIndex);

      if (hasRow || hasColumn) {
        continue;
      }

      const value = costs[rowIndex][columnIndex];
      uncovered.cells.push({ rowIndex, columnIndex, value });
      uncoveredKeys.add(`${rowIndex}:${columnIndex}`);
      uncovered.min = uncovered.min == null ? value : Math.min(uncovered.min, value);
    }
  }

  const visited = new Set();
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  uncovered.cells.forEach((cell) => {
    const startKey = `${cell.rowIndex}:${cell.columnIndex}`;

    if (visited.has(startKey)) {
      return;
    }

    const island = {
      key: `island-${uncoveredIslands.length + 1}`,
      cells: [],
      min: null
    };
    const queue = [cell];
    visited.add(startKey);

    while (queue.length) {
      const current = queue.shift();
      const currentKey = `${current.rowIndex}:${current.columnIndex}`;

      island.cells.push(current);
      island.min = island.min == null ? current.value : Math.min(island.min, current.value);

      directions.forEach(([rowDelta, columnDelta]) => {
        const nextRow = current.rowIndex + rowDelta;
        const nextColumn = current.columnIndex + columnDelta;
        const nextKey = `${nextRow}:${nextColumn}`;

        if (visited.has(nextKey) || !uncoveredKeys.has(nextKey)) {
          return;
        }

        visited.add(nextKey);
        queue.push({
          rowIndex: nextRow,
          columnIndex: nextColumn,
          value: costs[nextRow][nextColumn]
        });
      });
    }

    uncoveredIslands.push(island);
  });

  return {
    uncovered,
    uncoveredIslands,
    uncoveredKeys
  };
}

function getAssignmentIslandMinPositions(groups) {
  const positions = new Set();

  if (!groups?.uncoveredIslands?.length) {
    return positions;
  }

  groups.uncoveredIslands.forEach((island) => {
    const selectedCell = island.cells.reduce((bestCell, cell) => {
      if (Math.abs(cell.value - island.min) >= EPSILON) {
        return bestCell;
      }

      if (
        bestCell == null
        || cell.rowIndex < bestCell.rowIndex
        || (cell.rowIndex === bestCell.rowIndex && cell.columnIndex < bestCell.columnIndex)
      ) {
        return cell;
      }

      return bestCell;
    }, null);

    if (selectedCell) {
      positions.add(`${selectedCell.rowIndex}:${selectedCell.columnIndex}`);
    }
  });

  return positions;
}

function applyAssignmentMarginalRule(costs, cover, marginal) {
  return costs.map((row, rowIndex) => row.map((value, columnIndex) => {
    const coverCount = (cover.rows.has(rowIndex) ? 1 : 0) + (cover.columns.has(columnIndex) ? 1 : 0);

    if (coverCount === 0) {
      return value - marginal;
    }

    if (coverCount === 2) {
      return value + marginal;
    }

    return value;
  }));
}

function formatAssignmentMatrixLabel(value) {
  return String(value).padStart(2, "0");
}

function cloneAssignmentMatrix(matrix) {
  return matrix.map((row) => row.map((value) => value));
}

function buildAssignmentIterationSequence(startMatrix, targetAssignments, startLabelNumber = 4) {
  const iterations = [];
  let currentMatrix = cloneAssignmentMatrix(startMatrix);
  let nextLabelNumber = startLabelNumber;

  for (let index = 0; index < 20; index += 1) {
    const coverData = computeAssignmentMinCover(currentMatrix);
    const coverCount = coverData.rows.size + coverData.columns.size;
    const submatrixData = computeAssignmentSubmatrixData(currentMatrix, coverData);
    const marginalValue = submatrixData.uncovered.min ?? 0;
    const coverLabel = formatAssignmentMatrixLabel(nextLabelNumber);
    nextLabelNumber += 1;
    const iteration = {
      index,
      coverLabel,
      matrix: cloneAssignmentMatrix(currentMatrix),
      coverData,
      coverCount,
      submatrixData,
      marginalValue,
      reachedTarget: coverCount >= targetAssignments
    };

    if (iteration.reachedTarget || marginalValue <= EPSILON) {
      iterations.push(iteration);
      return {
        iterations,
        finalMatrix: cloneAssignmentMatrix(currentMatrix),
        nextLabelNumber
      };
    }

    const nextMatrix = applyAssignmentMarginalRule(currentMatrix, coverData, marginalValue);
    iteration.nextMatrix = cloneAssignmentMatrix(nextMatrix);
    iteration.nextMatrixLabel = formatAssignmentMatrixLabel(nextLabelNumber);
    nextLabelNumber += 1;
    iterations.push(iteration);
    currentMatrix = nextMatrix;
  }

  return {
    iterations,
    finalMatrix: cloneAssignmentMatrix(currentMatrix),
    nextLabelNumber
  };
}

function renderAssignmentMatrix(matrix, options = {}) {
  const {
    circledPositions = new Set(),
    caption = "",
    coverRows = new Set(),
    coverColumns = new Set(),
    submatrixGroups = null,
    essentialPositions = new Set(),
    crossedZeroPositions = new Set(),
    cornerLabel = "",
    greenSubmatrices = false,
    keepCoveredRed = false,
    highlightZeros = true
  } = options;
  const columnCount = matrix[0]?.length ?? 0;
  const headers = Array.from({ length: columnCount }, (_, index) => `<th>C${index + 1}</th>`).join("");
  const rowsMarkup = matrix.map((row, rowIndex) => `
    <tr>
      <th>F${rowIndex + 1}</th>
      ${row.map((value, columnIndex) => {
    const key = `${rowIndex}:${columnIndex}`;
    const isZero = Math.abs(value) < EPSILON;
    const isRowCrossed = coverRows.has(rowIndex);
    const isColumnCrossed = coverColumns.has(columnIndex);
    const isCoveredCell = isRowCrossed || isColumnCrossed;
    const isCircled = circledPositions.has(key) && !isCoveredCell;
    const isEssential = essentialPositions.has(key);
    const isCrossedZero = crossedZeroPositions.has(key);
    const isSubmatrixCell = Boolean(submatrixGroups?.uncoveredKeys?.has(key)) && !isCoveredCell;
    const submatrixClass = isSubmatrixCell
      ? greenSubmatrices
        ? "is-submatrix-green"
        : "is-submatrix-uncovered"
      : "";

    return `
          <td class="${[highlightZeros && isZero ? "is-zero" : "", isRowCrossed ? "is-row-crossed" : "", isColumnCrossed ? "is-column-crossed" : "", isCoveredCell ? "is-covered-cell" : "", submatrixClass].filter(Boolean).join(" ")}">
            <span class="assignment-matrix-value${isCircled ? " is-circled" : ""}${isEssential ? " is-essential" : ""}${isCrossedZero ? " is-crossed-zero" : ""}">${escapeHtml(formatValue(value))}</span>
          </td>
        `;
  }).join("")}
    </tr>
  `).join("");

  return `
    <div class="assignment-matrix-block">
      ${caption ? `<p class="assignment-matrix-label">${escapeHtml(caption)}</p>` : ""}
      <div class="assignment-matrix-wrap">
        <table class="assignment-matrix">
          <thead>
            <tr>
              <th>${escapeHtml(cornerLabel)}</th>
              ${headers}
            </tr>
          </thead>
          <tbody>
            ${rowsMarkup}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAssignmentPlainInput({ value, placeholder = "0", attributes = {} }) {
  const inputAttributes = serializeAttributes({
    type: "number",
    step: "any",
    value,
    placeholder,
    class: "compact-number-input transport-plain-input",
    style: `--digits: ${countVisibleCharacters(value)};`,
    ...attributes
  });

  return `<span class="transport-input-field"><input ${inputAttributes}></span>`;
}

function renderAssignmentDimensionHoverControls(axis) {
  const isRowAxis = axis === "row";
  const currentCount = isRowAxis ? assignmentState.rowCount : assignmentState.columnCount;
  const singularLabel = isRowAxis ? "fila" : "columna";
  const canAdd = currentCount < 6;
  const canRemove = currentCount > 1;

  return `
    <span class="assignment-dimension-hover-controls">
      <button class="assignment-dimension-hover-button" type="button" data-assignment-dimension-axis="${axis}" data-delta="1" aria-label="Agregar ${singularLabel}" title="Agregar ${singularLabel}" ${canAdd ? "" : "disabled"}>+</button>
      <button class="assignment-dimension-hover-button" type="button" data-assignment-dimension-axis="${axis}" data-delta="-1" aria-label="Quitar ${singularLabel}" title="Quitar ${singularLabel}" ${canRemove ? "" : "disabled"}>-</button>
    </span>
  `;
}

function adjustAssignmentDimension(axis, delta) {
  const nextRows = axis === "row"
    ? clampAssignmentDimension(assignmentState.rowCount + delta)
    : assignmentState.rowCount;
  const nextColumns = axis === "column"
    ? clampAssignmentDimension(assignmentState.columnCount + delta)
    : assignmentState.columnCount;

  if (nextRows === assignmentState.rowCount && nextColumns === assignmentState.columnCount) {
    return;
  }

  assignmentState.activeExample = null;
  syncAssignmentExampleButtons();
  resizeAssignmentState(nextRows, nextColumns);
  renderAssignmentGrid();
  refreshAssignmentResults();
}

function renderAssignmentGrid() {
  if (!hasAssignmentPage) {
    return;
  }

  const mainDiagonalTerms = [];
  const secondaryDiagonalTerms = [];
  const diagonalLimit = Math.min(assignmentState.rowCount, assignmentState.columnCount);

  for (let index = 0; index < diagonalLimit; index += 1) {
    mainDiagonalTerms.push(formatValue(assignmentState.costs[index][index]));
    secondaryDiagonalTerms.push(formatValue(assignmentState.costs[index][assignmentState.columnCount - 1 - index]));
  }

  const mainDiagonalTotal = getAssignmentMainDiagonalTotal(assignmentState.costs);
  const secondaryDiagonalTotal = getAssignmentSecondaryDiagonalTotal(assignmentState.costs);
  const columnHeaders = Array.from({ length: assignmentState.columnCount }, (_, index) => {
    const isLastColumn = index === assignmentState.columnCount - 1;
    return `
      <th class="${isLastColumn ? "assignment-dimension-cell assignment-dimension-cell-column" : ""}">
        C${index + 1}
        ${isLastColumn ? renderAssignmentDimensionHoverControls("column") : ""}
      </th>
    `;
  }).join("");
  const rowsMarkup = assignmentState.costs.map((row, rowIndex) => `
    <tr>
      <th class="transport-row-label ${rowIndex === assignmentState.rowCount - 1 ? "assignment-dimension-cell assignment-dimension-cell-row" : ""}">
        F${rowIndex + 1}
        ${rowIndex === assignmentState.rowCount - 1 ? renderAssignmentDimensionHoverControls("row") : ""}
      </th>
      ${row.map((cost, columnIndex) => `
        <td class="transport-cost-cell">
          ${renderAssignmentPlainInput({
    value: cost,
    attributes: {
      "data-scope": "assignment-cost",
      "data-row": rowIndex,
      "data-index": columnIndex,
      "aria-label": `Costo de F${rowIndex + 1} a C${columnIndex + 1}`
    }
  })}
        </td>
      `).join("")}
    </tr>
  `).join("");

  assignmentRowCountInput.value = String(assignmentState.rowCount);
  assignmentColumnCountInput.value = String(assignmentState.columnCount);
  updateCompactInputWidth(assignmentRowCountInput);
  updateCompactInputWidth(assignmentColumnCountInput);
  syncAssignmentModeButtons();
  syncAssignmentExampleButtons();

  assignmentGrid.innerHTML = `
    <div class="assignment-table-caption-row">
      <p class="transport-table-caption">Tabla de costos</p>
      <button
        class="assignment-table-info"
        type="button"
        aria-label="Como agregar o quitar filas y columnas"
        data-tooltip="Usá los botones + y - que aparecen al pasar el mouse por la última celda de la primera fila o de la primera columna."
      >i</button>
    </div>
    <div class="transport-input-wrap">
      <table class="transport-table transport-input-table">
        <thead>
          <tr>
            <th>01</th>
            ${columnHeaders}
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup}
        </tbody>
      </table>
    </div>
    <div class="assignment-inline-calcs">
      <p class="transport-balance-note"><strong>Diagonal principal:</strong> ${mainDiagonalTerms.join(" + ")} = <strong>${formatValue(mainDiagonalTotal)}</strong></p>
      <p class="transport-balance-note"><strong>Diagonal secundaria:</strong> ${secondaryDiagonalTerms.join(" + ")} = <strong>${formatValue(secondaryDiagonalTotal)}</strong></p>
    </div>
  `;

  updateCompactInputWidths(assignmentForm);
}

function renderAssignmentResults() {
  if (!hasAssignmentPage) {
    return;
  }

  const { rowCount, columnCount, costs, objectiveType } = assignmentState;
  const targetAssignments = Math.min(rowCount, columnCount);
  const preparation = prepareAssignmentWorkingMatrix(costs, objectiveType);
  const workingCosts = preparation.workingCosts;
  let nextLabelNumber = 2;
  const cards = [];

  if (preparation.transformed) {
    const transformedLabel = formatAssignmentMatrixLabel(nextLabelNumber);
    nextLabelNumber += 1;

    cards.push(`
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Transformacion a minimos</h3>
          <p>Como el ejercicio es de maximos, primero buscamos el mayor valor de tabla: <strong>${formatValue(preparation.maximumValue)}</strong>. Despues hacemos <strong>${formatValue(preparation.maximumValue)} - valor</strong> en cada celda.</p>
        </div>
        ${renderAssignmentMatrix(workingCosts, {
      cornerLabel: transformedLabel,
      caption: "Matriz equivalente para minimizar",
      highlightZeros: false
    })}
      </article>
    `);
  }

  const columnAttempt = buildAssignmentStartAttempt(workingCosts, "column", targetAssignments, nextLabelNumber);
  let failedColumnAttempt = null;
  let activeAttempt = columnAttempt;
  let fallbackMessage = "";

  if (
    columnAttempt.initialMatchingSize < targetAssignments
    && columnAttempt.finalMatchingSize < targetAssignments
  ) {
    failedColumnAttempt = columnAttempt;
    activeAttempt = buildAssignmentStartAttempt(workingCosts, "row", targetAssignments, nextLabelNumber + 2);
    fallbackMessage = `Se intento primero por columnas, pero aun despues de las iteraciones no se llego a ${targetAssignments} ceros independientes. Entonces conviene reiniciar por filas.`;
  }

  const { reduction: initialReduction, reductionKind, procedureSourceLabel, reducedLabel, iterationSequence } = activeAttempt;
  const essentialMatrix = iterationSequence.finalMatrix;
  const essentialMatching = getAssignmentZeroMatching(essentialMatrix);
  const essentialOriginalValues = Array.from(essentialMatching.selectedPositions).map((key) => {
    const [rowIndex, columnIndex] = key.split(":").map(Number);

    return {
      rowIndex,
      columnIndex,
      value: costs[rowIndex][columnIndex]
    };
  });
  const essentialOriginalSum = essentialOriginalValues.reduce((sum, item) => sum + item.value, 0);
  const crossedZeroPositions = new Set();

  for (let rowIndex = 0; rowIndex < essentialMatrix.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < (essentialMatrix[rowIndex]?.length ?? 0); columnIndex += 1) {
      const key = `${rowIndex}:${columnIndex}`;

      if (Math.abs(essentialMatrix[rowIndex][columnIndex]) < EPSILON && !essentialMatching.selectedPositions.has(key)) {
        crossedZeroPositions.add(key);
      }
    }
  }
  nextLabelNumber = iterationSequence.nextLabelNumber;
  const essentialMatrixLabel = formatAssignmentMatrixLabel(nextLabelNumber);
  nextLabelNumber += 1;
  const originalEssentialLabel = formatAssignmentMatrixLabel(nextLabelNumber);
  const zLabel = essentialMatching.size === targetAssignments
    ? objectiveType === "max"
      ? "Z maximo"
      : "Z minimo"
    : "Suma actual";
  const originalSumExpression = essentialOriginalValues.length
    ? essentialOriginalValues.map((item) => `${formatValue(item.value)}`).join(" + ")
    : "0";
  const iterationSections = iterationSequence.iterations.map((iteration) => {
    const isFirstIteration = iteration.index === 0;
    const circledPositions = getAssignmentIslandMinPositions(iteration.submatrixData);

    return `
      <section class="assignment-iteration-step">
        <div class="transport-card-copy">
          ${isFirstIteration
      ? `<p>Se comienzan las iteraciones tachando los ceros. Priorizamos tachar las filas o columnas que tengan mas ceros. En caso de que haya dos filas/columnas con la misma cantidad, cualquiera sirve. Tambien priorizamos tachar en el mismo sentido para evitar cruces de tachaduras.</p>`
      : `<p>Nuevamente tachamos los ceros</p>`}
        </div>
        ${renderAssignmentMatrix(iteration.matrix, {
      cornerLabel: iteration.coverLabel,
      circledPositions,
      coverRows: iteration.coverData.rows,
      coverColumns: iteration.coverData.columns,
      submatrixGroups: iteration.submatrixData,
      greenSubmatrices: !isFirstIteration
    })}
        ${iteration.reachedTarget
      ? `<div class="assignment-message-card is-success">Ahora si se cumple la condicion de corte: <strong>${iteration.coverCount}</strong> tachaduras = <strong>n = ${targetAssignments}</strong>.</div>`
      : `
          <div class="assignment-message-card is-danger">Todavia no se cumple la condicion porque la cantidad de tachaduras no llega a ${targetAssignments}. Hay que seguir iterando.</div>
          <div class="assignment-message-card is-warning assignment-message-card-with-icon"><span class="assignment-inline-info-icon" aria-hidden="true">i</span><span>Si la celda no esta tachada, se le resta valor marginal. Si tiene 1 tachadura, queda igual. Si tiene 2 tachaduras, se le suma valor marginal.</span></div>
          <p class="transport-balance-note"><strong>Valor marginal:</strong> <strong>${formatValue(iteration.marginalValue)}</strong>.</p>
          ${iteration.nextMatrix ? renderAssignmentMatrix(iteration.nextMatrix, {
        cornerLabel: iteration.nextMatrixLabel,
        caption: "Matriz luego de aplicar valor marginal"
      }) : ""}
        `}
      </section>
    `;
  }).join("");

  const failedColumnMarkup = failedColumnAttempt
    ? `
        <div class="transport-card-copy">
          <p>Primero intentamos por columnas.</p>
        </div>
        <div class="assignment-matrix-group">
          ${renderAssignmentMatrix(workingCosts, {
      cornerLabel: failedColumnAttempt.procedureSourceLabel,
      caption: preparation.transformed
        ? "Matriz equivalente con minimos por columna"
        : "Matriz original con minimos por columna",
      circledPositions: failedColumnAttempt.reduction.circledPositions,
      highlightZeros: false
    })}
          ${renderAssignmentMatrix(failedColumnAttempt.reduction.reduced, {
      cornerLabel: failedColumnAttempt.reducedLabel,
      caption: "Matriz luego de restar minimos por columna"
    })}
        </div>
      `
    : "";

  cards.push(`
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>${reductionKind === "row" ? "Procedimiento por filas" : "Procedimiento por columnas"}</h3>
          ${fallbackMessage ? `<p>${escapeHtml(fallbackMessage)}</p>` : ""}
        </div>
        ${failedColumnMarkup}
        ${failedColumnAttempt ? `<div class="transport-card-copy"><p>Entonces reiniciamos desde tabla original y probamos por filas, porque por columnas no aparecen suficientes ceros independientes para armar buena base inicial.</p></div>` : ""}
        <div class="assignment-matrix-group">
          ${renderAssignmentMatrix(workingCosts, {
    cornerLabel: procedureSourceLabel,
    caption: preparation.transformed
      ? `Matriz equivalente con minimos por ${reductionKind === "row" ? "fila" : "columna"}`
      : `Matriz original con minimos por ${reductionKind === "row" ? "fila" : "columna"}`,
    circledPositions: initialReduction.circledPositions,
    highlightZeros: false
  })}
          ${renderAssignmentMatrix(initialReduction.reduced, {
    cornerLabel: reducedLabel,
    caption: `Matriz luego de restar minimos por ${reductionKind === "row" ? "fila" : "columna"}`
  })}
        </div>
      </article>
    `);
  cards.push(`
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Iteraciones</h3>
        </div>
        <div class="assignment-iteration-stack">
          ${iterationSections}
        </div>
      </article>
    `);
  cards.push(`
      <article class="transport-card">
        <div class="transport-card-copy">
          <p class="section-kicker">Ceros esenciales</p>
          <h3>Matriz final de ceros</h3>
          <p>Ahora necesitamos un cero esencial por cada fila y por cada columna.</p>
          <p>Ceros esenciales: son los ceros que no comparten su fila ni su columna con otro cero.</p>
          <p>Primero marcamos los que se formaron de manera natural.</p>
          <p>Si todavia no alcanza, generamos los que faltan. Para eso elegimos ceros que sean independientes por fila o independientes por columna, o sea, ceros que esten solos en la fila o en la columna. Una vez elegido un cero independiente, tachamos los ceros que esten en la misma fila o columna. Esos ceros tachados ya no pueden elegirse como esenciales.</p>
        </div>
        ${renderAssignmentMatrix(essentialMatrix, {
    cornerLabel: essentialMatrixLabel,
    caption: "Matriz final de ceros",
    essentialPositions: essentialMatching.selectedPositions,
    crossedZeroPositions
  })}
        <div class="transport-card-copy">
          <h3>Matriz inicial con esenciales</h3>
          <p>Busco los costos, en la posicion de los ceros esenciales, en la matriz original.</p>
        </div>
        ${renderAssignmentMatrix(costs, {
    cornerLabel: originalEssentialLabel,
    essentialPositions: essentialMatching.selectedPositions
  })}
        <p class="transport-balance-note"><strong>${zLabel}</strong> = ${originalSumExpression} = <strong>${formatValue(essentialOriginalSum)}</strong>${essentialMatching.size === targetAssignments ? "" : "."}</p>
        ${essentialMatching.size === targetAssignments ? "" : `<p class="transport-balance-note">Todavia faltan ${targetAssignments - essentialMatching.size} asignacion${targetAssignments - essentialMatching.size === 1 ? "" : "es"} para cerrar Z final.</p>`}
      </article>
    `);

  assignmentResults.innerHTML = cards.join("");
}

function refreshAssignmentResults() {
  if (!hasAssignmentPage) {
    return;
  }

  renderAssignmentResults();
}

function syncAssignmentDimensionsFromInputs({ normalize = false } = {}) {
  if (assignmentRowCountInput.value === "" || assignmentColumnCountInput.value === "") {
    return;
  }

  const rows = clampAssignmentDimension(assignmentRowCountInput.value);
  const columns = clampAssignmentDimension(assignmentColumnCountInput.value);

  if (normalize) {
    assignmentRowCountInput.value = String(rows);
    assignmentColumnCountInput.value = String(columns);
  }

  if (rows === assignmentState.rowCount && columns === assignmentState.columnCount) {
    return;
  }

  assignmentState.activeExample = null;
  resizeAssignmentState(rows, columns);
  renderAssignmentGrid();
  refreshAssignmentResults();
}

window.addEventListener("pageshow", resetInitialScrollPosition);
window.addEventListener("load", resetInitialScrollPosition);

assignmentModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextType = button.dataset.assignmentMode;

    if (!nextType || nextType === assignmentState.objectiveType) {
      return;
    }

    setAssignmentObjectiveType(nextType);
  });
});

[assignmentRowCountInput, assignmentColumnCountInput].filter((input) => input instanceof HTMLInputElement).forEach((input) => {
  input.addEventListener("input", () => {
    syncAssignmentDimensionsFromInputs();
  });

  input.addEventListener("change", () => {
    syncAssignmentDimensionsFromInputs({ normalize: true });
  });
});

assignmentForm?.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  updateCompactInputWidth(target);

  if (target.dataset.scope !== "assignment-cost") {
    return;
  }

  const rowIndex = Number(target.dataset.row);
  const columnIndex = Number(target.dataset.index);
  assignmentState.activeExample = null;
  syncAssignmentExampleButtons();
  assignmentState.costs[rowIndex][columnIndex] = parseNumericValue(target.value);
  refreshAssignmentResults();
});

assignmentForm?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const dimensionButton = target.closest(".assignment-dimension-hover-button");

  if (dimensionButton instanceof HTMLButtonElement) {
    adjustAssignmentDimension(dimensionButton.dataset.assignmentDimensionAxis, Number(dimensionButton.dataset.delta));
    return;
  }

  const stepperButton = target.closest(".mini-stepper-button");

  if (!(stepperButton instanceof HTMLButtonElement)) {
    return;
  }

  const parent = stepperButton.parentElement?.parentElement;
  const input = parent?.querySelector("input");

  if (input instanceof HTMLInputElement) {
    bumpCompactInput(input, Number(stepperButton.dataset.delta));
  }
});

assignmentClearButton?.addEventListener("click", () => {
  clearAssignmentValues();
  renderAssignmentGrid();
  refreshAssignmentResults();
});

assignmentLoadMinimumButton?.addEventListener("click", () => {
  applyAssignmentPreset(ASSIGNMENT_PRESETS.minimum, "minimum");
});

assignmentLoadMaximumButton?.addEventListener("click", () => {
  applyAssignmentPreset(ASSIGNMENT_PRESETS.maximum, "maximum");
});

if (hasAssignmentPage) {
  resizeAssignmentState(assignmentState.rowCount, assignmentState.columnCount);
  renderAssignmentGrid();
  refreshAssignmentResults();
}
