"use strict";

/* ========================================
   Ver.0.7.1
   トレーニング予約フォーム
======================================== */

/* ---------- 要素取得 ---------- */

const bookingForm =
  document.getElementById("bookingForm");

const menuInputs =
  document.querySelectorAll(
    'input[name="menu"]'
  );

const dateInput =
  document.getElementById("date");

const timeInput =
  document.getElementById("time");

const rentalGymInput =
  document.getElementById("rentalGym");

const nameInput =
  document.getElementById("name");

const kanaInput =
  document.getElementById("kana");

const phoneInput =
  document.getElementById("phone");

const emailInput =
  document.getElementById("email");

const notesInput =
  document.getElementById("notes");

/* 料金表示 */

const menuPriceElement =
  document.getElementById("menuPrice");

const extraTimePriceElement =
  document.getElementById(
    "extraTimePrice"
  );

const rentalPriceElement =
  document.getElementById(
    "rentalPrice"
  );

const totalDurationElement =
  document.getElementById(
    "totalDuration"
  );

const totalPriceElement =
  document.getElementById(
    "totalPrice"
  );

const estimatedEndElement =
  document.getElementById(
    "estimatedEnd"
  );

const errorMessageElement =
  document.getElementById(
    "errorMessage"
  );

/* 画面 */

const confirmationSection =
  document.getElementById(
    "confirmation"
  );

const completedSection =
  document.getElementById(
    "completed"
  );

/* 確認画面 */

const confirmMenusElement =
  document.getElementById(
    "confirmMenus"
  );

const confirmDateTimeElement =
  document.getElementById(
    "confirmDateTime"
  );

const confirmEndTimeElement =
  document.getElementById(
    "confirmEndTime"
  );

const confirmNameElement =
  document.getElementById(
    "confirmName"
  );

const confirmKanaElement =
  document.getElementById(
    "confirmKana"
  );

const confirmPhoneElement =
  document.getElementById(
    "confirmPhone"
  );

const confirmEmailElement =
  document.getElementById(
    "confirmEmail"
  );

const confirmRentalElement =
  document.getElementById(
    "confirmRental"
  );

const confirmNotesElement =
  document.getElementById(
    "confirmNotes"
  );

const confirmMenuPriceElement =
  document.getElementById(
    "confirmMenuPrice"
  );

const confirmExtraTimePriceElement =
  document.getElementById(
    "confirmExtraTimePrice"
  );

const confirmRentalPriceElement =
  document.getElementById(
    "confirmRentalPrice"
  );

const confirmDurationElement =
  document.getElementById(
    "confirmDuration"
  );

const confirmTotalElement =
  document.getElementById(
    "confirmTotal"
  );

const confirmationErrorMessage =
  document.getElementById(
    "confirmationErrorMessage"
  );

/* 完了画面 */

const completedBookingIdElement =
  document.getElementById(
    "completedBookingId"
  );

const completedDateTimeElement =
  document.getElementById(
    "completedDateTime"
  );

const completedEndTimeElement =
  document.getElementById(
    "completedEndTime"
  );

const completedMenusElement =
  document.getElementById(
    "completedMenus"
  );

const completedTotalElement =
  document.getElementById(
    "completedTotal"
  );

/* ボタン */

const submitRequestButton =
  document.getElementById(
    "submitRequestButton"
  );

const editButton =
  document.getElementById(
    "editButton"
  );

const newBookingButton =
  document.getElementById(
    "newBookingButton"
  );

const showReservationsButton =
  document.getElementById(
    "showReservationsButton"
  );

const refreshReservationsButton =
  document.getElementById(
    "refreshReservationsButton"
  );

/* 予約一覧 */

const reservationListSection =
  document.getElementById(
    "reservationListSection"
  );

const reservationListElement =
  document.getElementById(
    "reservationList"
  );

const emptyReservationMessage =
  document.getElementById(
    "emptyReservationMessage"
  );

/* ---------- 設定 ---------- */

const EXTRA_TIME_FEE = 500;
const RENTAL_GYM_FEE = 1500;

const OPENING_HOUR = 10;
const EXTRA_TIME_START_HOUR = 21;

const TIME_INTERVAL = 15;

const STORAGE_KEY =
  "trainerBookingReservationsV071";

const OLD_STORAGE_KEYS = [
  "trainerBookingReservationsV06",
  "trainerBookingReservationsV07"
];

let pendingReservation = null;
let isSubmitting = false;

/* ---------- 共通処理 ---------- */

function formatPrice(price) {
  const safePrice =
    Number.isFinite(Number(price))
      ? Number(price)
      : 0;

  return `${safePrice.toLocaleString(
    "ja-JP"
  )}円`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

  if (
    Number.isNaN(date.getTime())
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }
  ).format(date);
}

function getSelectedMenus() {
  return Array.from(menuInputs)
    .filter(
      (input) => input.checked
    )
    .map((input) => ({
      name:
        input.dataset.name ||
        "名称未設定",

      price:
        Number(input.value) || 0,

      duration:
        Number(
          input.dataset.duration
        ) || 0
    }));
}

function calculateMenuPrice() {
  return getSelectedMenus().reduce(
    (total, menu) =>
      total + menu.price,
    0
  );
}

function calculateTotalDuration() {
  return getSelectedMenus().reduce(
    (total, menu) =>
      total + menu.duration,
    0
  );
}

function convertTimeToMinutes(
  timeValue
) {
  if (
    !timeValue ||
    !/^\d{2}:\d{2}$/.test(
      timeValue
    )
  ) {
    return null;
  }

  const [hours, minutes] =
    timeValue
      .split(":")
      .map(Number);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function convertMinutesToTime(
  totalMinutes
) {
  const minutesInDay =
    24 * 60;

  const adjustedMinutes =
    (
      (
        totalMinutes %
        minutesInDay
      ) +
      minutesInDay
    ) %
    minutesInDay;

  const hours =
    Math.floor(
      adjustedMinutes / 60
    );

  const minutes =
    adjustedMinutes % 60;

  return (
    `${String(hours).padStart(
      2,
      "0"
    )}:` +
    `${String(minutes).padStart(
      2,
      "0"
    )}`
  );
}

function isValidTimeInterval(
  timeValue
) {
  const totalMinutes =
    convertTimeToMinutes(
      timeValue
    );

  if (totalMinutes === null) {
    return false;
  }

  const minutes =
    totalMinutes % 60;

  return (
    minutes % TIME_INTERVAL === 0
  );
}

function calculateEstimatedEndTime() {
  const startMinutes =
    convertTimeToMinutes(
      timeInput.value
    );

  const duration =
    calculateTotalDuration();

  if (
    startMinutes === null ||
    duration <= 0
  ) {
    return "";
  }

  return convertMinutesToTime(
    startMinutes + duration
  );
}

function calculateExtraTimeFee() {
  const startMinutes =
    convertTimeToMinutes(
      timeInput.value
    );

  if (startMinutes === null) {
    return 0;
  }

  const openingMinutes =
    OPENING_HOUR * 60;

  const extraStartMinutes =
    EXTRA_TIME_START_HOUR * 60;

  if (
    startMinutes <
      openingMinutes ||
    startMinutes >=
      extraStartMinutes
  ) {
    return EXTRA_TIME_FEE;
  }

  return 0;
}

function calculateRentalFee() {
  return rentalGymInput.checked
    ? RENTAL_GYM_FEE
    : 0;
}

function calculateTotalPrice() {
  return (
    calculateMenuPrice() +
    calculateExtraTimeFee() +
    calculateRentalFee()
  );
}

function updateSummary() {
  menuPriceElement.textContent =
    formatPrice(
      calculateMenuPrice()
    );

  extraTimePriceElement.textContent =
    formatPrice(
      calculateExtraTimeFee()
    );

  rentalPriceElement.textContent =
    formatPrice(
      calculateRentalFee()
    );

  totalDurationElement.textContent =
    `${calculateTotalDuration()}分`;

  totalPriceElement.textContent =
    formatPrice(
      calculateTotalPrice()
    );

  const endTime =
    calculateEstimatedEndTime();

  estimatedEndElement.textContent =
    endTime || "未選択";
}

/* ---------- 時間選択肢 ---------- */

function createTimeOptions() {
  timeInput.innerHTML = "";

  const defaultOption =
    document.createElement("option");

  defaultOption.value = "";

  defaultOption.textContent =
    "開始時間を選択してください";

  timeInput.appendChild(
    defaultOption
  );

  for (
    let hour = 0;
    hour <= 23;
    hour += 1
  ) {
    for (
      let minute = 0;
      minute < 60;
      minute += TIME_INTERVAL
    ) {
      const timeValue =
        `${String(hour).padStart(
          2,
          "0"
        )}:` +
        `${String(minute).padStart(
          2,
          "0"
        )}`;

      const option =
        document.createElement(
          "option"
        );

      option.value = timeValue;
      option.textContent =
        timeValue;

      timeInput.appendChild(
        option
      );
    }
  }
}

/* ---------- バリデーション ---------- */

function isKatakana(text) {
  return /^[ァ-ヶー\s　]+$/.test(
    text
  );
}

function isValidPhoneNumber(text) {
  const normalizedPhone =
    text.replace(
      /[-ー\s　]/g,
      ""
    );

  return /^\d{10,11}$/.test(
    normalizedPhone
  );
}

function normalizePhoneNumber(text) {
  return text.replace(
    /[-ー\s　]/g,
    ""
  );
}

function getSelectedDateTime() {
  if (
    !dateInput.value ||
    !timeInput.value
  ) {
    return null;
  }

  const selectedDateTime =
    new Date(
      `${dateInput.value}T${timeInput.value}:00`
    );

  if (
    Number.isNaN(
      selectedDateTime.getTime()
    )
  ) {
    return null;
  }

  return selectedDateTime;
}

function isPastDateTime() {
  const selectedDateTime =
    getSelectedDateTime();

  if (!selectedDateTime) {
    return false;
  }

  return (
    selectedDateTime.getTime() <
    Date.now()
  );
}

function showError(
  message,
  inputElement = null
) {
  errorMessageElement.textContent =
    message;

  if (inputElement) {
    inputElement.focus();
  }

  errorMessageElement.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function clearError() {
  errorMessageElement.textContent =
    "";

  if (
    confirmationErrorMessage
  ) {
    confirmationErrorMessage.textContent =
      "";
  }
}

function showConfirmationError(
  message
) {
  if (
    !confirmationErrorMessage
  ) {
    return;
  }

  confirmationErrorMessage.textContent =
    message;

  confirmationErrorMessage.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function validateForm() {
  const menus =
    getSelectedMenus();

  const name =
    nameInput.value.trim();

  const kana =
    kanaInput.value.trim();

  const phone =
    phoneInput.value.trim();

  const email =
    emailInput.value.trim();

  const duration =
    calculateTotalDuration();

  if (menus.length === 0) {
    showError(
      "メニューを1つ以上選択してください。"
    );

    return false;
  }

  if (!dateInput.value) {
    showError(
      "希望日を選択してください。",
      dateInput
    );

    return false;
  }

  if (!timeInput.value) {
    showError(
      "開始時間を選択してください。",
      timeInput
    );

    return false;
  }

  if (
    !isValidTimeInterval(
      timeInput.value
    )
  ) {
    showError(
      "開始時間は00分・15分・30分・45分から選択してください。",
      timeInput
    );

    return false;
  }

  if (isPastDateTime()) {
    showError(
      "現在より後の予約日時を選択してください。",
      timeInput
    );

    return false;
  }

  if (duration <= 0) {
    showError(
      "メニューの時間設定を確認してください。"
    );

    return false;
  }

  if (!name) {
    showError(
      "お名前を入力してください。",
      nameInput
    );

    return false;
  }

  if (!kana) {
    showError(
      "フリガナを入力してください。",
      kanaInput
    );

    return false;
  }

  if (!isKatakana(kana)) {
    showError(
      "フリガナはカタカナで入力してください。",
      kanaInput
    );

    return false;
  }

  if (!phone) {
    showError(
      "電話番号を入力してください。",
      phoneInput
    );

    return false;
  }

  if (
    !isValidPhoneNumber(phone)
  ) {
    showError(
      "電話番号は10桁または11桁の数字で入力してください。",
      phoneInput
    );

    return false;
  }

  if (!email) {
    showError(
      "メールアドレスを入力してください。",
      emailInput
    );

    return false;
  }

  if (
    !emailInput.checkValidity()
  ) {
    showError(
      "メールアドレスを正しく入力してください。",
      emailInput
    );

    return false;
  }

  if (
    hasReservationConflict(
      dateInput.value,
      timeInput.value,
      duration
    )
  ) {
    showError(
      "選択した時間は、すでに保存されている予約と重複しています。",
      timeInput
    );

    return false;
  }

  return true;
}

/* ---------- ローカル保存 ---------- */

function loadReservations() {
  try {
    const savedData =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!savedData) {
      return [];
    }

    const parsedData =
      JSON.parse(savedData);

    return Array.isArray(parsedData)
      ? parsedData
      : [];
  } catch (error) {
    console.error(
      "予約データの読み込みに失敗しました。",
      error
    );

    return [];
  }
}

function saveReservations(
  reservations
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(reservations)
    );

    return true;
  } catch (error) {
    console.error(
      "予約データの保存に失敗しました。",
      error
    );

    return false;
  }
}

function migrateOldReservations() {
  try {
    const currentData =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (currentData) {
      return;
    }

    for (
      const oldKey of OLD_STORAGE_KEYS
    ) {
      const oldData =
        localStorage.getItem(
          oldKey
        );

      if (!oldData) {
        continue;
      }

      const parsedData =
        JSON.parse(oldData);

      if (
        Array.isArray(parsedData)
      ) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            parsedData
          )
        );

        return;
      }
    }
  } catch (error) {
    console.error(
      "過去の予約データ移行に失敗しました。",
      error
    );
  }
}

function generateBookingId() {
  const now = new Date();

  const datePart = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getDate()
    ).padStart(2, "0")
  ].join("");

  const timePart = [
    String(
      now.getHours()
    ).padStart(2, "0"),

    String(
      now.getMinutes()
    ).padStart(2, "0"),

    String(
      now.getSeconds()
    ).padStart(2, "0")
  ].join("");

  const randomPart =
    Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase();

  return (
    `BK-${datePart}-` +
    `${timePart}-${randomPart}`
  );
}

/* ---------- 重複予約判定 ---------- */

function hasReservationConflict(
  date,
  startTime,
  duration
) {
  const newStart =
    convertTimeToMinutes(
      startTime
    );

  const safeDuration =
    Number(duration);

  if (
    newStart === null ||
    !Number.isFinite(
      safeDuration
    ) ||
    safeDuration <= 0
  ) {
    return false;
  }

  const newEnd =
    newStart + safeDuration;

  return loadReservations().some(
    (reservation) => {
      if (
        reservation.date !== date
      ) {
        return false;
      }

      const existingStart =
        convertTimeToMinutes(
          reservation.startTime
        );

      const existingDuration =
        Number(
          reservation.duration
        );

      if (
        existingStart === null ||
        !Number.isFinite(
          existingDuration
        ) ||
        existingDuration <= 0
      ) {
        return false;
      }

      const existingEnd =
        existingStart +
        existingDuration;

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      );
    }
  );
}

/* ---------- 予約データ作成 ---------- */

function createReservationFromForm() {
  const menus =
    getSelectedMenus();

  const menuPrice =
    calculateMenuPrice();

  const extraTimePrice =
    calculateExtraTimeFee();

  const rentalPrice =
    calculateRentalFee();

  return {
    id:
      generateBookingId(),

    menus:
      menus.map(
        (menu) => menu.name
      ),

    menuDetails:
      menus,

    date:
      dateInput.value,

    startTime:
      timeInput.value,

    endTime:
      calculateEstimatedEndTime(),

    duration:
      calculateTotalDuration(),

    name:
      nameInput.value.trim(),

    kana:
      kanaInput.value.trim(),

    phone:
      normalizePhoneNumber(
        phoneInput.value.trim()
      ),

    email:
      emailInput.value.trim(),

    rentalGym:
      rentalGymInput.checked,

    notes:
      notesInput.value.trim(),

    menuPrice,
    extraTimePrice,
    rentalPrice,

    totalPrice:
      menuPrice +
      extraTimePrice +
      rentalPrice,

    createdAt:
      new Date().toISOString()
  };
}

/* ---------- 確認画面 ---------- */

function displayConfirmation(
  reservation
) {
  clearError();

  confirmMenusElement.textContent =
    reservation.menus.join("、");

  confirmDateTimeElement.textContent =
    `${formatDate(
      reservation.date
    )} ${reservation.startTime}`;

  confirmEndTimeElement.textContent =
    reservation.endTime ||
    "未設定";

  confirmNameElement.textContent =
    reservation.name;

  confirmKanaElement.textContent =
    reservation.kana;

  confirmPhoneElement.textContent =
    reservation.phone;

  confirmEmailElement.textContent =
    reservation.email;

  confirmRentalElement.textContent =
    reservation.rentalGym
      ? "利用する"
      : "利用しない";

  confirmNotesElement.textContent =
    reservation.notes ||
    "なし";

  confirmMenuPriceElement.textContent =
    formatPrice(
      reservation.menuPrice
    );

  confirmExtraTimePriceElement.textContent =
    formatPrice(
      reservation.extraTimePrice
    );

  confirmRentalPriceElement.textContent =
    formatPrice(
      reservation.rentalPrice
    );

  confirmDurationElement.textContent =
    `${reservation.duration}分`;

  confirmTotalElement.textContent =
    formatPrice(
      reservation.totalPrice
    );

  bookingForm.classList.add(
    "hidden"
  );

  completedSection.classList.add(
    "hidden"
  );

  confirmationSection.classList.remove(
    "hidden"
  );

  confirmationSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* ---------- 完了画面 ---------- */

function displayCompleted(
  reservation
) {
  completedBookingIdElement.textContent =
    reservation.id;

  completedDateTimeElement.textContent =
    `${formatDate(
      reservation.date
    )} ${reservation.startTime}`;

  completedEndTimeElement.textContent =
    reservation.endTime ||
    "未設定";

  completedMenusElement.textContent =
    reservation.menus.join("、");

  completedTotalElement.textContent =
    formatPrice(
      reservation.totalPrice
    );

  bookingForm.classList.add(
    "hidden"
  );

  confirmationSection.classList.add(
    "hidden"
  );

  completedSection.classList.remove(
    "hidden"
  );

  completedSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* ---------- 予約一覧 ---------- */

function createReservationCard(
  reservation
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "reservation-card";

  const idBadge =
    document.createElement(
      "span"
    );

  idBadge.className =
    "reservation-id";

  idBadge.textContent =
    reservation.id;

  const title =
    document.createElement(
      "h3"
    );

  title.textContent =
    `${formatDate(
      reservation.date
    )} ` +
    `${reservation.startTime}` +
    `〜${reservation.endTime}`;

  const details =
    document.createElement(
      "dl"
    );

  const rows = [
    [
      "お名前",
      reservation.name
    ],
    [
      "フリガナ",
      reservation.kana
    ],
    [
      "メニュー",
      Array.isArray(
        reservation.menus
      )
        ? reservation.menus.join(
            "、"
          )
        : "未設定"
    ],
    [
      "合計時間",
      `${reservation.duration}分`
    ],
    [
      "メニュー料金",
      formatPrice(
        reservation.menuPrice ??
          reservation.totalPrice
      )
    ],
    [
      "時間外料金",
      formatPrice(
        reservation.extraTimePrice ??
          0
      )
    ],
    [
      "レンタルジム料金",
      formatPrice(
        reservation.rentalPrice ??
          (
            reservation.rentalGym
              ? RENTAL_GYM_FEE
              : 0
          )
      )
    ],
    [
      "合計金額",
      formatPrice(
        reservation.totalPrice
      )
    ],
    [
      "レンタルジム",
      reservation.rentalGym
        ? "利用する"
        : "利用しない"
    ],
    [
      "電話番号",
      reservation.phone
    ],
    [
      "メール",
      reservation.email
    ],
    [
      "ご要望",
      reservation.notes ||
        "なし"
    ]
  ];

  rows.forEach(
    ([label, value]) => {
      const row =
        document.createElement(
          "div"
        );

      const dt =
        document.createElement(
          "dt"
        );

      const dd =
        document.createElement(
          "dd"
        );

      dt.textContent = label;
      dd.textContent = value;

      row.append(dt, dd);
      details.appendChild(row);
    }
  );

  const cancelButton =
    document.createElement(
      "button"
    );

  cancelButton.type =
    "button";

  cancelButton.className =
    "cancel-button";

  cancelButton.textContent =
    "この予約をキャンセルする";

  cancelButton.addEventListener(
    "click",
    () => {
      const shouldCancel =
        window.confirm(
          `${formatDate(
            reservation.date
          )} ` +
          `${reservation.startTime}の予約を` +
          `キャンセルしますか？`
        );

      if (!shouldCancel) {
        return;
      }

      const updatedReservations =
        loadReservations().filter(
          (item) =>
            item.id !==
            reservation.id
        );

      const saved =
        saveReservations(
          updatedReservations
        );

      if (!saved) {
        window.alert(
          "予約のキャンセルに失敗しました。"
        );

        return;
      }

      renderReservations();
    }
  );

  card.append(
    idBadge,
    title,
    details,
    cancelButton
  );

  return card;
}

function renderReservations() {
  const reservations =
    loadReservations().sort(
      (a, b) => {
        const aDate =
          `${a.date}T${a.startTime}`;

        const bDate =
          `${b.date}T${b.startTime}`;

        return aDate.localeCompare(
          bDate
        );
      }
    );

  reservationListElement.innerHTML =
    "";

  if (
    reservations.length === 0
  ) {
    emptyReservationMessage.classList.remove(
      "hidden"
    );

    return;
  }

  emptyReservationMessage.classList.add(
    "hidden"
  );

  reservations.forEach(
    (reservation) => {
      reservationListElement.appendChild(
        createReservationCard(
          reservation
        )
      );
    }
  );
}

/* ---------- 入力変更 ---------- */

menuInputs.forEach((input) => {
  input.addEventListener(
    "change",
    () => {
      clearError();
      updateSummary();
    }
  );
});

dateInput.addEventListener(
  "change",
  clearError
);

timeInput.addEventListener(
  "change",
  () => {
    clearError();
    updateSummary();
  }
);

rentalGymInput.addEventListener(
  "change",
  () => {
    clearError();
    updateSummary();
  }
);

/* ---------- 確認画面へ進む ---------- */

bookingForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    clearError();
    updateSummary();

    if (!validateForm()) {
      return;
    }

    pendingReservation =
      createReservationFromForm();

    displayConfirmation(
      pendingReservation
    );
  }
);

/* ---------- 入力内容を修正 ---------- */

editButton.addEventListener(
  "click",
  () => {
    clearError();

    confirmationSection.classList.add(
      "hidden"
    );

    completedSection.classList.add(
      "hidden"
    );

    bookingForm.classList.remove(
      "hidden"
    );

    bookingForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
);

/* ---------- 予約確定 ---------- */

submitRequestButton.addEventListener(
  "click",
  () => {
    if (
      !pendingReservation ||
      isSubmitting
    ) {
      return;
    }

    clearError();

    isSubmitting = true;

    const originalText =
      submitRequestButton.textContent;

    submitRequestButton.disabled =
      true;

    submitRequestButton.textContent =
      "予約を登録しています…";

    try {
      if (
        hasReservationConflict(
          pendingReservation.date,
          pendingReservation.startTime,
          pendingReservation.duration
        )
      ) {
        confirmationSection.classList.add(
          "hidden"
        );

        bookingForm.classList.remove(
          "hidden"
        );

        showError(
          "確認中に同じ時間の予約が追加されました。別の時間を選択してください。",
          timeInput
        );

        pendingReservation = null;

        return;
      }

      const reservations =
        loadReservations();

      const savedReservation = {
        ...pendingReservation
      };

      reservations.push(
        savedReservation
      );

      const saveSucceeded =
        saveReservations(
          reservations
        );

      if (!saveSucceeded) {
        showConfirmationError(
          "予約の保存に失敗しました。もう一度お試しください。"
        );

        return;
      }

      displayCompleted(
        savedReservation
      );

      pendingReservation = null;

      renderReservations();
    } finally {
      isSubmitting = false;

      submitRequestButton.disabled =
        false;

      submitRequestButton.textContent =
        originalText;
    }
  }
);

/* ---------- 新しい予約 ---------- */

newBookingButton.addEventListener(
  "click",
  () => {
    bookingForm.reset();

    createTimeOptions();

    pendingReservation = null;
    isSubmitting = false;

    clearError();
    setMinimumDate();
    updateSummary();

    confirmationSection.classList.add(
      "hidden"
    );

    completedSection.classList.add(
      "hidden"
    );

    bookingForm.classList.remove(
      "hidden"
    );

    bookingForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
);

/* ---------- 保存済み予約 ---------- */

showReservationsButton.addEventListener(
  "click",
  () => {
    renderReservations();

    reservationListSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
);

refreshReservationsButton.addEventListener(
  "click",
  renderReservations
);

/* ---------- 最小予約日 ---------- */

function setMinimumDate() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  dateInput.min =
    `${year}-${month}-${day}`;
}

/* ---------- 初期表示 ---------- */

function initializeBookingForm() {
  createTimeOptions();
  migrateOldReservations();
  setMinimumDate();
  updateSummary();
  renderReservations();

  bookingForm.classList.remove(
    "hidden"
  );

  confirmationSection.classList.add(
    "hidden"
  );

  completedSection.classList.add(
    "hidden"
  );
}

initializeBookingForm();