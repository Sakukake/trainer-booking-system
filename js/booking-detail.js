"use strict";

const $ = (id) => document.getElementById(id);

const token = new URLSearchParams(window.location.search).get("token");

const statusLabels = {
  pending: "受付中",
  confirmed: "確定",
  completed: "完了",
  cancelled: "キャンセル"
};

function setStatus(message) {
  $("bookingStatus").textContent = message;
}

function formatDateTime(value) {
  if (!value) return "不明";

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function loadBooking() {
  $("bookingDetails").hidden = true;
  $("cancelArea").hidden = true;

  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    setStatus("有効な予約確認リンクではありません。");
    return;
  }

  try {
    setStatus("予約情報を読み込んでいます...");

    const { data, error } = await supabaseClient.rpc(
      "beus_get_booking",
      { p_token: token }
    );

    if (error) throw error;

    if (!data) {
      setStatus("予約が見つかりませんでした。");
      return;
    }

    $("detailId").textContent = `#${data.booking_id}`;
    $("detailMenu").textContent = data.menu || "不明";
    $("detailDate").textContent = data.reservation_date || "不明";
    $("detailTime").textContent = data.reservation_time || "不明";
    $("detailEnd").textContent = formatDateTime(data.end_at);
    $("detailPrice").textContent =
      `${Number(data.price || 0).toLocaleString("ja-JP")}円`;
    $("detailStatus").textContent =
      statusLabels[data.status] || data.status;

    $("bookingDetails").hidden = false;
    $("cancelArea").hidden = !data.can_cancel;

    if (data.status === "cancelled") {
      setStatus("この予約はキャンセル済みです。");
    } else {
      setStatus("予約情報を確認できます。");

      if (!data.can_cancel) {
        $("cancelMessage").textContent =
          "キャンセル期限を過ぎているか、キャンセル対象外の予約です。";
      }
    }
  } catch (error) {
    console.error(error);
    setStatus("予約情報を取得できませんでした。");
  }
}

$("cancelBookingButton").addEventListener("click", async () => {
  if (!window.confirm("この予約をキャンセルしますか？")) {
    return;
  }

  const button = $("cancelBookingButton");
  button.disabled = true;

  try {
    const { data, error } = await supabaseClient.rpc(
      "beus_cancel_booking",
      { p_token: token }
    );

    if (error) throw error;

    if (data !== true) {
      throw new Error("キャンセル期限超過、または処理できない予約です。");
    }

    $("cancelMessage").textContent =
      "予約をキャンセルしました。";

    await loadBooking();
  } catch (error) {
    console.error(error);
    $("cancelMessage").textContent =
      "キャンセルできませんでした。予約状況をご確認ください。";
  } finally {
    button.disabled = false;
  }
});

loadBooking();