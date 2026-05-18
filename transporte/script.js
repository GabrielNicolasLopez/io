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

const transportForm = document.getElementById("transport-form");
const transportOriginCountInput = document.getElementById("transport-origin-count");
const transportDestinationCountInput = document.getElementById("transport-destination-count");
const transportLoadSimpleButton = document.getElementById("transport-load-simple-button");
const transportLoadCircuitButton = document.getElementById("transport-load-circuit-button");
const transportLoadDegenerateButton = document.getElementById("transport-load-degenerate-button");
const transportClearButton = document.getElementById("transport-clear-button");
const transportGrid = document.getElementById("transport-grid");
const transportResults = document.getElementById("transport-results");

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

function updateCompactInputWidths(root = transportForm) {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  root.querySelectorAll(".compact-number-input").forEach((input) => {
    updateCompactInputWidth(input);
  });
}


function bumpCompactInput(input, delta) {
  const isDimensionInput = input === transportOriginCountInput || input === transportDestinationCountInput;
  const currentValue = isDimensionInput ? clampTransportDimension(input.value) : parseNumericValue(input.value);
  const nextValue = isDimensionInput
    ? clampTransportDimension(currentValue + delta)
    : Math.round((currentValue + delta) * 1000) / 1000;

  input.value = formatNumber(nextValue);
  updateCompactInputWidth(input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}


function cleanNumber(value) {
  return Math.abs(value) < EPSILON ? 0 : value;
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

window.addEventListener("pageshow", resetInitialScrollPosition);
window.addEventListener("load", resetInitialScrollPosition);

[transportOriginCountInput, transportDestinationCountInput].filter((input) => input instanceof HTMLInputElement).forEach((input) => {
  input.addEventListener("input", () => {
    syncTransportDimensionsFromInputs();
  });

  input.addEventListener("change", () => {
    syncTransportDimensionsFromInputs({ normalize: true });
  });
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

if (hasTransportPage) {
  resizeTransportState(transportState.originCount, transportState.destinationCount);
  renderTransportGrid();
  refreshTransportResults();
}
