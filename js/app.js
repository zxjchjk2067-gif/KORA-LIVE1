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
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const $ = selector => document.querySelector(selector);

const matchesEl = $("#matchesList");
const newsEl = $("#newsList");

let allMatches = {};
let filter = "all";

$("#todayLabel").textContent =
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full"
  }).format(new Date());

$("#year").textContent = new Date().getFullYear();

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function statusText(status) {
  if (status === "live") return "مباشر";
  if (status === "finished") return "انتهت";
  return "قادمة";
}

function renderMatches() {

  const rows = Object.entries(allMatches)
    .map(([id, match]) => ({
      id,
      ...match
    }))
    .filter(match => match.published !== false)
    .sort((a, b) =>
      (a.date || "").localeCompare(b.date || "")
    );

  const shown = rows.filter(match =>
    filter === "all" || match.status === filter
  );

  if (!shown.length) {
    matchesEl.innerHTML =
      '<div class="empty">لا توجد مباريات في هذا القسم حالياً.</div>';
    return;
  }

  matchesEl.innerHTML = shown.map(match => `

    <a class="match-card"
       href="watch.html?id=${encodeURIComponent(match.id)}">

      <div class="match-meta">

        <span>${esc(match.competition || "مباراة")}</span>

        <span class="status ${esc(match.status)}">
          ${match.status === "live" ? "● " : ""}
          ${statusText(match.status)}
        </span>

      </div>

      <div class="teams">

        <div class="team">
          ${
            match.homeLogo
              ? `<img src="${esc(match.homeLogo)}" alt="">`
              : '<b class="team-placeholder">⚽</b>'
          }
          <strong>${esc(match.homeTeam)}</strong>
        </div>

        <div class="score-box">

          <b>
            ${
              match.status === "upcoming"
                ? "—"
                : Number(match.homeScore || 0) +
                  " : " +
                  Number(match.awayScore || 0)
            }
          </b>

          <small>
            ${
              match.status === "upcoming"
                ? new Date(match.date).toLocaleTimeString(
                    "ar-EG",
                    { hour: "2-digit", minute: "2-digit" }
                  )
                : "النتيجة"
            }
          </small>

        </div>

        <div class="team">
          ${
            match.awayLogo
              ? `<img src="${esc(match.awayLogo)}" alt="">`
              : '<b class="team-placeholder">⚽</b>'
          }
          <strong>${esc(match.awayTeam)}</strong>
        </div>

      </div>

      <div class="match-foot">
        <span>التفاصيل والبث</span>
        <b>←</b>
      </div>

    </a>

  `).join("");
}

if (!configReady()) {

  matchesEl.innerHTML =
    '<div class="empty">أكمل إعداد Firebase Web App داخل js/firebase.js.</div>';

} else {

  // الاستماع للمباريات في الوقت الفعلي
  onValue(ref(db, "matches"), snapshot => {

    allMatches = snapshot.val() || {};

    renderMatches();

  }, error => {

    matchesEl.innerHTML =
      '<div class="empty">تعذر تحميل المباريات. راجع اتصال Firebase.</div>';

    console.error(error);

  });

  // الاستماع للأخبار
  onValue(ref(db, "news"), snapshot => {

    const news = snapshot.val() || {};

    const items = Object.entries(news)
      .map(([id, item]) => ({
        id,
        ...item
      }))
      .filter(item => item.published !== false)
      .sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
      );

    newsEl.innerHTML = items.length
      ? items.map(item => `

        <article class="news-card">

          ${
            item.image
              ? `<img src="${esc(item.image)}" alt="">`
              : ""
          }

          <div>
            <span class="eyebrow">أخبار الكرة</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.body)}</p>
          </div>

        </article>

      `).join("")
      : '<div class="empty">لا توجد أخبار منشورة حالياً.</div>';

  });

}

// أزرار تصنيف المباريات
document.querySelectorAll(".tab").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".tab").forEach(tab =>
      tab.classList.remove("active")
    );

    button.classList.add("active");

    filter = button.dataset.filter;

    renderMatches();

  });

});

// تحديث الصفحة
$("#refreshBtn").onclick = () => location.reload();

// نافذة الحساب
const modal = $("#accountModal");

function openModal() {
  modal.classList.add("show");
}

$("#accountBtn").onclick = openModal;

$("#navAccount").onclick = event => {
  event.preventDefault();
  openModal();
};

modal.addEventListener("click", event => {

  if (
    event.target === modal ||
    event.target.matches("[data-close]")
  ) {
    modal.classList.remove("show");
  }

});

// حالة تسجيل الدخول
if (configReady()) {

  onAuthStateChanged(auth, user => {

    if (user) {

      $("#accountTitle").textContent =
        "أهلاً، " + (user.displayName || "بك");

      $("#accountInfo").textContent = user.email || "";

      $("#loginLink").classList.add("hidden");

      $("#logoutBtn").classList.remove("hidden");

    } else {

      $("#accountTitle").textContent = "أهلاً بك";

      $("#accountInfo").textContent =
        "سجّل الدخول لحفظ تفضيلاتك.";

    }

  });

}

$("#logoutBtn").onclick = () => signOut(auth);
