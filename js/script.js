"use strict";

/* ========================================
   Ver.0.8.0
   お客様用トレーニング予約フォーム
   Supabase保存対応
======================================== */

/* ========================================
   HTML要素
======================================== */

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

/* エラー表示 */

const errorMessageElement =
  document.getElementById(
    "errorMessage"
  );

const confirmationErrorMessage =
  document.getElementById(
    "confirmationErrorMessage"
  );

/* 各画面 */

const confirmationSection =
  document.getElementById(
    "confirmation"
  );

const completedSection =
  document.getElementById(
    "completed"
  );

const reservationListSection =
  document.getElementById(
    "reservationListSection"
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

/* ========================================
   設定
======================================== */

const EXTRA_TIME_FEE = 500;
const RENTAL_GYM_FEE = 1500;

const OPENING_HOUR = 10;
const EXTRA_TIME_START_HOUR = 21;

const TIME_INTERVAL = 15;

let pendingReservation = null;
let isSubmitting = false;

/* ========================================
   共通関数
======================================== */

function formatPrice(price) {
  const number =
    Number(price);

  const safePrice =
    Number.isFinite(number)
      ? number
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

function normalizePhoneNumber(
  phone
) {
  return phone.replace(
    /[-ー\s　]/g,
    ""
  );
}

function generateBookingNumber() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  const hours =
    String(
      now.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes()
    ).padStart(2, "0");

  const seconds =
    String(
      now.getSeconds()
    ).padStart(2, "0");

  const random =
    Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase();

  return (
    `BK-${year}${month}${day}-` +
    `${hours}${minutes}${seconds}-` +
    random
  );
}

/* ========================================
   メニュー取得・料金計算
======================================== */

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

function calculateRentalFee() {
  return rentalGymInput.checked
    ? RENTAL_GYM_FEE
    : 0;
}

/* ========================================
   時刻計算
======================================== */

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

  const adjusted =
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
      adjusted / 60
    );

  const minutes =
    adjusted % 60;

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

function calculateTotalPrice() {
  return (
    calculateMenuPrice() +
    calculateExtraTimeFee() +
    calculateRentalFee()
  );
}

/* ========================================
   画面内の料金更新
======================================== */

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

/* ========================================
   15分刻みの時間選択
======================================== */

function createTimeOptions() {
  timeInput.innerHTML = "";

  const defaultOption =
    document.createElement(
      "option"
    );

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

      option.value =
        timeValue;

      option.textContent =
        timeValue;

      timeInput.appendChild(
        option
      );
    }
  }
}

/* ========================================
   エラー表示
======================================== */

function clearError() {
  if (errorMessageElement) {
    errorMessageElement.textContent =
      "";
  }

  if (
    confirmationErrorMessage
  ) {
    confirmationErrorMessage.textContent =
      "";
  }
}

function showError(
  message,
  inputElement = null
) {
  if (errorMessageElement) {
    errorMessageElement.textContent =
      message;

    errorMessageElement.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  if (inputElement) {
    inputElement.focus();
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

/* ========================================
   入力チェック
======================================== */

function isKatakana(text) {
  return /^[ァ-ヶー\s　]+$/.test(
    text
  );
}

function isValidPhoneNumber(
  text
) {
  const normalized =
    normalizePhoneNumber(text);

  return /^\d{10,11}$/.test(
    normalized
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

  if (
    calculateTotalDuration() <= 0
  ) {
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

  return true;
}

/* ========================================
   予約データ作成
======================================== */

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
    bookingNumber:
      generateBookingNumber(),

    menus:
      menus.map(
        (menu) => menu.name
      ),

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
      emailInput.value
        .trim()
        .toLowerCase(),

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
      rentalPrice
  };
}

/* ========================================
   確認画面
======================================== */

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

/* ========================================
   完了画面
======================================== */

function displayCompleted(
  reservation
) {
  completedBookingIdElement.textContent =
    reservation.bookingNumber;

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

/* ========================================
   Supabaseへ保存
======================================== */

async function saveReservationToSupabase(
  reservation
) {
  if (
    typeof supabaseClient ===
    "undefined"
  ) {
    throw new Error(
      "Supabase接続設定が読み込まれていません。"
    );
  }

  const memoLines = [
    `予約番号：${reservation.bookingNumber}`,
    `フリガナ：${reservation.kana}`,
    `終了予定：${reservation.endTime}`,
    `メニュー料金：${formatPrice(
      reservation.menuPrice
    )}`,
    `時間外料金：${formatPrice(
      reservation.extraTimePrice
    )}`,
    `レンタルジム料金：${formatPrice(
      reservation.rentalPrice
    )}`,
    `レンタルジム：${
      reservation.rentalGym
        ? "利用する"
        : "利用しない"
    }`,
    `ご要望：${
      reservation.notes ||
      "なし"
    }`
  ];

  const databaseReservation = {
    customer_name:
      reservation.name,

    customer_phone:
      reservation.phone,

    customer_email:
      reservation.email,

    menu:
      reservation.menus.join("、"),

    reservation_date:
      reservation.date,

    reservation_time:
      reservation.startTime,

    duration:
      reservation.duration,

    price:
      reservation.totalPrice,

    status:
      "pending",

    memo:
      memoLines.join("\n")
  };

  const { error } =
    await supabaseClient
      .from("reservations")
      .insert(
        databaseReservation
      );

  if (error) {
    throw error;
  }
}

/* ========================================
   入力変更
======================================== */

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

/* ========================================
   確認画面へ進む
======================================== */

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

/* ========================================
   入力内容を修正
======================================== */

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

/* ========================================
   予約確定
======================================== */

submitRequestButton.addEventListener(
  "click",
  async () => {
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
      await saveReservationToSupabase(
        pendingReservation
      );

      const savedReservation = {
        ...pendingReservation
      };

      displayCompleted(
        savedReservation
      );

      pendingReservation = null;
    } catch (error) {
      console.error(
        "Supabase予約保存エラー:",
        error
      );

      let message =
        "予約の保存に失敗しました。時間をおいて、もう一度お試しください。";

      if (
        error &&
        error.message
      ) {
        console.error(
          "詳細:",
          error.message
        );
      }

      showConfirmationError(
        message
      );
    } finally {
      isSubmitting = false;

      submitRequestButton.disabled =
        false;

      submitRequestButton.textContent =
        originalText;
    }
  }
);

/* ========================================
   新しい予約
======================================== */

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

/* ========================================
   最小予約日
======================================== */

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

/* ========================================
   お客様画面から予約一覧を隠す
======================================== */

function hideCustomerReservationList() {
  if (reservationListSection) {
    reservationListSection.classList.add(
      "hidden"
    );
  }

  if (showReservationsButton) {
    showReservationsButton.classList.add(
      "hidden"
    );
  }

  if (
    refreshReservationsButton
  ) {
    refreshReservationsButton.classList.add(
      "hidden"
    );
  }
}

/* ========================================
   初期表示
======================================== */

function initializeBookingForm() {
  createTimeOptions();
  setMinimumDate();
  updateSummary();
  clearError();
  hideCustomerReservationList();

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

initializeBookingForm()