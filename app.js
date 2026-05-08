let data = [];
const coverCache = new Map();

const tinySampleXml = `<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
  <anime>
    <series_animedb_id>30831</series_animedb_id>
    <series_title><![CDATA[Kono Subarashii Sekai ni Shukufuku wo!]]></series_title>
    <series_type>TV</series_type>
    <series_episodes>10</series_episodes>
    <my_watched_episodes>10</my_watched_episodes>
    <my_start_date>2019-10-01</my_start_date>
    <my_finish_date>2019-10-09</my_finish_date>
    <my_score>10</my_score>
    <my_status>Completed</my_status>
  </anime>
  <anime>
    <series_animedb_id>34599</series_animedb_id>
    <series_title><![CDATA[Made in Abyss]]></series_title>
    <series_type>TV</series_type>
    <series_episodes>13</series_episodes>
    <my_watched_episodes>13</my_watched_episodes>
    <my_start_date>2020-01-01</my_start_date>
    <my_finish_date>2020-01-15</my_finish_date>
    <my_score>10</my_score>
    <my_status>Completed</my_status>
  </anime>
  <anime>
    <series_animedb_id>42897</series_animedb_id>
    <series_title><![CDATA[Horimiya]]></series_title>
    <series_type>TV</series_type>
    <series_episodes>13</series_episodes>
    <my_watched_episodes>13</my_watched_episodes>
    <my_start_date>2021-04-01</my_start_date>
    <my_finish_date>2021-04-15</my_finish_date>
    <my_score>9</my_score>
    <my_status>Completed</my_status>
  </anime>
</myanimelist>`;

document.getElementById("xmlInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  loadXml(text);
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  loadXml(tinySampleXml);
});

function resetApp() {
  data = [];
  coverCache.clear();
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("uploadHero").classList.remove("hidden");
  document.getElementById("timeline").innerHTML = "";
  document.getElementById("year").innerHTML = `<option value="">All years</option>`;
  document.getElementById("xmlInput").value = "";
}

function showError(message) {
  const box = document.getElementById("errorBox");
  box.textContent = message;
  box.classList.remove("hidden");
}

function clearError() {
  const box = document.getElementById("errorBox");
  box.textContent = "";
  box.classList.add("hidden");
}

function textOf(parent, tagName) {
  return parent.getElementsByTagName(tagName)[0]?.textContent?.trim() || "";
}

function normalizeMalDate(dateValue) {
  if (!dateValue || dateValue === "0000-00-00") return null;
  const parts = dateValue.split("-");
  let dateQuality = "exact";

  if (parts.length === 3) {
    if (parts[1] === "00") {
      parts[1] = "01";
      dateQuality = "year-only";
    }
    if (parts[2] === "00") {
      parts[2] = "01";
      dateQuality = dateQuality === "year-only" ? "year-only" : "month-only";
    }
  }

  const normalized = parts.join("-");
  const date = new Date(normalized + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  return { date, dateQuality };
}

function loadXml(xmlText) {
  clearError();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parseError = doc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    showError("Could not parse this XML file. Make sure it is a MAL anime list export.");
    return;
  }

  const animeNodes = [...doc.getElementsByTagName("anime")];
  const parsed = [];

  for (const anime of animeNodes) {
    const title = textOf(anime, "series_title");
    const malId = textOf(anime, "series_animedb_id");
    const scoreRaw = Number(textOf(anime, "my_score") || 0);
    const status = textOf(anime, "my_status");
    const type = textOf(anime, "series_type");
    const episodes = textOf(anime, "series_episodes");
    const watched = textOf(anime, "my_watched_episodes");
    const startDate = textOf(anime, "my_start_date");
    const finishDate = textOf(anime, "my_finish_date");

    const dateUsed = finishDate && finishDate !== "0000-00-00" ? finishDate : startDate;
    const normalized = normalizeMalDate(dateUsed);
    if (!normalized) continue;

    parsed.push({
      dateObj: normalized.date,
      dateQuality: normalized.dateQuality,
      date: formatDate(normalized.date),
      monthKey: monthKey(normalized.date),
      monthLabel: monthLabel(normalized.date),
      year: normalized.date.getFullYear(),
      title,
      score: scoreRaw > 0 ? scoreRaw : "—",
      status,
      type,
      episodes,
      watched,
      mal_id: malId,
      mal_url: malId ? `https://myanimelist.net/anime/${malId}` : "#"
    });
  }

  if (!parsed.length) {
    showError("I parsed the XML, but did not find dated anime entries. MAL entries without start/finish dates cannot appear in a timeline.");
    return;
  }

  data = parsed.sort((a, b) => a.dateObj - b.dateObj);
  document.getElementById("uploadHero").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  populateYears();
  bindControls();
  render();
}

let controlsBound = false;
function bindControls() {
  if (controlsBound) return;
  ["search", "minScore", "status", "year", "sort"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(id === "search" ? "input" : "change", render);
  });
  controlsBound = true;
}

function populateYears() {
  const select = document.getElementById("year");
  select.innerHTML = `<option value="">All years</option>`;
  [...new Set(data.map(x => x.year))].sort((a,b) => a-b).forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  });
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function initials(title) {
  return title.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join("").toUpperCase();
}

function scoreNum(score) {
  return score === "—" ? 0 : Number(score);
}

function scoreClass(score) {
  const n = scoreNum(score);
  if (n >= 9) return "s9";
  if (n >= 7) return "s7";
  if (n >= 5) return "s5";
  if (n > 0) return "low";
  return "none";
}

function filteredData() {
  const q = document.getElementById("search").value.toLowerCase();
  const min = Number(document.getElementById("minScore").value);
  const status = document.getElementById("status").value;
  const year = document.getElementById("year").value;
  const sort = document.getElementById("sort").value;

  let list = data
    .filter(x => x.title.toLowerCase().includes(q))
    .filter(x => min === 0 || scoreNum(x.score) >= min)
    .filter(x => !status || x.status === status)
    .filter(x => !year || String(x.year) === year);

  return [...list].sort((a,b) => {
    if (sort === "dateAsc") return a.date.localeCompare(b.date);
    if (sort === "dateDesc") return b.date.localeCompare(a.date);
    if (sort === "scoreDesc") return scoreNum(b.score) - scoreNum(a.score) || a.date.localeCompare(b.date);
    if (sort === "scoreAsc") return scoreNum(a.score) - scoreNum(b.score) || a.date.localeCompare(b.date);
    if (sort === "titleAsc") return a.title.localeCompare(b.title);
    return 0;
  });
}

function updateStats(list) {
  const scored = list.filter(x => scoreNum(x.score) > 0);
  const avg = scored.length ? (scored.reduce((s,x) => s + scoreNum(x.score), 0) / scored.length).toFixed(1) : "—";
  const top = list.filter(x => scoreNum(x.score) >= 9).length;
  const years = new Set(list.map(x => x.year)).size;
  document.getElementById("stat-count").textContent = list.length;
  document.getElementById("stat-avg").textContent = avg;
  document.getElementById("stat-top").textContent = top;
  document.getElementById("stat-years").textContent = years;
}

function groupList(list) {
  const sort = document.getElementById("sort").value;
  if (sort !== "dateAsc" && sort !== "dateDesc") {
    return { "Results": { "": list } };
  }

  const grouped = {};
  for (const item of list) {
    const year = String(item.year);
    grouped[year] = grouped[year] || {};
    grouped[year][item.monthLabel] = grouped[year][item.monthLabel] || [];
    grouped[year][item.monthLabel].push(item);
  }
  return grouped;
}

function card(item) {
  const dateNote = item.dateQuality === "exact" ? item.date : `${item.monthLabel} (approx.)`;
  return `
    <a class="card" href="${item.mal_url}" target="_blank" rel="noreferrer">
      <div class="cover" id="cover-${item.mal_id}">${initials(item.title)}</div>
      <div class="meta">
        <div class="title">${escapeHtml(item.title)}</div>
        <div class="sub">${escapeHtml(item.status)} · ${escapeHtml(item.type || "Anime")} · ${escapeHtml(item.watched)}/${escapeHtml(item.episodes || "?")} eps</div>
        <div class="bottom">
          <div class="pill">${dateNote}</div>
          <div class="score ${scoreClass(item.score)}">${item.score}</div>
        </div>
      </div>
    </a>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function render() {
  const list = filteredData();
  updateStats(list);

  const root = document.getElementById("timeline");
  if (!list.length) {
    root.innerHTML = `<div class="empty">No anime match your filters.</div>`;
    return;
  }

  const groups = groupList(list);
  let html = "";
  const sort = document.getElementById("sort").value;

  let yearEntries = Object.entries(groups);

  if (sort === "dateDesc") {
    yearEntries.sort(([a], [b]) => Number(b) - Number(a));
  } else if (sort === "dateAsc") {
    yearEntries.sort(([a], [b]) => Number(a) - Number(b));
  }

  for (const [year, months] of yearEntries) {
    html += `<section class="year-block"><h2 class="year-title">${year}</h2>`;

    let monthEntries = Object.entries(months);

  for (const [month, items] of monthEntries) {
    if (month) {
      const safeMonth = escapeHtml(month);
      html += `<h3 class="month">${safeMonth} <small>${items.length} anime</small><span class="section-actions"><button class="reload-btn" onclick="retryMonthCovers(event, '${safeMonth}')">Retry this month</button></span></h3>`;
    }
    html += `<div class="grid">${items.map(card).join("")}</div>`;
  }

    html += `</section>`;
  }

  root.innerHTML = html;
  hydrateVisibleCovers(list);
}

async function getCover(item, force = false) {
  if (!item.mal_id) return null;
  if (!force && coverCache.has(item.mal_id)) return coverCache.get(item.mal_id);

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${item.mal_id}`);
    if (!res.ok) throw new Error(`Jikan returned ${res.status}`);
    const json = await res.json();
    const url =
      json?.data?.images?.webp?.large_image_url ||
      json?.data?.images?.jpg?.large_image_url ||
      json?.data?.images?.jpg?.image_url || null;
    coverCache.set(item.mal_id, url);
    await new Promise(r => setTimeout(r, 420));
    return url;
  } catch {
    if (force) coverCache.delete(item.mal_id);
    return null;
  }
}

function resetCoverPlaceholder(el, item) {
  el.innerHTML = initials(item.title);
  el.classList.remove("failed");
}

async function loadCoverIntoElement(item, force = false) {
  const el = document.getElementById(`cover-${item.mal_id}`);
  if (!el) return false;
  if (!force && el.querySelector("img")) return true;

  resetCoverPlaceholder(el, item);
  el.classList.add("loading");

  const url = await getCover(item, force);
  const stillThere = document.getElementById(`cover-${item.mal_id}`);

  if (!stillThere) return false;
  stillThere.classList.remove("loading");

  if (url) {
    stillThere.innerHTML = `<img src="${url}" alt="${escapeHtml(item.title)} cover">`;
    stillThere.classList.remove("failed");
    return true;
  } else {
    stillThere.classList.add("failed");
    return false;
  }
}

async function hydrateVisibleCovers(list) {
  const visible = list.slice(0, 80);
  for (const item of visible) {
    const el = document.getElementById(`cover-${item.mal_id}`);
    if (!el || el.querySelector("img")) continue;
    await loadCoverIntoElement(item, false);
  }
}

async function runWithDisabledButton(event, fn) {
  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.dataset.oldText = oldText;
    btn.textContent = "Retrying...";
  }
  try {
    await fn();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.oldText || "Retry";
    }
  }
}

async function retryVisibleMissingCovers(event) {
  await runWithDisabledButton(event, async () => {
    const list = filteredData();
    for (const item of list) {
      const el = document.getElementById(`cover-${item.mal_id}`);
      if (!el) continue;
      if (!el.querySelector("img")) await loadCoverIntoElement(item, true);
    }
  });
}

async function retryAllVisibleCovers(event) {
  await runWithDisabledButton(event, async () => {
    const list = filteredData();
    for (const item of list) {
      const el = document.getElementById(`cover-${item.mal_id}`);
      if (!el) continue;
      await loadCoverIntoElement(item, true);
    }
  });
}

async function retryMonthCovers(event, monthLabel) {
  event.preventDefault();
  event.stopPropagation();
  await runWithDisabledButton(event, async () => {
    const list = filteredData().filter(item => item.monthLabel === monthLabel);
    for (const item of list) {
      await loadCoverIntoElement(item, true);
    }
  });
}
