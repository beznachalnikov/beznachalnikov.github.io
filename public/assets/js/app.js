(function () {
  "use strict";

  const SITE = window.SITE || {}, I18N = window.I18N || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  const TOP_LIMIT = 15;
  const telegram = SITE.telegram;

  let lang = pickLang();
  let stats = null, statsFailed = false, showAll = false;

  // ---- язык ----

  // ?lang=en в адресе, потом прошлый выбор, потом язык браузера
  function pickLang() {
    let saved = null;
    try { saved = localStorage.getItem("lang"); } catch (error) { /* хранилище бывает закрыто */ }

    const browser = /^(ru|uk|be|kk)/i.test(navigator.language || "") ? "ru" : "en";
    const choice = new URLSearchParams(location.search).get("lang") || saved || browser;
    return I18N[choice] ? choice : "ru";
  }

  function t(key, vars) {
    let text = (I18N[lang] && I18N[lang][key]) || (I18N.ru && I18N.ru[key]) || key;
    Object.keys(vars || {}).forEach((name) => { text = text.replace("{" + name + "}", vars[name]); });
    return text;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t("meta.title");
    $('meta[name="description"]').content = t("meta.desc");

    // в словаре встречается разметка (<code>, <strong>), строки там только наши
    $$("[data-i18n]").forEach((node) => { node.innerHTML = t(node.dataset.i18n); });
    $$("[data-lang]").forEach((button) => { button.setAttribute("aria-pressed", String(button.dataset.lang === lang)); });

    renderFriendsEmpty();
    renderTop();
  }

  $$("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      lang = button.dataset.lang;
      try { localStorage.setItem("lang", lang); } catch (error) { /* не запомнится, и ладно */ }
      applyLang();
    });
  });

  // ---- адрес сервера и подключение ----

  if (SITE.address) {
    $$("[data-address]").forEach((node) => { node.textContent = SITE.address; });
    $("#join").href = "steam://connect/" + SITE.address;
  }

  $("#copy").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const done = () => {
      button.textContent = t("hero.copied");
      setTimeout(() => { button.textContent = t("hero.copy"); }, 1600);
    };

    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(SITE.address).then(done);
    else {
      // http и file:// не дают доступа к буферу напрямую
      const field = document.createElement("textarea");
      field.value = SITE.address;
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
      done();
    }
  });

  // ---- Telegram ----

  $$("[data-telegram]").forEach((node) => {
    if (telegram) node.href = telegram;
    else node.hidden = true;
  });

  // из https://t.me/название получается @название
  const handle = telegram && telegram.replace(/\/+$/, "").split("/").pop();
  if (handle) $$("[data-telegram-handle]").forEach((node) => { node.textContent = "@" + handle; });

  // ---- карты и друзья ----

  (SITE.maps || []).forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    $("#maps").append(item);
  });
  $("#maps-count").textContent = (SITE.maps || []).length || "";

  const friends = SITE.friends || [];
  friends.forEach((friend) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = friend.url;
    link.target = "_blank";
    link.rel = "noopener";
    const name = document.createElement("strong");
    name.textContent = friend.name;
    link.append(name);
    if (friend.note) {
      const note = document.createElement("span");
      note.textContent = friend.note;
      link.append(note);
    }
    item.append(link);
    $("#friends-list").append(item);
  });

  function renderFriendsEmpty() {
    if (friends.length) return;

    let item = $(".friends__empty");
    if (!item) {
      item = document.createElement("li");
      item.className = "friends__empty";
      $("#friends-list").append(item);
    }
    item.textContent = t(telegram ? "friends.emptyTg" : "friends.empty");
  }

  // ---- модели VIP: под мышкой поворачиваются, по нажатию — следующий кадр ----

  const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  $$("[data-model]").forEach((view) => {
    const frames = view.querySelectorAll("img");
    let index = 0, timer = null;

    const show = (next) => {
      frames[index].classList.remove("is-on");
      index = next % frames.length;
      frames[index].classList.add("is-on");
    };
    const stop = () => { clearInterval(timer); timer = null; };

    view.addEventListener("mouseenter", () => {
      if (timer || calm) return;
      show(index + 1);
      timer = setInterval(() => show(index + 1), 450);
    });
    view.addEventListener("mouseleave", () => { stop(); show(0); });
    view.addEventListener("click", () => { stop(); show(index + 1); });
    view.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      show(index + 1);
    });
  });

  // ---- статистика ----

  const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const locale = () => (lang === "ru" ? "ru-RU" : "en-GB");

  function seenText(timestamp) {
    const date = new Date(timestamp * 1000), now = new Date();
    const days = Math.round((dayStart(now) - dayStart(date)) / 864e5);

    if (days <= 0) return t("time.today");
    if (days === 1) return t("time.yesterday");
    if (days < 7) return t("time.days", { n: days });

    const sameYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString(locale(), sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  }

  function cell(row, text, className) {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) td.className = className;
    row.append(td);
    return td;
  }

  function message(key) {
    const body = $("#top-body");
    body.textContent = "";
    cell(body.insertRow(), t(key), "top__empty").colSpan = 6;
  }

  function renderTop() {
    if (statsFailed) return message("top.error");
    if (!stats) return message("top.loading");

    const players = stats.players || [];
    if (!players.length) return message("top.empty");

    const body = $("#top-body");
    body.textContent = "";

    players.forEach((player, index) => {
      const row = body.insertRow();
      if (index < 3) row.className = "top--" + (index + 1);
      if (index >= TOP_LIMIT && !showAll) row.hidden = true;

      cell(row, index + 1, "c-rank");
      cell(row, player.name, "top__name");
      cell(row, player.wins, "c-num top__wins");
      cell(row, player.points, "c-num c-wide");
      cell(row, player.streak || "—", "c-num");
      cell(row, seenText(player.seen), "c-seen c-wide");
    });

    const more = $("#show-all");
    more.hidden = showAll || players.length <= TOP_LIMIT;
    more.textContent = t("top.all", { n: players.length });

    const best = players.reduce((a, b) => (b.streak > a.streak ? b : a));
    $("#record").textContent = best.streak > 1 ? t("top.record", { name: best.name, n: best.streak }) : "";

    if (stats.updated) {
      const when = new Date(stats.updated * 1000).toLocaleString(locale(), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      $("#updated").textContent = t("top.updated", { date: when });
    }
  }

  $("#show-all").addEventListener("click", () => {
    showAll = true;
    renderTop();
  });

  applyLang();

  // данные лежат скриптом, а не json: так страница открывается и просто с диска
  const loader = document.createElement("script");
  loader.src = "data/stats.js?t=" + Date.now();
  loader.onload = () => { stats = window.GG_STATS; renderTop(); };
  loader.onerror = () => { statsFailed = true; renderTop(); };
  document.head.append(loader);
})();
