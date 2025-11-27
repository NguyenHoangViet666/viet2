// Import các thư viện cần thiết trực tiếp từ CDN Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

// Cấu hình y chang cũ
const firebaseConfig = {
  apiKey: "AIzaSyCia5H0qCfFG9gORIOw7rFIAOdLFIo7VlI",
  authDomain: "betobook-final-submit.firebaseapp.com",
  projectId: "betobook-final-submit",
  storageBucket: "betobook-final-submit.firebasestorage.app",
  messagingSenderId: "1041636732234",
  appId: "1:1041636732234:web:233a3862f9f986bc3c65b3",
  measurementId: "G-9ZD8GB9WDK"
};

// Khởi tạo app
const app = initializeApp(firebaseConfig);

// Khởi tạo các dịch vụ và Export ra để các file khác dùng
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Xuất khẩu lao động sang các file khác :))
export { app, auth, db, storage };