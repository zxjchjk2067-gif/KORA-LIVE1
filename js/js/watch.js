import {
  db,
  configReady
} from "./firebase.js";

import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const $ = selector => document.querySelector(selector);

const id = new URLSearchParams(
  location.search
).get("id");

function esc(value = "") {

  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

}

function msg(text, error = false) {

  $("#playerMessage").textContent = text;

  $("#playerMessage").className =
    "notice " + (error ? "error" : "");

}

// إيقاف المشغل السابق
function stopPlayer() {

  const video = $("#videoStage").querySelector("video");

  if (video) {

    video.pause();

    video.removeAttribute("src");

    video.load();

  }

  $("#videoStage").innerHTML = "";

}

// تشغيل السيرفر
function play(stream) {

  stopPlayer();

  $("#serverLabel").textContent =
    stream.name || "سيرفر البث";

  const stage = $("#videoStage");

  // روابط Embed
  if (stream.type === "embed") {

    try {

      const url = new URL(stream.url);

      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Invalid URL");
      }

      const iframe = document.createElement("iframe");

      iframe.src = url.href;

      iframe.allow =
        "autoplay; fullscreen; picture-in-picture";

      iframe.allowFullscreen = true;

      iframe.referrerPolicy =
        "strict-origin-when-cross-origin";

      iframe.title = "مشغل البث";

      stage.appendChild(iframe);

      msg(
        "إذا لم يعمل التضمين، فقد يمنع مزود البث عرضه داخل مواقع أخرى."
      );

    } catch {

      msg("رابط التضمين غير صالح.", true);

    }

    return;

  }

  // إنشاء مشغل فيديو
  const video = document.createElement("video");

  video.controls = true;

  video.playsInline = true;

  video.autoplay = true;

  stage.appendChild(video);

  // MP4
  if (stream.type === "mp4") {

    video.src = stream.url;

    video.play().catch(() => {
      msg("اضغط تشغيل لبدء الفيديو.");
    });

    return;

  }

  // HLS / M3U8
  if (window.Hls && Hls.isSupported()) {

    const hls = new Hls({
      enableWorker: true
    });

    hls.loadSource(stream.url);

    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, (_, data) => {

      if (data.fatal) {

        msg(
          "تعذر تشغيل هذا السيرفر. جرّب سيرفر آخر أو تحقق من الرابط وCORS.",
          true
        );

        hls.destroy();

      }

    });

    video.play().catch(() => {
      msg("اضغط تشغيل لبدء البث.");
    });

  }

  else if (
    video.canPlayType("application/vnd.apple.mpegurl")
  ) {

    video.src = stream.url;

  }

  else {

    msg(
      "هذا المتصفح لا يدعم تشغيل HLS مباشرة.",
      true
    );

  }

}

// جلب بيانات المباراة
async function init() {

  if (!configReady()) {

    msg("أكمل إعداد Firebase أولاً.", true);

    return;

  }

  if (!id) {

    msg("معرّف المباراة غير موجود.", true);

    return;

  }

  try {

    const snapshot = await get(
      ref(db, `matches/${id}`)
    );

    if (
      !snapshot.exists() ||
      snapshot.val().published === false
    ) {

      $("#matchHeading").textContent =
        "المباراة غير متاحة";

      return;

    }

    const match = snapshot.val();

    $("#matchHeading").innerHTML = `

      <span class="eyebrow">
        ${esc(match.competition || "مباراة")}
      </span>

      <h1>
        ${esc(match.homeTeam)}
        <em>×</em>
        ${esc(match.awayTeam)}
      </h1>

      <p>
        ${
          match.status === "live"
            ? "● مباشر"
            : match.status === "finished"
            ? "انتهت المباراة"
            : new Date(match.date).toLocaleString("ar-EG")
        }
      </p>

    `;

    $("#matchDetails").innerHTML = `

      <h3>تفاصيل المباراة</h3>

      <p>${esc(match.note || "تابع المباراة من مشغل كورة لايف.")}</p>

      <p>
        النتيجة:
        ${Number(match.homeScore || 0)}
        -
        ${Number(match.awayScore || 0)}
      </p>

    `;

    const streams = Array.isArray(match.streams)
      ? match.streams
      : Object.values(match.streams || {});

    $("#serverList").innerHTML = streams.length

      ? streams.map((stream, index) => `

        <button
          class="server-btn"
          data-server="${index}"
        >
          ${esc(stream.name || "سيرفر " + (index + 1))}
        </button>

      `).join("")

      : '<div class="empty">لا يوجد رابط بث مضاف لهذه المباراة حتى الآن.</div>';

    $("#serverList")
      .querySelectorAll("button")
      .forEach((button, index) => {

        button.onclick = () => {
          play(streams[index]);
        };

      });

    if (streams.length) {
      play(streams[0]);
    }

  } catch (error) {

    msg(
      "تعذر تحميل المباراة: " + error.message,
      true
    );

  }

}

init();
