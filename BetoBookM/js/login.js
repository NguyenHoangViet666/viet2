import { renderNavbar } from './ui.js';
import { loginUser, registerUser, monitorAuthState } from './auth.js';

// Trạng thái hiện tại: false = Đăng nhập, true = Đăng ký
let isRegisterMode = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vẽ Navbar (vẫn cần navbar để quay về trang chủ)
    renderNavbar();

    // 2. Kiểm tra nếu đã đăng nhập rồi thì đá về trang chủ ngay
    monitorAuthState((user) => {
        if (user) {
            window.location.href = 'index.html';
        }
    });

    // 3. Xử lý nút Chuyển chế độ (Đăng nhập <-> Đăng ký)
    document.getElementById('btn-toggle-mode').addEventListener('click', (e) => {
        e.preventDefault();
        toggleMode();
    });

    // 4. Xử lý Submit Form
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
});

function toggleMode() {
    isRegisterMode = !isRegisterMode; // Đảo ngược trạng thái
    const errorBox = document.getElementById('error-box');
    const title = document.getElementById('form-title');
    const btnSubmit = document.getElementById('btn-submit');
    const toggleLink = document.getElementById('btn-toggle-mode');
    const groupUsername = document.getElementById('group-username');

    // Reset lỗi cũ
    errorBox.classList.add('hidden');
    errorBox.innerText = '';

    if (isRegisterMode) {
        // CHẾ ĐỘ ĐĂNG KÝ
        title.innerText = "Đăng Ký Tài Khoản";
        btnSubmit.innerText = "Đăng Ký Ngay";
        toggleLink.innerText = "Đã có tài khoản? Đăng nhập";
        groupUsername.classList.remove('hidden'); // Hiện ô nhập tên
    } else {
        // CHẾ ĐỘ ĐĂNG NHẬP
        title.innerText = "Đăng Nhập";
        btnSubmit.innerText = "Đăng Nhập";
        toggleLink.innerText = "Chưa có tài khoản? Đăng ký";
        groupUsername.classList.add('hidden'); // Ẩn ô nhập tên
    }
}

async function handleAuth(e) {
    e.preventDefault(); // Chặn reload trang

    const email = document.getElementById('inp-email').value;
    const password = document.getElementById('inp-password').value;
    const username = document.getElementById('inp-username').value;
    
    const errorBox = document.getElementById('error-box');
    const btnSubmit = document.getElementById('btn-submit');

    // Reset lỗi
    errorBox.classList.add('hidden');
    
    // Khóa nút để tránh bấm nhiều lần
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Đang xử lý...";

    let result;

    if (isRegisterMode) {
        // --- XỬ LÝ ĐĂNG KÝ ---
        if (!username) {
            showError("Vui lòng nhập tên hiển thị!");
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Đăng Ký Ngay";
            return;
        }
        result = await registerUser(username, email, password);
    } else {
        // --- XỬ LÝ ĐĂNG NHẬP ---
        result = await loginUser(email, password);
    }

    if (result.success) {
        // Thành công -> Chuyển về trang chủ
        window.location.href = 'index.html';
    } else {
        // Thất bại -> Hiện lỗi
        let msg = result.message;
        
        // Dịch lỗi Firebase sang tiếng Việt cho thân thiện
        if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) 
            msg = "Sai email hoặc mật khẩu!";
        else if (msg.includes('auth/email-already-in-use'))
            msg = "Email này đã được đăng ký rồi!";
        else if (msg.includes('auth/weak-password'))
            msg = "Mật khẩu yếu quá, đặt dài hơn 6 ký tự đi!";
            
        showError(msg);
        
        // Mở khóa nút
        btnSubmit.disabled = false;
        btnSubmit.innerText = isRegisterMode ? "Đăng Ký Ngay" : "Đăng Nhập";
    }
}

function showError(msg) {
    const errorBox = document.getElementById('error-box');
    errorBox.innerText = msg;
    errorBox.classList.remove('hidden');
}