const maximumRows = 24;
const maximumColumns = 12;
const maximumCellLength = 160;

function element(tag, text, properties) {
  const node = Object.assign(document.createElement(tag), properties);
  if (text != null) node.textContent = text;
  return node;
}

function tableElements(rows, header, appState) {
  const fontSize = 16;
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `${fontSize}px Arial`;
  const widths = rows[0].map((_, column) =>
    Math.ceil(Math.max(112, ...rows.map(row => measure.measureText(row[column]).width + 28))));
  const height = 44;
  const width = widths.reduce((sum, cell) => sum + cell, 0);
  const zoom = appState.zoom?.value || 1;
  const originX = (appState.width || window.innerWidth) / (2 * zoom) - appState.scrollX - width / 2;
  const originY = (appState.height || window.innerHeight) / (2 * zoom) - appState.scrollY - rows.length * height / 2;
  const group = crypto.randomUUID();
  return rows.flatMap((row, y) => {
    let left = originX;
    return row.map((value, x) => {
      const cell = {
        type: "rectangle", x: left, y: originY + y * height, width: widths[x], height,
        groupIds: [group], roughness: 0, strokeWidth: 1, strokeColor: "#9794b4",
        backgroundColor: header && y === 0 ? "#e7e4f8" : y % 2 ? "#ffffff" : "#f8f7fc",
        fillStyle: "solid", roundness: null,
        ...(value && { label: { text: value, fontFamily: 2, fontSize, textAlign: "center", verticalAlign: "middle", strokeColor: "#27233e" } }),
      };
      left += widths[x];
      return cell;
    });
  });
}

function chartData(rows, header) {
  const body = (header ? rows.slice(1) : rows).filter(row => row.some(value => value.trim()));
  if (!body.length || body.some(row => row.length < 2 || !row[1].trim() ||
      !Number.isFinite(Number(row[1])) || row.slice(2).some(value => value.trim()))) return null;
  return {
    title: header ? rows[0][1]?.trim() || null : null,
    labels: body.map((row, index) => row[0].trim() || String(index + 1)),
    values: body.map(row => Number(row[1])),
  };
}

export function openDiagramEditor({ api, zh, convert, capture }) {
  if (!api || document.querySelector(".icn-diagram-editor")) return;
  const t = (cn, en) => zh ? cn : en;
  const previouslyFocused = document.activeElement;
  const dialog = element("dialog", null, { className: "icn-diagram-editor" });
  dialog.setAttribute("aria-labelledby", "icn-diagram-title");
  const bar = element("header");
  const title = element("h2", t("编辑器", "Editor"), { id: "icn-diagram-title" });
  const close = element("button", "×", { type: "button", className: "icn-editor-close" });
  close.setAttribute("aria-label", t("关闭编辑器", "Close editor"));
  bar.append(title, close);

  const tools = element("div", null, { className: "icn-editor-tools" });
  const action = (label, run, primary = false) => {
    const button = element("button", label, { type: "button" });
    if (primary) button.className = "icn-editor-primary";
    button.addEventListener("click", run);
    return button;
  };
  const tableMode = action(t("表格", "Table"), () => setMode("table"));
  const chartMode = action(t("数据图表", "Charts"), () => setMode("chart"));
  const mermaid = action(t("Mermaid 图示", "Mermaid diagram"), () => {
    if (!canInsert()) return;
    dismiss();
    api.updateScene({ appState: { openDialog: { name: "ttd", tab: "mermaid" } }, captureUpdate: capture.NEVER });
  });
  tools.append(tableMode, chartMode, mermaid);

  const controls = element("div", null, { className: "icn-editor-tools" });
  const rowCount = element("input", null, { type: "number", min: "1", max: String(maximumRows), value: "5" });
  const columnCount = element("input", null, { type: "number", min: "1", max: String(maximumColumns), value: "4" });
  const header = element("input", null, { type: "checkbox", checked: true });
  const label = (text, input) => {
    const result = element("label", text);
    result.append(input);
    return result;
  };
  const columnLabel = label(t("列数", "Columns"), columnCount);
  controls.append(label(t("行数", "Rows"), rowCount), columnLabel, label(t("首行为表头", "First row is a header"), header));
  const help = element("p", null, { className: "icn-editor-help" });
  const viewport = element("div", null, { className: "icn-editor-grid" });
  const feedback = element("p", null, { className: "icn-editor-error" });
  feedback.setAttribute("role", "alert");
  const footer = element("footer");
  const apply = action("", insert, true);
  footer.append(action(t("取消", "Cancel"), dismiss), apply);
  dialog.append(bar, tools, controls, help, viewport, feedback, footer);

  let mode = "table";
  let rows = Array.from({ length: 5 }, () => Array(4).fill(""));
  let tableDraft = rows;
  let chartDraft = Array.from({ length: 5 }, () => ["", ""]);

  function dismiss() {
    dialog.close();
    dialog.remove();
    previouslyFocused?.focus?.();
  }
  dialog.addEventListener("cancel", event => { event.preventDefault(); dismiss(); });
  close.addEventListener("click", dismiss);

  function resize(height, width) {
    rows = Array.from({ length: height }, (_, row) =>
      Array.from({ length: width }, (_, column) => rows[row]?.[column] ?? ""));
    render();
  }

  function setMode(next) {
    if (next !== mode) {
      if (mode === "table") tableDraft = rows;
      else chartDraft = rows;
      rows = next === "table" ? tableDraft : chartDraft;
      mode = next;
    }
    tableMode.setAttribute("aria-pressed", String(mode === "table"));
    chartMode.setAttribute("aria-pressed", String(mode === "chart"));
    columnLabel.hidden = mode === "chart";
    help.textContent = mode === "table"
      ? t("点选单元格输入，或从表格软件复制数据粘贴。", "Type in a cell or paste data copied from a spreadsheet.")
      : t("左列填类别，右列填数值。继续后可选柱状图或折线图。", "Enter labels on the left and numbers on the right, then choose a bar or line chart.");
    apply.textContent = mode === "table" ? t("插入画布", "Insert into canvas") : t("预览图表", "Preview charts");
    render();
  }

  function render() {
    rowCount.value = rows.length;
    columnCount.value = rows[0].length;
    feedback.textContent = "";
    const table = element("table");
    const tbody = element("tbody");
    rows.forEach((row, y) => {
      const tr = element("tr", null, { className: y === 0 && header.checked ? "icn-editor-head" : "" });
      row.forEach((value, x) => {
        const input = element("input", null, { type: "text", value, maxLength: maximumCellLength });
        input.setAttribute("aria-label", t(`第 ${y + 1} 行第 ${x + 1} 列`, `Row ${y + 1}, column ${x + 1}`));
        if (mode === "chart" && x === 1 && !(y === 0 && header.checked)) input.inputMode = "decimal";
        input.addEventListener("input", () => { rows[y][x] = input.value; feedback.textContent = ""; });
        input.addEventListener("paste", event => paste(event, y, x));
        const td = element("td");
        td.append(input);
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody);
    viewport.replaceChildren(table);
  }

  function paste(event, y, x) {
    const text = event.clipboardData?.getData("text/plain").replace(/\r\n?/g, "\n").replace(/\n$/, "");
    if (!text || !/[\t\n]/.test(text)) return;
    event.preventDefault();
    const columns = mode === "chart" ? 2 : maximumColumns;
    const values = text.split("\n", maximumRows - y).map(row => row.split("\t", columns - x));
    const height = Math.max(rows.length, y + values.length);
    const width = Math.max(rows[0].length, x + Math.max(...values.map(row => row.length)));
    rows = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, column) =>
      values[row - y]?.[column - x]?.slice(0, maximumCellLength) ?? rows[row]?.[column] ?? ""));
    render();
    viewport.querySelectorAll("tr")[y].querySelectorAll("input")[x].focus();
  }

  function canInsert() {
    if (!api.getAppState().viewModeEnabled) return true;
    feedback.textContent = t("请退出只读模式后插入。", "Exit view mode to insert.");
    return false;
  }

  function insert() {
    if (!canInsert()) return;
    if (mode === "chart") {
      const data = chartData(rows, header.checked);
      if (!data) {
        feedback.textContent = t("请至少填写一行数据，右列必须是有效数字。", "Enter at least one row with a valid number in the right column.");
        return;
      }
      dismiss();
      api.updateScene({ appState: { pasteDialog: { shown: true, data } }, captureUpdate: capture.NEVER });
      return;
    }
    const elements = convert(tableElements(rows, header.checked, api.getAppState()));
    api.setActiveTool({ type: "selection" });
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
      appState: { selectedElementIds: Object.fromEntries(elements.map(item => [item.id, true])) },
      captureUpdate: capture.IMMEDIATELY,
    });
    dismiss();
  }

  const count = (field, fallback) => Math.min(Number(field.max), Math.max(1, Math.trunc(field.valueAsNumber || fallback)));
  rowCount.addEventListener("change", () => resize(count(rowCount, rows.length), rows[0].length));
  columnCount.addEventListener("change", () => resize(rows.length, count(columnCount, rows[0].length)));
  header.addEventListener("change", render);
  setMode("table");
  document.body.append(dialog);
  dialog.showModal();
  viewport.querySelector("input").focus();
}
