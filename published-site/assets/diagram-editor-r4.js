import { chartGeometry, handwriting, handwritingCSS, parseChartValue, readTable } from "./diagram-data.js";

const maxRows = 120;
const maxColumns = 64;
const maxCells = 3200;
const maxCellLength = 2000;
const formatNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format;
const clipboardData = transfer => ({ text: transfer?.getData("text/plain"), html: transfer?.getData("text/html") });
const asTSV = cells => cells.map(row => row.map(cell => /["\t\n]/.test(cell) ? '"' + cell.replaceAll('"', '""') + '"' : cell).join("\t")).join("\n");

function insertElements(api, items, width, height, convert, capture) {
  const state = api.getAppState();
  const left = state.width / (2 * state.zoom.value) - state.scrollX - width / 2;
  const top = state.height / (2 * state.zoom.value) - state.scrollY - height / 2;
  const group = crypto.randomUUID();
  const elements = convert(items.map(item => ({ ...item, x: item.x + left, y: item.y + top, groupIds: [group] })))
    .map(element => ({ ...element, groupIds: [group], ...(element.type === "text" && { fontFamily: handwriting }) }));
  api.setActiveTool({ type: "selection" });
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
    appState: {
      selectedElementIds: Object.fromEntries(elements.map(element => [element.id, true])),
      selectedGroupIds: { [group]: true },
    },
    captureUpdate: capture,
  });
}

function tableElements(grid) {
  const context = document.createElement("canvas").getContext("2d");
  context.font = "16px " + handwritingCSS;
  const measure = text => context.measureText(text).width;
  const widths = grid[0].map((_, column) => grid.reduce((width, row) =>
    row[column].split("\n").reduce((best, line) => Math.min(400, Math.max(best, measure(line) + 30)), width), 110));
  function wrap(text, width) {
    return text.split("\n").flatMap(line => {
      const lines = [""];
      for (const character of line) {
        const current = lines.at(-1);
        if (current && measure(current + character) > width - 28) lines.push(character);
        else lines[lines.length - 1] = current + character;
      }
      return lines;
    });
  }
  let y = 0;
  const elements = grid.flatMap((row, rowIndex) => {
    const lines = row.map((text, column) => wrap(text, widths[column]));
    const height = Math.max(38, 16 + Math.max(...lines.map(value => value.length)) * 23);
    let x = 0;
    const cells = lines.map((value, column) => {
      const rectangle = {
        type: "rectangle", x, y, width: widths[column], height,
        roughness: 0, roundness: null, strokeWidth: 1, strokeColor: "#9c98ad", fillStyle: "solid",
        backgroundColor: rowIndex === 0 ? "#edeaf6" : "transparent",
        label: { text: value.join("\n"), fontFamily: handwriting, fontSize: 16, strokeColor: "#282438", textAlign: "left" },
      };
      x += widths[column];
      return rectangle;
    });
    y += height;
    return cells;
  });
  return { elements, width: widths.reduce((sum, width) => sum + width, 0), height: y };
}

function chartElements(geometry) {
  const { width, height, left, right, top, bottom, zero, marks, points, step, type, title } = geometry;
  const elements = [];
  const line = (x, y, x2, y2, strokeColor, strokeWidth = 1) => {
    elements.push({ type: "line", x, y, points: [[0, 0], [x2 - x, y2 - y]], strokeColor, strokeWidth, roughness: 0 });
  };
  const text = (value, x, y, fontSize = 15) => {
    if (value) elements.push({ type: "text", text: value, x, y, fontSize, fontFamily: handwriting, strokeColor: "#302940" });
  };
  text(title, left, 18, 20);
  marks.forEach(mark => {
    line(left, mark.y, right, mark.y, mark.value === 0 ? "#655b74" : "#ddd8e7");
    text(formatNumber(mark.value), 2, mark.y - 9);
  });
  line(left, top, left, bottom, "#655b74");
  for (const [index, point] of points.entries()) {
    if (type === "bar") {
      const barWidth = Math.min(36, step * .62);
      elements.push({
        type: "rectangle", x: point.x - barWidth / 2, y: Math.min(point.y, zero),
        width: barWidth, height: Math.max(1, Math.abs(point.y - zero)),
        strokeColor: "#6955a2", strokeWidth: 1, backgroundColor: "#b7a5e2", fillStyle: "solid", roughness: 0, roundness: null,
      });
    } else {
      const previous = points[index - 1];
      if (previous) line(previous.x, previous.y, point.x, point.y, "#6955a2", 2);
      elements.push({ type: "ellipse", x: point.x - 3, y: point.y - 3, width: 6, height: 6, strokeColor: "#6955a2", backgroundColor: "#6955a2", fillStyle: "solid", roughness: 0 });
    }
    const shortLabel = [...point.label];
    text(shortLabel.length > 9 ? shortLabel.slice(0, 8).join("") + "…" : point.label, point.x - step * .44, bottom + 12, 13);
  }
  return { elements, width, height };
}

function drawPreview(canvas, geometry) {
  const { width, height, points } = geometry;
  const scale = Math.min(1, 860 / width);
  canvas.width = Math.round(width * scale * 2);
  canvas.height = Math.round(height * scale * 2);
  const context = canvas.getContext("2d");
  context.scale(scale * 2, scale * 2);
  for (const element of chartElements(geometry).elements) {
    const { type, x, y, strokeColor, strokeWidth = 1, backgroundColor } = element;
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    if (type === "text") {
      context.fillStyle = strokeColor;
      context.font = element.fontSize + "px " + handwritingCSS;
      context.textBaseline = "top";
      context.fillText(element.text, x, y);
    } else if (type === "line") {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + element.points[1][0], y + element.points[1][1]);
      context.stroke();
    } else {
      context.fillStyle = backgroundColor;
      if (type === "ellipse") {
        context.beginPath();
        context.arc(x + 3, y + 3, 3, 0, 2 * Math.PI);
        context.fill();
      } else {
        context.fillRect(x, y, element.width, element.height);
        context.strokeRect(x, y, element.width, element.height);
      }
    }
  }
  canvas.title = points.map(point => point.label + " " + formatNumber(point.value)).join("\n");
}

export function watchDiagramPaste(getApi, options) {
  function paste(event) {
    const target = event.target instanceof Element ? event.target : document.activeElement;
    const api = getApi();
    if (!api || api.getAppState().viewModeEnabled || !target || target.closest(".icn-diagram-editor")) return;
    const mermaid = target.closest(".ttd-dialog");
    const drawing = target.closest(".canvas-shell .excalidraw") &&
      !target.closest("textarea, input, [contenteditable='true'], .Modal");
    if (!mermaid && !drawing) return;
    const cells = readTable(clipboardData(event.clipboardData));
    if (!cells || !cells.some(row => row.length > 1)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (mermaid) api.updateScene({ appState: { openDialog: null } });
    openDiagramEditor(api, options, cells);
  }
  document.addEventListener("paste", paste, true);
  return () => document.removeEventListener("paste", paste, true);
}

export function openDiagramEditor(api, { zh, convert, capture }, initialCells) {
  if (!api || api.getAppState().viewModeEnabled || document.querySelector(".icn-diagram-editor")) return;
  const t = (chinese, english) => zh ? chinese : english;
  const dialog = document.createElement("dialog");
  dialog.className = "icn-diagram-editor";
  dialog.setAttribute("aria-labelledby", "icn-diagram-title");
  dialog.innerHTML = `
    <header>
      <h2 id="icn-diagram-title">${t("图表编辑器", "Diagram editor")}</h2>
      <button type="button" data-action="close" aria-label="${t("关闭图表编辑器", "Close diagram editor")}">×</button>
    </header>
    <div class="icn-diagram-modes" role="group" aria-label="${t("图表类型", "Diagram type")}">
      <button type="button" data-action="table" aria-pressed="true">${t("表格", "Table")}</button>
      <button type="button" data-action="chart" aria-pressed="false">${t("数据图表", "Data chart")}</button>
      <button type="button" data-action="mermaid">${t("Mermaid 图解", "Mermaid diagram")}</button>
    </div>
    <section data-panel="table">
      <div class="icn-table-tools">
        <button type="button" data-action="paste">${t("粘贴表格", "Paste table")}</button>
        <label>${t("行数", "Rows")} <input type="number" min="1" max="${maxRows}" value="4" data-size="rows"></label>
        <label>${t("列数", "Columns")} <input type="number" min="1" max="${maxColumns}" value="3" data-size="columns"></label>
        <small>${t("支持网页表格、Excel、CSV 和 Markdown，可直接按 Ctrl+V。", "Paste from a webpage, Excel, CSV, or Markdown with Ctrl+V.")}</small>
      </div>
      <div class="icn-table-scroll">
        <table aria-label="${t("编辑表格", "Edit table")}"><tbody></tbody></table>
      </div>
    </section>
    <section data-panel="chart" hidden>
      <label for="icn-chart-data">${t("粘贴数据后选择标签和数值列。", "Paste data, then choose the label and value columns.")}</label>
      <textarea id="icn-chart-data" rows="4" spellcheck="false"></textarea>
      <div class="icn-chart-controls">
        <label>${t("标签列", "Labels")} <select data-chart="labels"></select></label>
        <label>${t("数值列", "Values")} <select data-chart="values"></select></label>
        <label><input type="checkbox" data-chart="header" checked> ${t("首行为表头", "First row is a header")}</label>
        <label>${t("图表类型", "Chart type")} <select data-chart="type"><option value="bar">${t("柱状图", "Bar")}</option><option value="line">${t("折线图", "Line")}</option></select></label>
        <label data-chart-range hidden>${t("范围取值", "Range value")} <select data-chart="range"><option value="mid">${t("中值", "Midpoint")}</option><option value="low">${t("下限", "Minimum")}</option><option value="high">${t("上限", "Maximum")}</option></select></label>
      </div>
      <p class="icn-chart-status" role="status"></p>
      <canvas class="icn-chart-preview" aria-label="${t("图表预览", "Chart preview")}" hidden></canvas>
    </section>
    <p class="icn-diagram-error" role="alert" hidden></p>
    <footer>
      <button type="button" data-action="native" hidden>${t("原生图表预览", "Native chart preview")}</button>
      <button type="button" data-action="insert">${t("插入表格", "Insert table")}</button>
    </footer>`;
  const query = selector => dialog.querySelector(selector);
  const rows = query('[data-size="rows"]');
  const columns = query('[data-size="columns"]');
  const body = query("tbody");
  const chart = query("textarea#icn-chart-data");
  const labels = query('[data-chart="labels"]');
  const values = query('[data-chart="values"]');
  const header = query('[data-chart="header"]');
  const type = query('[data-chart="type"]');
  const range = query('[data-chart="range"]');
  const preview = query(".icn-chart-preview");
  const status = query(".icn-chart-status");
  const error = query(".icn-diagram-error");
  const submit = query('[data-action="insert"]');
  const native = query('[data-action="native"]');
  const grid = Array.from({ length: maxRows }, () => Array(maxColumns).fill(""));
  let mode = "table";
  let data = null;
  let geometry = null;
  let inserting = false;

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  function refreshGrid() {
    rows.value = Math.min(maxRows, Math.max(1, Math.trunc(rows.valueAsNumber || 1)));
    columns.value = Math.min(maxColumns, Math.max(1, Math.trunc(columns.valueAsNumber || 1)));
    if (Number(rows.value) * Number(columns.value) > maxCells) {
      columns.value = Math.floor(maxCells / Number(rows.value));
      showError(t("表格最多 3200 个单元格，已按当前行数调整列数。", "The table is limited to 3,200 cells. The column count has been adjusted."));
    }
    body.replaceChildren();
    for (let row = 0; row < Number(rows.value); row++) {
      const tableRow = body.insertRow();
      for (let column = 0; column < Number(columns.value); column++) {
        const input = document.createElement("textarea");
        input.rows = 1;
        input.maxLength = maxCellLength;
        input.dataset.cell = `${row}:${column}`;
        input.setAttribute("aria-label", t(`第 ${row + 1} 行，第 ${column + 1} 列`, `Row ${row + 1}, column ${column + 1}`));
        input.value = grid[row][column];
        tableRow.insertCell().append(input);
      }
    }
  }

  function loadTable(cells, startRow = 0, startColumn = 0) {
    const width = cells.reduce((largest, row) => Math.max(largest, row.length), 0);
    const empty = !grid.some(row => row.some(Boolean));
    const rowCount = empty ? cells.length : Math.max(Number(rows.value), startRow + cells.length);
    const columnCount = empty ? width : Math.max(Number(columns.value), startColumn + width);
    if (!width || rowCount > maxRows || columnCount > maxColumns || rowCount * columnCount > maxCells ||
        cells.some(row => row.some(cell => cell.length > maxCellLength))) {
      showError(t("表格超出 120 行、64 列、3200 格或单格 2000 字的限制。", "The paste exceeds 120 rows, 64 columns, 3,200 cells, or 2,000 characters per cell."));
      return;
    }
    cells.forEach((row, y) => row.forEach((cell, x) => { grid[(empty ? 0 : startRow) + y][(empty ? 0 : startColumn) + x] = cell; }));
    rows.value = rowCount;
    columns.value = columnCount;
    showError("");
    refreshGrid();
    body.rows[empty ? 0 : startRow].cells[empty ? 0 : startColumn].firstChild.focus();
  }

  function refreshChart(reset = false) {
    const cells = (readTable({ text: chart.value }, true) || []).slice(0, maxRows + 1);
    const width = Math.min(maxColumns, Math.max(0, ...cells.map(row => row.length)));
    if (reset && cells.length) {
      header.checked = cells.length > 1 && !cells[0].some(value => parseChartValue(value)) &&
        cells.slice(1).some(row => row.some(value => parseChartValue(value)));
    }
    const firstRow = header.checked ? cells[0] : [];
    const content = header.checked ? cells.slice(1) : cells;
    const scores = Array.from({ length: width }, (_, index) => content.filter(row => parseChartValue(row[index])).length);
    const valueIndex = values.value;
    const labelIndex = labels.value;
    const suggested = scores.indexOf(Math.max(...scores));
    labels.replaceChildren(new Option(t("按顺序编号", "Row number"), "-1"));
    values.replaceChildren();
    for (let index = 0; index < width; index++) {
      const name = firstRow?.[index] || t(`第 ${index + 1} 列`, `Column ${index + 1}`);
      labels.add(new Option(name, index));
      values.add(new Option(name, index));
    }
    values.value = reset || valueIndex === "" || Number(valueIndex) >= width ? String(suggested) : valueIndex;
    labels.value = reset || !labelIndex || Number(labelIndex) >= width
      ? String(width > 1 ? (Number(values.value) === 0 ? 1 : 0) : -1) : labelIndex;
    const parsed = content.map((row, index) => ({
      label: row[Number(labels.value)]?.trim() || String(index + 1), number: parseChartValue(row[Number(values.value)]),
    })).filter(point => point.number);
    query("[data-chart-range]").hidden = !parsed.some(point => point.number.range);
    data = parsed.map(({ label, number }) => ({
      label, value: range.value === "mid" ? (number.low + number.high) / 2 : number[range.value],
    }));
    const title = firstRow?.[Number(values.value)]?.trim() || "";
    geometry = data.length ? chartGeometry(data, type.value, title) : null;
    const dropped = content.length - data.length;
    status.textContent = data.length
      ? t(`${data.length} 项数据${dropped ? `，已跳过 ${dropped} 行非数值或空白` : ""}`, `${data.length} values${dropped ? `, ${dropped} blank or nonnumeric rows skipped` : ""}`)
      : t("粘贴数据并选择包含数字或范围的列。", "Paste data and choose a column with numbers or ranges.");
    preview.hidden = !geometry;
    submit.disabled = !geometry || inserting;
    native.hidden = !(data.length > 1 && data.every(point => point.value >= 0) && data.some(point => point.value > 0));
    if (geometry) {
      const current = geometry;
      drawPreview(preview, current);
      document.fonts.ready.then(() => {
        if (dialog.open && geometry === current) drawPreview(preview, current);
      });
    }
  }

  dialog.addEventListener("input", event => {
    if (event.target.dataset.cell) {
      const [row, column] = event.target.dataset.cell.split(":").map(Number);
      grid[row][column] = event.target.value;
    }
    if (event.target === chart) refreshChart(!values.options.length);
  });
  dialog.addEventListener("paste", event => {
    const cells = readTable(clipboardData(event.clipboardData));
    if (!cells) return;
    event.preventDefault();
    if (mode === "chart") {
      chart.value = asTSV(cells);
      refreshChart(true);
    } else {
      const [row, column] = (event.target.dataset.cell || "0:0").split(":").map(Number);
      loadTable(cells, row, column);
    }
  });
  rows.addEventListener("change", refreshGrid);
  columns.addEventListener("change", refreshGrid);
  for (const field of [labels, values, header, type, range]) field.addEventListener("change", () => refreshChart());
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.addEventListener("click", async event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "close") dialog.close();
    if (action === "paste") {
      try {
        let cells;
        if (navigator.clipboard?.read) {
          const items = await navigator.clipboard.read();
          const rich = items.find(item => item.types.includes("text/html"));
          const plain = items.find(item => item.types.includes("text/plain"));
          cells = readTable({
            html: rich ? await (await rich.getType("text/html")).text() : "",
            text: plain ? await (await plain.getType("text/plain")).text() : "",
          });
        } else {
          cells = readTable({ text: await navigator.clipboard.readText() });
        }
        if (!cells) throw new Error("Clipboard does not contain a table");
        if (dialog.open) loadTable(cells);
      } catch {
        if (dialog.open) showError(t("请先复制完整表格，再在此窗口按 Ctrl+V。", "Copy the full table, then press Ctrl+V in this window."));
      }
    }
    if (action === "table" || action === "chart") {
      mode = action;
      for (const panel of dialog.querySelectorAll("[data-panel]")) panel.hidden = panel.dataset.panel !== mode;
      for (const button of dialog.querySelectorAll(".icn-diagram-modes [aria-pressed]")) {
        button.setAttribute("aria-pressed", String(button.dataset.action === mode));
      }
      submit.textContent = mode === "table" ? t("插入表格", "Insert table") : t("插入图表", "Insert chart");
      showError("");
      if (mode === "chart") {
        if (!chart.value && grid.some(row => row.some(Boolean))) {
          chart.value = asTSV(grid.slice(0, Number(rows.value)).map(row => row.slice(0, Number(columns.value))));
          refreshChart(true);
        } else refreshChart();
        chart.focus();
      } else {
        submit.disabled = false;
        native.hidden = true;
      }
    }
    if (action === "mermaid") {
      dialog.close();
      api.updateScene({ appState: { openDialog: { name: "ttd", tab: "mermaid" } } });
    }
    if (action === "native" && geometry) {
      dialog.close();
      api.updateScene({ appState: { pasteDialog: { shown: true, data: {
        title: geometry.title, labels: data.map(point => point.label), values: data.map(point => point.value),
      } } } });
    }
    if (action === "insert" && !inserting && (mode === "table" || geometry)) {
      inserting = true;
      submit.disabled = true;
      const chartToInsert = mode === "chart" ? geometry : null;
      const cells = grid.slice(0, Number(rows.value)).map(row => row.slice(0, Number(columns.value)));
      try {
        await document.fonts.ready;
        if (!dialog.open) return;
        const output = chartToInsert ? chartElements(chartToInsert) : tableElements(cells);
        insertElements(api, output.elements, output.width, output.height, convert, capture);
        dialog.close();
      } catch {
        showError(t("插入失败，请检查数据后重试。", "Insertion failed. Check the data and try again."));
      } finally {
        inserting = false;
        submit.disabled = false;
      }
    }
  });
  refreshGrid();
  document.body.append(dialog);
  dialog.showModal();
  if (initialCells) loadTable(initialCells);
  else body.querySelector("textarea").focus();
}
