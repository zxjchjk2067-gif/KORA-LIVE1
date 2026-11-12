import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "ضع_WEB_API_KEY_هنا",
  authDomain: "ali1-2ac52.firebaseapp.com",
  databaseURL: "https://ali1-2ac52-default-rtdb.firebaseio.com",
  projectId: "ali1-2ac52",
  storageBucket: "ali1-2ac52.appspot.com",
  messagingSenderId: "868134603145",
  appId: "ضع_WEB_APP_ID_هنا"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getDatabase(app);

export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

export function configReady() {
  return (
    firebaseConfig.apiKey !== "ضع_WEB_API_KEY_هنا" &&
    firebaseConfig.appId !== "ضع_WEB_APP_ID_هنا"
  );
}
