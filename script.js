// ===== 配置 =====
// 婚礼时间（美国太平洋时间 2026-12-12 17:00）
const WEDDING_TIME = new Date("2026-12-12T17:00:00-08:00");
// 回执提交地址：Google Apps Script 部署后的“Web 应用网址”（以 /exec 结尾），
// 部署步骤见 google-apps-script.gs 顶部。留空时宾客提交会看到“暂未开放”的提示。
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbx7CPFNcYSsSFJPjfdy0pLqcp0Svnb2nJBlJcvqC6T34hA3XWS3UxXBe3mM3QH9wCs5/exec";

document.documentElement.classList.add("js");

// ===== 语言 =====
// 系统/浏览器语言里有中文就显示中文，否则显示英文；宾客也可以点右上角按钮手动切换，选择会被记住。
const MESSAGES = {
  zh: {
    title: "Winston & Serena 的婚礼邀请",
    side: "请选择嘉宾类别", name: "请填写姓名", guests: "请选择出席人数",
    closed: "回执功能暂未开放，请直接联系新人",
    ok: "提交成功，期待您的光临", fail: "提交失败，请稍后再试",
    wallEmpty: "还没有祝福，成为第一个送上祝福的人吧",
    wechatCal: "微信里无法直接添加日历，请点右上角「…」选择在浏览器中打开",
    calTitle: "Winston & Serena 的婚礼",
    calDetails: "Winston & Serena 的婚礼庆典，期待您的光临！",
  },
  en: {
    title: "Winston & Serena's Wedding Invitation",
    side: "Please choose whose guest you are", name: "Please enter your name", guests: "Please choose the number attending",
    closed: "RSVP is not open yet, please contact the couple directly",
    ok: "Thank you! We look forward to seeing you", fail: "Something went wrong, please try again later",
    wallEmpty: "No wishes yet. Be the first to leave one!",
    wechatCal: "WeChat can't add calendar events. Tap \"…\" at the top right and open in your browser",
    calTitle: "Winston & Serena's Wedding",
    calDetails: "Winston & Serena's wedding celebration. We look forward to seeing you!",
  },
};
let lang = detectLang();
const t = (key) => MESSAGES[lang][key];

function detectLang() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "zh" || saved === "en") return saved;
  } catch (e) {}
  const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  return prefs.some((l) => /^zh/i.test(l)) ? "zh" : "en";
}

function applyLang() {
  const en = lang === "en";
  document.documentElement.lang = en ? "en" : "zh-CN";
  document.documentElement.classList.toggle("en", en);
  document.title = t("title");
  for (const el of document.querySelectorAll("[data-en]")) {
    if (el.dataset.zh === undefined) el.dataset.zh = el.innerHTML;
    el.innerHTML = en ? el.dataset.en : el.dataset.zh;
  }
  for (const attr of ["placeholder", "aria-label", "src"]) {
    const key = "en-" + attr;
    for (const el of document.querySelectorAll("[data-" + key + "]")) {
      if (!el.hasAttribute("data-zh-" + attr)) el.setAttribute("data-zh-" + attr, el.getAttribute(attr) || "");
      el.setAttribute(attr, el.getAttribute(en ? "data-" + key : "data-zh-" + attr));
    }
  }
  // 英文字体只在英文模式下加载，避免国内打不开 Google Fonts 时拖慢中文页面
  if (en && !document.getElementById("en-font")) {
    const link = document.createElement("link");
    link.id = "en-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap";
    document.head.appendChild(link);
  }
  langBtn.textContent = en ? "中" : "EN";
  document.dispatchEvent(new Event("langchange"));
}

const langBtn = document.getElementById("lang");
langBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  lang = lang === "en" ? "zh" : "en";
  try { localStorage.setItem("lang", lang); } catch (err) {}
  applyLang();
});
applyLang();

// ===== 滚动淡入 =====
const fx = document.querySelectorAll(".fx");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  });
  fx.forEach((el) => io.observe(el));
} else {
  fx.forEach((el) => el.classList.add("in"));
}

// ===== 倒计时 =====
const cd = document.getElementById("countdown");
if (cd) {
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const left = Math.max(0, Math.floor((WEDDING_TIME - Date.now()) / 1000));
    cd.querySelector("[data-d]").textContent = Math.floor(left / 86400);
    cd.querySelector("[data-h]").textContent = pad(Math.floor(left / 3600) % 24);
    cd.querySelector("[data-m]").textContent = pad(Math.floor(left / 60) % 60);
    cd.querySelector("[data-s]").textContent = pad(left % 60);
  };
  tick();
  setInterval(tick, 1000);
}

// ===== 背景音乐 =====
// 默认开启：打开页面就尝试播放。
// 大多数浏览器会拦截有声自动播放，被拦截时在宾客第一次点击/触摸页面时开始播放；
// 宾客手动关掉后就不再自动开启。
const bgm = document.getElementById("bgm");
const musicBtn = document.getElementById("music");
const syncBtn = () => musicBtn.classList.toggle("playing", !bgm.paused);
bgm.addEventListener("play", syncBtn);
bgm.addEventListener("pause", syncBtn);

let userMuted = false;
const GESTURES = ["pointerup", "touchend", "click", "keydown"];
const stopWaiting = () => GESTURES.forEach((g) => document.removeEventListener(g, onGesture, true));
const tryPlay = () => bgm.play().then(stopWaiting).catch(() => {});
function onGesture(e) {
  if (userMuted || e.target === musicBtn) return;
  tryPlay();
}
GESTURES.forEach((g) => document.addEventListener(g, onGesture, true));

musicBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bgm.paused) {
    userMuted = false;
    tryPlay();
  } else {
    userMuted = true;
    stopWaiting();
    bgm.pause();
  }
});

tryPlay();
// 微信内置浏览器允许在这个事件里自动播放
document.addEventListener("WeixinJSBridgeReady", () => { if (!userMuted) tryPlay(); }, false);

// ===== 开场信封 =====
// 点击信封：盖子翻开、信纸上滑、遮罩淡出；这次点击同时让浏览器放行背景音乐。
const opening = document.getElementById("opening");
const OPEN_REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 背景里随机闪烁的金色小星
(function addSparkles() {
  const box = opening.querySelector(".sparkles");
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    const size = 5 + Math.random() * 7;
    s.style.width = s.style.height = size + "px";
    s.style.animationDelay = (Math.random() * 3.6).toFixed(2) + "s";
    s.style.animationDuration = (3.2 + Math.random() * 2.2).toFixed(2) + "s";
    box.append(s);
  }
})();

// 拆信时飘落的花瓣（粉 / 白 / 金）
function dropPetals() {
  const colors = ["#f6c1cf", "#f2a3b8", "#fff4f6", "#f8e3a3", "#fbd5de"];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "%";
    p.style.background = colors[i % colors.length];
    const scale = 0.6 + Math.random() * 0.8;
    p.style.width = 14 * scale + "px";
    p.style.height = 18 * scale + "px";
    p.style.setProperty("--fall", (3 + Math.random() * 2.5).toFixed(2) + "s");
    p.style.setProperty("--delay", (Math.random() * 1.2).toFixed(2) + "s");
    p.style.setProperty("--drift", (Math.random() * 160 - 80).toFixed(0) + "px");
    p.style.setProperty("--spin", (Math.random() * 720 - 360).toFixed(0) + "deg");
    opening.append(p);
  }
}

// 顺序：火漆印消失 → 信封口翻开露出内衬 → 信纸滑出 → 花瓣飘落 → 淡出进入请柬
function openEnvelope() {
  if (opening.classList.contains("open")) return;
  if (!userMuted) tryPlay();
  opening.classList.add("open");
  if (!OPEN_REDUCE) setTimeout(dropPetals, 700);
  setTimeout(() => {
    opening.classList.add("hide");
    document.documentElement.classList.remove("locked");
    setTimeout(() => opening.remove(), 1000);
  }, OPEN_REDUCE ? 0 : 2800);
}
opening.addEventListener("click", openEnvelope);
opening.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); }
});

// ===== 日历 / 地图 =====
const UA = navigator.userAgent;
const IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_APPLE = IS_IOS || /Macintosh/.test(UA);
const IS_WECHAT = /MicroMessenger/i.test(UA);
const ADDRESS = "2200 E Holt Blvd, Ontario, CA 91761";

// iPhone/iPad 上用 Apple 地图导航
if (IS_IOS) {
  const apple = "https://maps.apple.com/?q=" + encodeURIComponent(ADDRESS);
  document.querySelectorAll(".map-link").forEach((a) => { a.href = apple; });
}

document.getElementById("add-cal").addEventListener("click", () => {
  if (IS_WECHAT) return toast(t("wechatCal"));
  if (IS_APPLE) {
    // 苹果设备打开 .ics 会直接弹出“添加到日历”
    location.href = "assets/wedding.ics";
    return;
  }
  // 17:00–22:00 太平洋时间（UTC-8）
  const url = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(t("calTitle")) +
    "&dates=20261213T010000Z/20261213T060000Z" +
    "&details=" + encodeURIComponent(t("calDetails")) +
    "&location=" + encodeURIComponent(ADDRESS);
  window.open(url, "_blank", "noopener");
});

// ===== 祝福墙（弹幕） =====
// 留言做成气泡，分 5 行从右往左循环飘过。留言少（不到 6 条）时同一条最多同时出现 2 次，否则只出现 1 次。
const wallTrack = document.getElementById("wall-track");
const LANES = 5;
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let wishes = [];
let cursor = 0;
let laneFreeAt = new Array(LANES).fill(0);
let onScreen = new Map(); // 留言 → 当前在屏幕上的份数
let danmuTimer = null;

function danmu(w) {
  const el = document.createElement("div");
  el.className = "danmu" + (/新娘/.test(w.side || "") ? " bride" : "") + (w.mine ? " mine" : "");
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = Array.from(String(w.name).trim())[0] || "♥";
  const who = document.createElement("span");
  who.className = "who";
  who.textContent = w.name + (lang === "en" ? ":" : "：");
  const text = document.createElement("span");
  text.textContent = w.wish;
  el.append(avatar, who, text);
  return el;
}

function launchDanmu() {
  if (!wishes.length || document.hidden) return;
  const now = performance.now();
  const free = [];
  for (let i = 0; i < LANES; i++) if (laneFreeAt[i] <= now) free.push(i);
  if (!free.length) return;

  // 找下一条在屏幕上的份数还没到上限的留言
  const maxCopies = wishes.length < 6 ? 2 : 1;
  let w = null;
  for (let k = 0; k < wishes.length; k++) {
    const candidate = wishes[(cursor + k) % wishes.length];
    if ((onScreen.get(candidate) || 0) < maxCopies) { w = candidate; cursor = (cursor + k + 1) % wishes.length; break; }
  }
  if (!w) return;

  const lane = free[Math.floor(Math.random() * free.length)];
  const el = danmu(w);
  const W = wallTrack.clientWidth;
  el.style.top = `calc(${(lane * 100) / LANES}% + var(--u) * 6)`;
  el.style.transform = `translateX(${W}px)`;
  wallTrack.append(el);

  const bw = el.offsetWidth;
  const speed = (W / 6500) * (0.85 + Math.random() * 0.3); // 约 6.5 秒横穿一次
  onScreen.set(w, (onScreen.get(w) || 0) + 1);
  const anim = el.animate(
    [{ transform: `translateX(${W}px)` }, { transform: `translateX(${-bw}px)` }],
    { duration: (W + bw) / speed, easing: "linear" }
  );
  anim.onfinish = () => {
    el.remove();
    const n = (onScreen.get(w) || 1) - 1;
    if (n > 0) onScreen.set(w, n); else onScreen.delete(w);
  };
  laneFreeAt[lane] = now + (bw + W * 0.18) / speed; // 前一条完全进场并留出间距后，这一行才放下一条
}

function renderWishes() {
  clearInterval(danmuTimer);
  danmuTimer = null;
  // 先取消旧气泡的动画（cancel 不会触发 onfinish），避免它们结束时改动新的计数
  if (wallTrack.getAnimations) wallTrack.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  wallTrack.replaceChildren();
  wallTrack.classList.toggle("static", REDUCE_MOTION);
  laneFreeAt = new Array(LANES).fill(0);
  onScreen = new Map();
  cursor = 0;

  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "wall-empty";
    empty.textContent = t("wallEmpty");
    wallTrack.append(empty);
    return;
  }
  if (REDUCE_MOTION) {
    wishes.forEach((w) => wallTrack.append(danmu(w)));
    return;
  }
  launchDanmu();
  danmuTimer = setInterval(launchDanmu, 450);
}

async function loadWishes() {
  if (!RSVP_ENDPOINT) return renderWishes();
  try {
    // 加时间戳并禁用缓存：微信等内置浏览器会把同一个网址的旧结果缓存下来，
    // 导致表格里删掉的留言还一直显示在祝福墙上
    const res = await fetch(RSVP_ENDPOINT + "?action=wishes&t=" + Date.now(), { cache: "no-store" });
    const data = await res.json();
    if (data.ok && Array.isArray(data.wishes)) wishes = data.wishes;
  } catch (e) {}
  renderWishes();
}

document.addEventListener("langchange", renderWishes);
renderWishes();
loadWishes();

// ===== 提示 =====
const toastEl = document.getElementById("toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// ===== 回执表单 =====
const form = document.getElementById("rsvp");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  if (!data.get("side")) return toast(t("side"));
  if (!String(data.get("name") || "").trim()) return toast(t("name"));
  if (!data.get("guests")) return toast(t("guests"));
  if (!RSVP_ENDPOINT) return toast(t("closed"));

  const btn = document.querySelector(".submit");
  btn.disabled = true;
  try {
    // 用 x-www-form-urlencoded 格式提交，Apps Script 可直接从 e.parameter 读取，且不触发跨域预检
    const res = await fetch(RSVP_ENDPOINT, {
      method: "POST",
      body: new URLSearchParams(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.error || res.status);
    const wish = String(data.get("wish") || "").trim();
    if (wish) {
      wishes.unshift({ side: data.get("side"), name: String(data.get("name")).trim(), wish: wish, mine: true });
      renderWishes();
    }
    form.reset();
    toast(t("ok"));
  } catch (err) {
    toast(t("fail"));
  } finally {
    btn.disabled = false;
  }
});
