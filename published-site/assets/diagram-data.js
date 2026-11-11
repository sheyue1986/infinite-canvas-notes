export const handwriting = 5;
export const handwritingCSS = "Excalifont, Xiaolai, sans-serif";
const number = "[+-]?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const unit = "(?:[%°℃\\p{L}]+[\\p{L}\\d%°℃/·]*)?";
const numberWithUnit = new RegExp(`^[$¥€£]?\\s*(${number})\\s*${unit}$`, "u");
const rangeWithUnit = new RegExp(`^(${number})\\s*(?:-|–|—|~|至)\\s*(${number})\\s*${unit}$`, "u");

function readDelimited(text, delimiter) {
  const rows = [[]];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"' && (quoted || field === "")) {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === delimiter || character === "\n")) {
      rows.at(-1).push(field);
      field = "";
      if (character === "\n") rows.push([]);
    } else {
      field += character;
    }
  }
  rows.at(-1).push(field);
  while (rows.length > 1 && rows.at(-1).every(value => !value.trim())) rows.pop();
  return rows;
}

function tableFromHTML(html) {
  if (!html || !/<table[\s>]/i.test(html)) return null;
  const template = document.createElement("template");
  template.innerHTML = html;
  const table = template.content.querySelector("table");
  if (!table?.rows.length) return null;
  const rows = Array.from({ length: table.rows.length }, () => []);
  for (const [index, row] of [...table.rows].entries()) {
    let column = 0;
    for (const cell of row.cells) {
      while (rows[index][column] !== undefined) column++;
      const colSpan = Math.min(cell.colSpan, 65);
      const rowSpan = Math.min(cell.rowSpan || rows.length - index, rows.length - index);
      cell.querySelectorAll("script, style").forEach(node => node.remove());
      cell.querySelectorAll("br").forEach(node => node.replaceWith("\n"));
      rows[index][column] = cell.textContent.trim();
      for (let dy = 0; dy < rowSpan; dy++) {
        for (let dx = 0; dx < colSpan; dx++) rows[index + dy][column + dx] ??= "";
      }
      column += colSpan;
    }
  }
  return rows;
}

export function readTable({ text = "", html = "" }, allowValues = false) {
  const rich = tableFromHTML(html);
  if (rich) return rich;
  const plain = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!plain || /^\s*(?:```|graph\s|flowchart\s|sequenceDiagram\b|classDiagram\b|stateDiagram\b|erDiagram\b|gantt\b|pie\b)/i.test(plain)) return null;
  const lines = plain.split("\n");
  if (lines.length > 1 && /^\s*\|/.test(lines[0]) && /^\s*\|?\s*:?-{2,}/.test(lines[1])) {
    return [lines[0], ...lines.slice(2)].map(line => line.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim()));
  }
  if (plain.includes("\t")) return readDelimited(plain, "\t");
  const csv = readDelimited(plain, ",");
  if (allowValues || (csv.length > 1 && csv[0].length > 1 && csv.every(row => row.length === csv[0].length))) return csv;
  return null;
}

export function parseChartValue(text) {
  const input = (text || "").normalize("NFKC").trim().replace(/−/g, "-");
  const range = input.match(rangeWithUnit);
  const single = input.match(numberWithUnit);
  if (!range && !single) return null;
  const values = (range ? range.slice(1, 3) : [single[1]]).map(value => Number(value.replaceAll(",", "")));
  if (values.some(value => !Number.isFinite(value) || Math.abs(value) > 1e15)) return null;
  return { low: Math.min(...values), high: Math.max(...values), range: Boolean(range) };
}

export function chartGeometry(data, type, title) {
  const width = Math.max(460, data.length * 64 + 90);
  const height = 330;
  const left = 84;
  const right = width - 24;
  const top = 57;
  const bottom = 246;
  const min = Math.min(0, ...data.map(item => item.value));
  const max = Math.max(0, ...data.map(item => item.value)) || (min === 0 ? 1 : 0);
  const y = value => bottom - ((value - min) / (max - min)) * (bottom - top);
  const step = (right - left) / data.length;
  const points = data.map((item, index) => ({ ...item, x: left + step * (index + 0.5), y: y(item.value) }));
  const marks = [...new Set(Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4).concat(0))].sort((a, b) => a - b);
  return { width, height, left, right, top, bottom, zero: y(0), marks: marks.map(value => ({ value, y: y(value) })), points, step, type, title };
}
