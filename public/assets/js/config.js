// Настройки сайта. Всё, что меняется со временем, лежит здесь: адрес, Telegram, друзья, оружие, карты.
window.SITE = {
  // адрес игрового сервера
  address: "149.50.98.60:27023",

  // ссылка на группу в Telegram: кнопка в шапке и ссылка в подвале. Если оставить пустой — они скрыты
  telegram: "https://t.me/beznachalnikov_gg",

  // сайты друзей: { name: "Название", url: "https://...", note: "пара слов" },
  friends: [],

  // порядок оружия как в gg_weapon_order: [название, сколько фрагов нужно]; без числа — обычные 3
  killsPerLevel: 3,
  weapons: [
    ["Glock 18"], ["USP"], ["P228"], ["Desert Eagle"], ["Five-SeveN"], ["Dual Elites", 5],
    ["M3"], ["XM1014"], ["TMP"], ["MAC-10"], ["MP5"], ["UMP45"], ["P90"],
    ["Galil", 5], ["M4A1", 6], ["FAMAS"], ["AK-47", 6], ["SG 550", 4], ["G3SG1", 4],
    ["SG 552", 5], ["AUG", 5], ["Scout"], ["AWP"], ["M249", 6], ["HE-граната", 1]
  ],

  // карты из mapcycle.txt
  maps: [
    "gg_aztecplace", "gg_dich2", "gg_dusty_rmk", "gg_iceblocks", "gg_mini_dust2", "gg_rukojop",
    "gg_toycarpark", "gg_zoog", "gg_aim_orange_mini", "gg_blue_magic", "gg_dev_platform",
    "gg_minecraft_mini", "gg_rise", "gg_russia_snow", "gg_simpsons", "gg_snow3", "gg_wooden",
    "gg_ykm_street", "superpooldaymini3"
  ]
};
