import {
  auth,
  db,
  googleProvider,
  configReady
} from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  ref,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const $ = selector => document.querySelector(selector);

let creating = false;

function message(text, error = false) {

  $("#authMessage").textContent = text;

  $("#authMessage").className =
    "notice " + (error ? "error" : "success");

}

function render() {

  $("#formHeading").textContent =
    creating ? "إنشاء حساب جديد" : "سجّل دخولك";

  $("#submitBtn").textContent =
    creating ? "إنشاء الحساب" : "تسجيل الدخول";

  $("#switchText").innerHTML = creating
    ? 'لديك حساب بالفعل؟ <button class="text-btn" id="switchBtn">سجّل الدخول</button>'
    : 'ليس لديك حساب؟ <button class="text-btn" id="switchBtn">أنشئ حساباً</button>';

  $("#switchBtn").onclick = () => {

    creating = !creating;

    render();

  };

}

render();

if (!configReady()) {

  message(
    "أكمل إعداد Firebase Web App داخل js/firebase.js أولاً.",
    true
  );

}

// تسجيل الدخول أو إنشاء حساب
$("#authForm").addEventListener("submit", async event => {

  event.preventDefault();

  if (!configReady()) return;

  const email = $("#email").value.trim();

  const password = $("#password").value;

  const button = $("#submitBtn");

  button.disabled = true;

  try {

    if (creating) {

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await set(
        ref(db, `users/${credential.user.uid}`),
        {
          email: email,
          displayName: "",
          createdAt: Date.now()
        }
      );

      message("تم إنشاء الحساب بنجاح.");

    } else {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      message("تم تسجيل الدخول.");

    }

    setTimeout(() => {

      location.href = "index.html";

    }, 650);

  } catch (error) {

    message(friendly(error.code), true);

  } finally {

    button.disabled = false;

  }

});

// Google Sign-In
$("#googleBtn").onclick = async () => {

  try {

    const credential =
      await signInWithPopup(auth, googleProvider);

    const user = credential.user;

    await update(
      ref(db, `users/${user.uid}`),
      {
        email: user.email,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        lastLogin: Date.now()
      }
    );

    location.href = "index.html";

  } catch (error) {

    message(friendly(error.code), true);

  }

};

// استعادة كلمة المرور
$("#forgotBtn").onclick = async () => {

  const email = $("#email").value.trim();

  if (!email) {

    return message(
      "اكتب بريدك الإلكتروني أولاً.",
      true
    );

  }

  try {

    await sendPasswordResetEmail(auth, email);

    message(
      "أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك."
    );

  } catch (error) {

    message(friendly(error.code), true);

  }

};

// رسائل الأخطاء
function friendly(code) {

  const errors = {

    "auth/invalid-email":
      "البريد الإلكتروني غير صحيح.",

    "auth/user-not-found":
      "لا يوجد حساب بهذا البريد.",

    "auth/wrong-password":
      "كلمة المرور غير صحيحة.",

    "auth/invalid-credential":
      "بيانات الدخول غير صحيحة.",

    "auth/email-already-in-use":
      "هذا البريد مسجل بالفعل.",

    "auth/weak-password":
      "كلمة المرور يجب ألا تقل عن 6 أحرف.",

    "auth/popup-blocked":
      "اسمح بالنوافذ المنبثقة ثم حاول مجدداً.",

    "auth/operation-not-allowed":
      "فعّل طريقة تسجيل الدخول من Firebase Authentication."

  };

  return errors[code] ||
    "حدث خطأ. تحقق من الإعدادات والاتصال ثم حاول مرة أخرى.";

}
