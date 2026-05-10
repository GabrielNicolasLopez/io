const EPSILON = 1e-9;
const BIG_M_SYMBOL = "M";
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

const state = {
  variableCount: 2,
  constraintCount: 4,
  numberFormat: "fraction",
  objectiveType: "max",
  objectiveCoefficients: [4, 5],
  constraints: [
    { coefficients: [10, 4], relation: ">=", rhs: 3600 },
    { coefficients: [2, 1], relation: "<=", rhs: 1200 },
    { coefficients: [1, 0], relation: "<=", rhs: 500 },
    { coefficients: [1, 2], relation: ">=", rhs: 1000 }
  ]
};

const transportState = {
  originCount: 3,
  destinationCount: 4,
  offers: [30, 27, 23],
  demands: [14, 21, 35, 10],
  costs: [
    [12, 16, 13, 19],
    [14, 11, 9, 17],
    [12, 16, 7, 14]
  ]
};

const TRANSPORT_PRESETS = {
  simple: {
    originCount: 3,
    destinationCount: 4,
    offers: [30, 27, 23],
    demands: [14, 21, 35, 10],
    costs: [
      [12, 16, 13, 19],
      [14, 11, 9, 17],
      [12, 16, 7, 14]
    ]
  },
  circuit: {
    originCount: 4,
    destinationCount: 6,
    offers: [100, 250, 300, 180],
    demands: [70, 130, 140, 150, 150, 190],
    costs: [
      [8, 5, 2, 7, 3, 9],
      [5, 7, 4, 5, 8, 6],
      [9, 3, 6, 4, 2, 7],
      [11, 8, 2, 5, 1, 9]
    ]
  },
  degenerate: {
    originCount: 3,
    destinationCount: 4,
    offers: [200, 100, 500],
    demands: [100, 100, 200, 400],
    costs: [
      [4, 6, 7, 5],
      [12, 8, 9, 3],
      [6, 2, 9, 2]
    ]
  }
};

const TRANSPORT_HIGHLIGHT_COLORS = [
  "rgba(226, 179, 107, 0.22)",
  "rgba(138, 216, 255, 0.2)",
  "rgba(160, 230, 174, 0.2)",
  "rgba(255, 143, 132, 0.2)",
  "rgba(200, 180, 255, 0.2)",
  "rgba(255, 214, 120, 0.2)"
];

const variableCountInput = document.getElementById("variable-count");
const constraintCountInput = document.getElementById("constraint-count");
const objectiveToggle = document.getElementById("objective-toggle");
const displayModeButtons = Array.from(document.querySelectorAll(".display-mode-button"));
const objectiveExpression = document.getElementById("objective-expression");
const constraintsList = document.getElementById("constraints-list");
const simplexForm = document.getElementById("simplex-form");
const resultSummary = document.getElementById("result-summary");
const graphPanel = document.getElementById("graph-panel");
const iterationGroups = document.getElementById("iteration-groups");
const transportForm = document.getElementById("transport-form");
const transportOriginCountInput = document.getElementById("transport-origin-count");
const transportDestinationCountInput = document.getElementById("transport-destination-count");
const transportLoadSimpleButton = document.getElementById("transport-load-simple-button");
const transportLoadCircuitButton = document.getElementById("transport-load-circuit-button");
const transportLoadDegenerateButton = document.getElementById("transport-load-degenerate-button");
const transportClearButton = document.getElementById("transport-clear-button");
const transportGrid = document.getElementById("transport-grid");
const transportResults = document.getElementById("transport-results");
const hasSimplexPage = Boolean(
  variableCountInput &&
  constraintCountInput &&
  objectiveToggle &&
  objectiveExpression &&
  constraintsList &&
  simplexForm &&
  resultSummary &&
  graphPanel &&
  iterationGroups
);
const hasTransportPage = Boolean(
  transportOriginCountInput &&
  transportDestinationCountInput &&
  transportForm &&
  transportGrid &&
  transportResults
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

function createEmptyConstraint(variableCount) {
  return {
    coefficients: Array.from({ length: variableCount }, () => 0),
    relation: "<=",
    rhs: 0
  };
}

function resizeState(nextVariables, nextConstraints) {
  state.variableCount = nextVariables;
  state.constraintCount = nextConstraints;
  state.objectiveCoefficients = Array.from({ length: nextVariables }, (_, index) => state.objectiveCoefficients[index] ?? 0);
  state.constraints = Array.from({ length: nextConstraints }, (_, rowIndex) => {
    const source = state.constraints[rowIndex] ?? createEmptyConstraint(nextVariables);
    return {
      coefficients: Array.from({ length: nextVariables }, (_, columnIndex) => source.coefficients[columnIndex] ?? 0),
      relation: source.relation ?? "<=",
      rhs: source.rhs ?? 0
    };
  });
}

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

function exactAddRational(left, right) {
  const first = exactRationalFromNumber(left);
  const second = exactRationalFromNumber(right);

  return createExactRational(
    (first.numerator * second.denominator) + (second.numerator * first.denominator),
    first.denominator * second.denominator
  );
}

function exactSubtractRational(left, right) {
  const first = exactRationalFromNumber(left);
  const second = exactRationalFromNumber(right);

  return createExactRational(
    (first.numerator * second.denominator) - (second.numerator * first.denominator),
    first.denominator * second.denominator
  );
}

function exactMultiplyRational(left, right) {
  const first = exactRationalFromNumber(left);
  const second = exactRationalFromNumber(right);

  return createExactRational(
    first.numerator * second.numerator,
    first.denominator * second.denominator
  );
}

function exactDivideRational(left, right) {
  const first = exactRationalFromNumber(left);
  const second = exactRationalFromNumber(right);

  if (second.numerator === 0) {
    throw new Error("No se puede dividir por cero.");
  }

  return createExactRational(
    first.numerator * second.denominator,
    first.denominator * second.numerator
  );
}

function exactIsZeroRational(value) {
  return exactRationalFromNumber(value).numerator === 0;
}

function formatExactRational(value) {
  const rational = exactRationalFromNumber(value);

  if (state.numberFormat !== "fraction") {
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
  return state.numberFormat === "fraction"
    ? formatFractionNumber(value)
    : formatCompactDisplayNumber(value);
}

function formatGraphNumber(value) {
  return formatCompactDisplayNumber(value);
}

function formatExtendedNumber(value) {
  if (value === Number.POSITIVE_INFINITY) {
    return "∞";
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return "-∞";
  }

  return formatDisplayNumber(value);
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

function normalizeBigMValue(value) {
  const parts = toBigMParts(value);

  if (Math.abs(parts.bigM) < EPSILON) {
    return cleanNumber(parts.constant);
  }

  return parts;
}

function cloneCellValue(value) {
  return isBigMValue(value) ? { ...toBigMParts(value) } : value;
}

function isZeroValue(value) {
  if (isExactRationalValue(value) || isExactBigMValue(value)) {
    return exactCompareValueToZero(value) === 0;
  }

  const parts = toBigMParts(value);
  return Math.abs(parts.constant) < EPSILON && Math.abs(parts.bigM) < EPSILON;
}

function negateValue(value) {
  const parts = toBigMParts(value);
  return normalizeBigMValue({
    constant: parts.constant * -1,
    bigM: parts.bigM * -1
  });
}

function addValues(left, right) {
  const leftParts = toBigMParts(left);
  const rightParts = toBigMParts(right);
  return normalizeBigMValue({
    constant: leftParts.constant + rightParts.constant,
    bigM: leftParts.bigM + rightParts.bigM
  });
}

function subtractValues(left, right) {
  return addValues(left, negateValue(right));
}

function multiplyValues(left, right) {
  const leftParts = toBigMParts(left);
  const rightParts = toBigMParts(right);

  if (Math.abs(leftParts.bigM) > EPSILON && Math.abs(rightParts.bigM) > EPSILON) {
    throw new Error("No se admite multiplicar dos expresiones con M.");
  }

  return normalizeBigMValue({
    constant: leftParts.constant * rightParts.constant,
    bigM: (leftParts.bigM * rightParts.constant) + (rightParts.bigM * leftParts.constant)
  });
}

function divideValueByScalar(value, scalar) {
  if (Math.abs(scalar) < EPSILON) {
    throw new Error("No se puede dividir por cero.");
  }

  const parts = toBigMParts(value);
  return normalizeBigMValue({
    constant: parts.constant / scalar,
    bigM: parts.bigM / scalar
  });
}

function compareValues(left, right = 0) {
  if (
    isExactRationalValue(left) ||
    isExactBigMValue(left) ||
    isExactRationalValue(right) ||
    isExactBigMValue(right)
  ) {
    const leftParts = toExactBigMParts(left);
    const rightParts = toExactBigMParts(right);

    if (leftParts.bigM.numerator * rightParts.bigM.denominator < rightParts.bigM.numerator * leftParts.bigM.denominator) {
      return -1;
    }

    if (leftParts.bigM.numerator * rightParts.bigM.denominator > rightParts.bigM.numerator * leftParts.bigM.denominator) {
      return 1;
    }

    if (leftParts.constant.numerator * rightParts.constant.denominator < rightParts.constant.numerator * leftParts.constant.denominator) {
      return -1;
    }

    if (leftParts.constant.numerator * rightParts.constant.denominator > rightParts.constant.numerator * leftParts.constant.denominator) {
      return 1;
    }

    return 0;
  }

  const leftParts = toBigMParts(left);
  const rightParts = toBigMParts(right);

  if (leftParts.bigM < rightParts.bigM - EPSILON) {
    return -1;
  }

  if (leftParts.bigM > rightParts.bigM + EPSILON) {
    return 1;
  }

  if (leftParts.constant < rightParts.constant - EPSILON) {
    return -1;
  }

  if (leftParts.constant > rightParts.constant + EPSILON) {
    return 1;
  }

  return 0;
}

function isNegativeValue(value) {
  return compareValues(value, 0) < 0;
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

function normalizeExactValue(value) {
  const parts = toExactBigMParts(value);

  if (exactIsZeroRational(parts.bigM)) {
    return exactRationalFromNumber(parts.constant);
  }

  return parts;
}

function cloneExactValue(value) {
  if (isExactBigMValue(value)) {
    return {
      constant: exactRationalFromNumber(value.constant),
      bigM: exactRationalFromNumber(value.bigM)
    };
  }

  return exactRationalFromNumber(value);
}

function exactAddValue(left, right) {
  const first = toExactBigMParts(left);
  const second = toExactBigMParts(right);

  return normalizeExactValue({
    constant: exactAddRational(first.constant, second.constant),
    bigM: exactAddRational(first.bigM, second.bigM)
  });
}

function exactNegateValue(value) {
  const parts = toExactBigMParts(value);

  return normalizeExactValue({
    constant: createExactRational(parts.constant.numerator * -1, parts.constant.denominator),
    bigM: createExactRational(parts.bigM.numerator * -1, parts.bigM.denominator)
  });
}

function exactSubtractValue(left, right) {
  return exactAddValue(left, exactNegateValue(right));
}

function exactMultiplyValue(left, right) {
  const first = toExactBigMParts(left);
  const second = toExactBigMParts(right);

  if (!exactIsZeroRational(first.bigM) && !exactIsZeroRational(second.bigM)) {
    throw new Error("No se admite multiplicar dos expresiones exactas con M.");
  }

  return normalizeExactValue({
    constant: exactMultiplyRational(first.constant, second.constant),
    bigM: exactAddRational(
      exactMultiplyRational(first.bigM, second.constant),
      exactMultiplyRational(second.bigM, first.constant)
    )
  });
}

function exactDivideValueByScalar(value, scalar) {
  const parts = toExactBigMParts(value);
  const divisor = exactRationalFromNumber(scalar);

  if (exactIsZeroRational(divisor)) {
    throw new Error("No se puede dividir por cero.");
  }

  return normalizeExactValue({
    constant: exactDivideRational(parts.constant, divisor),
    bigM: exactDivideRational(parts.bigM, divisor)
  });
}

function exactCompareValueToZero(value) {
  const parts = toExactBigMParts(value);

  if (parts.bigM.numerator < 0) {
    return -1;
  }

  if (parts.bigM.numerator > 0) {
    return 1;
  }

  if (parts.constant.numerator < 0) {
    return -1;
  }

  if (parts.constant.numerator > 0) {
    return 1;
  }

  return 0;
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

function formatProductFactor(value) {
  const isNegative = isExactBigMValue(value) || isExactRationalValue(value)
    ? exactCompareValueToZero(value) < 0
    : compareValues(value, 0) < 0;

  return isNegative
    ? `(${formatValue(value)})`
    : formatValue(value);
}

function renderTableValue(value) {
  if (value === "∞" || value === "-∞") {
    return `<span class="infinity-symbol">${value}</span>`;
  }

  return value;
}

function renderCalcToken(text, tone) {
  return `<span class="calc-token${tone ? ` calc-token-${tone}` : ""}">${escapeHtml(text)}</span>`;
}

function formatLinearExpression(coefficients) {
  return coefficients.map((value, index) => {
    const absolute = `${formatDisplayNumber(Math.abs(value))}x${index + 1}`;

    if (index === 0) {
      return value < 0 ? `-${absolute}` : absolute;
    }

    return value < 0 ? `- ${absolute}` : `+ ${absolute}`;
  }).join(" ");
}

function formatConstraintLabel(constraint, rowIndex) {
  return `R${rowIndex + 1}: ${formatLinearExpression(constraint.coefficients)} ${constraint.relation} ${formatDisplayNumber(constraint.rhs)}`;
}

function formatDisplayVariableName(label, columnIndex = null) {
  if (columnIndex != null) {
    return `x${columnIndex + 1}`;
  }

  return label;
}

function isArtificialVariableName(label) {
  return /^mu\d+$/i.test(label);
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

function renderRelationSymbol(relation) {
  if (relation === "<=") {
    return "&le;";
  }

  if (relation === ">=") {
    return "&ge;";
  }

  return "=";
}

function getNextRelation(relation) {
  const currentIndex = RELATION_SEQUENCE.indexOf(relation);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % RELATION_SEQUENCE.length : 0;
  return RELATION_SEQUENCE[nextIndex];
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

function renderCompactInput({ value, step = "any", inputClass = "", incrementLabel, decrementLabel, attributes = {} }) {
  const className = ["compact-number-input", inputClass].filter(Boolean).join(" ");
  const inputAttributes = serializeAttributes({
    type: "number",
    step,
    value,
    class: className,
    style: `--digits: ${countVisibleCharacters(value)};`,
    ...attributes
  });

  return `
    <input ${inputAttributes}>
    <span class="mini-stepper">
      <button class="mini-stepper-button" type="button" data-delta="1" aria-label="${incrementLabel}" title="${incrementLabel}">&#9650;</button>
      <button class="mini-stepper-button" type="button" data-delta="-1" aria-label="${decrementLabel}" title="${decrementLabel}">&#9660;</button>
    </span>
  `;
}

function updateCompactInputWidth(input) {
  if (!(input instanceof HTMLInputElement) || !input.classList.contains("compact-number-input")) {
    return;
  }

  input.style.setProperty("--digits", String(countVisibleCharacters(input.value)));
}

function updateCompactInputWidths(root = simplexForm) {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  root.querySelectorAll(".compact-number-input").forEach((input) => {
    updateCompactInputWidth(input);
  });
}

function bumpCompactInput(input, delta) {
  const isSimplexDimensionInput = input === variableCountInput || input === constraintCountInput;
  const isTransportDimensionInput = input === transportOriginCountInput || input === transportDestinationCountInput;
  const currentValue = isSimplexDimensionInput
    ? clampDimension(input.value)
    : isTransportDimensionInput
      ? clampTransportDimension(input.value)
      : parseNumericValue(input.value);
  const nextValue = isSimplexDimensionInput
    ? clampDimension(currentValue + delta)
    : isTransportDimensionInput
      ? clampTransportDimension(currentValue + delta)
      : Math.round((currentValue + delta) * 1000) / 1000;

  input.value = formatNumber(nextValue);
  updateCompactInputWidth(input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderObjectiveToggle() {
  if (!(objectiveToggle instanceof HTMLButtonElement)) {
    return;
  }

  const isMinimization = state.objectiveType === "min";
  objectiveToggle.textContent = isMinimization ? "Minimizar" : "Maximizar";
  objectiveToggle.dataset.mode = state.objectiveType;
  objectiveToggle.setAttribute("aria-pressed", String(isMinimization));
  objectiveToggle.title = isMinimization ? "Cambiar a maximizar" : "Cambiar a minimizar";
}

function renderDisplayModeToggle() {
  displayModeButtons.forEach((button) => {
    const isActive = button.dataset.displayMode === state.numberFormat;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderObjectiveExpression() {
  if (!(objectiveExpression instanceof HTMLElement)) {
    return;
  }

  const prefix = state.objectiveType === "max" ? "Max Z =" : "Min Z =";
  const terms = state.objectiveCoefficients.map((coefficient, index) => `
    <span class="term">
      ${renderCompactInput({
    value: coefficient,
    incrementLabel: `Aumentar coeficiente de x${index + 1} en la funcion objetivo`,
    decrementLabel: `Disminuir coeficiente de x${index + 1} en la funcion objetivo`,
    attributes: {
      "data-scope": "objective",
      "data-index": index,
      "aria-label": `Coeficiente de x${index + 1} en la funcion objetivo`
    }
  })}
      <span class="term-label">x${index + 1}</span>
    </span>
    ${index < state.variableCount - 1 ? '<span class="math-token">+</span>' : ""}
  `).join("");

  objectiveExpression.innerHTML = `
    <div class="equation-row">
      <span class="equation-prefix">${prefix}</span>
      ${terms}
    </div>
  `;
}

function renderConstraintRows() {
  if (!(constraintsList instanceof HTMLElement)) {
    return;
  }

  constraintsList.innerHTML = state.constraints.map((constraint, rowIndex) => {
    const terms = constraint.coefficients.map((coefficient, columnIndex) => `
      <span class="term">
        ${renderCompactInput({
      value: coefficient,
      incrementLabel: `Aumentar coeficiente de x${columnIndex + 1} en la restriccion ${rowIndex + 1}`,
      decrementLabel: `Disminuir coeficiente de x${columnIndex + 1} en la restriccion ${rowIndex + 1}`,
      attributes: {
        "data-scope": "constraint",
        "data-row": rowIndex,
        "data-index": columnIndex,
        "aria-label": `Coeficiente de x${columnIndex + 1} en la restriccion ${rowIndex + 1}`
      }
    })}
        <span class="term-label">x${columnIndex + 1}</span>
      </span>
      ${columnIndex < state.variableCount - 1 ? '<span class="math-token">+</span>' : ""}
    `).join("");

    return `
      <div class="constraint-row">
        <span class="constraint-tag">R${rowIndex + 1}</span>
        ${terms}
        <button
          class="relation-toggle"
          type="button"
          data-scope="relation"
          data-row="${rowIndex}"
          aria-label="Relacion de la restriccion ${rowIndex + 1}: ${constraint.relation}. Click para cambiar"
          title="Click para cambiar entre <=, >= y ="
        >
          ${renderRelationSymbol(constraint.relation)}
        </button>
        <span class="rhs-control">
          ${renderCompactInput({
      value: constraint.rhs,
      inputClass: "rhs-input",
      incrementLabel: `Aumentar termino independiente de la restriccion ${rowIndex + 1}`,
      decrementLabel: `Disminuir termino independiente de la restriccion ${rowIndex + 1}`,
      attributes: {
        "data-scope": "rhs",
        "data-row": rowIndex,
        "aria-label": `Termino independiente de la restriccion ${rowIndex + 1}`
      }
    })}
        </span>
      </div>
    `;
  }).join("");
}

function renderModel() {
  if (!hasSimplexPage) {
    return;
  }

  variableCountInput.value = String(state.variableCount);
  constraintCountInput.value = String(state.constraintCount);
  renderObjectiveToggle();
  renderObjectiveExpression();
  renderConstraintRows();
  updateCompactInputWidths();
}

function buildModelSummary() {
  const target = state.objectiveType === "max" ? "Max Z" : "Min Z";
  const objectiveTerms = formatLinearExpression(state.objectiveCoefficients);

  return {
    objective: `${target} = ${objectiveTerms}`
  };
}

function normalizeConstraint(constraint) {
  const normalized = {
    coefficients: [...constraint.coefficients],
    relation: constraint.relation,
    rhs: constraint.rhs
  };

  if (normalized.rhs < 0) {
    normalized.coefficients = normalized.coefficients.map((value) => value * -1);
    normalized.rhs *= -1;

    if (normalized.relation === "<=") {
      normalized.relation = ">=";
    } else if (normalized.relation === ">=") {
      normalized.relation = "<=";
    }
  }

  return normalized;
}

function buildStandardForm(model) {
  const variableNames = Array.from({ length: model.variableCount }, (_, index) => `x${index + 1}`);
  const rows = model.constraints.map((constraint) => [...constraint.coefficients]);
  const basis = [];
  const artificialColumns = [];
  let surplusCount = 0;
  let artificialCount = 0;
  let nextSlackVariableNumber = variableNames.reduce((maxNumber, variableName) => {
    const match = variableName.match(/^x(\d+)$/i);
    if (!match) {
      return maxNumber;
    }

    return Math.max(maxNumber, Number.parseInt(match[1], 10));
  }, 0) + 1;

  function addColumn(name) {
    variableNames.push(name);
    rows.forEach((row) => row.push(0));
    return variableNames.length - 1;
  }

  model.constraints.forEach((constraint, rowIndex) => {
    if (constraint.relation === "<=") {
      const slackColumn = addColumn(`x${nextSlackVariableNumber}`);
      nextSlackVariableNumber += 1;
      rows[rowIndex][slackColumn] = 1;
      basis[rowIndex] = slackColumn;
    } else if (constraint.relation === ">=") {
      surplusCount += 1;
      const surplusColumn = addColumn(`e${surplusCount}`);
      rows[rowIndex][surplusColumn] = -1;
    }
  });

  model.constraints.forEach((constraint, rowIndex) => {
    if (constraint.relation === ">=" || constraint.relation === "=") {
      artificialCount += 1;
      const artificialColumn = addColumn(`mu${artificialCount}`);
      rows[rowIndex][artificialColumn] = 1;
      basis[rowIndex] = artificialColumn;
      artificialColumns.push(artificialColumn);
    }
  });

  const constraintRows = rows.map((row, index) => [...row, model.constraints[index].rhs]);

  return {
    variableNames,
    constraintRows,
    basis,
    artificialColumns
  };
}

function buildObjectiveRow(objectiveCoefficients, basis, constraintRows) {
  const objectiveRow = Array.from({ length: objectiveCoefficients.length + 1 }, () => 0);

  for (let columnIndex = 0; columnIndex < objectiveCoefficients.length; columnIndex += 1) {
    objectiveRow[columnIndex] = negateValue(objectiveCoefficients[columnIndex] ?? 0);
  }

  basis.forEach((basisColumn, rowIndex) => {
    const basisWeight = objectiveCoefficients[basisColumn] ?? 0;

    if (!isZeroValue(basisWeight)) {
      for (let columnIndex = 0; columnIndex < objectiveRow.length; columnIndex += 1) {
        objectiveRow[columnIndex] = addValues(
          objectiveRow[columnIndex],
          multiplyValues(basisWeight, constraintRows[rowIndex][columnIndex])
        );
      }
    }
  });

  return cleanRow(objectiveRow);
}

function cleanNumber(value) {
  return Math.abs(value) < EPSILON ? 0 : value;
}

function cleanCellValue(value) {
  return normalizeBigMValue(value);
}

function cleanRow(row) {
  return row.map((value) => cleanCellValue(value));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function cloneExactMatrix(matrix) {
  return matrix.map((row) => row.map((value) => cloneExactValue(value)));
}

function cloneTableau(tableau) {
  return tableau.map((row) => cleanRow(row.map((value) => cloneCellValue(value))));
}

function buildExactObjectiveRow(objectiveCoefficients, basis, constraintRows) {
  const objectiveRow = Array.from({ length: objectiveCoefficients.length + 1 }, () => createExactRational(0, 1));

  for (let columnIndex = 0; columnIndex < objectiveCoefficients.length; columnIndex += 1) {
    objectiveRow[columnIndex] = exactNegateValue(objectiveCoefficients[columnIndex] ?? createExactRational(0, 1));
  }

  basis.forEach((basisColumn, rowIndex) => {
    const basisWeight = objectiveCoefficients[basisColumn] ?? createExactRational(0, 1);

    if (exactCompareValueToZero(basisWeight) !== 0) {
      for (let columnIndex = 0; columnIndex < objectiveRow.length; columnIndex += 1) {
        objectiveRow[columnIndex] = exactAddValue(
          objectiveRow[columnIndex],
          exactMultiplyValue(basisWeight, constraintRows[rowIndex][columnIndex])
        );
      }
    }
  });

  return objectiveRow.map((value) => normalizeExactValue(value));
}

function pivotExactMatrix(matrix, pivotRowIndex, pivotColumnIndex) {
  const pivotValue = matrix[pivotRowIndex][pivotColumnIndex];
  const totalColumns = matrix[pivotRowIndex].length;

  for (let columnIndex = 0; columnIndex < totalColumns; columnIndex += 1) {
    matrix[pivotRowIndex][columnIndex] = exactDivideValueByScalar(matrix[pivotRowIndex][columnIndex], pivotValue);
  }

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    if (rowIndex === pivotRowIndex) {
      continue;
    }

    const factor = matrix[rowIndex][pivotColumnIndex];

    if (exactCompareValueToZero(factor) === 0) {
      continue;
    }

    for (let columnIndex = 0; columnIndex < totalColumns; columnIndex += 1) {
      matrix[rowIndex][columnIndex] = exactSubtractValue(
        matrix[rowIndex][columnIndex],
        exactMultiplyValue(factor, matrix[pivotRowIndex][columnIndex])
      );
    }
  }
}

function captureSnapshot({ phase, title, note, variableNames, basis, tableau, displayTableau, pivot, objectiveCoefficients, displayObjectiveCoefficients }) {
  return {
    phase,
    title,
    note,
    variableNames: [...variableNames],
    basis: [...basis],
    tableau: cloneTableau(tableau),
    displayTableau: cloneExactMatrix(displayTableau),
    objectiveCoefficients: objectiveCoefficients.map((value) => cloneCellValue(value)),
    displayObjectiveCoefficients: displayObjectiveCoefficients.map((value) => cloneExactValue(value)),
    pivot: pivot ? { ...pivot } : null
  };
}

function buildPreviousTableCalculation(previousSnapshot, currentSnapshot, targetRow, targetColumn) {
  if (!previousSnapshot || !currentSnapshot?.pivot) {
    return null;
  }

  const pivotRow = currentSnapshot.pivot.row;
  const pivotColumn = currentSnapshot.pivot.column;
  const pivotValue = previousSnapshot.tableau[pivotRow]?.[pivotColumn];
  const previousDisplayTableau = previousSnapshot.displayTableau ?? previousSnapshot.tableau;
  const targetValue = previousDisplayTableau[targetRow]?.[targetColumn];
  const pivotRowValue = previousDisplayTableau[pivotRow]?.[targetColumn];
  const pivotValueDisplay = previousDisplayTableau[pivotRow]?.[pivotColumn];
  const isSupportedDisplayValue = (value) => (
    Number.isFinite(value) ||
    isBigMValue(value) ||
    isExactRationalValue(value) ||
    isExactBigMValue(value)
  );

  if (
    !Number.isFinite(pivotValue) ||
    !isSupportedDisplayValue(targetValue) ||
    !isSupportedDisplayValue(pivotRowValue) ||
    !isSupportedDisplayValue(pivotValueDisplay)
  ) {
    return null;
  }

  if (targetRow === pivotRow) {
    const shortDivision = `${formatProductFactor(targetValue)} / ${formatProductFactor(pivotValueDisplay)}`;

    return {
      expression: targetColumn === previousSnapshot.tableau[pivotRow].length - 1
        ? shortDivision
        : `anterior / pivote = ${shortDivision}`,
      expressionHtml: targetColumn === previousSnapshot.tableau[pivotRow].length - 1
        ? `${renderCalcToken(formatProductFactor(targetValue), "primary")} / ${renderCalcToken(formatProductFactor(pivotValueDisplay), "pivot")}`
        : `anterior / pivote = ${renderCalcToken(formatProductFactor(targetValue), "primary")} / ${renderCalcToken(formatProductFactor(pivotValueDisplay), "pivot")}`,
      highlights: [
        { row: pivotRow, column: targetColumn, tone: "primary" },
        { row: pivotRow, column: pivotColumn, tone: "pivot" }
      ]
    };
  }

  const rowFactor = previousDisplayTableau[targetRow]?.[pivotColumn];

  if (!isSupportedDisplayValue(rowFactor)) {
    return null;
  }

  return {
    expression: `c - a*b/p = ${formatProductFactor(targetValue)} - ${formatProductFactor(rowFactor)} * ${formatProductFactor(pivotRowValue)} / ${formatProductFactor(pivotValueDisplay)}`,
    expressionHtml: `c - a*b/p = ${renderCalcToken(formatProductFactor(targetValue), "primary")} - ${renderCalcToken(formatProductFactor(rowFactor), "factor")} * ${renderCalcToken(formatProductFactor(pivotRowValue), "secondary")} / ${renderCalcToken(formatProductFactor(pivotValueDisplay), "pivot")}`,
    highlights: [
      { row: targetRow, column: targetColumn, tone: "primary" },
      { row: targetRow, column: pivotColumn, tone: "factor" },
      { row: pivotRow, column: targetColumn, tone: "secondary" },
      { row: pivotRow, column: pivotColumn, tone: "pivot" }
    ]
  };
}

function findEnteringColumn(objectiveRow) {
  let selectedColumn = -1;
  let mostNegativeValue = null;

  for (let columnIndex = 0; columnIndex < objectiveRow.length - 1; columnIndex += 1) {
    if (
      isNegativeValue(objectiveRow[columnIndex]) &&
      (mostNegativeValue == null || compareValues(objectiveRow[columnIndex], mostNegativeValue) < 0)
    ) {
      mostNegativeValue = objectiveRow[columnIndex];
      selectedColumn = columnIndex;
    }
  }

  return selectedColumn;
}

function findDisplayEnteringColumn(objectiveRow, objectiveType, excludedColumns = new Set()) {
  if (objectiveType !== "min") {
    let selectedColumn = -1;
    let mostNegativeValue = null;

    for (let columnIndex = 0; columnIndex < objectiveRow.length - 1; columnIndex += 1) {
      if (excludedColumns.has(columnIndex)) {
        continue;
      }

      if (
        isNegativeValue(objectiveRow[columnIndex]) &&
        (mostNegativeValue == null || compareValues(objectiveRow[columnIndex], mostNegativeValue) < 0)
      ) {
        mostNegativeValue = objectiveRow[columnIndex];
        selectedColumn = columnIndex;
      }
    }

    return selectedColumn;
  }

  let selectedColumn = -1;
  let mostPositiveValue = null;

  for (let columnIndex = 0; columnIndex < objectiveRow.length - 1; columnIndex += 1) {
    if (excludedColumns.has(columnIndex)) {
      continue;
    }

    if (
      compareValues(objectiveRow[columnIndex], 0) > 0 &&
      (mostPositiveValue == null || compareValues(objectiveRow[columnIndex], mostPositiveValue) > 0)
    ) {
      mostPositiveValue = objectiveRow[columnIndex];
      selectedColumn = columnIndex;
    }
  }

  return selectedColumn;
}

function chooseLeavingRow(tableau, enteringColumn) {
  let selectedRow = -1;
  let selectedRatio = Number.POSITIVE_INFINITY;

  for (let rowIndex = 0; rowIndex < tableau.length - 1; rowIndex += 1) {
    const coefficient = tableau[rowIndex][enteringColumn];
    const rhs = tableau[rowIndex][tableau[rowIndex].length - 1];

    if (coefficient > EPSILON) {
      const ratio = rhs / coefficient;

      if (
        ratio < selectedRatio - EPSILON ||
        (Math.abs(ratio - selectedRatio) <= EPSILON && rowIndex < selectedRow)
      ) {
        selectedRow = rowIndex;
        selectedRatio = ratio;
      }
    }
  }

  return selectedRow;
}

function pivotMatrix(matrix, pivotRowIndex, pivotColumnIndex) {
  const pivotValue = matrix[pivotRowIndex][pivotColumnIndex];
  const totalColumns = matrix[pivotRowIndex].length;

  for (let columnIndex = 0; columnIndex < totalColumns; columnIndex += 1) {
    matrix[pivotRowIndex][columnIndex] = divideValueByScalar(matrix[pivotRowIndex][columnIndex], pivotValue);
  }

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    if (rowIndex === pivotRowIndex) {
      continue;
    }

    const factor = matrix[rowIndex][pivotColumnIndex];

    if (isZeroValue(factor)) {
      continue;
    }

    for (let columnIndex = 0; columnIndex < totalColumns; columnIndex += 1) {
      matrix[rowIndex][columnIndex] = subtractValues(
        matrix[rowIndex][columnIndex],
        multiplyValues(factor, matrix[pivotRowIndex][columnIndex])
      );
    }
  }

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    matrix[rowIndex] = cleanRow(matrix[rowIndex]);
  }
}

function runSimplexPhase({ phase, variableNames, basis, constraintRows, exactConstraintRows, objectiveCoefficients, exactObjectiveCoefficients, snapshots }) {
  const tableau = [...cloneMatrix(constraintRows), buildObjectiveRow(objectiveCoefficients, basis, constraintRows)];
  const exactTableau = [...cloneExactMatrix(exactConstraintRows), buildExactObjectiveRow(exactObjectiveCoefficients, basis, exactConstraintRows)];
  const initialSnapshot = captureSnapshot({
    phase,
    title: "Tabla inicial",
    note: "",
    variableNames,
    basis,
    tableau,
    displayTableau: exactTableau,
    objectiveCoefficients
    ,
    displayObjectiveCoefficients: exactObjectiveCoefficients
  });
  snapshots.push(initialSnapshot);

  let iteration = 0;

  while (true) {
    const objectiveRow = tableau[tableau.length - 1];
    const enteringColumn = findEnteringColumn(objectiveRow);

    if (enteringColumn === -1) {
      return {
        status: "optimal",
        tableau,
        exactTableau,
        basis
      };
    }

    const leavingRow = chooseLeavingRow(tableau, enteringColumn);

    if (leavingRow === -1) {
      return {
        status: "unbounded",
        tableau,
        exactTableau,
        basis,
        enteringVariable: variableNames[enteringColumn]
      };
    }

    const leavingVariable = variableNames[basis[leavingRow]];
    const currentSnapshot = snapshots[snapshots.length - 1];

    if (currentSnapshot) {
      currentSnapshot.note = `Entra ${formatDisplayVariableName(variableNames[enteringColumn], enteringColumn)} y sale ${formatDisplayVariableName(leavingVariable, basis[leavingRow])}.`;
    }

    iteration += 1;
    pivotMatrix(tableau, leavingRow, enteringColumn);
    pivotExactMatrix(exactTableau, leavingRow, enteringColumn);
    basis[leavingRow] = enteringColumn;

    snapshots.push(captureSnapshot({
      phase,
      title: `Iteracion ${iteration}`,
      note: "",
      variableNames,
      basis,
      tableau,
      displayTableau: exactTableau,
      objectiveCoefficients,
      displayObjectiveCoefficients: exactObjectiveCoefficients,
      pivot: {
        row: leavingRow,
        column: enteringColumn,
        entering: variableNames[enteringColumn],
        leaving: leavingVariable
      }
    }));
  }
}

function removeArtificialColumns(constraintRows, basis, variableNames, artificialColumns) {
  const artificialSet = new Set(artificialColumns);

  for (let rowIndex = 0; rowIndex < constraintRows.length; rowIndex += 1) {
    if (!artificialSet.has(basis[rowIndex])) {
      continue;
    }

    let replacementColumn = -1;

    for (let columnIndex = 0; columnIndex < variableNames.length; columnIndex += 1) {
      if (artificialSet.has(columnIndex)) {
        continue;
      }

      if (Math.abs(constraintRows[rowIndex][columnIndex]) > EPSILON) {
        replacementColumn = columnIndex;
        break;
      }
    }

    if (replacementColumn !== -1) {
      pivotMatrix(constraintRows, rowIndex, replacementColumn);
      basis[rowIndex] = replacementColumn;
      continue;
    }

    if (Math.abs(constraintRows[rowIndex][constraintRows[rowIndex].length - 1]) > EPSILON) {
      return { status: "infeasible" };
    }

    constraintRows.splice(rowIndex, 1);
    basis.splice(rowIndex, 1);
    rowIndex -= 1;
  }

  const indexMap = [];
  const keptColumns = [];
  let nextColumn = 0;

  for (let columnIndex = 0; columnIndex < variableNames.length; columnIndex += 1) {
    if (!artificialSet.has(columnIndex)) {
      indexMap[columnIndex] = nextColumn;
      keptColumns.push(columnIndex);
      nextColumn += 1;
    } else {
      indexMap[columnIndex] = -1;
    }
  }

  const reducedRows = constraintRows.map((row) => {
    const rhs = row[row.length - 1];
    const projected = keptColumns.map((columnIndex) => row[columnIndex]);
    projected.push(rhs);
    return cleanRow(projected);
  });

  return {
    status: "ok",
    constraintRows: reducedRows,
    basis: basis.map((columnIndex) => indexMap[columnIndex]),
    variableNames: keptColumns.map((columnIndex) => variableNames[columnIndex])
  };
}

function extractSolution(tableau, basis, originalVariableCount) {
  const solution = Array.from({ length: originalVariableCount }, () => 0);
  const rhsColumn = tableau[0].length - 1;

  basis.forEach((basisColumn, rowIndex) => {
    if (basisColumn >= 0 && basisColumn < originalVariableCount) {
      solution[basisColumn] = tableau[rowIndex][rhsColumn];
    }
  });

  return solution.map((value) => cleanNumber(value));
}

function extractExactSolution(tableau, basis, originalVariableCount) {
  const solution = Array.from({ length: originalVariableCount }, () => createExactRational(0, 1));
  const rhsColumn = tableau[0].length - 1;

  basis.forEach((basisColumn, rowIndex) => {
    if (basisColumn >= 0 && basisColumn < originalVariableCount) {
      solution[basisColumn] = cloneExactValue(tableau[rowIndex][rhsColumn]);
    }
  });

  return solution;
}

function getPointCoordinate(point, index) {
  const axisKeys = ["x", "y", "z"];
  const semanticKey = axisKeys[index];
  const indexedKey = `x${index + 1}`;

  if (Number.isFinite(point[indexedKey])) {
    return point[indexedKey];
  }

  if (Number.isFinite(point[semanticKey])) {
    return point[semanticKey];
  }

  if (Array.isArray(point.coordinates)) {
    return point.coordinates[index] ?? 0;
  }

  return 0;
}

function evaluateConstraint(constraint, point) {
  return constraint.coefficients.reduce((sum, coefficient, index) => (
    sum + (coefficient * getPointCoordinate(point, index))
  ), 0);
}

function satisfiesConstraint(constraint, point, tolerance = 1e-7) {
  const lhs = evaluateConstraint(constraint, point);

  if (constraint.relation === "<=") {
    return lhs <= constraint.rhs + tolerance;
  }

  if (constraint.relation === ">=") {
    return lhs >= constraint.rhs - tolerance;
  }

  return Math.abs(lhs - constraint.rhs) <= tolerance;
}

function isFeasiblePoint(point, constraints, tolerance = 1e-7) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return false;
  }

  if (point.x < -tolerance || point.y < -tolerance) {
    return false;
  }

  return constraints.every((constraint) => satisfiesConstraint(constraint, point, tolerance));
}

function intersectLines(first, second) {
  const [a1, b1] = first.coefficients;
  const [a2, b2] = second.coefficients;
  const determinant = (a1 * b2) - (a2 * b1);

  if (Math.abs(determinant) < EPSILON) {
    return null;
  }

  return {
    x: ((first.rhs * b2) - (second.rhs * b1)) / determinant,
    y: ((a1 * second.rhs) - (a2 * first.rhs)) / determinant
  };
}

function determinant3x3(matrix) {
  return (
    (matrix[0][0] * ((matrix[1][1] * matrix[2][2]) - (matrix[1][2] * matrix[2][1])))
    - (matrix[0][1] * ((matrix[1][0] * matrix[2][2]) - (matrix[1][2] * matrix[2][0])))
    + (matrix[0][2] * ((matrix[1][0] * matrix[2][1]) - (matrix[1][1] * matrix[2][0])))
  );
}

function intersectPlanes(first, second, third) {
  const matrix = [
    first.coefficients.slice(0, 3),
    second.coefficients.slice(0, 3),
    third.coefficients.slice(0, 3)
  ];
  const determinant = determinant3x3(matrix);

  if (Math.abs(determinant) < EPSILON) {
    return null;
  }

  const rhs = [first.rhs, second.rhs, third.rhs];
  const xMatrix = matrix.map((row, rowIndex) => [rhs[rowIndex], row[1], row[2]]);
  const yMatrix = matrix.map((row, rowIndex) => [row[0], rhs[rowIndex], row[2]]);
  const zMatrix = matrix.map((row, rowIndex) => [row[0], row[1], rhs[rowIndex]]);

  return {
    x: determinant3x3(xMatrix) / determinant,
    y: determinant3x3(yMatrix) / determinant,
    z: determinant3x3(zMatrix) / determinant
  };
}

function uniquePoints(points) {
  const seen = new Map();

  points.forEach((point) => {
    const key = `${Math.round(point.x * 100000)}:${Math.round(point.y * 100000)}`;

    if (!seen.has(key)) {
      seen.set(key, {
        x: cleanNumber(point.x),
        y: cleanNumber(point.y)
      });
    }
  });

  return [...seen.values()];
}

function uniquePoints3D(points) {
  const seen = new Map();

  points.forEach((point) => {
    const key = [
      Math.round(point.x * 100000),
      Math.round(point.y * 100000),
      Math.round(point.z * 100000)
    ].join(":");

    if (!seen.has(key)) {
      seen.set(key, {
        x: cleanNumber(point.x),
        y: cleanNumber(point.y),
        z: cleanNumber(point.z)
      });
    }
  });

  return [...seen.values()];
}

function findFeasibleVertices(constraints) {
  const boundaries = [
    ...constraints.map((constraint) => ({
      coefficients: [...constraint.coefficients],
      rhs: constraint.rhs
    })),
    { coefficients: [1, 0], rhs: 0 },
    { coefficients: [0, 1], rhs: 0 }
  ];

  const points = [];

  for (let firstIndex = 0; firstIndex < boundaries.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boundaries.length; secondIndex += 1) {
      const intersection = intersectLines(boundaries[firstIndex], boundaries[secondIndex]);

      if (intersection && isFeasiblePoint(intersection, constraints)) {
        points.push(intersection);
      }
    }
  }

  return uniquePoints(points);
}

function isFeasiblePoint3D(point, constraints, tolerance = 1e-7) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
    return false;
  }

  if (point.x < -tolerance || point.y < -tolerance || point.z < -tolerance) {
    return false;
  }

  return constraints.every((constraint) => satisfiesConstraint(constraint, point, tolerance));
}

function buildAxisBoundary3D(axisIndex) {
  return {
    coefficients: [0, 0, 0].map((_, index) => (index === axisIndex ? 1 : 0)),
    rhs: 0,
    label: `x${axisIndex + 1} = 0`,
    display: `x${axisIndex + 1} = 0`,
    isAxis: true
  };
}

function findFeasibleVertices3D(constraints) {
  const boundaries = [
    ...constraints.map((constraint) => ({
      coefficients: constraint.coefficients.slice(0, 3),
      rhs: constraint.rhs
    })),
    buildAxisBoundary3D(0),
    buildAxisBoundary3D(1),
    buildAxisBoundary3D(2)
  ];
  const points = [];

  for (let firstIndex = 0; firstIndex < boundaries.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boundaries.length; secondIndex += 1) {
      for (let thirdIndex = secondIndex + 1; thirdIndex < boundaries.length; thirdIndex += 1) {
        const intersection = intersectPlanes(
          boundaries[firstIndex],
          boundaries[secondIndex],
          boundaries[thirdIndex]
        );

        if (intersection && isFeasiblePoint3D(intersection, constraints)) {
          points.push(intersection);
        }
      }
    }
  }

  return uniquePoints3D(points);
}

function subtractPoint3D(first, second) {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z
  };
}

function dotProduct3D(first, second) {
  return (first.x * second.x) + (first.y * second.y) + (first.z * second.z);
}

function crossProduct3D(first, second) {
  return {
    x: (first.y * second.z) - (first.z * second.y),
    y: (first.z * second.x) - (first.x * second.z),
    z: (first.x * second.y) - (first.y * second.x)
  };
}

function vectorLength3D(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalizeVector3D(vector) {
  const length = vectorLength3D(vector) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function averagePoint3D(points) {
  const total = points.reduce((sum, point) => ({
    x: sum.x + point.x,
    y: sum.y + point.y,
    z: sum.z + point.z
  }), { x: 0, y: 0, z: 0 });

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length
  };
}

function isPointOnPlane(point, boundary, tolerance = 1e-6) {
  return Math.abs(evaluateConstraint(boundary, point) - boundary.rhs) <= tolerance;
}

function orderFaceVertices3D(points, normal) {
  const centroid = averagePoint3D(points);
  const normalizedNormal = normalizeVector3D({
    x: normal[0] ?? normal.x ?? 0,
    y: normal[1] ?? normal.y ?? 0,
    z: normal[2] ?? normal.z ?? 0
  });
  let reference = Math.abs(normalizedNormal.x) < 0.85
    ? { x: 1, y: 0, z: 0 }
    : { x: 0, y: 1, z: 0 };
  let tangent = crossProduct3D(normalizedNormal, reference);

  if (vectorLength3D(tangent) < EPSILON) {
    reference = { x: 0, y: 0, z: 1 };
    tangent = crossProduct3D(normalizedNormal, reference);
  }

  tangent = normalizeVector3D(tangent);
  const bitangent = normalizeVector3D(crossProduct3D(normalizedNormal, tangent));

  return [...points].sort((first, second) => {
    const firstVector = subtractPoint3D(first, centroid);
    const secondVector = subtractPoint3D(second, centroid);
    const firstAngle = Math.atan2(dotProduct3D(firstVector, bitangent), dotProduct3D(firstVector, tangent));
    const secondAngle = Math.atan2(dotProduct3D(secondVector, bitangent), dotProduct3D(secondVector, tangent));
    return firstAngle - secondAngle;
  });
}

function buildFaces3D(vertices, boundaries) {
  const faces = [];
  const seen = new Set();

  boundaries.forEach((boundary) => {
    const faceVertices = vertices.filter((point) => isPointOnPlane(point, boundary));

    if (faceVertices.length < 3) {
      return;
    }

    const orderedVertices = orderFaceVertices3D(faceVertices, boundary.coefficients);
    const faceKey = orderedVertices
      .map((point) => `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}:${Math.round(point.z * 1000)}`)
      .sort()
      .join("|");

    if (seen.has(faceKey)) {
      return;
    }

    seen.add(faceKey);
    faces.push({
      ...boundary,
      points: orderedVertices,
      centroid: averagePoint3D(orderedVertices)
    });
  });

  return faces;
}

function buildEdgesFromFaces(faces) {
  const edgeMap = new Map();

  faces.forEach((face) => {
    for (let index = 0; index < face.points.length; index += 1) {
      const from = face.points[index];
      const to = face.points[(index + 1) % face.points.length];
      const key = [
        `${Math.round(from.x * 1000)}:${Math.round(from.y * 1000)}:${Math.round(from.z * 1000)}`,
        `${Math.round(to.x * 1000)}:${Math.round(to.y * 1000)}:${Math.round(to.z * 1000)}`
      ].sort().join("|");

      if (!edgeMap.has(key)) {
        edgeMap.set(key, {
          from,
          to,
          binding: Boolean(face.binding)
        });
      } else if (face.binding) {
        edgeMap.get(key).binding = true;
      }
    }
  });

  return [...edgeMap.values()];
}

function projectPointIsometric(point, limits) {
  const angle = Math.PI / 6;
  const x = getPointCoordinate(point, 0) / (limits.xMax || 1);
  const y = getPointCoordinate(point, 1) / (limits.yMax || 1);
  const z = getPointCoordinate(point, 2) / (limits.zMax || 1);

  return {
    x: (x - y) * Math.cos(angle),
    y: (z * 1.08) + ((x + y) * Math.sin(angle))
  };
}

function niceAxisLimit(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 5;
  }

  const raw = Math.max(1, value * 1.2);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  let nice = 1;

  if (normalized <= 1) {
    nice = 1;
  } else if (normalized <= 2) {
    nice = 2;
  } else if (normalized <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }

  return nice * magnitude;
}

function fitAxisLimit(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const raw = Math.max(1, value * 1.08);
  const step = getTickStep(raw);
  return cleanNumber(Math.ceil(raw / step) * step);
}

function getTickStep(limit) {
  const raw = limit / 5;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const normalized = raw / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }

  if (normalized <= 2) {
    return 2 * magnitude;
  }

  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function getAxisTicks(limit) {
  const step = getTickStep(limit);
  const ticks = [];

  for (let value = 0; value <= limit + EPSILON; value += step) {
    ticks.push(cleanNumber(value));
  }

  return ticks;
}

function lineIntersectionWithSegment(start, end, constraint) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const denominator = (constraint.coefficients[0] * deltaX) + (constraint.coefficients[1] * deltaY);

  if (Math.abs(denominator) < EPSILON) {
    return null;
  }

  const numerator = constraint.rhs - evaluateConstraint(constraint, start);
  const ratio = numerator / denominator;

  return {
    x: start.x + (ratio * deltaX),
    y: start.y + (ratio * deltaY)
  };
}

function isInsideHalfPlane(point, constraint, relationOverride = constraint.relation) {
  if (relationOverride === "<=") {
    return evaluateConstraint(constraint, point) <= constraint.rhs + 1e-7;
  }

  return evaluateConstraint(constraint, point) >= constraint.rhs - 1e-7;
}

function clipPolygonAgainstRelation(polygon, constraint, relationOverride) {
  if (!polygon.length) {
    return [];
  }

  const clipped = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentInside = isInsideHalfPlane(current, constraint, relationOverride);
    const previousInside = isInsideHalfPlane(previous, constraint, relationOverride);

    if (currentInside && previousInside) {
      clipped.push(current);
    } else if (previousInside && !currentInside) {
      const intersection = lineIntersectionWithSegment(previous, current, constraint);

      if (intersection) {
        clipped.push(intersection);
      }
    } else if (!previousInside && currentInside) {
      const intersection = lineIntersectionWithSegment(previous, current, constraint);

      if (intersection) {
        clipped.push(intersection);
      }

      clipped.push(current);
    }
  }

  return uniquePoints(clipped);
}

function clipPolygonWithConstraint(polygon, constraint) {
  if (constraint.relation === "=") {
    return clipPolygonAgainstRelation(
      clipPolygonAgainstRelation(polygon, constraint, "<="),
      constraint,
      ">="
    );
  }

  return clipPolygonAgainstRelation(polygon, constraint, constraint.relation);
}

function buildLineSegmentInBounds(constraint, xMax, yMax) {
  const candidates = [];
  const [a, b] = constraint.coefficients;

  if (Math.abs(b) > EPSILON) {
    const left = { x: 0, y: constraint.rhs / b };
    const right = { x: xMax, y: (constraint.rhs - (a * xMax)) / b };

    if (left.y >= -EPSILON && left.y <= yMax + EPSILON) {
      candidates.push(left);
    }

    if (right.y >= -EPSILON && right.y <= yMax + EPSILON) {
      candidates.push(right);
    }
  }

  if (Math.abs(a) > EPSILON) {
    const bottom = { x: constraint.rhs / a, y: 0 };
    const top = { x: (constraint.rhs - (b * yMax)) / a, y: yMax };

    if (bottom.x >= -EPSILON && bottom.x <= xMax + EPSILON) {
      candidates.push(bottom);
    }

    if (top.x >= -EPSILON && top.x <= xMax + EPSILON) {
      candidates.push(top);
    }
  }

  const unique = uniquePoints(candidates);

  if (unique.length < 2) {
    return null;
  }

  let bestPair = [unique[0], unique[1]];
  let bestDistance = -1;

  for (let firstIndex = 0; firstIndex < unique.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < unique.length; secondIndex += 1) {
      const deltaX = unique[firstIndex].x - unique[secondIndex].x;
      const deltaY = unique[firstIndex].y - unique[secondIndex].y;
      const distance = (deltaX * deltaX) + (deltaY * deltaY);

      if (distance > bestDistance) {
        bestDistance = distance;
        bestPair = [unique[firstIndex], unique[secondIndex]];
      }
    }
  }

  return bestPair;
}

function buildGraphData2D(result) {
  if (result.status !== "optimal") {
    return {
      type: "unsupported",
      message: "El grafico del punto optimo se muestra cuando el modelo tiene una solucion optima."
    };
  }

  const constraints = state.constraints.map((constraint, rowIndex) => ({
    ...constraint,
    rowIndex,
    label: `R${rowIndex + 1}`,
    display: formatConstraintLabel(constraint, rowIndex)
  }));

  const optimum = {
    x: result.solution[0] ?? 0,
    y: result.solution[1] ?? 0
  };

  const xCandidateValues = [1, optimum.x];
  const yCandidateValues = [1, optimum.y];
  const feasibleVertices = findFeasibleVertices(constraints);

  feasibleVertices.forEach((point) => {
    xCandidateValues.push(point.x);
    yCandidateValues.push(point.y);
  });

  constraints.forEach((constraint) => {
    const [a, b] = constraint.coefficients;

    if (Math.abs(a) > EPSILON) {
      const xIntercept = constraint.rhs / a;

      if (Number.isFinite(xIntercept) && xIntercept > 0) {
        xCandidateValues.push(xIntercept);
      }
    }

    if (Math.abs(b) > EPSILON) {
      const yIntercept = constraint.rhs / b;

      if (Number.isFinite(yIntercept) && yIntercept > 0) {
        yCandidateValues.push(yIntercept);
      }
    }
  });

  const workingAxisMax = niceAxisLimit(Math.max(
    ...xCandidateValues.filter((value) => Number.isFinite(value) && value >= 0),
    ...yCandidateValues.filter((value) => Number.isFinite(value) && value >= 0)
  ));
  let region = [
    { x: 0, y: 0 },
    { x: workingAxisMax, y: 0 },
    { x: workingAxisMax, y: workingAxisMax },
    { x: 0, y: workingAxisMax }
  ];

  constraints.forEach((constraint) => {
    region = clipPolygonWithConstraint(region, constraint);
  });

  const regionAxisMax = fitAxisLimit(Math.max(
    1,
    optimum.x,
    optimum.y,
    ...region.map((point) => point.x).filter((value) => Number.isFinite(value) && value >= 0),
    ...region.map((point) => point.y).filter((value) => Number.isFinite(value) && value >= 0)
  ));
  const axisMax = Math.max(workingAxisMax, regionAxisMax);

  const bindingConstraints = constraints.filter((constraint) => (
    Math.abs(evaluateConstraint(constraint, optimum) - constraint.rhs) <= 1e-6
  ));

  const activeAxes = [];

  if (Math.abs(optimum.x) <= 1e-6) {
    activeAxes.push("x1 = 0");
  }

  if (Math.abs(optimum.y) <= 1e-6) {
    activeAxes.push("x2 = 0");
  }

  const objectiveSegment = buildLineSegmentInBounds({
    coefficients: [state.objectiveCoefficients[0], state.objectiveCoefficients[1]],
    rhs: (state.objectiveCoefficients[0] * optimum.x) + (state.objectiveCoefficients[1] * optimum.y)
  }, axisMax, axisMax);

  return {
    type: "graph-2d",
    dimension: 2,
    xMax: axisMax,
    yMax: axisMax,
    xTicks: getAxisTicks(axisMax),
    yTicks: getAxisTicks(axisMax),
    optimum,
    region,
    objectiveSegment,
    constraints: constraints.map((constraint, index) => ({
      ...constraint,
      segment: buildLineSegmentInBounds(constraint, axisMax, axisMax),
      binding: bindingConstraints.some((item) => item.rowIndex === constraint.rowIndex),
      color: THEME.graphConstraintColors[index % THEME.graphConstraintColors.length]
    })),
    bindingConstraints,
    activeAxes
  };
}

function buildGraphData3D(result) {
  if (result.status !== "optimal") {
    return {
      type: "unsupported",
      message: "El grafico del punto optimo se muestra cuando el modelo tiene una solucion optima."
    };
  }

  const constraints = state.constraints.map((constraint, rowIndex) => ({
    ...constraint,
    rowIndex,
    label: `R${rowIndex + 1}`,
    display: formatConstraintLabel(constraint, rowIndex)
  }));

  const optimum = {
    x: result.solution[0] ?? 0,
    y: result.solution[1] ?? 0,
    z: result.solution[2] ?? 0
  };
  const feasibleVertices = uniquePoints3D([
    ...findFeasibleVertices3D(constraints),
    optimum
  ]);
  const xMax = fitAxisLimit(Math.max(
    1,
    optimum.x,
    ...feasibleVertices.map((point) => point.x).filter((value) => Number.isFinite(value) && value >= 0)
  ));
  const yMax = fitAxisLimit(Math.max(
    1,
    optimum.y,
    ...feasibleVertices.map((point) => point.y).filter((value) => Number.isFinite(value) && value >= 0)
  ));
  const zMax = fitAxisLimit(Math.max(
    1,
    optimum.z,
    ...feasibleVertices.map((point) => point.z).filter((value) => Number.isFinite(value) && value >= 0)
  ));
  const bindingConstraints = constraints.filter((constraint) => (
    Math.abs(evaluateConstraint(constraint, optimum) - constraint.rhs) <= 1e-6
  ));
  const activeAxes = [];

  if (Math.abs(optimum.x) <= 1e-6) {
    activeAxes.push("x1 = 0");
  }

  if (Math.abs(optimum.y) <= 1e-6) {
    activeAxes.push("x2 = 0");
  }

  if (Math.abs(optimum.z) <= 1e-6) {
    activeAxes.push("x3 = 0");
  }

  const boundaries = [
    ...constraints.map((constraint, index) => ({
      ...constraint,
      binding: bindingConstraints.some((item) => item.rowIndex === constraint.rowIndex),
      color: THEME.graphFaceColors[index % THEME.graphFaceColors.length]
    })),
    buildAxisBoundary3D(0),
    buildAxisBoundary3D(1),
    buildAxisBoundary3D(2)
  ];
  const faces = buildFaces3D(feasibleVertices, boundaries);
  const edges = buildEdgesFromFaces(faces);

  return {
    type: "graph-3d",
    dimension: 3,
    xMax,
    yMax,
    zMax,
    xTicks: getAxisTicks(xMax),
    yTicks: getAxisTicks(yMax),
    zTicks: getAxisTicks(zMax),
    optimum,
    vertices: feasibleVertices,
    faces,
    edges,
    constraints: constraints.map((constraint, index) => ({
      ...constraint,
      binding: bindingConstraints.some((item) => item.rowIndex === constraint.rowIndex),
      color: THEME.graphConstraintColors[index % THEME.graphConstraintColors.length]
    })),
    bindingConstraints,
    activeAxes
  };
}

function buildGraphData(result) {
  if (state.variableCount === 2) {
    return buildGraphData2D(result);
  }

  if (state.variableCount === 3) {
    return buildGraphData3D(result);
  }

  return {
    type: "unsupported",
    message: "El grafico se genera cuando el problema tiene dos o tres variables de decision."
  };
}

function getObjectiveValueForPoint(point, dimension = state.variableCount) {
  return state.objectiveCoefficients
    .slice(0, dimension)
    .reduce((sum, coefficient, index) => sum + (coefficient * getPointCoordinate(point, index)), 0);
}

function isSamePoint(pointA, pointB, dimension = state.variableCount) {
  return Array.from({ length: dimension }, (_, index) => (
    Math.abs(getPointCoordinate(pointA, index) - getPointCoordinate(pointB, index)) <= 1e-6
  )).every(Boolean);
}

function formatPointTuple(point, dimension = state.variableCount) {
  return Array.from({ length: dimension }, (_, index) => (
    formatGraphNumber(getPointCoordinate(point, index))
  )).join(", ");
}

function buildPointAriaLabel(label, point, dimension = state.variableCount) {
  const coordinates = Array.from({ length: dimension }, (_, index) => (
    `x${index + 1} = ${formatGraphNumber(getPointCoordinate(point, index))}`
  )).join(", ");

  return `${label} | ${coordinates}, Z = ${formatGraphNumber(getObjectiveValueForPoint(point, dimension))}`;
}

function buildPointDataset(label, point, dimension = state.variableCount, type = "vertex") {
  return {
    label,
    type,
    dimension,
    objective: formatGraphNumber(getObjectiveValueForPoint(point, dimension)),
    coordinates: Array.from({ length: dimension }, (_, index) => ({
      label: `X${index + 1}`,
      value: formatGraphNumber(getPointCoordinate(point, index))
    })),
    aria: buildPointAriaLabel(label, point, dimension)
  };
}

function renderPointDataAttributes(pointData) {
  const coordinateAttributes = pointData.coordinates.map((coordinate, index) => (
    `data-x${index + 1}="${coordinate.value}"`
  )).join(" ");

  return `
    data-dimension="${pointData.dimension}"
    data-label="${pointData.label}"
    data-objective="${pointData.objective}"
    data-type="${pointData.type}"
    ${coordinateAttributes}
  `;
}

function renderVertexMarker(pointData, svgPoint, radius = 8, extraClass = "") {
  const className = ["graph-vertex", extraClass].filter(Boolean).join(" ");

  return `
    <g
      class="${className}"
      tabindex="0"
      role="button"
      aria-label="${pointData.aria}"
      ${renderPointDataAttributes(pointData)}
    >
      <circle class="graph-vertex-ring" cx="${svgPoint.x}" cy="${svgPoint.y}" r="${radius}"></circle>
    </g>
  `;
}

function buildGraphHeaderMarkup(graphData) {
  return `
    <div class="graph-header">
      <div>
        <h3>Region factible y restricciones vinculantes</h3>
      </div>
      <div class="graph-header-actions">
        <div class="graph-caption">
          <span class="graph-chip">${state.objectiveType === "max" ? "Z -> Max" : "Z -> Min"}</span>
          <span class="binding-badge">Optimo (${formatPointTuple(graphData.optimum, graphData.dimension)})</span>
        </div>
        <button
          type="button"
          class="button secondary graph-copy-button"
          aria-label="Copiar grafico como imagen PNG"
          title="Copiar grafico como imagen PNG"
          data-state="idle"
        >
          <span class="graph-copy-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M9 5.75A2.75 2.75 0 0 1 11.75 3h6.5A2.75 2.75 0 0 1 21 5.75v9.5A2.75 2.75 0 0 1 18.25 18h-6.5A2.75 2.75 0 0 1 9 15.25z"></path>
              <path d="M4.75 7A1.75 1.75 0 0 0 3 8.75v9.5A2.75 2.75 0 0 0 5.75 21h7.5A1.75 1.75 0 0 0 15 19.25"></path>
            </svg>
          </span>
          <span class="graph-copy-label">Copiar PNG</span>
        </button>
      </div>
    </div>
  `;
}

function buildGraphTooltipMarkup() {
  return `
    <div class="graph-tooltip" aria-hidden="true">
      <div class="graph-tooltip-head">
        <span class="graph-tooltip-kicker"></span>
      </div>
      <div class="graph-tooltip-grid"></div>
    </div>
  `;
}

function buildGraphSideMarkup(graphData) {
  return "";
}

function renderGraph2D(graphData) {
  const width = 1120;
  const height = 760;
  const padding = {
    top: 34,
    right: 38,
    bottom: 72,
    left: 76
  };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const uniformScale = Math.min(
    usableWidth / Math.max(graphData.xMax, EPSILON),
    usableHeight / Math.max(graphData.yMax, EPSILON)
  );
  const plotWidth = graphData.xMax * uniformScale;
  const plotHeight = graphData.yMax * uniformScale;
  const plotLeft = padding.left + ((usableWidth - plotWidth) / 2);
  const plotRight = plotLeft + plotWidth;
  const plotBottom = height - padding.bottom - ((usableHeight - plotHeight) / 2);
  const plotTop = plotBottom - plotHeight;

  const toSvgPoint = (point) => ({
    x: plotLeft + (point.x * uniformScale),
    y: plotBottom - (point.y * uniformScale)
  });

  const regionPoints = graphData.region.map(toSvgPoint);
  const regionPolygon = regionPoints.length >= 3
    ? regionPoints.map((point) => `${point.x},${point.y}`).join(" ")
    : "";
  const regionPolyline = regionPoints.length === 2
    ? regionPoints.map((point) => `${point.x},${point.y}`).join(" ")
    : "";

  const optimumPoint = toSvgPoint(graphData.optimum);
  const optimumData = buildPointDataset("Optimo", graphData.optimum, 2, "optimum");
  const objectiveVector = state.objectiveType === "max"
    ? { x: state.objectiveCoefficients[0], y: state.objectiveCoefficients[1] }
    : { x: state.objectiveCoefficients[0] * -1, y: state.objectiveCoefficients[1] * -1 };
  const objectiveLength = Math.hypot(objectiveVector.x, objectiveVector.y) || 1;
  const arrowEnd = {
    x: Math.max(0, Math.min(graphData.xMax, graphData.optimum.x + ((objectiveVector.x / objectiveLength) * (graphData.xMax * 0.18)))),
    y: Math.max(0, Math.min(graphData.yMax, graphData.optimum.y + ((objectiveVector.y / objectiveLength) * (graphData.yMax * 0.18))))
  };
  const arrowEndPoint = toSvgPoint(arrowEnd);

  const gridLinesX = graphData.xTicks.map((tick) => {
    const point = toSvgPoint({ x: tick, y: 0 });

    return `
      <line x1="${point.x}" y1="${plotTop}" x2="${point.x}" y2="${plotBottom}" stroke="${THEME.graphGrid}" stroke-dasharray="3 6" />
      <text x="${point.x}" y="${plotBottom + 26}" text-anchor="middle" fill="${THEME.graphLabel}" font-size="13">${formatGraphNumber(tick)}</text>
    `;
  }).join("");

  const gridLinesY = graphData.yTicks.map((tick) => {
    const point = toSvgPoint({ x: 0, y: tick });

    return `
      <line x1="${plotLeft}" y1="${point.y}" x2="${plotRight}" y2="${point.y}" stroke="${THEME.graphGrid}" stroke-dasharray="3 6" />
      <text x="${plotLeft - 14}" y="${point.y + 5}" text-anchor="end" fill="${THEME.graphLabel}" font-size="13">${formatGraphNumber(tick)}</text>
    `;
  }).join("");

  const constraintLines = graphData.constraints.map((constraint, index) => {
    if (!constraint.segment) {
      return "";
    }

    const [from, to] = constraint.segment.map(toSvgPoint);
    const labelPoint = {
      x: ((from.x + to.x) / 2) + ((index % 2 === 0) ? 14 : -14),
      y: ((from.y + to.y) / 2) - 12 - ((index % 3) * 8)
    };
    const color = constraint.binding ? THEME.graphBindingColor : constraint.color;

    return `
      <line
        x1="${from.x}"
        y1="${from.y}"
        x2="${to.x}"
        y2="${to.y}"
        stroke="${color}"
        stroke-width="${constraint.binding ? 4 : 2.8}"
        stroke-linecap="round"
      />
      <text x="${labelPoint.x}" y="${labelPoint.y}" fill="${color}" font-size="14" font-weight="800">${constraint.label}</text>
    `;
  }).join("");

  const objectiveLine = graphData.objectiveSegment
    ? (() => {
      const [from, to] = graphData.objectiveSegment.map(toSvgPoint);

      return `
        <line
          x1="${from.x}"
          y1="${from.y}"
          x2="${to.x}"
          y2="${to.y}"
          stroke="${THEME.graphObjective}"
          stroke-width="4"
          stroke-linecap="round"
          opacity="0.95"
        />
      `;
    })()
    : "";

  const vertexMarkers = graphData.region.map((point, index) => {
    if (isSamePoint(point, graphData.optimum, 2)) {
      return "";
    }

    return renderVertexMarker(
      buildPointDataset(`Vertice ${index + 1}`, point, 2),
      toSvgPoint(point)
    );
  }).join("");

  graphPanel.innerHTML = `
    ${buildGraphHeaderMarkup(graphData)}

    <div class="graph-layout">
      <div class="graph-frame">
        <svg class="graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico de la region factible y restricciones vinculantes del problema">
          <defs>
            <marker id="objective-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="${THEME.graphObjective}"></path>
            </marker>
          </defs>

          ${gridLinesX}
          ${gridLinesY}

          <line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="${THEME.graphAxis}" stroke-width="2.5" />
          <line x1="${plotLeft}" y1="${plotBottom}" x2="${plotLeft}" y2="${plotTop}" stroke="${THEME.graphAxis}" stroke-width="2.5" />

          ${regionPolygon ? `<polygon points="${regionPolygon}" fill="${THEME.graphRegionFill}" stroke="${THEME.graphRegionStroke}" stroke-width="4"></polygon>` : ""}
          ${regionPolyline ? `<polyline points="${regionPolyline}" fill="none" stroke="${THEME.graphRegionStroke}" stroke-width="6" stroke-linecap="round"></polyline>` : ""}

          ${constraintLines}
          ${objectiveLine}

          <line
            x1="${optimumPoint.x}"
            y1="${optimumPoint.y}"
            x2="${arrowEndPoint.x}"
            y2="${arrowEndPoint.y}"
            stroke="${THEME.graphObjective}"
            stroke-width="4"
            stroke-linecap="round"
            marker-end="url(#objective-arrow)"
          />

          ${vertexMarkers}

          ${renderVertexMarker(optimumData, optimumPoint, 10, "graph-vertex-optimum")}
          <text x="${optimumPoint.x + 14}" y="${optimumPoint.y - 14}" fill="${THEME.graphAxis}" font-size="15" font-weight="800">Optimo</text>

          <text x="${plotRight + 4}" y="${plotBottom + 8}" fill="${THEME.graphAxis}" font-size="15" font-weight="800">X1</text>
          <text x="${plotLeft - 6}" y="${plotTop - 6}" fill="${THEME.graphAxis}" font-size="15" font-weight="800">X2</text>
        </svg>
        ${buildGraphTooltipMarkup()}
      </div>

      ${buildGraphSideMarkup(graphData)}
    </div>
  `;

  initializeGraphTooltip();
  initializeGraphCopyButton();
}

function renderGraph3D(graphData) {
  const width = 1120;
  const height = 760;
  const padding = {
    top: 48,
    right: 52,
    bottom: 94,
    left: 88
  };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const limits = {
    xMax: graphData.xMax,
    yMax: graphData.yMax,
    zMax: graphData.zMax
  };
  const origin = { x: 0, y: 0, z: 0 };
  const axisPoints = [
    { label: "X1", point: { x: graphData.xMax, y: 0, z: 0 }, color: THEME.graphAxis },
    { label: "X2", point: { x: 0, y: graphData.yMax, z: 0 }, color: THEME.graphAxis },
    { label: "X3", point: { x: 0, y: 0, z: graphData.zMax }, color: THEME.graphAxis }
  ];
  const objectiveDirection = state.objectiveType === "max"
    ? {
      x: state.objectiveCoefficients[0] ?? 0,
      y: state.objectiveCoefficients[1] ?? 0,
      z: state.objectiveCoefficients[2] ?? 0
    }
    : {
      x: (state.objectiveCoefficients[0] ?? 0) * -1,
      y: (state.objectiveCoefficients[1] ?? 0) * -1,
      z: (state.objectiveCoefficients[2] ?? 0) * -1
    };
  const objectiveLength = vectorLength3D(objectiveDirection) || 1;
  const objectiveScale = Math.min(graphData.xMax, graphData.yMax, graphData.zMax) * 0.16;
  const objectiveArrowEnd = {
    x: Math.max(0, Math.min(graphData.xMax, graphData.optimum.x + ((objectiveDirection.x / objectiveLength) * objectiveScale))),
    y: Math.max(0, Math.min(graphData.yMax, graphData.optimum.y + ((objectiveDirection.y / objectiveLength) * objectiveScale))),
    z: Math.max(0, Math.min(graphData.zMax, graphData.optimum.z + ((objectiveDirection.z / objectiveLength) * objectiveScale)))
  };
  const projectedBounds = [
    origin,
    graphData.optimum,
    objectiveArrowEnd,
    ...axisPoints.map((axis) => axis.point),
    ...graphData.vertices
  ].map((point) => projectPointIsometric(point, limits));
  const minProjectedX = Math.min(...projectedBounds.map((point) => point.x));
  const maxProjectedX = Math.max(...projectedBounds.map((point) => point.x));
  const minProjectedY = Math.min(...projectedBounds.map((point) => point.y));
  const maxProjectedY = Math.max(...projectedBounds.map((point) => point.y));
  const rangeX = Math.max(maxProjectedX - minProjectedX, 1e-6);
  const rangeY = Math.max(maxProjectedY - minProjectedY, 1e-6);
  const scale = Math.min(usableWidth / rangeX, usableHeight / rangeY);
  const offsetX = padding.left + ((usableWidth - (rangeX * scale)) / 2) - (minProjectedX * scale);
  const offsetY = padding.top + ((usableHeight - (rangeY * scale)) / 2) + (maxProjectedY * scale);
  const toSvgPoint = (point) => {
    const projected = projectPointIsometric(point, limits);

    return {
      x: offsetX + (projected.x * scale),
      y: offsetY - (projected.y * scale)
    };
  };

  const axisLines = axisPoints.map((axis) => {
    const from = toSvgPoint(origin);
    const to = toSvgPoint(axis.point);
    const axisMax = axis.label === "X1" ? graphData.xMax : axis.label === "X2" ? graphData.yMax : graphData.zMax;

    return `
      <line
        x1="${from.x}"
        y1="${from.y}"
        x2="${to.x}"
        y2="${to.y}"
        stroke="${axis.color}"
        stroke-width="3"
        stroke-linecap="round"
      />
      <text x="${to.x + 10}" y="${to.y + (axis.label === "X3" ? -8 : 4)}" fill="${THEME.graphAxis}" font-size="16" font-weight="800">${axis.label}</text>
      <text x="${to.x + 10}" y="${to.y + (axis.label === "X3" ? 12 : 22)}" fill="${THEME.graphLabel}" font-size="12">${formatGraphNumber(axisMax)}</text>
    `;
  }).join("");

  const faces = graphData.faces
    .map((face) => {
      const projectedPoints = face.points.map(toSvgPoint);
      const depth = face.centroid.x + face.centroid.y + face.centroid.z;
      const fill = face.binding
        ? THEME.graphFaceBinding
        : face.isAxis
          ? THEME.graphFaceAxis
          : face.color;

      return {
        depth,
        markup: `
          <polygon
            points="${projectedPoints.map((point) => `${point.x},${point.y}`).join(" ")}"
            fill="${fill}"
            stroke="${face.binding ? THEME.graphBindingColor : THEME.graphFaceStroke}"
            stroke-width="${face.binding ? 2.4 : 1.2}"
          ></polygon>
        `
      };
    })
    .sort((first, second) => first.depth - second.depth)
    .map((face) => face.markup)
    .join("");

  const edges = graphData.edges.map((edge) => {
    const from = toSvgPoint(edge.from);
    const to = toSvgPoint(edge.to);

    return `
      <line
        x1="${from.x}"
        y1="${from.y}"
        x2="${to.x}"
        y2="${to.y}"
        stroke="${edge.binding ? THEME.graphBindingColor : THEME.graphEdge}"
        stroke-width="${edge.binding ? 3.4 : 2.1}"
        stroke-linecap="round"
      />
    `;
  }).join("");

  const optimumGuides = [
    [{ x: graphData.optimum.x, y: graphData.optimum.y, z: graphData.optimum.z }, { x: graphData.optimum.x, y: graphData.optimum.y, z: 0 }],
    [{ x: graphData.optimum.x, y: graphData.optimum.y, z: 0 }, { x: graphData.optimum.x, y: 0, z: 0 }],
    [{ x: graphData.optimum.x, y: 0, z: 0 }, origin]
  ].map(([fromPoint, toPoint]) => {
    const from = toSvgPoint(fromPoint);
    const to = toSvgPoint(toPoint);

    return `
      <line
        x1="${from.x}"
        y1="${from.y}"
        x2="${to.x}"
        y2="${to.y}"
        stroke="${THEME.graphGuide}"
        stroke-width="1.4"
        stroke-dasharray="5 6"
      />
    `;
  }).join("");

  const vertexMarkers = graphData.vertices.map((point, index) => {
    if (isSamePoint(point, graphData.optimum, 3)) {
      return "";
    }

    return renderVertexMarker(
      buildPointDataset(`Vertice ${index + 1}`, point, 3),
      toSvgPoint(point),
      7
    );
  }).join("");
  const optimumPoint = toSvgPoint(graphData.optimum);
  const optimumData = buildPointDataset("Optimo", graphData.optimum, 3, "optimum");
  const objectiveArrowStart = toSvgPoint(graphData.optimum);
  const objectiveArrowFinish = toSvgPoint(objectiveArrowEnd);

  graphPanel.innerHTML = `
    ${buildGraphHeaderMarkup(graphData)}

    <div class="graph-layout">
      <div class="graph-frame">
        <svg class="graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico tridimensional de la region factible y restricciones vinculantes del problema">
          <defs>
            <marker id="objective-arrow-3d" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="${THEME.graphObjective}"></path>
            </marker>
          </defs>

          ${faces}
          ${axisLines}
          ${optimumGuides}
          ${edges}

          <line
            x1="${objectiveArrowStart.x}"
            y1="${objectiveArrowStart.y}"
            x2="${objectiveArrowFinish.x}"
            y2="${objectiveArrowFinish.y}"
            stroke="${THEME.graphObjective}"
            stroke-width="3.2"
            stroke-linecap="round"
            marker-end="url(#objective-arrow-3d)"
          />

          ${vertexMarkers}
          ${renderVertexMarker(optimumData, optimumPoint, 9, "graph-vertex-optimum")}
          <text x="${optimumPoint.x + 12}" y="${optimumPoint.y - 14}" fill="${THEME.graphAxis}" font-size="15" font-weight="800">Optimo</text>
          <text x="${toSvgPoint(origin).x - 16}" y="${toSvgPoint(origin).y + 22}" fill="${THEME.graphLabel}" font-size="12">0</text>
        </svg>
        ${buildGraphTooltipMarkup()}
      </div>

      ${buildGraphSideMarkup(graphData)}
    </div>
  `;

  initializeGraphTooltip();
  initializeGraphCopyButton();
}

function renderGraph(result) {
  const graphData = buildGraphData(result);

  graphPanel.classList.remove("hidden");

  if (graphData.type === "unsupported") {
    graphPanel.innerHTML = `
      <div class="graph-empty">${graphData.message}</div>
    `;
    return;
  }

  if (graphData.type === "graph-3d") {
    renderGraph3D(graphData);
    return;
  }

  renderGraph2D(graphData);
}

function initializeGraphTooltip() {
  const frame = graphPanel.querySelector(".graph-frame");
  const tooltip = graphPanel.querySelector(".graph-tooltip");
  const vertices = frame?.querySelectorAll(".graph-vertex");

  if (!frame || !tooltip || !vertices?.length) {
    return;
  }

  const kicker = tooltip.querySelector(".graph-tooltip-kicker");
  const grid = tooltip.querySelector(".graph-tooltip-grid");

  const setTooltipPosition = (clientX, clientY) => {
    const frameRect = frame.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 18;
    const maxLeft = Math.max(12, frameRect.width - tooltipRect.width - 12);
    const maxTop = Math.max(12, frameRect.height - tooltipRect.height - 12);
    let left = (clientX - frameRect.left) + gap;
    let top = (clientY - frameRect.top) - tooltipRect.height - gap;
    let placement = "top";

    if (left > maxLeft) {
      left = (clientX - frameRect.left) - tooltipRect.width - gap;
    }

    if (top < 12) {
      top = (clientY - frameRect.top) + gap;
      placement = "bottom";
    }

    const clampedLeft = Math.max(12, Math.min(left, maxLeft));
    const clampedTop = Math.max(12, Math.min(top, maxTop));
    tooltip.dataset.placement = placement;
    tooltip.style.setProperty("--tooltip-left", `${clampedLeft}px`);
    tooltip.style.setProperty("--tooltip-top", `${clampedTop}px`);
  };

  const showTooltip = (vertex, clientX, clientY) => {
    const isOptimum = vertex.dataset.type === "optimum";
    const dimension = Number(vertex.dataset.dimension) || 2;
    const stats = Array.from({ length: dimension }, (_, index) => ({
      label: `X${index + 1}`,
      value: vertex.dataset[`x${index + 1}`] ?? "0",
      accent: false
    }));

    stats.push({
      label: "Z",
      value: vertex.dataset.objective ?? "0",
      accent: true
    });

    kicker.textContent = isOptimum ? "Optimo" : "";
    tooltip.classList.toggle("has-kicker", isOptimum);
    tooltip.style.setProperty("--tooltip-columns", String(stats.length));
    tooltip.style.setProperty("--tooltip-width", stats.length > 3 ? "276px" : "214px");
    grid.innerHTML = stats.map((stat) => `
      <div class="graph-tooltip-stat ${stat.accent ? "graph-tooltip-objective" : ""}">
        <span>${stat.label}</span>
        <strong>${stat.value}</strong>
      </div>
    `).join("");
    tooltip.dataset.type = vertex.dataset.type ?? "vertex";
    tooltip.classList.add("is-visible");
    tooltip.setAttribute("aria-hidden", "false");
    setTooltipPosition(clientX, clientY);
  };

  const hideTooltip = () => {
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
  };

  vertices.forEach((vertex) => {
    vertex.addEventListener("pointerenter", (event) => {
      showTooltip(vertex, event.clientX, event.clientY);
    });

    vertex.addEventListener("pointermove", (event) => {
      showTooltip(vertex, event.clientX, event.clientY);
    });

    vertex.addEventListener("pointerleave", hideTooltip);
    vertex.addEventListener("blur", hideTooltip);
    vertex.addEventListener("focus", () => {
      const vertexRect = vertex.getBoundingClientRect();
      showTooltip(
        vertex,
        vertexRect.left + (vertexRect.width / 2),
        vertexRect.top + (vertexRect.height / 2)
      );
    });
  });
}

function setGraphCopyButtonState(button, state) {
  const label = button.querySelector(".graph-copy-label");

  button.dataset.state = state;

  if (!label) {
    return;
  }

  if (state === "busy") {
    label.textContent = "Copiando...";
    button.setAttribute("aria-busy", "true");
    return;
  }

  button.removeAttribute("aria-busy");

  if (state === "success") {
    label.textContent = "Copiado";
    return;
  }

  if (state === "download") {
    label.textContent = "Descargado";
    return;
  }

  if (state === "error") {
    label.textContent = "Sin copiar";
    return;
  }

  label.textContent = "Copiar PNG";
}

function scheduleGraphCopyButtonReset(button) {
  window.clearTimeout(button._resetTimer);
  button._resetTimer = window.setTimeout(() => {
    setGraphCopyButtonState(button, "idle");
  }, 1800);
}

function setGenericCopyButtonState(button, state, labels) {
  const label = button.querySelector("[data-copy-label]");

  button.dataset.state = state;

  if (!label) {
    return;
  }

  if (state === "busy") {
    label.textContent = labels.busy;
    button.setAttribute("aria-busy", "true");
    return;
  }

  button.removeAttribute("aria-busy");

  if (state === "success") {
    label.textContent = labels.success;
    return;
  }

  if (state === "download") {
    label.textContent = labels.download;
    return;
  }

  if (state === "error") {
    label.textContent = labels.error;
    return;
  }

  label.textContent = labels.idle;
}

function scheduleGenericCopyButtonReset(button, labels) {
  window.clearTimeout(button._resetTimer);
  button._resetTimer = window.setTimeout(() => {
    setGenericCopyButtonState(button, "idle", labels);
  }, 1800);
}

function initializeGraphCopyButton() {
  const button = graphPanel.querySelector(".graph-copy-button");
  const svg = graphPanel.querySelector(".graph-svg");

  if (!button || !svg) {
    return;
  }

  button.addEventListener("click", async () => {
    if (button.dataset.state === "busy") {
      return;
    }

    setGraphCopyButtonState(button, "busy");

    try {
      const pngBlob = await exportGraphToPng(svg);

      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": pngBlob
          })
        ]);
        setGraphCopyButtonState(button, "success");
      } else {
        downloadGraphBlob(pngBlob);
        setGraphCopyButtonState(button, "download");
      }
    } catch (error) {
      try {
        const pngBlob = await exportGraphToPng(svg);
        downloadGraphBlob(pngBlob);
        setGraphCopyButtonState(button, "download");
      } catch {
        setGraphCopyButtonState(button, "error");
      }
    }

    scheduleGraphCopyButtonReset(button);
  });
}

async function exportElementToPng(element) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Seguimos con las fuentes disponibles si alguna falla.
    }
  }

  const rect = element.getBoundingClientRect();
  const exportWidth = Math.ceil(rect.width);
  const exportHeight = Math.ceil(rect.height);
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = exportWidth * scale;
  canvas.height = exportHeight * scale;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo crear el contexto del canvas.");
  }

  context.scale(scale, scale);
  context.fillStyle = "#212121";
  context.fillRect(0, 0, exportWidth, exportHeight);

  const drawableNodes = [
    ...element.querySelectorAll(
      ".phase-heading-actions > p, .table-iteration-title, .table-iteration-note, .classroom-tableau th:not(.top-blank):not(.top-gap):not(.guide-gutter), .classroom-tableau td:not(.guide-gutter), .classroom-tableau .guide-arrow"
    )
  ];

  drawableNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const nodeRect = node.getBoundingClientRect();
    const x = nodeRect.left - rect.left;
    const y = nodeRect.top - rect.top;
    const width = nodeRect.width;
    const height = nodeRect.height;
    const computed = window.getComputedStyle(node);

    if (computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)" && computed.backgroundColor !== "transparent") {
      context.fillStyle = computed.backgroundColor;
      context.fillRect(x, y, width, height);
    }

    const borderWidth = Number.parseFloat(computed.borderTopWidth);

    if (borderWidth > 0 && computed.borderTopColor && computed.borderTopColor !== "transparent") {
      context.strokeStyle = computed.borderTopColor;
      context.lineWidth = borderWidth;
      context.strokeRect(x + (borderWidth / 2), y + (borderWidth / 2), Math.max(0, width - borderWidth), Math.max(0, height - borderWidth));
    }

    const text = node.innerText?.trim();

    if (!text) {
      return;
    }

    const fontStyle = computed.fontStyle && computed.fontStyle !== "normal" ? `${computed.fontStyle} ` : "";
    const fontWeight = computed.fontWeight ? `${computed.fontWeight} ` : "";
    const fontSize = computed.fontSize || "16px";
    const fontFamily = computed.fontFamily || '"Manrope", sans-serif';
    const lineHeight = Number.parseFloat(computed.lineHeight) || (Number.parseFloat(fontSize) * 1.2);
    context.font = `${fontStyle}${fontWeight}${fontSize} ${fontFamily}`;
    context.fillStyle = computed.color || "#E8E8E8";
    context.textBaseline = "middle";
    context.textAlign = computed.textAlign === "left" ? "left" : computed.textAlign === "right" ? "right" : "center";

    if (node.classList.contains("guide-arrow-row")) {
      // In DOM this arrow is an up-arrow rotated via CSS transform. Canvas export must
      // emulate that transform so the glyph matches the bottom arrow.
      context.save();
      context.translate(x + (width / 2), y + (height / 2));
      context.rotate(Math.PI / 2);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 0, 0);
      context.restore();
      return;
    }

    const lines = text.split(/\r?\n/);
    const totalTextHeight = lineHeight * lines.length;

    const textX = computed.textAlign === "left"
      ? x + 8
      : computed.textAlign === "right"
        ? x + width - 8
        : x + (width / 2);
    let lineY = y + (height / 2) - (totalTextHeight / 2) + (lineHeight / 2);

    lines.forEach((line) => {
      context.fillText(line, textX, lineY);
      lineY += lineHeight;
    });
  });

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("No se pudo generar la imagen PNG."));
    }, "image/png");
  });
}

async function copyOrDownloadElementPng(element, button, labels) {
  setGenericCopyButtonState(button, "busy", labels);

  try {
    const pngBlob = await exportElementToPng(element);

    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": pngBlob
        })
      ]);
      setGenericCopyButtonState(button, "success", labels);
    } else {
      downloadGraphBlob(pngBlob);
      setGenericCopyButtonState(button, "download", labels);
    }
  } catch (error) {
    try {
      const pngBlob = await exportElementToPng(element);
      downloadGraphBlob(pngBlob);
      setGenericCopyButtonState(button, "download", labels);
    } catch {
      setGenericCopyButtonState(button, "error", labels);
    }
  }

  scheduleGenericCopyButtonReset(button, labels);
}

function initializeTableCopyButtons() {
  const labels = {
    idle: "Copiar tablas",
    busy: "Copiando...",
    success: "Copiado",
    download: "Descargado",
    error: "Sin copiar"
  };

  iterationGroups.querySelectorAll(".tables-copy-button").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.addEventListener("click", async () => {
      if (button.dataset.state === "busy") {
        return;
      }

      const phaseBlock = button.closest(".phase-block");

      if (!(phaseBlock instanceof HTMLElement)) {
        return;
      }

      await copyOrDownloadElementPng(phaseBlock, button, labels);
    });
  });
}

async function exportGraphToPng(svg) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Si las fuentes no estan listas, seguimos con las disponibles.
    }
  }

  const viewBox = svg.viewBox.baseVal;
  const exportWidth = viewBox?.width || svg.clientWidth || 1120;
  const exportHeight = viewBox?.height || svg.clientHeight || 760;
  const serializedSvg = serializeGraphSvg(svg, exportWidth, exportHeight);
  const svgBlob = new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = exportWidth * scale;
    canvas.height = exportHeight * scale;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo crear el contexto del canvas.");
    }

    context.scale(scale, scale);
    context.drawImage(image, 0, 0, exportWidth, exportHeight);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("No se pudo generar la imagen PNG."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function serializeGraphSvg(svg, exportWidth, exportHeight) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NAMESPACE);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(exportWidth));
  clone.setAttribute("height", String(exportHeight));

  let defs = clone.querySelector("defs");

  if (!defs) {
    defs = document.createElementNS(SVG_NAMESPACE, "defs");
    clone.insertBefore(defs, clone.firstChild);
  }

  const exportStyle = document.createElementNS(SVG_NAMESPACE, "style");
  exportStyle.textContent = `
    text { font-family: "Manrope", sans-serif; }
    .graph-vertex-ring { fill: ${THEME.graphVertexFill}; stroke: ${THEME.graphAxis}; stroke-width: 2.5; }
    .graph-vertex-optimum .graph-vertex-ring { fill: ${THEME.graphVertexOptimumFill}; stroke-width: 3; }
  `;
  defs.appendChild(exportStyle);

  const linearGradient = document.createElementNS(SVG_NAMESPACE, "linearGradient");
  linearGradient.setAttribute("id", "graph-export-base");
  linearGradient.setAttribute("x1", "0%");
  linearGradient.setAttribute("y1", "0%");
  linearGradient.setAttribute("x2", "0%");
  linearGradient.setAttribute("y2", "100%");

  [
    { offset: "0%", color: THEME.exportBaseStart, opacity: "0.96" },
    { offset: "100%", color: THEME.exportBaseEnd, opacity: "0.96" }
  ].forEach((stopData) => {
    const stop = document.createElementNS(SVG_NAMESPACE, "stop");
    stop.setAttribute("offset", stopData.offset);
    stop.setAttribute("stop-color", stopData.color);
    stop.setAttribute("stop-opacity", stopData.opacity);
    linearGradient.appendChild(stop);
  });

  const radialGradient = document.createElementNS(SVG_NAMESPACE, "radialGradient");
  radialGradient.setAttribute("id", "graph-export-glow");
  radialGradient.setAttribute("cx", "16%");
  radialGradient.setAttribute("cy", "14%");
  radialGradient.setAttribute("r", "42%");

  [
    { offset: "0%", color: THEME.exportGlow, opacity: "0.16" },
    { offset: "100%", color: THEME.exportGlow, opacity: "0" }
  ].forEach((stopData) => {
    const stop = document.createElementNS(SVG_NAMESPACE, "stop");
    stop.setAttribute("offset", stopData.offset);
    stop.setAttribute("stop-color", stopData.color);
    stop.setAttribute("stop-opacity", stopData.opacity);
    radialGradient.appendChild(stop);
  });

  defs.appendChild(linearGradient);
  defs.appendChild(radialGradient);

  const baseRect = document.createElementNS(SVG_NAMESPACE, "rect");
  baseRect.setAttribute("x", "0");
  baseRect.setAttribute("y", "0");
  baseRect.setAttribute("width", String(exportWidth));
  baseRect.setAttribute("height", String(exportHeight));
  baseRect.setAttribute("fill", "url(#graph-export-base)");

  const glowRect = document.createElementNS(SVG_NAMESPACE, "rect");
  glowRect.setAttribute("x", "0");
  glowRect.setAttribute("y", "0");
  glowRect.setAttribute("width", String(exportWidth));
  glowRect.setAttribute("height", String(exportHeight));
  glowRect.setAttribute("fill", "url(#graph-export-glow)");

  clone.insertBefore(baseRect, defs.nextSibling);
  clone.insertBefore(glowRect, baseRect.nextSibling);

  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar el grafico para copiarlo."));
    image.src = src;
  });
}

function downloadGraphBlob(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "grafico-region-factible.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function solveModel() {
  const normalizedModel = {
    variableCount: state.variableCount,
    objectiveType: state.objectiveType,
    objectiveCoefficients: [...state.objectiveCoefficients],
    constraints: state.constraints.map((constraint) => normalizeConstraint(constraint))
  };

  const transformedObjective = normalizedModel.objectiveType === "max"
    ? [...normalizedModel.objectiveCoefficients]
    : normalizedModel.objectiveCoefficients.map((value) => value * -1);

  const standardForm = buildStandardForm(normalizedModel);
  const snapshots = [];
  const messages = [];

  if (standardForm.artificialColumns.length > 0) {
    const bigMObjective = Array.from({ length: standardForm.variableNames.length }, (_, columnIndex) => (
      columnIndex < state.variableCount ? transformedObjective[columnIndex] : 0
    ));
    const exactBigMObjective = bigMObjective.map((value) => cloneExactValue(value));
    const exactConstraintRows = cloneExactMatrix(standardForm.constraintRows);

    standardForm.artificialColumns.forEach((columnIndex) => {
      bigMObjective[columnIndex] = { constant: 0, bigM: -1 };
      exactBigMObjective[columnIndex] = normalizeExactValue({
        constant: createExactRational(0, 1),
        bigM: createExactRational(-1, 1)
      });
    });

    const bigMResult = runSimplexPhase({
      phase: "Metodo M",
      variableNames: [...standardForm.variableNames],
      basis: [...standardForm.basis],
      constraintRows: cloneMatrix(standardForm.constraintRows),
      exactConstraintRows,
      objectiveCoefficients: bigMObjective,
      exactObjectiveCoefficients: exactBigMObjective,
      snapshots
    });

    if (bigMResult.status === "unbounded") {
      return {
        status: "error",
        reason: "El metodo M quedo sin cota para la variable seleccionada.",
        messages,
        snapshots
      };
    }

    const artificialInBasis = bigMResult.basis.some((basisColumn, rowIndex) => (
      standardForm.artificialColumns.includes(basisColumn) &&
      bigMResult.tableau[rowIndex].at(-1) > EPSILON
    ));

    if (artificialInBasis) {
      messages.push("El problema es infactible: quedaron variables artificiales activas al terminar el metodo M.");
      return {
        status: "infeasible",
        messages,
        snapshots
      };
    }

    messages.push("Se agregaron variables artificiales (mu) y la tabla se resolvio con metodo M. La fila inferior usa la convencion Zj - Cj, por eso las artificiales aparecen con costo -M.");

    const transformedOptimum = toBigMParts(bigMResult.tableau[bigMResult.tableau.length - 1].at(-1)).constant;
    const exactTransformedOptimum = toExactBigMParts(bigMResult.exactTableau[bigMResult.exactTableau.length - 1].at(-1)).constant;
    const optimum = state.objectiveType === "max" ? transformedOptimum : transformedOptimum * -1;
    const exactOptimum = state.objectiveType === "max"
      ? exactTransformedOptimum
      : createExactRational(exactTransformedOptimum.numerator * -1, exactTransformedOptimum.denominator);

    return {
      status: "optimal",
      optimum,
      exactOptimum,
      solution: extractSolution(bigMResult.tableau, bigMResult.basis, state.variableCount),
      exactSolution: extractExactSolution(bigMResult.exactTableau, bigMResult.basis, state.variableCount),
      snapshots,
      messages
    };
  }

  const phaseTwoObjective = Array.from({ length: standardForm.variableNames.length }, (_, columnIndex) => (
    columnIndex < state.variableCount ? transformedObjective[columnIndex] : 0
  ));
  const exactPhaseTwoObjective = phaseTwoObjective.map((value) => cloneExactValue(value));

  const phaseTwoResult = runSimplexPhase({
    phase: "Fase II",
    variableNames: standardForm.variableNames,
    basis: [...standardForm.basis],
    constraintRows: cloneMatrix(standardForm.constraintRows),
    exactConstraintRows: cloneExactMatrix(standardForm.constraintRows),
    objectiveCoefficients: phaseTwoObjective,
    exactObjectiveCoefficients: exactPhaseTwoObjective,
    snapshots
  });

  if (phaseTwoResult.status === "unbounded") {
    messages.push(`La variable ${phaseTwoResult.enteringVariable} puede entrar pero no hay fila saliente positiva.`);
    return {
      status: "unbounded",
      messages,
      snapshots
    };
  }

  const transformedOptimum = phaseTwoResult.tableau[phaseTwoResult.tableau.length - 1].at(-1);
  const exactTransformedOptimum = cloneExactValue(phaseTwoResult.exactTableau[phaseTwoResult.exactTableau.length - 1].at(-1));
  const optimum = state.objectiveType === "max" ? transformedOptimum : transformedOptimum * -1;
  const exactOptimum = state.objectiveType === "max"
    ? exactTransformedOptimum
    : createExactRational(exactTransformedOptimum.numerator * -1, exactTransformedOptimum.denominator);

  return {
    status: "optimal",
    optimum,
    exactOptimum,
    solution: extractSolution(phaseTwoResult.tableau, phaseTwoResult.basis, state.variableCount),
    exactSolution: extractExactSolution(phaseTwoResult.exactTableau, phaseTwoResult.basis, state.variableCount),
    snapshots,
    messages
  };
}

function renderSummary(result) {
  const summary = buildModelSummary();
  const alerts = result.messages && result.messages.length
    ? result.messages
    : result.reason
      ? [result.reason]
      : [];

  if (result.status === "optimal") {
    const solutionValues = state.numberFormat === "fraction" && Array.isArray(result.exactSolution)
      ? result.exactSolution
      : result.solution;
    const optimumValue = state.numberFormat === "fraction" && result.exactOptimum
      ? result.exactOptimum
      : result.optimum;
    const solutionPills = solutionValues.map((value, index) => `
      <span class="solution-pill">
        <strong>x${index + 1}</strong>
        <span>${formatValue(value)}</span>
      </span>
    `).join("");

    const messagePills = result.messages.map((message) => `
      <span class="message-pill">${message}</span>
    `).join("");

    resultSummary.classList.remove("empty-state");
    resultSummary.innerHTML = `
      <div class="summary-grid">
        <div class="summary-block">
          <p class="summary-label">Objetivo</p>
          <p class="summary-value">${summary.objective}</p>
        </div>
        <div class="summary-block">
          <p class="summary-label">Valor optimo</p>
          <p class="summary-value">${formatValue(optimumValue)}</p>
        </div>
      </div>
      <div class="summary-block">
        <p class="summary-label">Solucion</p>
        <div class="solution-list">${solutionPills}</div>
      </div>
      ${messagePills ? `
        <div class="summary-block">
          <p class="summary-label">Notas</p>
          <div class="message-list">${messagePills}</div>
        </div>
      ` : ""}
    `;

    return;
  }

  const pillClass = result.status === "infeasible" ? "danger" : "warning";
  resultSummary.classList.remove("empty-state");
  resultSummary.innerHTML = `
    <div class="summary-block">
      <p class="summary-label">Estado</p>
      <p class="summary-value">${result.status === "infeasible" ? "Problema infactible" : result.status === "unbounded" ? "Problema no acotado" : "No se pudo resolver"}</p>
    </div>
    <div class="message-list">
      ${alerts.filter(Boolean).map((message) => `
        <span class="message-pill ${pillClass}">${message}</span>
      `).join("")}
    </div>
  `;
}

function buildTableMarkup(snapshot, previousSnapshot = null) {
  const objectiveRow = snapshot.tableau[snapshot.tableau.length - 1];
  const displayTableau = snapshot.displayTableau ?? snapshot.tableau;
  const displayObjectiveCoefficients = snapshot.displayObjectiveCoefficients ?? snapshot.objectiveCoefficients;
  const displayObjectiveRowRaw = displayTableau[displayTableau.length - 1];
  const rhsColumnIndex = objectiveRow.length - 1;
  const dataColumnWidth = state.numberFormat === "fraction" ? "42px" : "30px";
  const guideColumnWidth = "22px";
  const buildFixedCol = (width) => `<col style="width:${width}">`;
  const displayObjectiveValue = (value) => {
    if (state.objectiveType !== "min") {
      return value;
    }

    return (isExactRationalValue(value) || isExactBigMValue(value))
      ? exactNegateValue(value)
      : negateValue(value);
  };
  const displayObjectiveRow = displayObjectiveRowRaw.map((value) => displayObjectiveValue(value));
  const retiredArtificialColumns = new Set(
    snapshot.variableNames
      .map((label, columnIndex) => ({ label, columnIndex }))
      .filter(({ label, columnIndex }) => isArtificialVariableName(label) && !snapshot.basis.includes(columnIndex))
      .map(({ columnIndex }) => columnIndex)
  );
  const enteringColumn = findDisplayEnteringColumn(displayObjectiveRow, state.objectiveType, retiredArtificialColumns);
  const leavingRow = enteringColumn === -1 ? -1 : chooseLeavingRow(snapshot.tableau, enteringColumn);
  const ratios = enteringColumn === -1
    ? []
    : snapshot.tableau.slice(0, -1).map((row, rowIndex) => {
      const coefficient = row[enteringColumn];
      const rhs = row[rhsColumnIndex];
      const displayCoefficient = displayTableau[rowIndex][enteringColumn];
      const displayRhs = displayTableau[rowIndex][rhsColumnIndex];
      if (Math.abs(coefficient) < EPSILON) {
        if (Math.abs(rhs) < EPSILON) {
          return { expression: `${formatValue(displayRhs)} / ${formatValue(displayCoefficient)}`, display: "Indef." };
        }

        return {
          expression: `${formatValue(displayRhs)} / ${formatValue(displayCoefficient)}`,
          display: rhs > 0 ? "∞" : "-∞"
        };
      }

      const ratio = cleanNumber(rhs / coefficient);
      const exactRatio = exactDivideRational(displayRhs, displayCoefficient);
      const baseExpression = `${formatProductFactor(displayRhs)} / ${formatProductFactor(displayCoefficient)}`;

      return {
        expression: baseExpression,
        display: state.numberFormat === "fraction" ? formatExactRational(exactRatio) : formatExtendedNumber(ratio)
      };
    });

  const formatSymbol = (label, columnIndex = null) => {
    const displayLabel = formatDisplayVariableName(label, columnIndex);
    const match = displayLabel.match(/^([a-zA-Z]+)(\d+)$/);

    if (!match) {
      return displayLabel;
    }

    return `${match[1]}<sub>${match[2]}</sub>`;
  };

  const collectNonZeroProducts = (items, rightValueSelector) => {
    return items
      .map((item) => ({
        rowIndex: item.rowIndex,
        left: item.basisCost,
        right: rightValueSelector(item)
      }))
      .filter(({ left, right }) => !isZeroValue(left) && !isZeroValue(right));
  };

  const renderNonZeroProductSum = (products) => {
    const terms = products.map(({ left, right }) => `${formatProductFactor(left)} &times; ${formatProductFactor(right)}`);
    return terms.length ? terms.join(" + ") : "0";
  };

  const cjCells = snapshot.variableNames.map((_, columnIndex) => `
    <th class="${columnIndex === enteringColumn ? "pivot-column" : ""}" data-role="cj" data-table-col="${columnIndex}">
      ${formatValue(displayObjectiveValue(displayObjectiveCoefficients[columnIndex] ?? 0))}
    </th>
  `).join("");

  const columnHeaders = snapshot.variableNames.map((_, columnIndex) => `
    <th class="${columnIndex === enteringColumn ? "pivot-column" : ""}">
      A<sub>${columnIndex + 1}</sub>
    </th>
  `).join("");

  const basisRows = snapshot.tableau.slice(0, -1).map((row, rowIndex) => {
    const basisColumn = snapshot.basis[rowIndex];
    const displayRow = displayTableau[rowIndex];

    return {
      row,
      displayRow,
      rowIndex,
      basisVariable: snapshot.variableNames[basisColumn] ?? "Base",
      basisColumn,
      basisCost: displayObjectiveValue(displayObjectiveCoefficients[basisColumn] ?? 0),
      rhs: displayRow[rhsColumnIndex]
    };
  });

  const rows = basisRows.map(({ row, displayRow, rowIndex, basisVariable, basisColumn, basisCost, rhs }) => {
    const ratioInfo = ratios[rowIndex];
    const ratioAttributes = ratioInfo == null
      ? ""
      : ` tabindex="0" data-guide-target="row" data-calc-expression="${escapeHtml(ratioInfo.expression)}" data-calc-result="${escapeHtml(ratioInfo.display)}" data-current-highlights="${escapeHtml(JSON.stringify([
        { row: rowIndex, role: "rhs", tone: "z-rhs" },
        { row: rowIndex, column: enteringColumn, tone: "z-cost" }
      ]))}"`;

    const cells = row.slice(0, -1).map((value, columnIndex) => {
      const displayValue = displayRow[columnIndex];
      if (retiredArtificialColumns.has(columnIndex)) {
        return `<td class="retired-artificial-cell" data-table-row="${rowIndex}" data-table-col="${columnIndex}">-</td>`;
      }

      const previousCalculation = buildPreviousTableCalculation(previousSnapshot, snapshot, rowIndex, columnIndex);
      const classes = [
        columnIndex === enteringColumn ? "pivot-column" : "",
        rowIndex === leavingRow && columnIndex === enteringColumn ? "pivot-cell" : "",
        previousCalculation ? "calc-trigger calc-from-previous" : ""
      ].filter(Boolean).join(" ");
      const previousAttributes = previousCalculation
        ? `
            tabindex="0"
            data-calc-mode="previous"
            data-calc-expression="${escapeHtml(previousCalculation.expression)}"
            data-calc-html="${escapeHtml(previousCalculation.expressionHtml ?? previousCalculation.expression)}"
            data-calc-result="${escapeHtml(formatValue(displayValue))}"
            data-prev-highlights="${escapeHtml(JSON.stringify(previousCalculation.highlights))}"
          `
        : "";

      return `<td class="${classes}" data-table-row="${rowIndex}" data-table-col="${columnIndex}"${previousAttributes}>${formatValue(displayValue)}</td>`;
    }).join("");

    const rhsCalculation = buildPreviousTableCalculation(previousSnapshot, snapshot, rowIndex, rhsColumnIndex);
    const rhsAttributes = rhsCalculation
      ? `
          tabindex="0"
          data-calc-mode="previous"
          data-calc-expression="${escapeHtml(rhsCalculation.expression)}"
          data-calc-html="${escapeHtml(rhsCalculation.expressionHtml ?? rhsCalculation.expression)}"
          data-calc-result="${escapeHtml(formatValue(rhs))}"
          data-prev-highlights="${escapeHtml(JSON.stringify(rhsCalculation.highlights))}"
        `
      : "";

    return `
      <tr class="${rowIndex === leavingRow ? "pivot-row" : ""}">
        <td class="ck-cell" data-table-row="${rowIndex}" data-role="basis-cost">${formatValue(basisCost)}</td>
        <td class="basis-variable">${formatSymbol(basisVariable, basisColumn)}</td>
        <td class="rhs-cell section-divider-right ${rhsCalculation ? "calc-trigger calc-from-previous" : ""}" data-table-row="${rowIndex}" data-table-col="${rhsColumnIndex}" data-role="rhs"${rhsAttributes}>${formatValue(rhs)}</td>
        ${cells}
        <td class="ratio-cell section-divider-left ${ratioInfo == null ? "" : "calc-trigger"}"${ratioAttributes}>${ratioInfo == null ? "&nbsp;" : renderTableValue(ratioInfo.display)}</td>
        <td class="guide-gutter row-guide-cell">
          <div class="row-guide-shell ${rowIndex === leavingRow ? "has-arrow" : ""}">
            <span class="guide-calc"></span>
            ${rowIndex === leavingRow ? '<span class="guide-arrow guide-arrow-row" aria-hidden="true">&uarr;</span>' : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const zProducts = basisRows.length
    ? collectNonZeroProducts(basisRows, ({ rhs }) => rhs)
    : [];
  const zExpression = basisRows.length
    ? renderNonZeroProductSum(zProducts)
    : formatValue(displayObjectiveValue(displayObjectiveRowRaw[rhsColumnIndex]));
  const zLabelText = `Z = ${formatValue(displayObjectiveRow[rhsColumnIndex])}`;
  const zCurrentHighlights = zProducts.flatMap(({ rowIndex }) => ([
    { row: rowIndex, role: "basis-cost", tone: "z-cost" },
    { row: rowIndex, role: "rhs", tone: "z-rhs" }
  ]));
  const zHoverExpression = basisRows.length && zExpression !== "0" ? zExpression : "";

  const objectiveCells = objectiveRow.slice(0, -1).map((_, columnIndex) => {
    if (retiredArtificialColumns.has(columnIndex)) {
      return `<td class="${columnIndex === enteringColumn ? "pivot-column " : ""}retired-artificial-cell" data-table-row="${basisRows.length}" data-table-col="${columnIndex}">-</td>`;
    }

    const displayValue = displayObjectiveRow[columnIndex];
    const zjProducts = basisRows.length
      ? collectNonZeroProducts(basisRows, ({ displayRow }) => displayRow[columnIndex])
      : [];
    const zjExpression = basisRows.length
      ? renderNonZeroProductSum(zjProducts)
      : "0";
    const cjValue = displayObjectiveValue(displayObjectiveCoefficients[columnIndex] ?? 0);
    const fullExpression = !isZeroValue(cjValue)
      ? `${zjExpression} - ${formatProductFactor(cjValue)}`
      : zjExpression;
    const currentHighlights = [
      ...basisRows.map(({ rowIndex }) => rowIndex).flatMap((rowIndex) => ([
        { row: rowIndex, role: "basis-cost", tone: "z-cost" },
        { row: rowIndex, column: columnIndex, tone: "z-rhs" }
      ])),
      { role: "cj", column: columnIndex, tone: "primary" }
    ];

    return `
      <td class="${columnIndex === enteringColumn ? "pivot-column " : ""}calc-trigger" tabindex="0" data-table-row="${basisRows.length}" data-table-col="${columnIndex}" data-guide-target="bottom" data-calc-expression="${escapeHtml(fullExpression.replaceAll("&times;", "x"))}" data-calc-result="${escapeHtml(formatValue(displayValue))}" data-current-highlights="${escapeHtml(JSON.stringify(currentHighlights))}">${formatValue(displayValue)}</td>
    `;
  }).join("");
  const bottomGuideMarkup = enteringColumn === -1
    ? `
        <tr class="guide-row" aria-hidden="true">
          <td colspan="${3 + snapshot.variableNames.length}" class="guide-gutter bottom-guide-display">
            <div class="bottom-guide-shell">
              <span class="guide-calc"></span>
            </div>
          </td>
          <td class="guide-gutter">&nbsp;</td>
          <td class="guide-gutter">&nbsp;</td>
        </tr>
      `
    : `
        <tr class="guide-row" aria-hidden="true">
          <td colspan="${3 + enteringColumn}" class="guide-gutter bottom-guide-display">
            <div class="bottom-guide-shell">
              <span class="guide-calc"></span>
            </div>
          </td>
          <td class="guide-gutter column-guide-cell">
            <span class="guide-arrow guide-arrow-column" aria-hidden="true">&uarr;</span>
          </td>
          ${Array.from({ length: snapshot.variableNames.length - enteringColumn - 1 }, () => '<td class="guide-gutter">&nbsp;</td>').join("")}
          <td class="guide-gutter">&nbsp;</td>
          <td class="guide-gutter">&nbsp;</td>
        </tr>
      `;

  return `
    <div class="table-wrap classroom-wrap">
      <table class="classroom-tableau ${state.numberFormat === "fraction" ? "fraction-display" : ""}">
        <colgroup>
          ${Array.from({ length: 3 }, () => buildFixedCol(dataColumnWidth)).join("")}
          ${Array.from({ length: snapshot.variableNames.length }, () => buildFixedCol(dataColumnWidth)).join("")}
          ${buildFixedCol(dataColumnWidth)}
          ${buildFixedCol(guideColumnWidth)}
        </colgroup>
        <thead>
          <tr class="cj-row">
            <th colspan="2" class="top-blank iteration-spot">
              <div class="table-iteration-label">
                <p class="table-iteration-title">${snapshot.title}</p>
                ${snapshot.note ? `<p class="table-iteration-note">${snapshot.note}</p>` : ""}
              </div>
            </th>
            <th class="cj-label section-divider-right">C<sub>j</sub></th>
            ${cjCells}
            <th class="top-gap"></th>
            <th class="guide-gutter"></th>
          </tr>
          <tr class="column-row">
            <th>C<sub>k</sub></th>
            <th>x<sub>k</sub></th>
            <th class="section-divider-right">B</th>
            ${columnHeaders}
            <th class="section-divider-left">b<sub>i</sub>/a<sub>ij</sub></th>
            <th class="guide-gutter"></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="objective-row classroom-z-row">
            <td colspan="3" class="z-label section-divider-right ${zHoverExpression ? "calc-trigger" : ""}" ${zHoverExpression ? `tabindex="0" data-guide-target="bottom" data-calc-expression="${escapeHtml(zHoverExpression.replaceAll("&times;", "x"))}" data-calc-result="${escapeHtml(formatValue(displayObjectiveRow[rhsColumnIndex]))}" data-current-highlights="${escapeHtml(JSON.stringify(zCurrentHighlights))}"` : ""}>${zLabelText}</td>
            ${objectiveCells}
            <td class="ratio-cell section-divider-left">&nbsp;</td>
            <td class="guide-gutter">&nbsp;</td>
          </tr>
          ${bottomGuideMarkup}
        </tbody>
      </table>
    </div>
  `;
}

function clearGuideCalculations(container) {
  container.querySelectorAll(".guide-calc").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.textContent = "";
      node.classList.remove("is-active");
    }
  });
}

function clearTraceHighlights(container = iterationGroups) {
  container.querySelectorAll(".trace-cell-primary, .trace-cell-secondary, .trace-cell-factor, .trace-cell-pivot, .trace-cell-current, .trace-cell-z-cost, .trace-cell-z-rhs, .trace-row-focus").forEach((node) => {
    node.classList.remove("trace-cell-primary", "trace-cell-secondary", "trace-cell-factor", "trace-cell-pivot", "trace-cell-current", "trace-cell-z-cost", "trace-cell-z-rhs", "trace-row-focus");
  });
}

function applyTraceHighlights(card, highlights) {
  if (!(card instanceof HTMLElement) || !Array.isArray(highlights)) {
    return;
  }

  highlights.forEach((highlight) => {
    const row = Number(highlight.row);
    const tone = String(highlight.tone || "primary");
    const role = highlight.role ? String(highlight.role) : "";
    const column = highlight.column == null ? null : Number(highlight.column);
    const cell = role === "cj"
      ? card.querySelector(`[data-role="cj"][data-table-col="${column}"]`)
      : role
        ? card.querySelector(`[data-table-row="${row}"][data-role="${role}"]`)
        : card.querySelector(`[data-table-row="${row}"][data-table-col="${column}"]`);

    if (!(cell instanceof HTMLElement)) {
      return;
    }

    cell.classList.add(
      tone === "z-cost"
        ? "trace-cell-z-cost"
        : tone === "z-rhs"
          ? "trace-cell-z-rhs"
          : tone === "pivot"
            ? "trace-cell-pivot"
            : tone === "factor"
              ? "trace-cell-factor"
              : tone === "secondary"
                ? "trace-cell-secondary"
                : "trace-cell-primary"
    );

    const rowElement = cell.closest("tr");

    if (rowElement instanceof HTMLElement) {
      rowElement.classList.add("trace-row-focus");
    }
  });
}

function updateGuideCalculation(target) {
  const card = target.closest(".iteration-card");

  if (!(card instanceof HTMLElement)) {
    return;
  }

  clearGuideCalculations(iterationGroups);
  clearTraceHighlights(iterationGroups);
  if (!target.classList.contains("ratio-cell") && !target.closest(".objective-row")) {
    target.classList.add("trace-cell-current");
  }

  const expression = target.dataset.calcExpression ?? "";
  const expressionHtml = target.dataset.calcHtml ?? "";
  const result = target.dataset.calcResult ?? "";
  const displayMode = target.dataset.calcDisplay ?? "equation";
  const fullText = displayMode === "result-only" ? result : `${expression} = ${result}`;
  const fullHtml = displayMode === "result-only"
    ? `<span class="calc-token calc-token-result">${escapeHtml(result)}</span>`
    : expressionHtml
      ? `${expressionHtml} = <span class="calc-token calc-token-result">${escapeHtml(result)}</span>`
      : escapeHtml(fullText);
  const calcMode = target.dataset.calcMode ?? "current";

  if (calcMode === "previous") {
    const previousCard = card.previousElementSibling;

    if (!(previousCard instanceof HTMLElement)) {
      return;
    }

    const previousCalcNode = previousCard.querySelector(".bottom-guide-display .guide-calc");

    if (!(previousCalcNode instanceof HTMLElement)) {
      return;
    }

    previousCalcNode.innerHTML = fullHtml;
    previousCalcNode.classList.add("is-active");

    try {
      const highlights = JSON.parse(target.dataset.prevHighlights ?? "[]");
      applyTraceHighlights(previousCard, highlights);
    } catch {
      // Ignore malformed highlight payloads and keep the hover usable.
    }

    return;
  }

  const calcNode = card.querySelector(".bottom-guide-display .guide-calc");

  if (!(calcNode instanceof HTMLElement)) {
    return;
  }

  calcNode.innerHTML = fullHtml;
  calcNode.classList.add("is-active");

  try {
    const highlights = JSON.parse(target.dataset.currentHighlights ?? "[]");
    applyTraceHighlights(card, highlights);
  } catch {
    // Ignore malformed current highlight payloads.
  }
}

function buildTerminationReason(result) {
  if (result.status === "optimal") {
    return state.objectiveType === "min"
      ? "Condicion de corte: en la fila Z - Cj ya no quedan valores positivos."
      : "Condicion de corte: en la fila Z - Cj ya no quedan valores negativos.";
  }

  if (result.status === "unbounded") {
    return "Condicion de corte: aparecio una columna entrante pero no hubo fila saliente positiva.";
  }

  if (result.status === "infeasible") {
    return "Condicion de corte: no se pudo construir una solucion factible que elimine las artificiales activas.";
  }

  return result.reason || result.messages?.[0] || "Condicion de corte: el procedimiento se detuvo por una condicion excepcional.";
}

function renderSnapshots(result) {
  const snapshots = result.snapshots ?? [];

  if (!snapshots.length) {
    iterationGroups.innerHTML = "";
    return;
  }

  const grouped = snapshots.reduce((accumulator, snapshot) => {
    if (!accumulator[snapshot.phase]) {
      accumulator[snapshot.phase] = [];
    }

    accumulator[snapshot.phase].push(snapshot);
    return accumulator;
  }, {});

  const groupedEntries = Object.entries(grouped);
  const groupsMarkup = groupedEntries.map(([phase, items], groupIndex) => {
    const iterationCount = Math.max(items.length - 1, 0);

    return `
      <section class="phase-block">
        <div class="phase-heading">
          <div class="phase-heading-actions">
            <p>${iterationCount} iteracion${iterationCount === 1 ? "" : "es"}</p>
            <button type="button" class="button secondary tables-copy-button" data-export-hidden>
              <span class="graph-copy-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M9 5.75A2.75 2.75 0 0 1 11.75 3h6.5A2.75 2.75 0 0 1 21 5.75v9.5A2.75 2.75 0 0 1 18.25 18h-6.5A2.75 2.75 0 0 1 9 15.25z"></path>
                  <path d="M4.75 7A1.75 1.75 0 0 0 3 8.75v9.5A2.75 2.75 0 0 0 5.75 21h7.5A1.75 1.75 0 0 0 15 19.25"></path>
                </svg>
              </span>
              <span data-copy-label>Copiar tablas</span>
            </button>
          </div>
        </div>
        ${items.map((snapshot, index) => {
      const isLastCard = groupIndex === groupedEntries.length - 1 && index === items.length - 1;

      return `
          <article class="iteration-card${isLastCard ? " is-last-card" : ""}">
            ${buildTableMarkup(snapshot, index > 0 ? items[index - 1] : null)}
          </article>
        `;
    }).join("")}
      </section>
    `;
  }).join("");

  const terminationReason = buildTerminationReason(result);

  iterationGroups.innerHTML = `
    ${groupsMarkup}
    <section class="termination-note">
      <p class="termination-note-label">Fin del procedimiento</p>
      <p class="termination-note-copy">${terminationReason}</p>
    </section>
  `;

  initializeTableCopyButtons();
}

function clearResults() {
  if (!hasSimplexPage) {
    return;
  }

  resultSummary.classList.add("empty-state");
  resultSummary.innerHTML = 'Ajusta el modelo para ver automaticamente las tablas, pivotes y la solucion.';
  graphPanel.classList.add("hidden");
  graphPanel.innerHTML = "";
  iterationGroups.innerHTML = "";
}

function refreshResults() {
  if (!hasSimplexPage) {
    return;
  }

  const result = solveModel();
  renderSummary(result);
  renderGraph(result);
  renderSnapshots(result);
}

function syncDimensionsFromInputs({ normalize = false } = {}) {
  if (variableCountInput.value === "" || constraintCountInput.value === "") {
    return;
  }

  const variables = clampDimension(variableCountInput.value);
  const constraints = clampDimension(constraintCountInput.value);

  if (normalize) {
    variableCountInput.value = String(variables);
    constraintCountInput.value = String(constraints);
  }

  if (variables === state.variableCount && constraints === state.constraintCount) {
    return;
  }

  resizeState(variables, constraints);
  renderModel();
  refreshResults();
}

function clampTransportDimension(value) {
  const parsed = parseInt(value, 10);
  return Math.min(6, Math.max(1, Number.isFinite(parsed) ? parsed : 1));
}

function createTransportCostRow(destinationCount) {
  return Array.from({ length: destinationCount }, () => 0);
}

function resizeTransportState(nextOrigins, nextDestinations) {
  transportState.originCount = nextOrigins;
  transportState.destinationCount = nextDestinations;
  transportState.offers = Array.from({ length: nextOrigins }, (_, index) => transportState.offers[index] ?? 0);
  transportState.demands = Array.from({ length: nextDestinations }, (_, index) => transportState.demands[index] ?? 0);
  transportState.costs = Array.from({ length: nextOrigins }, (_, rowIndex) => {
    const source = transportState.costs[rowIndex] ?? createTransportCostRow(nextDestinations);
    return Array.from({ length: nextDestinations }, (_, columnIndex) => source[columnIndex] ?? 0);
  });
}

function clearTransportValues() {
  transportState.offers = transportState.offers.map(() => 0);
  transportState.demands = transportState.demands.map(() => 0);
  transportState.costs = transportState.costs.map((row) => row.map(() => 0));
}

function applyTransportPreset(preset) {
  if (!preset) {
    return;
  }

  transportState.originCount = preset.originCount;
  transportState.destinationCount = preset.destinationCount;
  transportState.offers = [...preset.offers];
  transportState.demands = [...preset.demands];
  transportState.costs = preset.costs.map((row) => [...row]);

  transportOriginCountInput.value = String(preset.originCount);
  transportDestinationCountInput.value = String(preset.destinationCount);
  updateCompactInputWidth(transportOriginCountInput);
  updateCompactInputWidth(transportDestinationCountInput);
  renderTransportGrid();
  refreshTransportResults();
}

function getTransportTotal(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function getTransportBalanceDisplay(totalOffer, totalDemand) {
  if (Math.abs(totalOffer - totalDemand) < EPSILON) {
    return formatValue(totalOffer);
  }

  return `${formatValue(totalOffer)} / ${formatValue(totalDemand)}`;
}

function renderTransportPlainInput({ value, placeholder = "0", attributes = {} }) {
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

function renderTransportGrid() {
  if (!hasTransportPage) {
    return;
  }

  const totalOffer = getTransportTotal(transportState.offers);
  const totalDemand = getTransportTotal(transportState.demands);
  const isBalanced = Math.abs(totalOffer - totalDemand) < EPSILON;
  const destinationHeaders = Array.from({ length: transportState.destinationCount }, (_, index) => `<th>D${index + 1}</th>`).join("");

  const rowsMarkup = transportState.costs.map((row, rowIndex) => `
    <tr>
      <th class="transport-row-label">O${rowIndex + 1}</th>
      ${row.map((cost, columnIndex) => `
        <td class="transport-cost-cell">
          ${renderTransportPlainInput({
    value: cost,
    attributes: {
      "data-scope": "transport-cost",
      "data-row": rowIndex,
      "data-index": columnIndex,
      "aria-label": `Costo de O${rowIndex + 1} a D${columnIndex + 1}`
    }
  })}
        </td>
      `).join("")}
      <td class="transport-cost-cell">
        ${renderTransportPlainInput({
    value: transportState.offers[rowIndex],
    attributes: {
      "data-scope": "transport-offer",
      "data-row": rowIndex,
      "aria-label": `Oferta de O${rowIndex + 1}`
    }
  })}
      </td>
    </tr>
  `).join("");

  const demandMarkup = transportState.demands.map((demand, columnIndex) => `
    <td class="transport-cost-cell">
      ${renderTransportPlainInput({
    value: demand,
    attributes: {
      "data-scope": "transport-demand",
      "data-index": columnIndex,
      "aria-label": `Demanda de D${columnIndex + 1}`
    }
  })}
    </td>
  `).join("");

  transportOriginCountInput.value = String(transportState.originCount);
  transportDestinationCountInput.value = String(transportState.destinationCount);
  updateCompactInputWidth(transportOriginCountInput);
  updateCompactInputWidth(transportDestinationCountInput);

  transportGrid.innerHTML = `
    <p class="transport-table-caption">Tabla de costos</p>
    <div class="transport-input-wrap">
      <table class="transport-table transport-input-table">
        <thead>
          <tr>
            <th></th>
            ${destinationHeaders}
            <th>Oferta</th>
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup}
          <tr>
            <th class="transport-total-label">Demanda</th>
            ${demandMarkup}
            <td class="transport-balance-cell ${isBalanced ? "is-valid" : "is-invalid"}" data-transport-balance-total>
              <strong>${escapeHtml(getTransportBalanceDisplay(totalOffer, totalDemand))}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  updateCompactInputWidths(transportForm);
}

function updateTransportGridBalanceDisplay() {
  if (!(transportGrid instanceof HTMLElement)) {
    return;
  }

  const balanceCell = transportGrid.querySelector("[data-transport-balance-total]");

  if (!(balanceCell instanceof HTMLElement)) {
    return;
  }

  const totalOffer = getTransportTotal(transportState.offers);
  const totalDemand = getTransportTotal(transportState.demands);
  const isBalanced = Math.abs(totalOffer - totalDemand) < EPSILON;

  balanceCell.classList.toggle("is-valid", isBalanced);
  balanceCell.classList.toggle("is-invalid", !isBalanced);
  balanceCell.innerHTML = `<strong>${escapeHtml(getTransportBalanceDisplay(totalOffer, totalDemand))}</strong>`;
}

function createTransportPlan(rows, columns) {
  return {
    amounts: Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0)),
    basics: Array.from({ length: rows }, () => Array.from({ length: columns }, () => false))
  };
}

function cloneTransportPlan(plan) {
  return {
    amounts: plan.amounts.map((row) => row.map((value) => value)),
    basics: plan.basics.map((row) => row.map((value) => value))
  };
}

function createTransportPositiveBasisPlan(plan) {
  return {
    amounts: plan.amounts.map((row) => row.map((value) => value)),
    basics: plan.amounts.map((row) => row.map((value) => value > EPSILON))
  };
}

function countTransportBasics(plan) {
  return plan.basics.reduce((count, row) => count + row.filter(Boolean).length, 0);
}

function createTransportUnionFind(size) {
  const parent = Array.from({ length: size }, (_, index) => index);

  function find(value) {
    if (parent[value] !== value) {
      parent[value] = find(parent[value]);
    }

    return parent[value];
  }

  function union(left, right) {
    const rootLeft = find(left);
    const rootRight = find(right);

    if (rootLeft !== rootRight) {
      parent[rootRight] = rootLeft;
    }
  }

  return { find, union };
}

function ensureTransportNonDegenerate(plan, costs) {
  const rowCount = plan.amounts.length;
  const columnCount = plan.amounts[0]?.length ?? 0;
  const expectedBasics = rowCount + columnCount - 1;

  while (countTransportBasics(plan) < expectedBasics) {
    const unionFind = createTransportUnionFind(rowCount + columnCount);

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        if (plan.basics[rowIndex][columnIndex]) {
          unionFind.union(rowIndex, rowCount + columnIndex);
        }
      }
    }

    let selectedCell = null;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        if (plan.basics[rowIndex][columnIndex]) {
          continue;
        }

        if (unionFind.find(rowIndex) === unionFind.find(rowCount + columnIndex)) {
          continue;
        }

        const candidate = {
          row: rowIndex,
          column: columnIndex,
          cost: costs[rowIndex][columnIndex]
        };

        if (
          !selectedCell
          || candidate.cost < selectedCell.cost - EPSILON
          || (Math.abs(candidate.cost - selectedCell.cost) < EPSILON
            && (candidate.row < selectedCell.row || (candidate.row === selectedCell.row && candidate.column < selectedCell.column)))
        ) {
          selectedCell = candidate;
        }
      }
    }

    if (!selectedCell) {
      break;
    }

    plan.basics[selectedCell.row][selectedCell.column] = true;
  }

  return plan;
}

function computeTransportCost(plan, costs) {
  let total = 0;

  for (let rowIndex = 0; rowIndex < plan.amounts.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < plan.amounts[rowIndex].length; columnIndex += 1) {
      total += plan.amounts[rowIndex][columnIndex] * costs[rowIndex][columnIndex];
    }
  }

  return total;
}

function countTransportPositiveAllocations(plan) {
  return plan.amounts.reduce((count, row) => count + row.filter((value) => value > EPSILON).length, 0);
}

function buildNorthwestTransportPlan(offers, demands, costs) {
  const remainingOffers = [...offers];
  const remainingDemands = [...demands];
  const plan = createTransportPlan(offers.length, demands.length);
  let rowIndex = 0;
  let columnIndex = 0;

  while (rowIndex < offers.length && columnIndex < demands.length) {
    const allocation = Math.min(remainingOffers[rowIndex], remainingDemands[columnIndex]);
    plan.amounts[rowIndex][columnIndex] = allocation;
    plan.basics[rowIndex][columnIndex] = true;
    remainingOffers[rowIndex] -= allocation;
    remainingDemands[columnIndex] -= allocation;

    const offerDone = Math.abs(remainingOffers[rowIndex]) < EPSILON;
    const demandDone = Math.abs(remainingDemands[columnIndex]) < EPSILON;

    if (offerDone && demandDone) {
      rowIndex += 1;
      columnIndex += 1;
    } else if (offerDone) {
      rowIndex += 1;
    } else {
      columnIndex += 1;
    }
  }

  const positiveAllocations = countTransportPositiveAllocations(plan);
  const expectedAllocations = offers.length + demands.length - 1;
  ensureTransportNonDegenerate(plan, costs);
  return {
    plan,
    totalCost: computeTransportCost(plan, costs),
    positiveAllocations,
    expectedAllocations,
    isDegenerate: positiveAllocations !== expectedAllocations
  };
}

function buildColumnMinimumTransportPlan(offers, demands, costs) {
  const remainingOffers = [...offers];
  const remainingDemands = [...demands];
  const plan = createTransportPlan(offers.length, demands.length);

  while (remainingDemands.some((value) => value > EPSILON)) {
    const roundCandidates = [];

    for (let columnIndex = 0; columnIndex < demands.length; columnIndex += 1) {
      if (remainingDemands[columnIndex] <= EPSILON) {
        continue;
      }

      let bestRow = -1;
      let bestCost = Infinity;

      for (let rowIndex = 0; rowIndex < offers.length; rowIndex += 1) {
        if (remainingOffers[rowIndex] <= EPSILON) {
          continue;
        }

        const cost = costs[rowIndex][columnIndex];

        if (
          cost < bestCost - EPSILON
          || (Math.abs(cost - bestCost) < EPSILON && remainingOffers[rowIndex] > (bestRow >= 0 ? remainingOffers[bestRow] : -Infinity) + EPSILON)
        ) {
          bestCost = cost;
          bestRow = rowIndex;
        }
      }

      if (bestRow >= 0) {
        roundCandidates.push({
          row: bestRow,
          column: columnIndex,
          cost: bestCost,
          capacity: Math.min(remainingOffers[bestRow], remainingDemands[columnIndex])
        });
      }
    }

    if (roundCandidates.length === 0) {
      break;
    }

    roundCandidates.sort((left, right) => {
      if (Math.abs(left.cost - right.cost) >= EPSILON) {
        return left.cost - right.cost;
      }

      if (Math.abs(left.capacity - right.capacity) >= EPSILON) {
        return right.capacity - left.capacity;
      }

      return left.row - right.row || left.column - right.column;
    });

    let allocatedInRound = false;

    for (const selected of roundCandidates) {
      if (remainingOffers[selected.row] <= EPSILON || remainingDemands[selected.column] <= EPSILON) {
        continue;
      }

      const allocation = Math.min(remainingOffers[selected.row], remainingDemands[selected.column]);

      if (allocation <= EPSILON) {
        continue;
      }

      plan.amounts[selected.row][selected.column] += allocation;
      plan.basics[selected.row][selected.column] = true;
      remainingOffers[selected.row] -= allocation;
      remainingDemands[selected.column] -= allocation;
      allocatedInRound = true;
    }

    if (!allocatedInRound) {
      break;
    }
  }

  const positiveAllocations = countTransportPositiveAllocations(plan);
  const expectedAllocations = offers.length + demands.length - 1;
  const displayPlan = cloneTransportPlan(plan);
  ensureTransportNonDegenerate(plan, costs);
  return {
    plan,
    displayPlan,
    totalCost: computeTransportCost(plan, costs),
    positiveAllocations,
    expectedAllocations,
    isDegenerate: positiveAllocations !== expectedAllocations
  };
}

function computeTransportPotentials(plan, costs, options = {}) {
  const { preserveUnknowns = false } = options;
  const rowCount = plan.amounts.length;
  const columnCount = plan.amounts[0].length;
  const rowPotentials = Array.from({ length: rowCount }, () => null);
  const columnPotentials = Array.from({ length: columnCount }, () => null);
  rowPotentials[0] = 0;

  let updated = true;

  while (updated) {
    updated = false;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        if (!plan.basics[rowIndex][columnIndex]) {
          continue;
        }

        const cost = costs[rowIndex][columnIndex];

        if (rowPotentials[rowIndex] != null && columnPotentials[columnIndex] == null) {
          columnPotentials[columnIndex] = cost - rowPotentials[rowIndex];
          updated = true;
        } else if (columnPotentials[columnIndex] != null && rowPotentials[rowIndex] == null) {
          rowPotentials[rowIndex] = cost - columnPotentials[columnIndex];
          updated = true;
        }
      }
    }
  }

  return {
    u: preserveUnknowns ? rowPotentials : rowPotentials.map((value) => value ?? 0),
    v: preserveUnknowns ? columnPotentials : columnPotentials.map((value) => value ?? 0)
  };
}

function computeTransportPotentialsWithSeed(plan, costs, seed, options = {}) {
  const { preserveUnknowns = false } = options;
  const rowCount = plan.amounts.length;
  const columnCount = plan.amounts[0].length;
  const rowPotentials = Array.from({ length: rowCount }, () => null);
  const columnPotentials = Array.from({ length: columnCount }, () => null);
  rowPotentials[0] = seed;

  let updated = true;

  while (updated) {
    updated = false;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        if (!plan.basics[rowIndex][columnIndex]) {
          continue;
        }

        const cost = costs[rowIndex][columnIndex];

        if (rowPotentials[rowIndex] != null && columnPotentials[columnIndex] == null) {
          columnPotentials[columnIndex] = cost - rowPotentials[rowIndex];
          updated = true;
        } else if (columnPotentials[columnIndex] != null && rowPotentials[rowIndex] == null) {
          rowPotentials[rowIndex] = cost - columnPotentials[columnIndex];
          updated = true;
        }
      }
    }
  }

  return {
    u: preserveUnknowns ? rowPotentials : rowPotentials.map((value) => value ?? 0),
    v: preserveUnknowns ? columnPotentials : columnPotentials.map((value) => value ?? 0)
  };
}

function computeTransportOpportunityMatrix(plan, costs) {
  const potentials = computeTransportPotentials(plan, costs);
  const matrix = costs.map((row, rowIndex) => row.map((cost, columnIndex) => potentials.u[rowIndex] + potentials.v[columnIndex] - cost));

  return {
    matrix,
    potentials
  };
}

function findTransportEnteringCell(plan, opportunityMatrix) {
  let bestCell = null;

  for (let rowIndex = 0; rowIndex < opportunityMatrix.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < opportunityMatrix[rowIndex].length; columnIndex += 1) {
      if (plan.basics[rowIndex][columnIndex]) {
        continue;
      }

      const value = opportunityMatrix[rowIndex][columnIndex];

      if (
        value > EPSILON
        && (
          !bestCell
          || value > bestCell.value + EPSILON
          || (Math.abs(value - bestCell.value) < EPSILON && (rowIndex < bestCell.row || (rowIndex === bestCell.row && columnIndex < bestCell.column)))
        )
      ) {
        bestCell = { row: rowIndex, column: columnIndex, value };
      }
    }
  }

  return bestCell;
}

function findTransportCycle(plan, enteringCell) {
  const cells = [];

  for (let rowIndex = 0; rowIndex < plan.basics.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < plan.basics[rowIndex].length; columnIndex += 1) {
      if (plan.basics[rowIndex][columnIndex] || (rowIndex === enteringCell.row && columnIndex === enteringCell.column)) {
        cells.push([rowIndex, columnIndex]);
      }
    }
  }

  function visit(path, moveAlongRow) {
    const [currentRow, currentColumn] = path[path.length - 1];

    for (const [nextRow, nextColumn] of cells) {
      if (moveAlongRow ? nextRow !== currentRow || nextColumn === currentColumn : nextColumn !== currentColumn || nextRow === currentRow) {
        continue;
      }

      const isStart = nextRow === enteringCell.row && nextColumn === enteringCell.column;

      if (isStart) {
        if (path.length >= 4) {
          return path;
        }

        continue;
      }

      if (path.some(([row, column]) => row === nextRow && column === nextColumn)) {
        continue;
      }

      const result = visit([...path, [nextRow, nextColumn]], !moveAlongRow);

      if (result) {
        return result;
      }
    }

    return null;
  }

  return visit([[enteringCell.row, enteringCell.column]], true) ?? visit([[enteringCell.row, enteringCell.column]], false);
}

function pivotTransportPlan(plan, enteringCell, cycle, costs) {
  const nextPlan = cloneTransportPlan(plan);
  nextPlan.basics[enteringCell.row][enteringCell.column] = true;
  const minusCells = cycle.filter((_, index) => index % 2 === 1);
  const theta = Math.min(...minusCells.map(([rowIndex, columnIndex]) => nextPlan.amounts[rowIndex][columnIndex]));

  cycle.forEach(([rowIndex, columnIndex], index) => {
    if (index % 2 === 0) {
      nextPlan.amounts[rowIndex][columnIndex] += theta;
    } else {
      nextPlan.amounts[rowIndex][columnIndex] -= theta;
    }

    if (Math.abs(nextPlan.amounts[rowIndex][columnIndex]) < EPSILON) {
      nextPlan.amounts[rowIndex][columnIndex] = 0;
    }
  });

  const leavingCell = minusCells.find(([rowIndex, columnIndex]) => Math.abs(nextPlan.amounts[rowIndex][columnIndex]) < EPSILON) ?? minusCells[0];
  nextPlan.basics[leavingCell[0]][leavingCell[1]] = false;
  ensureTransportNonDegenerate(nextPlan, costs);

  return {
    plan: nextPlan,
    theta,
    leavingCell
  };
}

function optimizeTransportPlan(initialPlan, costs) {
  const iterations = [];
  let currentPlan = cloneTransportPlan(initialPlan);
  ensureTransportNonDegenerate(currentPlan, costs);

  for (let iteration = 0; iteration < 24; iteration += 1) {
    const { matrix, potentials } = computeTransportOpportunityMatrix(currentPlan, costs);
    const enteringCell = findTransportEnteringCell(currentPlan, matrix);

    if (!enteringCell) {
      return {
        optimalPlan: currentPlan,
        optimal: true,
        iterations,
        finalOpportunityMatrix: matrix,
        finalPotentials: potentials
      };
    }

    const cycle = findTransportCycle(currentPlan, enteringCell);

    if (!cycle) {
      return {
        optimalPlan: currentPlan,
        optimal: false,
        iterations,
        finalOpportunityMatrix: matrix,
        finalPotentials: potentials
      };
    }

    const pivotResult = pivotTransportPlan(currentPlan, enteringCell, cycle, costs);
    currentPlan = pivotResult.plan;
    iterations.push({
      iteration: iteration + 1,
      enteringCell,
      cycle,
      theta: pivotResult.theta,
      leavingCell: pivotResult.leavingCell,
      allocation: cloneTransportPlan(currentPlan),
      opportunityMatrix: matrix,
      potentials,
      totalCost: computeTransportCost(currentPlan, costs)
    });
  }

  const finalSnapshot = computeTransportOpportunityMatrix(currentPlan, costs);

  return {
    optimalPlan: currentPlan,
    optimal: false,
    iterations,
    finalOpportunityMatrix: finalSnapshot.matrix,
    finalPotentials: finalSnapshot.potentials
  };
}

function solveTransportProblem() {
  const offers = transportState.offers.map((value) => Math.max(0, value));
  const demands = transportState.demands.map((value) => Math.max(0, value));
  const costs = transportState.costs.map((row) => row.map((value) => value));
  const totalOffer = getTransportTotal(offers);
  const totalDemand = getTransportTotal(demands);
  const isBalanced = Math.abs(totalOffer - totalDemand) < EPSILON;

  if (!isBalanced) {
    return {
      valid: false,
      totalOffer,
      totalDemand
    };
  }

  const northwest = buildNorthwestTransportPlan(offers, demands, costs);
  const columnMinimum = buildColumnMinimumTransportPlan(offers, demands, costs);
  const optimization = optimizeTransportPlan(columnMinimum.plan, costs);
  const verification = createTransportVerification(columnMinimum.plan, costs, offers, demands);
  const degenerateVerification = columnMinimum.isDegenerate
    ? createTransportVerification(createTransportPositiveBasisPlan(columnMinimum.displayPlan), costs, offers, demands, { preserveUnknowns: true })
    : null;

  return {
    valid: true,
    costs,
    offers,
    demands,
    totalOffer,
    totalDemand,
    northwest,
    columnMinimum,
    verification,
    degenerateVerification,
    optimization,
    optimalCost: computeTransportCost(optimization.optimalPlan, costs)
  };
}

function renderTransportPotentialList(potentials) {
  const rowPotentials = potentials.u.map((value, index) => `u${index + 1} = ${formatValue(value)}`).join(" · ");
  const columnPotentials = potentials.v.map((value, index) => `v${index + 1} = ${formatValue(value)}`).join(" · ");
  return `<p class="transport-iteration-note">${rowPotentials}<br>${columnPotentials}</p>`;
}

function formatTransportCellReference(rowIndex, columnIndex) {
  return `O${rowIndex + 1}-D${columnIndex + 1}`;
}

function renderTransportCaptionText(caption) {
  return escapeHtml(caption).replaceAll("ε", '<span class="transport-epsilon-symbol">ε</span>');
}

function buildTransportThetaCellAdjustments(previousPlan, cycle, theta) {
  if (!previousPlan || !Array.isArray(cycle) || cycle.length === 0 || !Number.isFinite(theta)) {
    return {};
  }

  return cycle.reduce((adjustments, [rowIndex, columnIndex], index) => {
    const currentValue = previousPlan.amounts[rowIndex][columnIndex];
    const isPlus = index % 2 === 0;
    adjustments[getTransportCycleCellKey(rowIndex, columnIndex)] = {
      expression: `${formatValue(currentValue)} ${isPlus ? "+" : "-"} ${formatValue(theta)}`,
      sign: isPlus ? "+" : "-"
    };
    return adjustments;
  }, {});
}

function solveTransportLinearSystem(matrix, rhs) {
  const size = rhs.length;
  const augmented = matrix.map((row, rowIndex) => [...row, rhs[rowIndex]]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let bestRow = pivotIndex;

    for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[bestRow][pivotIndex])) {
        bestRow = rowIndex;
      }
    }

    if (Math.abs(augmented[bestRow][pivotIndex]) < EPSILON) {
      return null;
    }

    if (bestRow !== pivotIndex) {
      [augmented[pivotIndex], augmented[bestRow]] = [augmented[bestRow], augmented[pivotIndex]];
    }

    const pivotValue = augmented[pivotIndex][pivotIndex];

    for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
      augmented[pivotIndex][columnIndex] /= pivotValue;
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue;
      }

      const factor = augmented[rowIndex][pivotIndex];

      if (Math.abs(factor) < EPSILON) {
        continue;
      }

      for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
        augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function createTransportEpsilonDisplay(basePlan, completedPlan, costs) {
  const rowCount = completedPlan.amounts.length;
  const columnCount = completedPlan.amounts[0]?.length ?? 0;
  const basicCells = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      if (completedPlan.basics[rowIndex][columnIndex]) {
        basicCells.push([rowIndex, columnIndex]);
      }
    }
  }

  const matrix = [];
  const rhs = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    matrix.push(basicCells.map(([basicRowIndex]) => basicRowIndex === rowIndex ? 1 : 0));
    rhs.push(1);
  }

  for (let columnIndex = 0; columnIndex < columnCount - 1; columnIndex += 1) {
    matrix.push(basicCells.map(([, basicColumnIndex]) => basicColumnIndex === columnIndex ? 1 : 0));
    rhs.push(0);
  }

  const coefficients = solveTransportLinearSystem(matrix, rhs);

  if (!coefficients) {
    return {
      symbolicAllocations: {},
      symbolicOffers: [],
      symbolicDemands: [],
      totalCostLabel: `Z = ${formatValue(computeTransportCost(basePlan, costs))}`
    };
  }

  const symbolicAllocations = {};
  const formatEpsilonTerm = (coefficient) => {
    const rounded = Math.abs(coefficient - Math.round(coefficient)) < EPSILON ? Math.round(coefficient) : coefficient;
    const absoluteValue = Math.abs(rounded);

    if (absoluteValue < EPSILON) {
      return "";
    }

    if (Math.abs(absoluteValue - 1) < EPSILON) {
      return "ε";
    }

    return `${formatValue(absoluteValue)}ε`;
  };

  basicCells.forEach(([rowIndex, columnIndex], variableIndex) => {
    const coefficient = Math.abs(coefficients[variableIndex] - Math.round(coefficients[variableIndex])) < EPSILON
      ? Math.round(coefficients[variableIndex])
      : coefficients[variableIndex];
    const baseAmount = basePlan.amounts[rowIndex][columnIndex];

    if (Math.abs(coefficient) < EPSILON) {
      return;
    }

    if (Math.abs(baseAmount) < EPSILON) {
      symbolicAllocations[getTransportCycleCellKey(rowIndex, columnIndex)] = coefficient < 0
        ? `-${formatEpsilonTerm(coefficient)}`
        : formatEpsilonTerm(coefficient);
      return;
    }

    symbolicAllocations[getTransportCycleCellKey(rowIndex, columnIndex)] = `${formatValue(baseAmount)} ${coefficient < 0 ? "-" : "+"} ${formatEpsilonTerm(coefficient)}`;
  });

  const symbolicOffers = Array.from({ length: rowCount }, (_, rowIndex) => `${formatValue(getTransportTotal(basePlan.amounts[rowIndex]))} + ε`);
  const epsilonCostRounded = rowCount;
  const epsilonCostTerm = formatEpsilonTerm(epsilonCostRounded);

  return {
    symbolicAllocations,
    symbolicOffers,
    symbolicDemands: [],
    totalCostLabel: Math.abs(epsilonCostRounded) < EPSILON
      ? `Z = ${formatValue(computeTransportCost(basePlan, costs))}`
      : `Z = ${formatValue(computeTransportCost(basePlan, costs))} ${epsilonCostRounded < 0 ? "-" : "+"} ${epsilonCostTerm}`
  };
}

function renderTransportThetaSteps(referencePlan, stepDetails) {
  if (!referencePlan || !stepDetails?.cycle?.length || !Number.isFinite(stepDetails.theta)) {
    return "";
  }

  const theta = stepDetails.theta;
  const plusCells = stepDetails.cycle.filter((_, index) => index % 2 === 0);
  const minusCells = stepDetails.cycle.filter((_, index) => index % 2 === 1);
  const minusEntries = minusCells.map(([rowIndex, columnIndex]) => ({
    rowIndex,
    columnIndex,
    value: referencePlan.amounts[rowIndex][columnIndex]
  }));
  const minusChoicesMarkup = minusEntries.map(({ rowIndex, columnIndex, value }) => `
    <span
      class="transport-theta-choice ${Math.abs(value - theta) < EPSILON ? "is-min" : ""}"
      title="${escapeHtml(formatTransportCellReference(rowIndex, columnIndex))}"
    >
      ${formatValue(value)}
    </span>
  `).join("");
  const plusUpdates = plusCells.map(([rowIndex, columnIndex]) => {
    const currentValue = referencePlan.amounts[rowIndex][columnIndex];
    const nextValue = currentValue + theta;
    return `<p>${formatTransportCellReference(rowIndex, columnIndex)}: ${formatValue(currentValue)} + ${formatValue(theta)} = ${formatValue(nextValue)}</p>`;
  }).join("");
  const minusUpdates = minusCells.map(([rowIndex, columnIndex]) => {
    const currentValue = referencePlan.amounts[rowIndex][columnIndex];
    const nextValue = currentValue - theta;
    return `<p>${formatTransportCellReference(rowIndex, columnIndex)}: ${formatValue(currentValue)} - ${formatValue(theta)} = ${formatValue(nextValue)}</p>`;
  }).join("");

  return `
    <div class="transport-theta-steps">
      <p class="transport-table-caption">Rehacer tabla con theta</p>
      <div class="transport-theta-layout">
        <div class="transport-theta-summary">
          <p class="transport-iteration-note">1. Mirás solo celdas con signo -.</p>
          <p class="transport-iteration-note">2. Buscás la menor asignación entre esas celdas.</p>
          <div class="transport-theta-choice-list">${minusChoicesMarkup}</div>
          <p class="transport-iteration-note">3. Ese valor es theta, ${formatValue(theta)}.</p>
          <p class="transport-iteration-note">4. Sumás ${formatValue(theta)} en todas las celdas +.</p>
          <p class="transport-iteration-note">5. Restás ${formatValue(theta)} en todas las celdas -.</p>
        </div>
        <div class="transport-theta-actions">
          <div class="transport-theta-block is-plus">
            <strong>Se suma en celdas +</strong>
            ${plusUpdates}
          </div>
          <div class="transport-theta-block is-minus">
            <strong>Se resta en celdas -</strong>
            ${minusUpdates}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getTransportColumnMinimumCells(costs) {
  return costs[0].map((_, columnIndex) => {
    let bestRow = 0;
    let bestCost = costs[0][columnIndex];

    for (let rowIndex = 1; rowIndex < costs.length; rowIndex += 1) {
      const nextCost = costs[rowIndex][columnIndex];

      if (nextCost < bestCost - EPSILON) {
        bestCost = nextCost;
        bestRow = rowIndex;
      }
    }

    return { row: bestRow, column: columnIndex };
  });
}

function getTransportCycleCellKey(rowIndex, columnIndex) {
  return `${rowIndex}:${columnIndex}`;
}

function buildTransportCycleAnnotations(cycle) {
  if (!Array.isArray(cycle) || cycle.length === 0) {
    return {};
  }

  return cycle.reduce((annotations, [rowIndex, columnIndex], index) => {
    const [nextRowIndex, nextColumnIndex] = cycle[(index + 1) % cycle.length];
    let direction = "right";

    if (nextRowIndex === rowIndex) {
      direction = nextColumnIndex > columnIndex ? "right" : "left";
    } else if (nextColumnIndex === columnIndex) {
      direction = nextRowIndex > rowIndex ? "down" : "up";
    }

    annotations[getTransportCycleCellKey(rowIndex, columnIndex)] = {
      sign: index % 2 === 0 ? "+" : "-",
      direction,
      isStart: index === 0
    };

    return annotations;
  }, {});
}

function renderTransportAllocationTable(title, plan, costs, offers, demands, totalCost, options = {}) {
  const {
    scope = "transport-default",
    highlightOfferRow = false,
    thetaAdjustments = {},
    symbolicAllocations = {},
    symbolicOffers = [],
    symbolicDemands = [],
    totalCostLabel = null
  } = options;
  const hasThetaAdjustments = Object.keys(thetaAdjustments).length > 0;
  const headerMarkup = Array.from({ length: demands.length }, (_, index) => `<th>D${index + 1}</th>`).join("");
  const bodyMarkup = plan.amounts.map((row, rowIndex) => `
    <tr class="transport-solution-row">
      <th class="transport-row-label">O${rowIndex + 1}</th>
      ${row.map((amount, columnIndex) => {
        const adjustment = thetaAdjustments[getTransportCycleCellKey(rowIndex, columnIndex)];
        const symbolicAllocation = symbolicAllocations[getTransportCycleCellKey(rowIndex, columnIndex)];
        const hasPositiveAllocation = Math.abs(amount) >= EPSILON;
        const shouldShowAllocation = Math.abs(amount) >= EPSILON || Boolean(adjustment) || Boolean(symbolicAllocation);
        const hasSymbolicAllocation = Boolean(symbolicAllocation);

        return `
        <td
          class="transport-allocation-cell ${hasPositiveAllocation ? "has-allocation" : ""} ${hasSymbolicAllocation ? "has-symbolic-allocation" : ""} ${adjustment ? "has-adjustment" : ""}"
          data-solution-scope="${escapeHtml(scope)}"
          data-solution-row="${rowIndex}"
          data-solution-col="${columnIndex}"
          data-solution-cost="${escapeHtml(String(formatValue(costs[rowIndex][columnIndex])))}"
          style="--transport-highlight:${TRANSPORT_HIGHLIGHT_COLORS[columnIndex % TRANSPORT_HIGHLIGHT_COLORS.length]};"
        >
          ${shouldShowAllocation ? `
            <div class="transport-cell-stack">
              <span class="transport-cell-cost">c = ${formatValue(costs[rowIndex][columnIndex])}</span>
              ${adjustment ? `<span class="transport-cell-adjustment transport-cell-adjustment-${adjustment.sign === "+" ? "plus" : "minus"}">${escapeHtml(adjustment.expression)}</span>` : ""}
              <span class="transport-cell-allocation ${Math.abs(amount) < EPSILON ? "is-zero" : ""} ${symbolicAllocation ? "transport-cell-symbolic" : ""}">${symbolicAllocation ?? formatValue(amount)}</span>
            </div>
          ` : '<span class="transport-cell-dash">-</span>'}
        </td>
      `;
      }).join("")}
      <td
        class="${highlightOfferRow ? "transport-offer-hover-cell" : ""}"
        ${highlightOfferRow ? `data-offer-highlight="${rowIndex}" data-offer-scope="${escapeHtml(scope)}"` : ""}
      >
        ${symbolicOffers[rowIndex] ?? formatValue(offers[rowIndex])}
      </td>
    </tr>
  `).join("");

  const demandMarkup = demands.map((value, columnIndex) => `<td>${symbolicDemands[columnIndex] ?? formatValue(value)}</td>`).join("");
  const captionMarkup = title ? `<p class="transport-table-caption">${renderTransportCaptionText(title)}</p>` : "";

  return `
    <div class="transport-card-grid">
      ${captionMarkup}
      <div class="transport-input-wrap">
        <table class="transport-table ${hasThetaAdjustments ? "transport-table-has-theta-adjustments" : ""}">
          <thead>
            <tr>
              <th></th>
              ${headerMarkup}
              <th>Oferta</th>
            </tr>
          </thead>
          <tbody>
            ${bodyMarkup}
            <tr>
              <th class="transport-total-label">Demanda</th>
              ${demandMarkup}
              <td class="transport-balance-cell transport-total-cost-cell transport-z-hover-cell is-valid" data-z-scope="${escapeHtml(scope)}">
                <strong>${totalCostLabel ?? `Z = ${formatValue(totalCost)}`}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTransportColumnMinimaTable(costs) {
  const minima = getTransportColumnMinimumCells(costs);
  const headerMarkup = Array.from({ length: costs[0]?.length ?? 0 }, (_, index) => `<th>D${index + 1}</th>`).join("");
  const bodyMarkup = costs.map((row, rowIndex) => `
    <tr>
      <th class="transport-row-label">O${rowIndex + 1}</th>
      ${row.map((cost, columnIndex) => {
    const isMinimum = minima[columnIndex]?.row === rowIndex;
    return `
          <td class="transport-minimum-cell">
            <span class="transport-minimum-value ${isMinimum ? "is-marked" : ""}">${formatValue(cost)}</span>
          </td>
        `;
  }).join("")}
    </tr>
  `).join("");

  return `
    <div class="transport-card-grid">
      <p class="transport-table-caption">Menor costo por columna</p>
      <div class="transport-input-wrap">
        <table class="transport-table">
          <thead>
            <tr>
              <th></th>
              ${headerMarkup}
            </tr>
          </thead>
          <tbody>${bodyMarkup}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTransportDegeneracyCheck(solution) {
  return `
    <div class="transport-degeneracy-check ${solution.isDegenerate ? "is-degenerate" : "is-normal"}">
      <p>
        Validación de asignaciones:<br>
        Fórmula: m + n - 1 = asignaciones esperadas<br><br>
        ${transportState.originCount} + ${transportState.destinationCount} - 1 = ${solution.expectedAllocations}.<br>
        Asignaciones reales = ${solution.positiveAllocations}.<br><br>
        Transporte ${solution.isDegenerate ? "degenerado" : "normal"}.
      </p>
    </div>
  `;
}

function renderTransportNormalizedCheck(plan) {
  const expectedAllocations = plan.amounts.length + plan.amounts[0].length - 1;
  const basicAllocations = countTransportBasics(plan);
  return `
    <div class="transport-degeneracy-check is-normal">
      <p>
        Verificación después de agregar ε:<br>
        Fórmula: m + n - 1 = asignaciones esperadas<br><br>
        ${plan.amounts.length} + ${plan.amounts[0].length} - 1 = ${expectedAllocations}.<br>
        Asignaciones con ε = ${basicAllocations}.<br><br>
        Transporte ${basicAllocations === expectedAllocations ? "normal" : "degenerado"}.
      </p>
    </div>
  `;
}

function createTransportVerification(plan, costs, offers, demands, options = {}) {
  const { preserveUnknowns = false } = options;
  const seed = Math.abs(Math.round(
    costs.flat().reduce((sum, value) => sum + value, 0)
    + getTransportTotal(offers)
    + getTransportTotal(demands)
  )) % 11;
  const potentials = computeTransportPotentialsWithSeed(plan, costs, seed, { preserveUnknowns });
  const sums = costs.map((row, rowIndex) => row.map((_, columnIndex) => (
    potentials.u[rowIndex] != null && potentials.v[columnIndex] != null
      ? potentials.u[rowIndex] + potentials.v[columnIndex]
      : (plan.basics[rowIndex][columnIndex] ? costs[rowIndex][columnIndex] : null)
  )));
  const reduced = costs.map((row, rowIndex) => row.map((cost, columnIndex) => (
    sums[rowIndex][columnIndex] == null ? null : sums[rowIndex][columnIndex] - cost
  )));
  const hasInsufficientData = potentials.u.some((value) => value == null) || potentials.v.some((value) => value == null);
  const isOptimal = !hasInsufficientData && reduced.every((row) => row.every((value) => value <= EPSILON));

  return {
    seed,
    potentials,
    sums,
    reduced,
    hasInsufficientData,
    isOptimal
  };
}

function renderTransportPotentialTable(verification, costs, plan, options = {}) {
  const {
    scope = "transport-verification",
    caption = "Verificación con fila y columna agregadas",
    note = ""
  } = options;
  const colgroupMarkup = `
    <colgroup>
      <col class="transport-comparison-col-label">
      ${Array.from({ length: costs[0]?.length ?? 0 }, () => "<col>").join("")}
      <col class="transport-comparison-col-balance">
    </colgroup>
  `;
  const columnHeaders = Array.from({ length: costs[0]?.length ?? 0 }, (_, index) => `<th>D${index + 1}</th>`).join("");
  const bodyMarkup = costs.map((row, rowIndex) => `
    <tr>
      <th class="transport-row-label">O${rowIndex + 1}</th>
      ${row.map((_, columnIndex) => `
        <td
          class="transport-verification-cell ${plan.basics[rowIndex][columnIndex] ? "is-basic" : ""} ${verification.sums[rowIndex][columnIndex] == null ? "is-unresolved" : ""}"
          data-verification-scope="${escapeHtml(scope)}"
          data-verification-row="${rowIndex}"
          data-verification-col="${columnIndex}"
        >
          <span class="transport-verification-stack">
            <span class="transport-cell-allocation">${verification.sums[rowIndex][columnIndex] == null ? "" : formatValue(verification.sums[rowIndex][columnIndex])}</span>
            <span class="transport-verification-subtract" data-verification-subtract></span>
          </span>
        </td>
      `).join("")}
      <td class="transport-balance-cell is-valid">${verification.potentials.u[rowIndex] == null ? "" : formatValue(verification.potentials.u[rowIndex])}</td>
    </tr>
  `).join("");

  const footerMarkup = verification.potentials.v.map((value) => `<td class="transport-balance-cell is-valid">${value == null ? "" : formatValue(value)}</td>`).join("");
  const noteMarkup = note ? `
    <div class="transport-degeneracy-check is-degenerate">
      <p>${escapeHtml(note)}</p>
    </div>
  ` : "";

  return `
    <div class="transport-card-grid">
      <p class="transport-table-caption">${renderTransportCaptionText(caption)}</p>
      <div class="transport-input-wrap">
        <table class="transport-table transport-comparison-table">
          ${colgroupMarkup}
          <thead>
            <tr>
              <th></th>
              ${columnHeaders}
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${bodyMarkup}
            <tr>
              <th class="transport-total-label"></th>
              ${footerMarkup}
              <td class="transport-balance-cell is-valid"></td>
            </tr>
          </tbody>
        </table>
      </div>
      ${noteMarkup}
    </div>
  `;
}

function renderTransportReducedMatrix(verification, costs, options = {}) {
  const {
    cycleAnnotations = {},
    totalCost = null,
    scope = "transport-verification",
    referencePlan = null,
    referenceSymbolicAllocations = {},
    referenceSymbolicOffers = [],
    referenceSymbolicDemands = [],
    referenceTotalCostLabel = null,
    offers = [],
    demands = [],
    stepDetails = null
  } = options;
  const colgroupMarkup = `
    <colgroup>
      <col class="transport-comparison-col-label">
      ${Array.from({ length: verification.reduced[0]?.length ?? 0 }, () => "<col>").join("")}
      <col class="transport-comparison-col-balance">
    </colgroup>
  `;
  const referenceTableMarkup = !verification.isOptimal && referencePlan
    ? `
      <div class="transport-circuit-reference">
        ${renderTransportAllocationTable("Solución actual, no la óptima", referencePlan, costs, offers, demands, totalCost ?? 0, {
          scope: `${scope}-reference`,
          highlightOfferRow: false,
          symbolicAllocations: referenceSymbolicAllocations,
          symbolicOffers: referenceSymbolicOffers,
          symbolicDemands: referenceSymbolicDemands,
          totalCostLabel: referenceTotalCostLabel
        })}
      </div>
    `
    : "";
  const supportMarkup = verification.isOptimal ? "" : `
      <div class="transport-circuit-support">
        <div class="transport-circuit-rules">
        <p class="transport-iteration-note">
          Objetivo: armar un circuito cerrado.<br><br>
          Reglas del circuito:<br>
          1. Empezar en la celda positiva de mayor valor.<br>
          2. Se puede avanzar solo vertical u horizontalmente.<br>
          3. Doblá solo en celdas asignadas de tabla de solucion.<br>
          4. Los signos alternan + y - hasta cerrar vuelta, siempre empezando con signo +.<br><br>
          Notas:<br>
          - No siempre conviene doblar en el primer 0 que encontrás. Puede pasar que mas adelante no tenga salida para seguir o cerrar el circuito.
        </p>
        </div>
        ${referenceTableMarkup}
      </div>
  `;
  const thetaStepsMarkup = verification.isOptimal ? "" : renderTransportThetaSteps(referencePlan, stepDetails);
  const columnCount = verification.reduced[0]?.length ?? 0;
  const headerMarkup = Array.from({ length: columnCount }, (_, index) => `<th>D${index + 1}</th>`).join("");
  const bodyMarkup = verification.reduced.map((row, rowIndex) => `
    <tr>
      <th class="transport-row-label">O${rowIndex + 1}</th>
      ${row.map((value, columnIndex) => {
        const cycleMeta = cycleAnnotations[getTransportCycleCellKey(rowIndex, columnIndex)];
        return `
          <td
            class="transport-opportunity-cell ${value > EPSILON ? "is-positive" : "is-optimal"} ${cycleMeta ? `is-cycle-cell is-cycle-${cycleMeta.sign === "+" ? "plus" : "minus"}` : ""}"
            data-reduced-scope="${escapeHtml(scope)}"
            data-reduced-row="${rowIndex}"
            data-reduced-col="${columnIndex}"
            data-reduced-cost="${escapeHtml(String(formatValue(costs[rowIndex][columnIndex])))}"
          >
            ${cycleMeta ? `
              <div class="transport-cycle-flags" aria-hidden="true">
                <span class="transport-cycle-sign transport-cycle-sign-${cycleMeta.sign === "+" ? "plus" : "minus"}">${cycleMeta.sign}</span>
                <span class="transport-cycle-arrow transport-cycle-arrow-${cycleMeta.direction} ${cycleMeta.isStart ? "transport-cycle-arrow-start" : ""}">
                  <span class="transport-cycle-arrow-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" focusable="false">
                      <path d="M3 8h8"></path>
                      <path d="M8.75 4.75 12 8l-3.25 3.25"></path>
                    </svg>
                  </span>
                </span>
              </div>
            ` : ""}
            ${formatValue(value)}
          </td>
        `;
      }).join("")}
      <td class="transport-balance-cell is-valid"></td>
    </tr>
  `).join("");

  return `
    <div class="transport-card-grid">
      <p class="transport-table-caption">Tabla de 0 y negativos</p>
      <div class="transport-input-wrap">
        <table class="transport-table transport-comparison-table">
          ${colgroupMarkup}
          <thead>
            <tr>
              <th></th>
              ${headerMarkup}
              <th></th>
            </tr>
          </thead>
          <tbody>${bodyMarkup}</tbody>
        </table>
      </div>
      ${supportMarkup}
      ${thetaStepsMarkup}
      <div class="transport-degeneracy-check ${verification.isOptimal ? "is-normal" : "is-degenerate"}">
        <p>${verification.isOptimal ? `Todos los valores dieron 0 o negativos. Punto óptimo.<br>Z = ${formatValue(totalCost ?? 0)}.` : "Aparecieron positivos. Todavía no es punto óptimo."}</p>
      </div>
    </div>
  `;
}

function renderTransportOpportunityTable(matrix) {
  const columnCount = matrix[0]?.length ?? 0;
  const headerMarkup = Array.from({ length: columnCount }, (_, index) => `<th>D${index + 1}</th>`).join("");
  const bodyMarkup = matrix.map((row, rowIndex) => `
    <tr>
      <th class="transport-row-label">O${rowIndex + 1}</th>
      ${row.map((value) => `
        <td class="transport-opportunity-cell ${value > EPSILON ? "is-positive" : "is-optimal"}">${formatValue(value)}</td>
      `).join("")}
    </tr>
  `).join("");

  return `
    <div class="transport-card-grid">
      <p class="transport-table-caption">Matriz de mejoras (u + v - c)</p>
      <div class="transport-input-wrap">
        <table class="transport-table">
          <thead>
            <tr>
              <th></th>
              ${headerMarkup}
            </tr>
          </thead>
          <tbody>${bodyMarkup}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTransportOptimizationContinuation(result) {
  if (result.verification.isOptimal) {
    return [];
  }

  const continuationCards = result.optimization.iterations.map((snapshot, index) => {
    const stepVerification = createTransportVerification(snapshot.allocation, result.costs, result.offers, result.demands);
    const nextIteration = result.optimization.iterations[index + 1];

    return `
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Continuación: iteración ${snapshot.iteration}</h3>
        </div>
        ${renderTransportAllocationTable("", snapshot.allocation, result.costs, result.offers, result.demands, snapshot.totalCost, {
          scope: `continuation-${snapshot.iteration}`,
          highlightOfferRow: true,
          thetaAdjustments: buildTransportThetaCellAdjustments(
            index === 0 ? result.columnMinimum.plan : result.optimization.iterations[index - 1].allocation,
            snapshot.cycle,
            snapshot.theta
          )
        })}
        ${renderTransportPotentialTable(stepVerification, result.costs, snapshot.allocation, {
          scope: `continuation-${snapshot.iteration}`
        })}
        ${renderTransportReducedMatrix(stepVerification, result.costs, {
          scope: `continuation-${snapshot.iteration}`,
          cycleAnnotations: buildTransportCycleAnnotations(nextIteration?.cycle),
          totalCost: snapshot.totalCost,
          referencePlan: snapshot.allocation,
          offers: result.offers,
          demands: result.demands,
          stepDetails: nextIteration ?? null
        })}
      </article>
    `;
  });

  if (!result.optimization.optimal) {
    const finalVerification = createTransportVerification(result.optimization.optimalPlan, result.costs, result.offers, result.demands);

    continuationCards.push(`
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Resultado alcanzado</h3>
          <p>Se mostró la mejor continuación encontrada con la rutina actual.</p>
        </div>
        ${renderTransportAllocationTable("", result.optimization.optimalPlan, result.costs, result.offers, result.demands, result.optimalCost, {
          scope: "continuation-final",
          highlightOfferRow: true
        })}
        ${renderTransportPotentialTable(finalVerification, result.costs, result.optimization.optimalPlan, {
          scope: "continuation-final"
        })}
        ${renderTransportReducedMatrix(finalVerification, result.costs, {
          scope: "continuation-final",
          totalCost: result.optimalCost,
          referencePlan: result.optimization.optimalPlan,
          offers: result.offers,
          demands: result.demands,
          stepDetails: null
        })}
      </article>
    `);
  }

  return continuationCards;
}

function renderTransportResults(result) {
  if (!(transportResults instanceof HTMLElement)) {
    return;
  }

  if (!result.valid) {
    transportResults.innerHTML = '<div class="transport-card transport-empty"><p class="transport-empty">Ajusta datos hasta que oferta total y demanda total coincidan.</p></div>';
    return;
  }

  const degenerateEpsilonDisplay = result.degenerateVerification
    ? createTransportEpsilonDisplay(result.columnMinimum.displayPlan, result.columnMinimum.plan, result.costs)
    : null;

  const cards = [
    `
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Solucion 1: esquina noroeste</h3>
        </div>
        ${renderTransportAllocationTable("", result.northwest.plan, result.costs, result.offers, result.demands, result.northwest.totalCost, {
          scope: "northwest",
          highlightOfferRow: true
        })}
        ${renderTransportColumnMinimaTable(result.costs)}
      </article>
    `,
    `
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Solucion 2: costo minimo por columna</h3>
        </div>
        ${renderTransportAllocationTable("", result.columnMinimum.plan, result.costs, result.offers, result.demands, result.columnMinimum.totalCost, {
          scope: "column-min",
          highlightOfferRow: true
        })}
        ${renderTransportDegeneracyCheck(result.columnMinimum)}
      </article>
    `,
    `
      <article class="transport-card">
        <div class="transport-card-copy">
          <h3>Verificacion de optimalidad</h3>
        </div>
        ${result.degenerateVerification ? renderTransportPotentialTable(result.degenerateVerification, result.costs, createTransportPositiveBasisPlan(result.columnMinimum.displayPlan), {
          scope: "verification-incomplete",
          note: "No hay suficientes datos para completar esta tabla. Como el transporte es degenerado, hay que agregar ε a la oferta."
        }) : ""}
        ${result.degenerateVerification ? renderTransportAllocationTable("Solución 2 redibujada con ε", result.columnMinimum.plan, result.costs, result.offers, result.demands, result.columnMinimum.totalCost, {
          scope: "verification-epsilon-plan",
          highlightOfferRow: true,
          symbolicAllocations: degenerateEpsilonDisplay?.symbolicAllocations ?? {},
          symbolicOffers: degenerateEpsilonDisplay?.symbolicOffers ?? [],
          symbolicDemands: degenerateEpsilonDisplay?.symbolicDemands ?? [],
          totalCostLabel: degenerateEpsilonDisplay?.totalCostLabel ?? null
        }) : ""}
        ${result.degenerateVerification ? renderTransportNormalizedCheck(result.columnMinimum.plan) : ""}
        ${renderTransportPotentialTable(result.verification, result.costs, result.columnMinimum.plan, {
          scope: "verification-base",
          caption: result.degenerateVerification ? "Verificación para continuar agregando ε" : "Verificación con fila y columna agregadas"
        })}
        ${renderTransportReducedMatrix(result.verification, result.costs, {
          scope: "verification-base",
          cycleAnnotations: buildTransportCycleAnnotations(result.optimization.iterations[0]?.cycle),
          totalCost: result.columnMinimum.totalCost,
          referencePlan: result.columnMinimum.plan,
          referenceSymbolicAllocations: degenerateEpsilonDisplay?.symbolicAllocations ?? {},
          referenceSymbolicOffers: degenerateEpsilonDisplay?.symbolicOffers ?? [],
          referenceSymbolicDemands: degenerateEpsilonDisplay?.symbolicDemands ?? [],
          referenceTotalCostLabel: degenerateEpsilonDisplay?.totalCostLabel ?? null,
          offers: result.offers,
          demands: result.demands,
          stepDetails: result.optimization.iterations[0] ?? null
        })}
      </article>
    `
  ];

  cards.push(...renderTransportOptimizationContinuation(result));

  transportResults.innerHTML = cards.join("");
}

function refreshTransportResults() {
  if (!hasTransportPage) {
    return;
  }

  const result = solveTransportProblem();
  renderTransportResults(result);
}

function clearTransportOfferHighlights() {
  if (!(transportResults instanceof HTMLElement)) {
    return;
  }

  transportResults.querySelectorAll(".is-offer-highlighted").forEach((cell) => {
    cell.classList.remove("is-offer-highlighted");
  });
}

function applyTransportOfferHighlights(scope, row) {
  if (!(transportResults instanceof HTMLElement)) {
    return;
  }

  clearTransportOfferHighlights();

  transportResults.querySelectorAll(`[data-offer-scope="${scope}"][data-offer-highlight="${row}"]`).forEach((cell) => {
    cell.classList.add("is-offer-highlighted");
  });

  transportResults.querySelectorAll(`[data-solution-scope="${scope}"][data-solution-row="${row}"].has-allocation, [data-solution-scope="${scope}"][data-solution-row="${row}"].has-symbolic-allocation`).forEach((cell) => {
    cell.classList.add("is-offer-highlighted");
  });
}

function applyTransportZHighlights(scope) {
  if (!(transportResults instanceof HTMLElement)) {
    return;
  }

  clearTransportOfferHighlights();

  transportResults.querySelectorAll(`[data-solution-scope="${scope}"].has-allocation, [data-solution-scope="${scope}"].has-symbolic-allocation, [data-z-scope="${scope}"]`).forEach((cell) => {
    cell.classList.add("is-offer-highlighted");
  });
}

function clearTransportVerificationHighlights() {
  if (!(transportResults instanceof HTMLElement)) {
    return;
  }

  transportResults.querySelectorAll(".is-verification-hovered").forEach((cell) => {
    cell.classList.remove("is-verification-hovered");
  });

  transportResults.querySelectorAll("[data-verification-subtract]").forEach((element) => {
    element.textContent = "";
  });
}

function applyTransportVerificationHover(scope, row, column, costDisplay) {
  if (!(transportResults instanceof HTMLElement)) {
    return;
  }

  clearTransportVerificationHighlights();

  transportResults.querySelectorAll(
    `[data-verification-scope="${scope}"][data-verification-row="${row}"][data-verification-col="${column}"]`
  ).forEach((cell) => {
    cell.classList.add("is-verification-hovered");
    cell.querySelector("[data-verification-subtract]")?.replaceChildren(`- ${costDisplay}`);
  });

  transportResults.querySelectorAll(
    `[data-reduced-scope="${scope}"][data-reduced-row="${row}"][data-reduced-col="${column}"]`
  ).forEach((cell) => {
    cell.classList.add("is-verification-hovered");
  });

  transportResults.querySelectorAll(
    `[data-solution-scope="${scope}-reference"][data-solution-row="${row}"][data-solution-col="${column}"]`
  ).forEach((cell) => {
    cell.classList.add("is-verification-hovered");
  });
}

function syncTransportDimensionsFromInputs({ normalize = false } = {}) {
  if (transportOriginCountInput.value === "" || transportDestinationCountInput.value === "") {
    return;
  }

  const origins = clampTransportDimension(transportOriginCountInput.value);
  const destinations = clampTransportDimension(transportDestinationCountInput.value);

  if (normalize) {
    transportOriginCountInput.value = String(origins);
    transportDestinationCountInput.value = String(destinations);
  }

  if (origins === transportState.originCount && destinations === transportState.destinationCount) {
    return;
  }

  resizeTransportState(origins, destinations);
  renderTransportGrid();
  refreshTransportResults();
}

objectiveToggle?.addEventListener("click", () => {
  state.objectiveType = state.objectiveType === "max" ? "min" : "max";
  renderObjectiveToggle();
  renderObjectiveExpression();
  refreshResults();
});

displayModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.displayMode;

    if (!nextMode || nextMode === state.numberFormat) {
      return;
    }

    state.numberFormat = nextMode;
    renderDisplayModeToggle();
    refreshResults();
  });
});

[variableCountInput, constraintCountInput].filter((input) => input instanceof HTMLInputElement).forEach((input) => {
  input.addEventListener("input", () => {
    syncDimensionsFromInputs();
  });

  input.addEventListener("change", () => {
    syncDimensionsFromInputs({ normalize: true });
  });
});

[transportOriginCountInput, transportDestinationCountInput].filter((input) => input instanceof HTMLInputElement).forEach((input) => {
  input.addEventListener("input", () => {
    syncTransportDimensionsFromInputs();
  });

  input.addEventListener("change", () => {
    syncTransportDimensionsFromInputs({ normalize: true });
  });
});

simplexForm?.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  updateCompactInputWidth(target);

  const scope = target.dataset.scope;

  if (scope === "objective") {
    state.objectiveCoefficients[Number(target.dataset.index)] = parseNumericValue(target.value);
  } else if (scope === "constraint") {
    const rowIndex = Number(target.dataset.row);
    const columnIndex = Number(target.dataset.index);
    state.constraints[rowIndex].coefficients[columnIndex] = parseNumericValue(target.value);
  } else if (scope === "rhs") {
    const rowIndex = Number(target.dataset.row);
    state.constraints[rowIndex].rhs = parseNumericValue(target.value);
  }

  refreshResults();
});

simplexForm?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const stepperButton = target.closest(".mini-stepper-button");

  if (stepperButton instanceof HTMLButtonElement) {
    const parent = stepperButton.parentElement?.parentElement;
    const input = parent?.querySelector("input");

    if (input instanceof HTMLInputElement) {
      bumpCompactInput(input, Number(stepperButton.dataset.delta));
    }

    return;
  }

  const relationButton = target.closest(".relation-toggle");

  if (!(relationButton instanceof HTMLButtonElement)) {
    return;
  }

  const rowIndex = Number(relationButton.dataset.row);
  const nextRelation = getNextRelation(state.constraints[rowIndex].relation);
  state.constraints[rowIndex].relation = nextRelation;
  relationButton.innerHTML = renderRelationSymbol(nextRelation);
  relationButton.setAttribute("aria-label", `Relacion de la restriccion ${rowIndex + 1}: ${nextRelation}. Click para cambiar`);
  refreshResults();
});

transportForm?.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  updateCompactInputWidth(target);

  const scope = target.dataset.scope;

  if (!scope) {
    return;
  }

  if (scope === "transport-cost") {
    const rowIndex = Number(target.dataset.row);
    const columnIndex = Number(target.dataset.index);
    transportState.costs[rowIndex][columnIndex] = parseNumericValue(target.value);
  } else if (scope === "transport-offer") {
    const rowIndex = Number(target.dataset.row);
    transportState.offers[rowIndex] = parseNumericValue(target.value);
  } else if (scope === "transport-demand") {
    const columnIndex = Number(target.dataset.index);
    transportState.demands[columnIndex] = parseNumericValue(target.value);
  }

  updateTransportGridBalanceDisplay();
  refreshTransportResults();
});

transportForm?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
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

transportClearButton?.addEventListener("click", () => {
  clearTransportValues();
  renderTransportGrid();
  refreshTransportResults();
});

transportLoadSimpleButton?.addEventListener("click", () => {
  applyTransportPreset(TRANSPORT_PRESETS.simple);
});

transportLoadCircuitButton?.addEventListener("click", () => {
  applyTransportPreset(TRANSPORT_PRESETS.circuit);
});

transportLoadDegenerateButton?.addEventListener("click", () => {
  applyTransportPreset(TRANSPORT_PRESETS.degenerate);
});

["mouseover", "focusin"].forEach((eventName) => {
  transportResults?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const offerCell = target.closest("[data-offer-highlight]");

    if (!(offerCell instanceof HTMLElement)) {
      const zCell = target.closest("[data-z-scope]");

      if (!(zCell instanceof HTMLElement)) {
        return;
      }

      applyTransportZHighlights(zCell.dataset.zScope);
      return;
    }

    applyTransportOfferHighlights(offerCell.dataset.offerScope, offerCell.dataset.offerHighlight);
  });
});

["mouseout", "focusout"].forEach((eventName) => {
  transportResults?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const offerCell = target.closest("[data-offer-highlight]");

    if (!(offerCell instanceof HTMLElement)) {
      const zCell = target.closest("[data-z-scope]");

      if (!(zCell instanceof HTMLElement)) {
        return;
      }

      const relatedTarget = event.relatedTarget;

      if (relatedTarget instanceof HTMLElement && zCell.contains(relatedTarget)) {
        return;
      }

      clearTransportOfferHighlights();
      return;
    }

    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof HTMLElement && offerCell.contains(relatedTarget)) {
      return;
    }

    clearTransportOfferHighlights();
  });
});

["mouseover", "focusin"].forEach((eventName) => {
  transportResults?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const reducedCell = target.closest("[data-reduced-scope]");

    if (!(reducedCell instanceof HTMLElement)) {
      return;
    }

    applyTransportVerificationHover(
      reducedCell.dataset.reducedScope,
      reducedCell.dataset.reducedRow,
      reducedCell.dataset.reducedCol,
      reducedCell.dataset.reducedCost
    );
  });
});

["mouseout", "focusout"].forEach((eventName) => {
  transportResults?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const reducedCell = target.closest("[data-reduced-scope]");

    if (!(reducedCell instanceof HTMLElement)) {
      return;
    }

    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof HTMLElement && reducedCell.contains(relatedTarget)) {
      return;
    }

    clearTransportVerificationHighlights();
  });
});

["mouseover", "focusin"].forEach((eventName) => {
  transportResults?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const solutionCell = target.closest("[data-solution-scope]");

    if (!(solutionCell instanceof HTMLElement)) {
      return;
    }

    if (!solutionCell.dataset.solutionScope?.endsWith("-reference")) {
      return;
    }

    applyTransportVerificationHover(
      solutionCell.dataset.solutionScope.replace(/-reference$/, ""),
      solutionCell.dataset.solutionRow,
      solutionCell.dataset.solutionCol,
      solutionCell.dataset.solutionCost
    );
  });
});

["mouseout", "focusout"].forEach((eventName) => {
  transportResults?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const solutionCell = target.closest("[data-solution-scope]");

    if (!(solutionCell instanceof HTMLElement)) {
      return;
    }

    if (!solutionCell.dataset.solutionScope?.endsWith("-reference")) {
      return;
    }

    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof HTMLElement && solutionCell.contains(relatedTarget)) {
      return;
    }

    clearTransportVerificationHighlights();
  });
});

["mouseover", "focusin"].forEach((eventName) => {
  iterationGroups?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const calcTrigger = target.closest(".calc-trigger");

    if (!(calcTrigger instanceof HTMLElement) || !iterationGroups.contains(calcTrigger)) {
      return;
    }

    updateGuideCalculation(calcTrigger);
  });
});

["mouseout", "focusout"].forEach((eventName) => {
  iterationGroups?.addEventListener(eventName, (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const calcTrigger = target.closest(".calc-trigger");

    if (!(calcTrigger instanceof HTMLElement) || !iterationGroups.contains(calcTrigger)) {
      return;
    }

    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof HTMLElement) {
      const nextTrigger = relatedTarget.closest(".calc-trigger");

      if (nextTrigger instanceof HTMLElement && calcTrigger.closest(".iteration-card") === nextTrigger.closest(".iteration-card")) {
        return;
      }
    }

    const card = calcTrigger.closest(".iteration-card");

    if (!(card instanceof HTMLElement)) {
      return;
    }

    clearGuideCalculations(iterationGroups);
    clearTraceHighlights(iterationGroups);
  });
});

if (hasSimplexPage) {
  resizeState(state.variableCount, state.constraintCount);
  renderDisplayModeToggle();
  renderModel();
  refreshResults();
}

if (hasTransportPage) {
  resizeTransportState(transportState.originCount, transportState.destinationCount);
  renderTransportGrid();
  refreshTransportResults();
}
