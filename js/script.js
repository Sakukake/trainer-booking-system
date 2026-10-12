
"use strict";

/* ========================================
   Be Us 予約システム
   Version 0.9.0
   お客様用 JavaScript
======================================== */

const $ = (id) =>
  document.getElementById(id);

const pad = (n) =>
  String(n).padStart(2, "0");

const yen = (n) =>
  Number(n || 0).toLocaleString("ja-JP") + "円";

const TZ = "Asia/Tokyo";

const state = {
  menus: [],
  settings: null,
  selectedMenu: null,
  pending: null,
  busy: [],
  submitting: false,
  availabilityRequest: 0
};

/* ========================================
   日付・時刻
======================================== */

function todayJST() {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(new Date());

  const get = (type) =>
    parts.find(p => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toMinutes(value) {
  if (!value) return null;

  const [hour, minute] =
    value.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function toTime(minutes) {
  return (
    `${pad(Math.floor(minutes / 60))}:` +
    `${pad(minutes % 60)}`
  );
}

function startDate(date, time) {
  return new Date(
    `${date}T${time}:00+09:00`
  );
}

function formatJST(date) {
  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }
  ).format(date);
}

function getEndDate(date, time, duration) {
  const start = startDate(date, time);

  return new Date(
    start.getTime() + duration * 60000
  );
}

/* ========================================
   画面切り替え
======================================== */

function showSection(id) {
  $("bookingForm").classList.add("hidden");
  $("confirmation").classList.add("hidden");
  $("completed").classList.add("hidden");

  $(id).classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function showError(message, target = "formError") {
  $(target).textContent = message;
}

function clearErrors() {
  $("formError").textContent = "";
  $("confirmError").textContent = "";
}

/* ========================================
   Supabaseから設定取得
======================================== */

async function loadSettings() {
  if (typeof supabaseClient === "undefined") {
    throw new Error(
      "Supabaseの接続設定がありません。"
    );
  }

  const [settingsResult, menusResult] =
    await Promise.all([
      supabaseClient
        .from("gym_settings")
        .select("*")
        .eq("id", 1)
        .single(),

      supabaseClient
        .from("gym_menus")
        .select("*")
        .eq("enabled", true)
        .order("sort_order")
    ]);

  if (settingsResult.error) {
    throw settingsResult.error;
  }

  if (menusResult.error) {
    throw menusResult.error;
  }

  if (!settingsResult.data) {
    throw new Error(
      "店舗設定が見つかりません。"
    );
  }

  state.settings = settingsResult.data;
  state.menus = menusResult.data || [];

  if (!state.menus.length) {
    throw new Error(
      "現在選択できるメニューがありません。"
    );
  }

  $("facilityFee").textContent =
    yen(state.settings.facility_fee);

  renderMenus();
}

/* ========================================
   メニュー表示
======================================== */

function renderMenus() {
  const list = $("menuList");

  list.replaceChildren();

  for (const menu of state.menus) {
    const label =
      document.createElement("label");

    label.className = "menu-card";

    const input =
      document.createElement("input");

    input.type = "radio";
    input.name = "menu";
    input.value = menu.id;

    const content =
      document.createElement("span");

    const name =
      document.createElement("strong");

    name.textContent = menu.name;

    const price =
      document.createElement("small");

    price.textContent = yen(menu.price);

    content.append(name, price);
    label.append(input, content);
    list.append(label);

    input.addEventListener(
      "change",
      () => {
        state.selectedMenu = menu;
        state.pending = null;

        updatePrice();
        refreshAvailability();
      }
    );
  }
}

/* ========================================
   料金表示
======================================== */

function updatePrice() {
  const menuPrice =
    state.selectedMenu?.price || 0;

  const facilityFee =
    Number(state.settings?.facility_fee || 0);

  $("menuPrice").textContent =
    yen(menuPrice);

  $("facilityFee").textContent =
    yen(facilityFee);

  $("totalPrice").textContent =
    yen(
      state.selectedMenu
        ? menuPrice + facilityFee
        : 0
    );

  updateEndTime();
}

/* ========================================
   終了予定
======================================== */

function updateEndTime() {
  const menu = state.selectedMenu;
  const date = $("date").value;
  const time = $("time").value;

  if (!menu || !date || !time) {
    $("endTime").textContent = "未選択";
    return;
  }

  const end =
    getEndDate(date, time, menu.duration);

  $("endTime").textContent =
    formatJST(end);
}

/* ========================================
   予約済み時間の取得
======================================== */

async function getBusyTimes(date) {
  const { data, error } =
    await supabaseClient.rpc(
      "beus_busy",
      {
        p_date: date
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}

/* ========================================
   空き時間の判定
======================================== */

function overlaps(
  start,
  end,
  occupied
) {
  return occupied.some(item => {
    const busyStart =
      new Date(item.start_at).getTime();

    const busyEnd =
      new Date(item.end_at).getTime();

    return (
      start < busyEnd &&
      end > busyStart
    );
  });
}

function availableFor(
  date,
  time,
  menu,
  busy
) {
  if (!date || !time || !menu) {
    return false;
  }

  const start =
    startDate(date, time).getTime();

  const end =
    start + menu.duration * 60000;

  if (!Number.isFinite(start)) {
    return false;
  }

  if (start <= Date.now()) {
    return false;
  }

  return !overlaps(start, end, busy);
}

/* ========================================
   時間選択を作成
======================================== */

function buildTimeOptions(busy) {
  const select = $("time");

  const previousValue = select.value;

  select.replaceChildren();

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    "開始時間を選択してください";

  select.append(placeholder);

  const date = $("date").value;
  const menu = state.selectedMenu;

  if (!date || !menu || !state.settings) {
    select.disabled = true;
    updateEndTime();
    return;
  }

  const openingTime =
    toMinutes(
      state.settings.opening_time.slice(0, 5)
    );

  const lastStart =
    toMinutes(
      state.settings.last_start_time.slice(0, 5)
    );

  let availableCount = 0;

  for (
    let minute = openingTime;
    minute <= lastStart;
    minute += 15
  ) {
    const value = toTime(minute);

    const isAvailable =
      availableFor(
        date,
        value,
        menu,
        busy
      );

    const option =
      document.createElement("option");

    option.value = value;

    option.textContent =
      isAvailable
        ? value
        : `${value}（予約不可）`;

    option.disabled = !isAvailable;

    if (isAvailable) {
      availableCount++;
    }

    select.append(option);
  }

  select.disabled = false;

  const previousOption =
    [...select.options].find(
      option =>
        option.value === previousValue &&
        !option.disabled
    );

  select.value = previousOption
    ? previousValue
    : "";

  $("availabilityMessage").textContent =
    availableCount > 0
      ? `予約可能な開始時間：${availableCount}枠`
      : "この日程・メニューで予約できる時間はありません。";

  updateEndTime();
}

/* ========================================
   空き時間を更新
======================================== */

async function refreshAvailability() {
  const date = $("date").value;
  const menu = state.selectedMenu;

  const requestNumber =
    ++state.availabilityRequest;

  const timeSelect = $("time");

  timeSelect.disabled = true;
  timeSelect.replaceChildren();

  $("availabilityMessage").textContent =
    "";

  updateEndTime();
  clearErrors();

  if (!date || !menu) {
    $("availabilityMessage").textContent =
      "メニューと希望日を選択してください。";
    return;
  }

  $("availabilityMessage").textContent =
    "空き時間を確認しています…";

  try {
    const busy =
      await getBusyTimes(date);

    if (
      requestNumber !==
      state.availabilityRequest
    ) {
      return;
    }

    state.busy = busy;

    buildTimeOptions(busy);
  } catch (error) {
    console.error(
      "空き時間取得エラー:",
      error
    );

    if (
      requestNumber !==
      state.availabilityRequest
    ) {
      return;
    }

    timeSelect.disabled = true;

    $("availabilityMessage").textContent =
      "空き時間を取得できませんでした。再度お試しください。";
  }
}

/* ========================================
   入力チェック
======================================== */

function validateCustomer() {
  const name = $("name").value.trim();
  const kana = $("kana").value.trim();

  const phone = $("phone").value
    .replace(/[-ー\s　]/g, "");

  const email = $("email").value.trim();

  const notes = $("notes").value;

  if (!state.selectedMenu) {
    return "メニューを選択してください。";
  }

  if (!$("date").value) {
    return "希望日を選択してください。";
  }

  if (!$("time").value) {
    return "開始時間を選択してください。";
  }

  if (
    !availableFor(
      $("date").value,
      $("time").value,
      state.selectedMenu,
      state.busy
    )
  ) {
    return "この時間帯は予約できません。";
  }

  if (!name || name.length > 100) {
    return "お名前を正しく入力してください。";
  }

  if (!/^[ァ-ヶー\s　]+$/.test(kana)) {
    return "フリガナはカタカナで入力してください。";
  }

  if (kana.length > 100) {
    return "フリガナが長すぎます。";
  }

  if (!/^\d{10,11}$/.test(phone)) {
    return "電話番号は10〜11桁の数字で入力してください。";
  }

  if (!$("email").checkValidity() || !email) {
    return "メールアドレスを正しく入力してください。";
  }

  if (notes.length > 2000) {
    return "ご要望は2000文字以内で入力してください。";
  }

  return "";
}

/* ========================================
   予約情報作成
======================================== */

function createPendingReservation() {
  const menu = state.selectedMenu;

  const date = $("date").value;
  const time = $("time").value;

  return {
    menuId: menu.id,
    menuName: menu.name,

    duration: menu.duration,

    date,
    time,

    endTime: formatJST(
      getEndDate(
        date,
        time,
        menu.duration
      )
    ),

    name: $("name").value.trim(),
    kana: $("kana").value.trim(),

    phone: $("phone").value
      .replace(/[-ー\s　]/g, ""),

    email: $("email").value
      .trim()
      .toLowerCase(),

    notes: $("notes").value.trim(),

    menuPrice: menu.price,

    facilityFee:
      Number(state.settings.facility_fee),

    totalPrice:
      Number(menu.price) +
      Number(state.settings.facility_fee)
  };
}

/* ========================================
   確認画面
======================================== */

function displayConfirmation(reservation) {
  $("confirmationText").textContent =
    [
      `メニュー：${reservation.menuName}`,
      `希望日：${reservation.date}`,
      `開始時間：${reservation.time}`,
      `終了予定：${reservation.endTime}`,
      `時間：${reservation.duration}分`,
      "",
      `お名前：${reservation.name}`,
      `フリガナ：${reservation.kana}`,
      `電話番号：${reservation.phone}`,
      `メールアドレス：${reservation.email}`,
      `ご要望：${reservation.notes || "なし"}`,
      "",
      `メニュー料金：${yen(reservation.menuPrice)}`,
      `施設利用料：${yen(reservation.facilityFee)}`,
      `合計：${yen(reservation.totalPrice)}`
    ].join("\n");

  showSection("confirmation");
}

/* ========================================
   フォームから確認画面へ
======================================== */

$("bookingForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearErrors();

    const button =
      $("bookingForm").querySelector(
        'button[type="submit"]'
      );

    button.disabled = true;

    try {
      if (
        !$("date").value ||
        !state.selectedMenu ||
        !$("time").value
      ) {
        throw new Error(
          "メニュー・日時を選択してください。"
        );
      }

      const chosenMenu = state.selectedMenu;
      const chosenDate = $("date").value;
      const chosenTime = $("time").value;

      const busy =
        await getBusyTimes(chosenDate);

      state.busy = busy;

      if (
        !availableFor(
          chosenDate,
          chosenTime,
          chosenMenu,
          busy
        )
      ) {
        await refreshAvailability();

        throw new Error(
          "選択した時間は予約できません。別の時間を選択してください。"
        );
      }

      const validationError =
        validateCustomer();

      if (validationError) {
        throw new Error(
          validationError
        );
      }

      state.pending =
        createPendingReservation();

      displayConfirmation(state.pending);
    } catch (error) {
      showError(
        error.message ||
        "予約内容を確認できませんでした。"
      );
    } finally {
      button.disabled = false;
    }
  }
);

/* ========================================
   Supabaseへ予約登録
======================================== */

async function registerBooking(reservation) {
  const { data, error } =
    await supabaseClient.rpc(
      "beus_create_booking",
      {
        p_menu_id: reservation.menuId,
        p_date: reservation.date,
        p_time: reservation.time,

        p_name: reservation.name,
        p_kana: reservation.kana,

        p_phone: reservation.phone,
        p_email: reservation.email,

        p_notes: reservation.notes,
        p_source: "customer"
      }
    );

  if (error) {
    throw error;
  }

  if (data == null) {
    throw new Error(
      "予約番号を取得できませんでした。"
    );
  }

  return data;
}

/* ========================================
   予約確定ボタン
======================================== */

$("confirmButton").addEventListener(
  "click",
  async () => {
    if (
      state.submitting ||
      !state.pending
    ) {
      return;
    }

    state.submitting = true;

    const button = $("confirmButton");

    button.disabled = true;
    button.textContent =
      "予約を登録しています…";

    $("confirmError").textContent = "";

    try {
      const reservation = state.pending;

      const bookingId =
        await registerBooking(reservation);

      $("bookingId").textContent =
        `#${bookingId}`;

      $("completedText").textContent =
        [
          `メニュー：${reservation.menuName}`,
          `予約日：${reservation.date}`,
          `開始：${reservation.time}`,
          `終了予定：${reservation.endTime}`,
          `合計予定金額：${yen(reservation.totalPrice)}`
        ].join("\n");

      state.pending = null;

      showSection("completed");
    } catch (error) {
      console.error(
        "予約登録エラー:",
        error
      );

      const message =
        String(error.message || "");

      if (
        message.includes("SLOT_TAKEN") ||
        message.includes("BLOCKED_SLOT") ||
        message.includes("exclusion constraint")
      ) {
        showError(
          "他の予約または休日設定と重なりました。戻って別の時間を選んでください。",
          "confirmError"
        );
      } else if (
        message.includes("PAST_SLOT")
      ) {
        showError(
          "過去の日時は予約できません。",
          "confirmError"
        );
      } else {
        showError(
          "予約登録に失敗しました。予約状況をご確認のうえ、必要に応じて店舗にお問い合わせください。",
          "confirmError"
        );
      }
    } finally {
      state.submitting = false;

      button.disabled = false;
      button.textContent =
        "この内容で予約する";
    }
  }
);

/* ========================================
   入力画面に戻る
======================================== */

$("backButton").addEventListener(
  "click",
  async () => {
    clearErrors();

    showSection("bookingForm");

    await refreshAvailability();
  }
);

/* ========================================
   新しい予約
======================================== */

$("newButton").addEventListener(
  "click",
  async () => {
    state.pending = null;
    state.selectedMenu = null;
    state.busy = [];

    $("bookingForm").reset();

    $("date").min = todayJST();

    $("time").replaceChildren();
    $("time").disabled = true;

    updatePrice();

    clearErrors();

    $("availabilityMessage").textContent =
      "メニューと希望日を選択してください。";

    showSection("bookingForm");
  }
);

/* ========================================
   入力変更イベント
======================================== */

$("date").addEventListener(
  "change",
  () => {
    state.pending = null;
    refreshAvailability();
  }
);

$("time").addEventListener(
  "change",
  () => {
    state.pending = null;
    clearErrors();
    updateEndTime();
  }
);

/* ========================================
   初期表示
======================================== */

async function initializeBeUs() {
  $("loading").textContent =
    "メニューを読み込んでいます…";

  $("bookingForm").classList.add(
    "hidden"
  );

  $("date").min = todayJST();

  $("time").disabled = true;

  try {
    await loadSettings();

    $("loading").classList.add(
      "hidden"
    );

    $("bookingForm").classList.remove(
      "hidden"
    );

    updatePrice();

    $("availabilityMessage").textContent =
      "メニューと希望日を選択してください。";
  } catch (error) {
    console.error(
      "Be Us初期化エラー:",
      error
    );

    $("loading").textContent =
      "現在、予約画面を読み込めません。時間をおいて再度お試しください。";
  }
}

initializeBeUs();
