import {
  auth,
  db,
  configReady
} from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const $ = s => document.querySelector(s);

let currentUser = null;
let matches = {};

function notice(text, error = false) {
  $("#adminNotice").textContent = text;
  $("#adminNotice").className =
    "notice " + (error ? "error" : "success");
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

if (!configReady()) {
  notice("أكمل إعداد Firebase Web App في js/firebase.js.", true);
}

// التحقق من تسجيل الدخول وصلاحية المسؤول
onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;
  $("#adminEmail").textContent = user.email || "مسؤول";

  try {

    const snapshot = await get(
      ref(db, `admins/${user.uid}`)
    );

    if (snapshot.val() !== true) {

      notice(
        "هذا الحساب ليس لديه صلاحية إدارة. اطلب من مالك المشروع إضافته إلى admins.",
        true
      );

      document.querySelectorAll(
        "#createMatchForm input, #createMatchForm select, #createMatchForm textarea, #createMatchForm button, #createNewsForm input, #createNewsForm textarea, #createNewsForm button, #addStream"
      ).forEach(element => {
        element.disabled = true;
      });

      return;
    }

    notice("تم التحقق من صلاحيات المسؤول.");

    startAdmin();

  } catch (error) {

    notice(
      "تعذر التحقق من الصلاحيات. راجع قواعد Firebase.",
      true
    );

  }

});

// تشغيل لوحة الإدارة
function startAdmin() {

  onValue(ref(db, "matches"), snapshot => {

    matches = snapshot.val() || {};

    const values = Object.values(matches);

    $("#totalMatches").textContent =
      values.filter(x => x.published !== false).length;

    $("#liveMatches").textContent =
      values.filter(
        x => x.status === "live" && x.published !== false
      ).length;

    renderMatches();

  });

  onValue(ref(db, "news"), snapshot => {

    const news = snapshot.val() || {};

    $("#totalNews").textContent =
      Object.values(news).filter(
        x => x.published !== false
      ).length;

  });

  $("#createMatchForm").addEventListener(
    "submit",
    createMatch
  );

  $("#createNewsForm").addEventListener(
    "submit",
    createNews
  );

}

// قراءة روابط البث
function readStreams() {

  return [
    ...document.querySelectorAll(".stream-row")
  ].map(row => ({

    type: row.querySelector(".streamType").value,

    url: row.querySelector(".streamUrl").value.trim(),

    name:
      row.querySelector(".streamName").value.trim() ||
      "سيرفر"

  })).filter(stream => stream.url);

}

// إضافة سيرفر جديد
$("#addStream").onclick = () => {

  const div = document.createElement("div");

  div.className = "stream-row";

  div.innerHTML = `

    <select class="streamType">

      <option value="hls">HLS / M3U8</option>

      <option value="mp4">MP4</option>

      <option value="embed">Embed</option>

    </select>

    <input
      class="streamUrl"
      type="url"
      placeholder="https://example.com/live.m3u8"
    >

    <input
      class="streamName"
      placeholder="اسم السيرفر"
    >

    <button type="button" class="remove-stream">×</button>

  `;

  div.querySelector("button").onclick = () => {
    div.remove();
  };

  $("#streamRows").append(div);

};

// نشر مباراة
async function createMatch(event) {

  event.preventDefault();

  const streams = readStreams();

  const dateValue = $("#matchDate").value;

  if (!dateValue || Number.isNaN(new Date(dateValue).getTime())) {
    notice("أدخل موعداً صحيحاً للمباراة.", true);
    return;
  }

  const id = push(ref(db, "matches")).key;

  const match = {

    competition: $("#competition").value.trim(),

    homeTeam: $("#homeTeam").value.trim(),

    awayTeam: $("#awayTeam").value.trim(),

    date: new Date(dateValue).toISOString(),

    status: $("#matchStatus").value,

    homeScore: Number($("#homeScore").value || 0),

    awayScore: Number($("#awayScore").value || 0),

    homeLogo: $("#homeLogo").value.trim(),

    awayLogo: $("#awayLogo").value.trim(),

    streams: streams,

    note: $("#matchNote").value.trim(),

    published: true,

    createdAt: Date.now(),

    createdBy: currentUser.uid

  };

  try {

    await set(
      ref(db, `matches/${id}`),
      match
    );

    event.target.reset();

    $("#streamRows").innerHTML = `

      <div class="stream-row">

        <select class="streamType">
          <option value="hls">HLS / M3U8</option>
          <option value="mp4">MP4</option>
          <option value="embed">Embed</option>
        </select>

        <input
          class="streamUrl"
          type="url"
          placeholder="https://example.com/live.m3u8"
        >

        <input
          class="streamName"
          placeholder="السيرفر الأساسي"
        >

      </div>

    `;

    notice("تم نشر المباراة بنجاح.");

  } catch (error) {

    notice("فشل النشر: " + error.message, true);

  }

}

// عرض المباريات في لوحة الإدارة
function renderMatches() {

  const rows = Object.entries(matches);

  $("#adminMatches").innerHTML = rows.length

    ? rows.map(([id, match]) => `

      <div class="admin-match">

        <div>

          <b>
            ${esc(match.homeTeam)} × ${esc(match.awayTeam)}
          </b>

          <small>
            ${esc(match.competition)}
            ·
            ${
              match.status === "live"
                ? "مباشر"
                : match.status === "finished"
                ? "انتهت"
                : "قادمة"
            }
          </small>

        </div>

        <div class="admin-actions">

          <button
            class="btn tiny ghost"
            data-status="${id}"
            data-next="${
              match.status === "live"
                ? "finished"
                : "live"
            }"
          >
            ${
              match.status === "live"
                ? "إنهاء"
                : "تحويل لمباشر"
            }
          </button>

          <button
            class="btn tiny danger"
            data-delete="${id}"
          >
            حذف
          </button>

        </div>

      </div>

    `).join("")

    : '<div class="empty">لا توجد مباريات.</div>';

  // تغيير حالة المباراة
  $("#adminMatches")
    .querySelectorAll("[data-status]")
    .forEach(button => {

      button.onclick = async () => {

        try {

          await update(
            ref(db, `matches/${button.dataset.status}`),
            {
              status: button.dataset.next
            }
          );

          notice("تم تحديث حالة المباراة.");

        } catch (error) {

          notice(error.message, true);

        }

      };

    });

  // حذف مباراة
  $("#adminMatches")
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.onclick = async () => {

        if (!confirm("هل تريد حذف المباراة نهائياً؟")) {
          return;
        }

        try {

          await remove(
            ref(db, `matches/${button.dataset.delete}`)
          );

          notice("تم حذف المباراة.");

        } catch (error) {

          notice(error.message, true);

        }

      };

    });

}

// نشر خبر
async function createNews(event) {

  event.preventDefault();

  try {

    const newsRef = push(ref(db, "news"));

    await set(newsRef, {

      title: $("#newsTitle").value.trim(),

      body: $("#newsBody").value.trim(),

      image: $("#newsImage").value.trim(),

      published: true,

      createdAt: Date.now(),

      createdBy: currentUser.uid

    });

    event.target.reset();

    notice("تم نشر الخبر بنجاح.");

  } catch (error) {

    notice("فشل نشر الخبر: " + error.message, true);

  }

}

// تسجيل الخروج
$("#adminLogout").onclick = () => signOut(auth);
