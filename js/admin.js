"use strict";

/* ========================================
   Ver.0.8.0
   トレーナー専用 予約管理画面
======================================== */

/* ---------- 要素 ---------- */

const loginSection =
  document.getElementById("loginSection");

const dashboardSection =
  document.getElementById("dashboardSection");

const loginForm =
  document.getElementById("loginForm");

const loginEmail =
  document.getElementById("loginEmail");

const loginPassword =
  document.getElementById("loginPassword");

const loginButton =
  document.getElementById("loginButton");

const loginError =
  document.getElementById("loginError");

const logoutButton =
  document.getElementById("logoutButton");

const loggedInUser =
  document.getElementById("loggedInUser");

const refreshButton =
  document.getElementById("refreshButton");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");

const dateFilter =
  document.getElementById("dateFilter");

const clearFilterButton =
  document.getElementById("clearFilterButton");

const reservationList =
  document.getElementById("reservationList");

const loadingSection =
  document.getElementById("loadingSection");

const emptySection =
  document.getElementById("emptySection");

const adminError =
  document.getElementById("adminError");

const totalReservations =
  document.getElementById("totalReservations");

const pendingReservations =
  document.getElementById("pendingReservations");

const confirmedReservations =
  document.getElementById("confirmedReservations");

const completedReservations =
  document.getElementById("completedReservations");

/* ---------- モーダル ---------- */

const reservationModal =
  document.getElementById("reservationModal");

const closeModalButton =
  document.getElementById("closeModalButton");

const cancelModalButton =
  document.getElementById("cancelModalButton");

const saveReservationButton =
  document.getElementById("saveReservationButton");

const deleteReservationButton =
  document.getElementById("deleteReservationButton");

const detailId =
  document.getElementById("detailId");

const detailName =
  document.getElementById("detailName");

const detailPhone =
  document.getElementById("detailPhone");

const detailEmail =
  document.getElementById("detailEmail");

const detailMenu =
  document.getElementById("detailMenu");

const detailDate =
  document.getElementById("detailDate");

const detailTime =
  document.getElementById("detailTime");

const detailDuration =
  document.getElementById("detailDuration");

const detailPrice =
  document.getElementById("detailPrice");

const detailCreatedAt =
  document.getElementById("detailCreatedAt");

const detailStatus =
  document.getElementById("detailStatus");

const detailMemo =
  document.getElementById("detailMemo");

const modalError =
  document.getElementById("modalError");


/* ---------- 状態 ---------- */

let reservations = [];
let selectedReservation = null;


/* ---------- 共通 ---------- */

function formatPrice(value) {
  const number = Number(value) || 0;

  return `${number.toLocaleString("ja-JP")}円`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "申請中";

    case "confirmed":
      return "確定";

    case "completed":
      return "完了";

    case "cancelled":
      return "キャンセル";

    default:
      return status || "-";
  }
}

function clearErrors() {
  loginError.textContent = "";
  adminError.textContent = "";
  modalError.textContent = "";
}


/* ---------- ログイン表示 ---------- */

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  logoutButton.classList.add("hidden");

  reservationList.innerHTML = "";
}

function showDashboard(user) {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  logoutButton.classList.remove("hidden");

  loggedInUser.textContent =
    user?.email
      ? `ログイン中：${user.email}`
      : "";
}


/* ---------- ログイン ---------- */

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearErrors();

    const email =
      loginEmail.value.trim();

    const password =
      loginPassword.value;

    if (!email || !password) {
      loginError.textContent =
        "メールアドレスとパスワードを入力してください。";

      return;
    }

    loginButton.disabled = true;
    loginButton.textContent =
      "ログイン中…";

    try {
      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {
        throw error;
      }

      showDashboard(data.user);

      await loadReservations();
    } catch (error) {
      console.error(
        "ログインエラー:",
        error
      );

      loginError.textContent =
        "ログインできませんでした。メールアドレスまたはパスワードを確認してください。";
    } finally {
      loginButton.disabled = false;
      loginButton.textContent =
        "ログイン";
    }
  }
);


/* ---------- ログアウト ---------- */

logoutButton.addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    reservations = [];
    selectedReservation = null;

    showLogin();
  }
);


/* ---------- 予約取得 ---------- */

async function loadReservations() {
  clearErrors();

  loadingSection.classList.remove(
    "hidden"
  );

  emptySection.classList.add(
    "hidden"
  );

  reservationList.innerHTML = "";

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("reservations")
        .select("*")
        .order(
          "reservation_date",
          {
            ascending: true
          }
        )
        .order(
          "reservation_time",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    reservations =
      Array.isArray(data)
        ? data
        : [];

    updateSummary();

    renderReservations();
  } catch (error) {
    console.error(
      "予約取得エラー:",
      error
    );

    adminError.textContent =
      "予約情報を取得できませんでした。管理者権限の設定を確認してください。";
  } finally {
    loadingSection.classList.add(
      "hidden"
    );
  }
}


/* ---------- 集計 ---------- */

function updateSummary() {
  totalReservations.textContent =
    reservations.length;

  pendingReservations.textContent =
    reservations.filter(
      (item) =>
        item.status === "pending"
    ).length;

  confirmedReservations.textContent =
    reservations.filter(
      (item) =>
        item.status === "confirmed"
    ).length;

  completedReservations.textContent =
    reservations.filter(
      (item) =>
        item.status === "completed"
    ).length;
}


/* ---------- 絞り込み ---------- */

function getFilteredReservations() {
  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();

  const status =
    statusFilter.value;

  const date =
    dateFilter.value;

  return reservations.filter(
    (reservation) => {
      if (
        status &&
        reservation.status !== status
      ) {
        return false;
      }

      if (
        date &&
        reservation.reservation_date !==
          date
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchTarget = [
        reservation.customer_name,
        reservation.customer_phone,
        reservation.customer_email,
        reservation.menu,
        reservation.memo
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(
        keyword
      );
    }
  );
}


/* ---------- 一覧描画 ---------- */

function renderReservations() {
  const filtered =
    getFilteredReservations();

  reservationList.innerHTML = "";

  if (filtered.length === 0) {
    emptySection.classList.remove(
      "hidden"
    );

    return;
  }

  emptySection.classList.add(
    "hidden"
  );

  filtered.forEach(
    (reservation) => {
      const card =
        document.createElement(
          "article"
        );

      card.className =
        "reservation-card";

      const title =
        document.createElement("h3");

      title.textContent =
        `${reservation.reservation_date} ` +
        `${reservation.reservation_time}`;

      const name =
        document.createElement("p");

      name.textContent =
        reservation.customer_name ||
        "-";

      const menu =
        document.createElement("p");

      menu.textContent =
        reservation.menu ||
        "-";

      const status =
        document.createElement("span");

      status.className =
        `status-badge status-${reservation.status}`;

      status.textContent =
        getStatusLabel(
          reservation.status
        );

      const price =
        document.createElement("strong");

      price.textContent =
        formatPrice(
          reservation.price
        );

      const detailButton =
        document.createElement(
          "button"
        );

      detailButton.type =
        "button";

      detailButton.className =
        "primary-button";

      detailButton.textContent =
        "詳細を見る";

      detailButton.addEventListener(
        "click",
        () => {
          openReservationModal(
            reservation
          );
        }
      );

      card.append(
        status,
        title,
        name,
        menu,
        price,
        detailButton
      );

      reservationList.appendChild(
        card
      );
    }
  );
}


/* ---------- 詳細 ---------- */

function openReservationModal(
  reservation
) {
  selectedReservation =
    reservation;

  modalError.textContent = "";

  detailId.textContent =
    reservation.id ?? "-";

  detailName.textContent =
    reservation.customer_name ||
    "-";

  detailPhone.textContent =
    reservation.customer_phone ||
    "-";

  detailEmail.textContent =
    reservation.customer_email ||
    "-";

  detailMenu.textContent =
    reservation.menu ||
    "-";

  detailDate.textContent =
    reservation.reservation_date ||
    "-";

  detailTime.textContent =
    reservation.reservation_time ||
    "-";

  detailDuration.textContent =
    reservation.duration != null
      ? `${reservation.duration}分`
      : "-";

  detailPrice.textContent =
    formatPrice(
      reservation.price
    );

  detailCreatedAt.textContent =
    formatDateTime(
      reservation.created_at
    );

  detailStatus.value =
    reservation.status ||
    "pending";

  detailMemo.value =
    reservation.memo ||
    "";

  reservationModal.classList.remove(
    "hidden"
  );

  reservationModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeReservationModal() {
  selectedReservation = null;

  reservationModal.classList.add(
    "hidden"
  );

  reservationModal.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* ---------- 変更保存 ---------- */

saveReservationButton.addEventListener(
  "click",
  async () => {
    if (!selectedReservation) {
      return;
    }

    clearErrors();

    saveReservationButton.disabled =
      true;

    saveReservationButton.textContent =
      "保存中…";

    try {
      const {
        error
      } =
        await supabaseClient
          .from("reservations")
          .update({
            status:
              detailStatus.value,

            memo:
              detailMemo.value.trim()
          })
          .eq(
            "id",
            selectedReservation.id
          );

      if (error) {
        throw error;
      }

      closeReservationModal();

      await loadReservations();
    } catch (error) {
      console.error(
        "予約更新エラー:",
        error
      );

      modalError.textContent =
        "変更を保存できませんでした。";
    } finally {
      saveReservationButton.disabled =
        false;

      saveReservationButton.textContent =
        "変更を保存";
    }
  }
);


/* ---------- 削除 ---------- */

deleteReservationButton.addEventListener(
  "click",
  async () => {
    if (!selectedReservation) {
      return;
    }

    const confirmed =
      window.confirm(
        "この予約を完全に削除しますか？"
      );

    if (!confirmed) {
      return;
    }

    clearErrors();

    try {
      const {
        error
      } =
        await supabaseClient
          .from("reservations")
          .delete()
          .eq(
            "id",
            selectedReservation.id
          );

      if (error) {
        throw error;
      }

      closeReservationModal();

      await loadReservations();
    } catch (error) {
      console.error(
        "予約削除エラー:",
        error
      );

      modalError.textContent =
        "予約を削除できませんでした。";
    }
  }
);


/* ---------- 検索 ---------- */

searchInput.addEventListener(
  "input",
  renderReservations
);

statusFilter.addEventListener(
  "change",
  renderReservations
);

dateFilter.addEventListener(
  "change",
  renderReservations
);

clearFilterButton.addEventListener(
  "click",
  () => {
    searchInput.value = "";
    statusFilter.value = "";
    dateFilter.value = "";

    renderReservations();
  }
);

refreshButton.addEventListener(
  "click",
  loadReservations
);


/* ---------- モーダル閉じる ---------- */

closeModalButton.addEventListener(
  "click",
  closeReservationModal
);

cancelModalButton.addEventListener(
  "click",
  closeReservationModal
);


/* ---------- 初期ログイン状態 ---------- */

async function initializeAdmin() {
  clearErrors();

  const {
    data,
    error
  } =
    await supabaseClient.auth
      .getSession();

  if (error) {
    console.error(
      "セッション確認エラー:",
      error
    );

    showLogin();

    return;
  }

  const session =
    data.session;

  if (!session) {
    showLogin();

    return;
  }

  showDashboard(
    session.user
  );

  await loadReservations();
}

initializeAdmin();