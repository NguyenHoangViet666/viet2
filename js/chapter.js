import { monitorAuthState } from './auth.js';
import { getChapterDetail, getChapters, getNovelById, updateChapter, deleteChapter } from './db-service.js';

let chapterId = null;
let novelId = null; // Vì URL chỉ có chapterId, ta phải lấy novelId từ data chương (nếu có lưu) hoặc phải tìm cách khác.
// LƯU Ý: Trong db-service.js, hàm getChapterDetail trả về chapter object có chứa novelId không?
// Nếu theo thiết kế chuẩn Firestore thì document Chapter nên có trường `novelId`.

let currentChapter = null;
let currentNovel = null;
let allChapters = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Lấy ID từ URL (chapter.html?id=...)
    const params = new URLSearchParams(window.location.search);
    chapterId = params.get('id');

    if (!chapterId) {
        alert("Không tìm thấy chương!");
        window.location.href = 'index.html';
        return;
    }

    monitorAuthState((user) => {
        currentUser = user;
        loadChapterData();
    });
});

async function loadChapterData() {
    try {
        // 1. Lấy nội dung chương
        const chapter = await getChapterDetail(chapterId);
        if (!chapter) {
            alert("Chương này không tồn tại hoặc đã bị xóa.");
            window.location.href = 'index.html';
            return;
        }
        currentChapter = chapter;
        novelId = chapter.novelId; // Lấy ID truyện để quay về

        // 2. Lấy thông tin truyện (để hiện tên truyện trên header)
        const novel = await getNovelById(novelId);
        currentNovel = novel;

        // 3. Lấy danh sách tất cả chương (để biết Trước/Sau)
        allChapters = await getChapters(novelId);

        renderUI();
        checkPermissions();

        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('chapter-container').classList.remove('hidden');
        document.getElementById('footer-nav').classList.remove('hidden');

        // Scroll lên đầu
        window.scrollTo(0, 0);

    } catch (e) {
        console.error("Lỗi tải chương:", e);
        alert("Lỗi tải dữ liệu.");
    }
}

function renderUI() {
    document.title = `${currentChapter.title} - ${currentNovel.title}`;

    // Navbar
    document.getElementById('nav-novel-title').innerText = currentNovel.title;
    document.getElementById('link-back-novel').href = `novel-detail.html?id=${novelId}`;
    document.getElementById('nav-chapter-title').innerText = currentChapter.title;

    // Nội dung
    document.getElementById('chapter-content').innerText = currentChapter.content;

    // Nút điều hướng
    const currentIndex = allChapters.findIndex(c => c.id === chapterId);
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const tocBtn = document.getElementById('btn-toc');

    tocBtn.href = `novel-detail.html?id=${novelId}`;

    if (currentIndex > 0) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => window.location.href = `chapter.html?id=${allChapters[currentIndex - 1].id}`;
    } else {
        prevBtn.disabled = true;
    }

    if (currentIndex < allChapters.length - 1) {
        nextBtn.disabled = false;
        nextBtn.onclick = () => window.location.href = `chapter.html?id=${allChapters[currentIndex + 1].id}`;
    } else {
        nextBtn.disabled = true;
    }
}

function checkPermissions() {
    const adminActions = document.getElementById('chapter-admin-actions');
    
    if (!currentUser) {
        adminActions.classList.add('hidden');
        return;
    }

    const userRole = currentUser.role || 'User';
    const isOwner = currentNovel.uploaderId === currentUser.id;
    const canEdit = userRole === 'Admin' || userRole === 'Mod' || isOwner;

    if (canEdit) {
        adminActions.classList.remove('hidden');
    } else {
        adminActions.classList.add('hidden');
    }
}

// --- EDIT & DELETE LOGIC ---

window.openEditModal = () => {
    document.getElementById('edit-title').value = currentChapter.title;
    document.getElementById('edit-content').value = currentChapter.content;
    document.getElementById('modal-edit-chapter').classList.remove('hidden');
};

window.closeEditModal = () => {
    document.getElementById('modal-edit-chapter').classList.add('hidden');
};

window.saveChapter = async () => {
    const newTitle = document.getElementById('edit-title').value;
    const newContent = document.getElementById('edit-content').value;

    if (!newTitle || !newContent) return alert("Không được để trống!");

    try {
        await updateChapter(chapterId, newTitle, newContent);
        alert("Cập nhật thành công!");
        location.reload();
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

window.confirmDeleteChapter = async () => {
    if(confirm("Xóa chương này? Không thể hoàn tác đâu nhé!")) {
        try {
            await deleteChapter(chapterId);
            alert("Đã xóa!");
            window.location.href = `novel-detail.html?id=${novelId}`;
        } catch (e) {
            alert("Lỗi xóa: " + e.message);
        }
    }
};