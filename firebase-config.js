// ==========================================
// firebase-config.js - ASGate CRM PRO v2.1
// الربط السحابي الموحد - محسن - آمن
// Project: ahmdtest-2d434 | SDK v10.12.5
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8YCYmcbip2_HmM-zWQAEM2t31X2OnqZQ",
  authDomain: "ahmdtest-2d434.firebaseapp.com",
  projectId: "ahmdtest-2d434",
  storageBucket: "ahmdtest-2d434.firebasestorage.app",
  messagingSenderId: "165625818127",
  appId: "1:165625818127:web:c2fbcb69f14694af5b877a",
  measurementId: "G-BCXQPJPFP3"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تفعيل العمل Offline مع مزامنة التبويبات
enableIndexedDbPersistence(db, { synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("[Firebase] Offline متعدد التبويبات - مفتوح في تبويب آخر");
  } else if (err.code === 'unimplemented') {
    console.warn("[Firebase] المتصفح لا يدعم Offline persistence");
  }
});

// Analytics (اختياري)
let analytics = null;
isSupported().then(ok => {
  if (ok) {
    analytics = getAnalytics(app);
    console.log("📊 Analytics enabled");
  }
});

console.log("✅ Firebase Connected: ahmdtest-2d434 | PRO v2.1");

export { app, db, analytics };
export default app;
