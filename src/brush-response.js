export const brushDynamics = [
  ["pressure", "压感", "Pressure"],
  ["speed", "速度变细", "Thin with speed"],
  ["inverse", "速度变粗", "Thicken with speed"],
  ["fixed", "固定宽度", "Fixed width"],
];

export const responseControls = {
  responseStrength: { min: 0, max: 100, value: 100, unit: "%", zh: "响应幅度", en: "Response strength" },
  responseCurve: { min: -100, max: 100, value: 0, unit: "", zh: "曲线弯度", en: "Response curvature" },
};

export const tipControls = {
  spacing: { min: 5, max: 120, unit: "%", zh: "笔尖间距", en: "Tip spacing" },
  scatter: { min: 0, max: 100, value: 0, unit: "%", zh: "散布", en: "Scatter" },
  rotation: { min: -180, max: 180, value: 0, unit: "°", zh: "旋转偏移", en: "Rotation offset" },
  flow: { min: 0, max: 100, value: 100, unit: "%", zh: "单次着色量", en: "Tip flow" },
};

export function brushControlValue(profile, key) {
  const { min, max, value } = responseControls[key] || tipControls[key];
  if (Number.isFinite(profile[key])) return Math.min(max, Math.max(min, profile[key]));
  return value ?? (profile.engine === "water" ? 14 : 20);
}

export function brushResponse(input, profile) {
  const bounded = Number.isFinite(input) ? Math.min(1, Math.max(0, input)) : .5;
  const exponent = 2 ** (brushControlValue(profile, "responseCurve") / 50);
  return .5 + (bounded ** exponent - .5) * brushControlValue(profile, "responseStrength") / 100;
}

export function speedPressure(distance, width, dynamics) {
  const normalized = Math.min(.72, distance / Math.max(8, width * 8));
  return dynamics === "speed" ? .82 - normalized : .23 + normalized;
}

export function vectorBrushStroke(points, pressures, profile, pointerType, width, end = points.at(-1)) {
  const amount = (profile.smoothing ?? 25) / 100;
  const straight = amount === 1 && points.length > 1;
  const shaped = straight ? [points[0], end] : points.map(([x, y], index) => {
    if (!index || index === points.length - 1 || !amount) return [x, y];
    const [ax, ay] = points[index - 1], [bx, by] = points[index + 1];
    return [x + ((ax + bx) / 2 - x) * amount, y + ((ay + by) / 2 - y) * amount];
  });
  const dynamics = profile.dynamics || "pressure";
  if (dynamics === "fixed" || dynamics === "pressure" && pointerType === "mouse") {
    return { points: shaped, pressures: shaped.map(() => .5), simulatePressure: false };
  }
  if (dynamics === "speed" || dynamics === "inverse") {
    return { points: shaped, simulatePressure: false, pressures: shaped.map(([x, y], index) => {
      const previous = shaped[index - 1];
      return brushResponse(speedPressure(previous ? Math.hypot(x - previous[0], y - previous[1]) : 0, width, dynamics), profile);
    }) };
  }
  const input = straight && pressures.length ? [pressures[0], pressures.at(-1)] : pressures;
  return { points: shaped, pressures: input.map(value => brushResponse(value, profile)) };
}
