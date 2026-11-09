import React, { useState } from "react";
import { solarPosition } from "./model-study.js";

const places = [
  ["上海",31.2304,121.4737,8], ["北京",39.9042,116.4074,8], ["广州",23.1291,113.2644,8],
  ["深圳",22.5431,114.0579,8], ["杭州",30.2741,120.1551,8], ["成都",30.5728,104.0668,8],
  ["南京",32.0603,118.7969,8], ["香港",22.3193,114.1694,8], ["新加坡",1.3521,103.8198,8],
  ["东京",35.6762,139.6503,9], ["伦敦",51.5072,-0.1276,0], ["纽约",40.7128,-74.006,-5],
  ["悉尼",-33.8688,151.2093,10], ["古晋",1.5533,110.3592,8],
];
function Dial({ label, value, onChange, altitude, image }) {
  const radians = value * Math.PI / 180;
  const cx = altitude ? 18 : 50, cy = altitude ? 78 : 50, radius = altitude ? 55 : 32;
  const x = cx + radius * (altitude ? Math.cos(radians) : Math.sin(radians));
  const y = cy - radius * (altitude ? Math.sin(radians) : Math.cos(radians));
  function update(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - box.left) * 100 / box.width - cx;
    const dy = (event.clientY - box.top) * 100 / box.height - cy;
    const angle = altitude ? Math.max(-10, Math.min(90, Math.atan2(-dy, Math.max(0, dx)) * 180 / Math.PI))
      : (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    onChange(Math.round(angle * 10) / 10);
  }
  return <svg className="model-dial" viewBox="0 0 100 100" aria-label={label}
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event); }}>
    {image && <image href={image} x="11" y="11" width="78" height="78" transform={`rotate(${-value} 50 50)`} />}
    {altitude ? <path d="M18 23 A55 55 0 0 1 73 78 H18 Z" /> : <><circle cx="50" cy="50" r="38" /><text x="50" y="10" textAnchor="middle">N</text></>}
    <line x1={cx} y1={cy} x2={x} y2={y} /><circle className="dial-handle" cx={x} cy={y} r="5" />
  </svg>;
}

export default function ModelStudyControls({ panel, study, groups, change, zh, shadows, setShadows, northImage }) {
  const [northOpen, setNorthOpen] = useState(false);
  const t = (a, b) => zh ? a : b;
  const { sun, section, visibility } = study;
  const setSun = patch => change({ ...study, sun: { ...sun, ...patch } });
  const setSection = patch => change({ ...study, section: { ...section, ...patch } });
  const number = (label, key, min, max, step = 1) => <label>{label}
    <input type="number" min={min} max={max} step={step} value={sun[key]}
      onChange={event => { if (Number.isFinite(event.target.valueAsNumber)) setSun({ [key]: event.target.valueAsNumber }); }} />
  </label>;
  if (panel === "sun") {
    const position = solarPosition(sun);
    const year = Number(sun.date.slice(0, 4));
    const yearStart = Date.UTC(year, 0, 1);
    const dayOfYear = (Date.parse(sun.date) - yearStart) / 864e5;
    const lastDay = (Date.UTC(year + 1, 0, 1) - yearStart) / 864e5 - 1;
    const minutes = sun.time.split(":").reduce((a, b) => a * 60 + Number(b), 0);
    const setMinutes = value => setSun({ time: [Math.floor(value / 60), value % 60].map(n => String(n).padStart(2, "0")).join(":") });
    const angle = (label, key, min, max, altitude = false, image) => <div className="model-angle">
      <Dial label={label} value={sun[key]} onChange={value => setSun({ [key]: value })} altitude={altitude} image={image} />
      {number(label, key, min, max, 0.1)}
      <input type="range" aria-label={label} min={min} max={max} step="0.1" value={sun[key]}
        onChange={event => setSun({ [key]: event.target.valueAsNumber })} />
    </div>;
    return <section className="model-study-panel" aria-label={t("日照设置", "Sun settings")}>
      <div className="model-study-fields">
        <label className="model-study-check"><input type="checkbox" checked={shadows}
          onChange={event => setShadows(event.target.checked)} />{t("显示投影阴影", "Show cast shadows")}</label>
        <div className="model-settings-tabs">
          {[["manual", t("手动", "Manual")], ["location", t("地点", "Location")]].map(([mode, label]) =>
            <button type="button" key={mode} aria-pressed={sun.mode === mode} onClick={() => setSun({ mode })}>{label}</button>)}
        </div>
        {sun.mode === "manual" ? <div className="model-sun-dials">
          {angle(t("方位角 (°)", "Azimuth (°)"), "azimuth", 0, 360)}
          {angle(t("高度角 (°)", "Elevation (°)"), "altitude", -10, 90, true)}
        </div> : <>
          <label>{t("地点预设", "Location preset")}<select value="" onChange={event => {
            if (event.target.value === "") return;
            const [,lat,lon,utc] = places[Number(event.target.value)];
            setSun({ lat, lon, utc });
          }}><option value="">{t("选择城市或输入坐标", "Choose a city or enter coordinates")}</option>
          {places.map(([name], index) => <option key={name} value={index}>{name}</option>)}</select></label>
          {number(t("纬度 (°)", "Latitude (°)"), "lat", -90, 90, 0.0001)}
          {number(t("经度 (°)", "Longitude (°)"), "lon", -180, 180, 0.0001)}
          {number(t("UTC 时差 (小时)", "UTC offset (hours)"), "utc", -14, 14, 0.25)}
          <label>{t("日期", "Date")}<input type="date" min="1900-01-01" max="2100-12-31" value={sun.date}
            onChange={event => { if (event.target.validity.valid && event.target.value) setSun({ date: event.target.value }); }} /></label>
          <input type="range" aria-label={t("日期滑轨", "Date slider")} min="0" max={lastDay} value={dayOfYear}
            onChange={event => setSun({ date: new Date(yearStart + event.target.valueAsNumber * 864e5).toISOString().slice(0, 10) })} />
          <label>{t("当地时间", "Local time")}<input type="time" value={sun.time}
            onChange={event => { if (event.target.value) setSun({ time: event.target.value }); }} /></label>
          <input type="range" aria-label={t("当地时间滑轨", "Local time slider")} min="0" max="1439" value={minutes}
            onChange={event => setMinutes(event.target.valueAsNumber)} />
        </>}
        <button type="button" aria-expanded={northOpen} onClick={() => setNorthOpen(!northOpen)}>{t("设置北向", "Set north")} · {sun.north}°</button>
        {northOpen && angle(t("北向旋转 (°)", "North rotation (°)"), "north", 0, 360, false, northImage)}
      </div>
      <div className="model-study-note">
        {t("北向 0° 指向模型 −Z，顺时针为正。", "North 0° is model −Z; clockwise is positive.")}
        {" · "}{t("方位", "Azimuth")} {position.azimuth.toFixed(1)}° · {t("高度", "Elevation")} {position.altitude.toFixed(1)}°
        {position.altitude <= 0 ? t(" · 太阳在地平线下", " · Sun below the horizon") : ""}
      </div>
    </section>;
  }
  if (panel === "section") return <section className="model-study-panel model-study-fields" aria-label={t("剖切设置", "Section settings")}>
    <label className="model-study-check"><input type="checkbox" checked={section.enabled}
      onChange={event => setSection({ enabled: event.target.checked })} />{t("启用剖切", "Enable section")}</label>
    <label>{t("剖切方向", "Section axis")}<select value={section.axis} onChange={event => setSection({ axis: event.target.value })}>
      <option value="y">{t("Y · 水平切", "Y · Horizontal")}</option>
      <option value="x">{t("X · 垂直切", "X · Vertical")}</option>
      <option value="z">{t("Z · 垂直切", "Z · Vertical")}</option>
    </select></label>
    <label>{t("剖切位置", "Section position")} {section.position}%<input type="range" min="0" max="100"
      value={section.position} onChange={event => setSection({ position: event.target.valueAsNumber })} /></label>
    <label className="model-study-check"><input type="checkbox" checked={section.reverse}
      onChange={event => setSection({ reverse: event.target.checked })} />{t("反向保留", "Reverse side")}</label>
  </section>;
  if (panel === "groups") return <section className="model-study-panel" aria-label={t("模型分组显隐", "Model group visibility")}>
    <div className="model-study-group-actions">
      <button type="button" onClick={() => change({ ...study, visibility: Object.fromEntries(groups.map(group => [group.id, true])) })}>
        {t("全部显示", "Show all")}
      </button>
      <button type="button" onClick={() => change({ ...study, visibility: {} })}>{t("恢复模型显隐", "Restore source visibility")}</button>
    </div>
    <div className="model-study-groups">
      {groups.map((group, index) => <label key={group.id} title={group.name}>
        <input type="checkbox" checked={visibility[group.id] ?? group.visible}
          onChange={event => change({ ...study, visibility: { ...visibility, [group.id]: event.target.checked } })} />
        <span>{group.name || (t("分组", "Group") + " " + (index + 1))}</span>
      </label>)}
      {!groups.length && <span>{t("此模型没有可切换的分组。", "This model has no groups to toggle.")}</span>}
    </div>
  </section>;
  return null;
}
