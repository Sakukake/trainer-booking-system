
"use strict";

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const yen = n => Number(n || 0).toLocaleString("ja-JP") + "円";

const jst = date =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

const s = {
  month: new Date(),
  day: jst(new Date()),
  reservations: [],
  blocks: [],
  menus: [],
  settings: null
};

s.month = new Date(`${s.day}T12:00:00+09:00`);

function error(msg) {
  $("adminError").textContent = msg || "";
}

function dateInMonth() {
  return `${s.month.getFullYear()}-${pad(s.month.getMonth() + 1)}`;
}

function statusName(x) {
  return {
    pending: "申請中",
    confirmed: "確定",
    completed: "完了",
    cancelled: "キャンセル"
  }[x] || x;
}

function escapeText(text) {
  const span = document.createElement("span");
  span.textContent = text ?? "";
  return span;
}

async function adminLoad() {
  const [rs, bs, ms, gs] = await Promise.all([
    supabaseClient
      .from("reservations")
      .select("*")
      .order("reservation_date"),

    supabaseClient
      .from("gym_blocks")
      .select("*")
      .order("start_at"),

    supabaseClient
      .from("gym_menus")
      .select("*")
      .order("sort_order"),

    supabaseClient
      .from("gym_settings")
      .select("*")
      .eq("id", 1)
      .single()
  ]);

  for (const r of [rs, bs, ms, gs]) {
    if (r.error) throw r.error;
  }

  s.reservations = rs.data || [];
  s.blocks = bs.data || [];
  s.menus = ms.data || [];
  s.settings = gs.data;

  $("facilityFee").value = s.settings.facility_fee;
  $("openTime").value = s.settings.opening_time.slice(0, 5);
  $("lastTime").value = s.settings.last_start_time.slice(0, 5);

  renderMenus();
  renderCalendar();
  renderDay();
}

function utcJstTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(date));
}

function dayRanges(d) {
  const a = new Date(`${d}T00:00:00+09:00`).getTime();
  return [a, a + 86400000];
}

function blocksForDay(d) {
  const [a, b] = dayRanges(d);

  return s.blocks.filter(x =>
    new Date(x.start_at).getTime() < b &&
    new Date(x.end_at).getTime() > a
  );
}

function renderCalendar() {
  const month = dateInMonth();
  const [y, m] = month.split("-").map(Number);

  $("monthLabel").textContent = `${y}年${m}月`;

  const cal = $("calendar");
  cal.replaceChildren();

  for (const d of ["日", "月", "火", "水", "木", "金", "土"]) {
    const el = document.createElement("div");
    el.className = "cal-head";
    el.textContent = d;
    cal.append(el);
  }

  const first = new Date(y, m - 1, 1);
  const max = new Date(y, m, 0).getDate();

  for (let i = 0; i < first.getDay(); i++) {
    cal.append(document.createElement("div"));
  }

  for (let day = 1; day <= max; day++) {
    const d = `${y}-${pad(m)}-${pad(day)}`;

    const count = s.reservations.filter(x =>
      x.reservation_date === d &&
      x.status !== "cancelled"
    ).length;

    const b = document.createElement("button");

    b.className =
      "cal-day" +
      (s.day === d ? " active" : "") +
      (blocksForDay(d).length ? " off" : "");

    b.textContent = day;

    const sub = document.createElement("span");
    sub.className = "count";
    sub.textContent =
      (count ? `${count}件` : "") +
      (blocksForDay(d).length ? " ▪" : "");

    b.append(sub);

    b.onclick = () => {
      s.day = d;
      renderCalendar();
      renderDay();
    };

    cal.append(b);
  }
}

function renderDay() {
  $("dayTitle").textContent = `${s.day} の予約・休業`;

  const list = $("dayReservations");
  list.replaceChildren();

  const items = s.reservations
    .filter(x => x.reservation_date === s.day)
    .sort((a, b) =>
      a.reservation_time.localeCompare(b.reservation_time)
    );

  if (!items.length) {
    list.append(escapeText("予約なし"));
  }

  for (const r of items) {
    const el = document.createElement("div");
    el.className = "day-entry";

    el.append(
      escapeText(
        `${r.reservation_time} / ${r.duration}分 / ` +
        `${r.customer_name} / ${r.menu} / ` +
        `${yen(r.price)} / ${statusName(r.status)}`
      )
    );

    const btn = document.createElement("button");
    btn.className = "mini";
    btn.textContent = "状態・メモ編集";

    btn.onclick = async () => {
      const status = prompt(
        "状態：pending / confirmed / completed / cancelled",
        r.status
      );

      if (status === null) return;

      if (![
        "pending",
        "confirmed",
        "completed",
        "cancelled"
      ].includes(status)) {
        return alert("状態が正しくありません");
      }

      const memo = prompt("メモ", r.memo || "");
      if (memo === null) return;

      const { error: e } = await supabaseClient
        .from("reservations")
        .update({ status, memo })
        .eq("id", r.id);

      if (e) return alert(e.message);

      await safeLoad();
    };

    el.append(btn);
    list.append(el);
  }

  const blocks = $("dayBlocks");
  blocks.replaceChildren();

  for (const block of blocksForDay(s.day)) {
    const row = document.createElement("div");
    row.className = "day-entry";

    row.append(
      escapeText(
        `${utcJstTime(block.start_at)}〜` +
        `${utcJstTime(block.end_at)}　${block.reason} `
      )
    );

    const remove = document.createElement("button");
    remove.className = "mini danger";
    remove.textContent = "解除";

    remove.onclick = async () => {
      if (!confirm("この予約不可設定を解除しますか？")) {
        return;
      }

      const { error: e } = await supabaseClient
        .from("gym_blocks")
        .delete()
        .eq("id", block.id);

      if (e) return alert(e.message);

      await safeLoad();
    };

    row.append(remove);
    blocks.append(row);
  }

  $("manualMenu").replaceChildren(
    ...s.menus
      .filter(m => m.enabled)
      .map(m => {
        const o = document.createElement("option");
        o.value = m.id;
        o.textContent =
          `${m.name} / ${yen(m.price + s.settings.facility_fee)}`;
        return o;
      })
  );

  refreshManualTimes();
}

async function refreshManualTimes() {
  const select = $("manualTime");

  const menu = s.menus.find(
    m => String(m.id) === $("manualMenu").value
  );

  select.replaceChildren();

  if (!menu) return;

  const { data, error: e } = await supabaseClient.rpc(
    "beus_busy",
    { p_date: s.day }
  );

  if (e) {
    error(e.message);
    return;
  }

  const min = t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const fmt = t =>
    `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;

  const occupied = data || [];

  for (
    let t = min(s.settings.opening_time.slice(0, 5));
    t <= min(s.settings.last_start_time.slice(0, 5));
    t += 15
  ) {
    const val = fmt(t);

    const a = new Date(
      `${s.day}T${val}:00+09:00`
    ).getTime();

    const b = a + menu.duration * 60000;

    const blocked =
      a <= Date.now() ||
      occupied.some(x =>
        a < new Date(x.end_at).getTime() &&
        b > new Date(x.start_at).getTime()
      );

    const o = document.createElement("option");
    o.value = val;
    o.textContent = val + (blocked ? "（不可）" : "");
    o.disabled = blocked;

    select.append(o);
  }

  select.value =
    [...select.options].find(o => !o.disabled)?.value || "";
}

function renderMenus() {
  const box = $("menuSettings");
  box.replaceChildren();

  for (const m of s.menus) {
    const row = document.createElement("div");
    row.className = "menu-setting";

    const name = document.createElement("label");
    name.textContent = m.name;

    const input = document.createElement("input");
    input.type = "number";
    input.min = 0;
    input.value = m.price;
    input.dataset.menuId = m.id;

    name.append(document.createTextNode("（円）"));
    row.append(name, input);
    box.append(row);
  }
}

async function safeLoad() {
  try {
    error("");
    await adminLoad();
  } catch (e) {
    console.error(e);
    error("取得または更新に失敗しました：" + e.message);
  }
}

$("loginForm").onsubmit = async ev => {
  ev.preventDefault();

  $("loginError").textContent = "";

  const { data, error: e } =
    await supabaseClient.auth.signInWithPassword({
      email: $("loginEmail").value.trim(),
      password: $("loginPassword").value
    });

  $("loginPassword").value = "";

  if (e) {
    $("loginError").textContent = "ログインできませんでした";
    return;
  }

  await showDashboard(data.user);
};

async function showDashboard(user) {
  if (
    user.email?.toLowerCase() !==
    "sakukake.0825@gmail.com"
  ) {
    await supabaseClient.auth.signOut();
    $("loginError").textContent = "管理者権限がありません";
    return;
  }

  $("loginSection").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("logoutButton").classList.remove("hidden");

  $("adminUser").textContent =
    `ログイン中：${user.email}`;

  await safeLoad();
}

$("logoutButton").onclick = async () => {
  await supabaseClient.auth.signOut();

  $("dashboard").classList.add("hidden");
  $("loginSection").classList.remove("hidden");
  $("logoutButton").classList.add("hidden");
};

$("prevMonth").onclick = () => {
  s.month = new Date(
    s.month.getFullYear(),
    s.month.getMonth() - 1,
    1
  );
  renderCalendar();
};

$("nextMonth").onclick = () => {
  s.month = new Date(
    s.month.getFullYear(),
    s.month.getMonth() + 1,
    1
  );
  renderCalendar();
};

async function addBlock(allDay) {
  try {
    let a, b;

    if (allDay) {
      a = new Date(`${s.day}T00:00:00+09:00`);
      b = new Date(a.getTime() + 86400000);
    } else {
      const first = $("blockStart").value;
      const last = $("blockEnd").value;

      if (!first || !last) {
        throw Error("開始と終了を入力してください");
      }

      a = new Date(`${s.day}T${first}:00+09:00`);
      b = new Date(`${s.day}T${last}:00+09:00`);

      if (b <= a) {
        b = new Date(b.getTime() + 86400000);
      }
    }

    if (b <= a) {
      throw Error("終了日時が不正です");
    }

    const { error: e } = await supabaseClient
      .from("gym_blocks")
      .insert({
        start_at: a.toISOString(),
        end_at: b.toISOString(),
        reason: allDay
          ? "休業日"
          : $("blockReason").value.trim() || "予約不可"
      });

    if (e) throw e;

    await safeLoad();
  } catch (e) {
    alert("登録失敗：" + e.message);
  }
}

$("addBlock").onclick = () => addBlock(false);
$("allDayBlock").onclick = () => addBlock(true);

$("manualMenu").onchange = refreshManualTimes;

$("manualForm").onsubmit = async ev => {
  ev.preventDefault();

  const params = {
    p_menu_id: $("manualMenu").value,
    p_date: s.day,
    p_time: $("manualTime").value,
    p_name: $("manualName").value.trim(),
    p_kana: $("manualKana").value.trim(),
    p_phone: $("manualPhone").value.replace(/[-\sー]/g, ""),
    p_email: $("manualEmail").value.trim(),
    p_notes: $("manualNotes").value,
    p_source: "admin"
  };

  const { data, error: e } =
    await supabaseClient.rpc(
      "beus_create_booking",
      params
    );

  if (e) {
    return alert("予約登録できません：" + e.message);
  }

  alert("登録成功：予約ID " + data);
  $("manualForm").reset();

  await safeLoad();
};

$("settingsForm").onsubmit = async ev => {
  ev.preventDefault();

  const opening_time = $("openTime").value;
  const last_start_time = $("lastTime").value;

  if (opening_time > last_start_time) {
    return alert(
      "開始時刻と最終開始時刻を確認してください"
    );
  }

  const { error: e } = await supabaseClient
    .from("gym_settings")
    .update({
      facility_fee: Number($("facilityFee").value),
      opening_time,
      last_start_time,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1);

  if (e) {
    return alert("変更できません：" + e.message);
  }

  alert("店舗設定を保存しました");

  await safeLoad();
};

$("saveMenus").onclick = async () => {
  for (
    const el of
    document.querySelectorAll("[data-menu-id]")
  ) {
    const { error: e } = await supabaseClient
      .from("gym_menus")
      .update({
        price: Number(el.value)
      })
      .eq("id", el.dataset.menuId);

    if (e) {
      return alert(
        "料金変更に失敗：" + e.message
      );
    }
  }

  alert("メニュー料金を保存しました");
  await safeLoad();
};

(async () => {
  if (typeof supabaseClient === "undefined") {
    error("supabase-config.js を確認してください");
    return;
  }

  const { data, error: e } =
    await supabaseClient.auth.getSession();

  if (!e && data.session) {
    await showDashboard(data.session.user);
  }
})();
