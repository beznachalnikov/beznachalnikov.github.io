(function () {
  "use strict";

  const SITE = window.SITE || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  const TOP_LIMIT = 15;

  const telegram = SITE.telegram;

  // адрес сервера и подключение
  if (SITE.address) {
    $$("[data-address]").forEach((node) => { node.textContent = SITE.address; });
    $("#join").href = "steam://connect/" + SITE.address;
  }

  $("#copy").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const done = () => {
      button.textContent = "Скопировано";
      setTimeout(() => { button.textContent = "Скопировать"; }, 1600);
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

  $$("[data-telegram]").forEach((node) => {
    if (telegram) node.href = telegram;
    else node.hidden = true;
  });

  // из https://t.me/название получается @название
  const handle = telegram && telegram.replace(/\/+$/, "").split("/").pop();
  if (handle) $$("[data-telegram-handle]").forEach((node) => { node.textContent = "@" + handle; });

  // порядок оружия
  (SITE.weapons || []).forEach(([name, kills]) => {
    const item = document.createElement("li");
    const title = document.createElement("span");
    title.textContent = name;
    item.append(title);

    if (kills && kills !== SITE.killsPerLevel) {
      const goal = document.createElement("b");
      goal.textContent = "×" + kills;
      goal.title = "Фрагов на этом уровне: " + kills;
      item.append(goal);
    }
    $("#ladder").append(item);
  });

  // карты
  (SITE.maps || []).forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    $("#maps").append(item);
  });
  $("#maps-count").textContent = (SITE.maps || []).length || "";

  // друзья
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
  if (!friends.length) {
    const item = document.createElement("li");
    item.className = "friends__empty";
    item.textContent = telegram
      ? "Пока здесь пусто. Хочешь обменяться ссылками — напиши нам в Telegram."
      : "Пока здесь пусто. Скоро появятся первые ссылки.";
    $("#friends-list").append(item);
  }

  // статистика
  const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  function seenText(timestamp) {
    const date = new Date(timestamp * 1000), now = new Date();
    const days = Math.round((dayStart(now) - dayStart(date)) / 864e5);

    if (days <= 0) return "сегодня";
    if (days === 1) return "вчера";
    if (days < 7) return days + " дн. назад";

    const sameYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString("ru-RU", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  }

  function cell(row, text, className) {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) td.className = className;
    row.append(td);
    return td;
  }

  function renderTop(data) {
    const body = $("#top-body"), players = (data && data.players) || [];
    body.textContent = "";

    if (!players.length) {
      cell(body.insertRow(), "Пока никто не выиграл ни одной карты. Будь первым.", "top__empty").colSpan = 6;
      return;
    }

    players.forEach((player, index) => {
      const row = body.insertRow();
      if (index < 3) row.className = "top--" + (index + 1);
      if (index >= TOP_LIMIT) row.hidden = true;

      cell(row, index + 1, "c-rank");
      cell(row, player.name, "top__name");
      cell(row, player.wins, "c-num top__wins");
      cell(row, player.points, "c-num c-wide");
      cell(row, player.streak || "—", "c-num");
      cell(row, seenText(player.seen), "c-seen c-wide");
    });

    if (players.length > TOP_LIMIT) {
      const more = $("#show-all");
      more.hidden = false;
      more.textContent = "Показать всех (" + players.length + ")";
      more.addEventListener("click", () => {
        body.querySelectorAll("tr[hidden]").forEach((row) => { row.hidden = false; });
        more.hidden = true;
      });
    }

    const best = players.reduce((a, b) => (b.streak > a.streak ? b : a));
    if (best.streak > 1) $("#record").textContent = "Рекорд сервера: " + best.name + " — " + best.streak + " побед подряд.";

    if (data.updated) {
      const when = new Date(data.updated * 1000).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      $("#updated").textContent = "Обновлено " + when;
    }
  }

  // данные лежат скриптом, а не json: так страница открывается и просто с диска
  const stats = document.createElement("script");
  stats.src = "data/stats.js?t=" + Date.now();
  stats.onload = () => renderTop(window.GG_STATS);
  stats.onerror = () => {
    $("#top-body").textContent = "";
    cell($("#top-body").insertRow(), "Статистика сейчас недоступна. Загляни чуть позже.", "top__empty").colSpan = 6;
  };
  document.head.append(stats);
})();
