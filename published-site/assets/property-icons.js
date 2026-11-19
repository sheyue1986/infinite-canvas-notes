const paths = {
  solid: "M3 10h14", dashed: "M2 10h4m3 0h4m3 0h2", dotted: "M3 10h.1m4 0h.1m4 0h.1m4 0h.1",
  precise: "M2 14 7 7l5 5 6-7", hand: "M2 14c3-10 9-11 6-3s5-5 10-5",
  sketch: "M2 14c6-14 5-6 4-2s7-12 6-4-1 8 6-4M4 16l10-9",
  sharp: "M4 16V4h12", round: "M4 16V9a5 5 0 0 1 5-5h7",
  fill: "M4 3h13v14H3V4m0 9L13 3m-8 14L17 5m-4 12 4-4",
  hatch: "M3 6l3-3M3 12l9-9M3 18 18 3m-6 15 3-3",
  cross: "M3 6l3-3M3 12l9-9M3 18 15 3M3 14l3 3M3 8l9 9M3 2l15 15",
  zigzag: "m2 5 3 5 3-5 3 5 3-5 3 5m-15 3 3 5 3-5 3 5 3-5 3 5",
  straightArrow: "M3 17 17 3m-7 0h7v7", curvedArrow: "M3 17V9a6 6 0 0 1 6-6h8m-4-3 4 3-4 4",
  elbowArrow: "M3 17V9h14V3m-4 4 4-4 3 4", none: "M3 10h14",
  arrow: "M3 10h14m-5-5 5 5-5 5", triangle: "M3 10h8m0-5 7 5-7 5z",
  circle: "M3 10h7m8 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  diamond: "M2 10h6m0 0 5-5 5 5-5 5z", bar: "M3 10h13m0-5v10",
  crow: "M2 10h16m-5-5-5 5 5 5", font: "m3 16 5-12 5 12M5 12h6m4-4h3m-1-3v11",
  left: "M3 4h14M3 8h9M3 12h14M3 16h9", center: "M3 4h14M6 8h8M3 12h14M6 16h8",
  right: "M3 4h14M8 8h9M3 12h14M8 16h9", top: "M3 3h14m-7 14V6m-3 3 3-3 3 3",
  middle: "M3 10h14m-7-8v5m-2-2 2 2 2-2m-2 13v-5m-2 2 2-2 2 2",
  bottom: "M3 17h14m-7-14v11m-3-3 3 3 3-3",
};

export function propertyOptionIcon(h, field, value) {
  let name = value;
  if (field === "roughness") name = ["precise","hand","sketch"][value];
  if (field === "fillStyle") name = ({solid:"fill",hachure:"hatch","cross-hatch":"cross",zigzag:"zigzag"})[value];
  if (field === "arrowType") name = ({sharp:"straightArrow",round:"curvedArrow",elbow:"elbowArrow"})[value];
  if (/Arrowhead$/.test(field)) name = value == null ? "none" : value.split("_")[0];
  if (field === "fontFamily") name = "font";
  return h("svg", {viewBox:"0 0 20 20",width:24,height:24,fill:"none",stroke:"currentColor",strokeWidth:1.5,
    strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true},
    h("path",{d:paths[name] || paths.crow}));
}
