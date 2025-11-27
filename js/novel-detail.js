import { renderNavbar } from './ui.js';
import { monitorAuthState } from './auth.js';
import { 
    getNovelById, getChapters, getCommentsByNovel, 
    addChapter, addComment, updateNovel, deleteChapter, 
    toggleNovelLike, toggleCommentLike, replyToComment 
} from './db-service.js';

// --- BIẾN TOÀN CỤC ---
let novelId = null;
let currentUser = null;
let currentNovel = null;
let deleteChapterId = null; // Để lưu tạm ID chương muốn xóa

// --- 1. KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();

    // Lấy ID từ URL (?id=...)
    const params = new URLSearchParams(window.location.search);
    novelId = params.get('id');

    if (!novelId) {
        alert("Không tìm thấy truyện!");
        window.location.href = 'index.html';
        return;
    }

    // Lắng nghe User đăng nhập
    monitorAuthState((user) => {
        currentUser = user;
        // Load data lần đầu
        loadData().then(() => {
            checkAuthUI(); // Check quyền sau khi đã có dữ liệu truyện + user
        });
    });
});

// --- 2. TẢI DỮ LIỆU ---
async function loadData() {
    try {
        // Tải thông tin truyện
        const novel = await getNovelById(novelId);
        if (!novel) {
            document.getElementById('main-content').innerHTML = '<p class="text-center mt-10">Truyện không tồn tại.</p>';
            document.getElementById('loading-screen').classList.add('hidden');
            return;
        }
        currentNovel = novel;
        renderNovelInfo(novel);

        // Tải danh sách chương
        const chapters = await getChapters(novelId);
        renderChapters(chapters);

        // Tải bình luận
        const comments = await getCommentsByNovel(novelId);
        renderComments(comments);

        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');

    } catch (error) {
        console.error("Lỗi tải trang:", error);
    }
}

// --- 3. RENDER GIAO DIỆN ---

function renderNovelInfo(novel) {
    document.title = `${novel.title} - BetoBook`;
    
    // Fill thông tin cơ bản
    document.getElementById('novel-bg').src = novel.coverUrl;
    document.getElementById('novel-cover').src = novel.coverUrl;
    document.getElementById('novel-title').innerText = novel.title;
    document.getElementById('novel-author').innerText = novel.author;
    document.getElementById('novel-status').innerText = novel.status;
    document.getElementById('novel-desc').innerText = novel.description;
    
    // Stats
    document.getElementById('stat-views').innerText = novel.viewCount || 0;
    
    // Genres
    const genresHTML = novel.genres.map(g => `<span class="tag">${g}</span>`).join('');
    document.getElementById('novel-genres').innerHTML = genresHTML;

    // Nút Like & Trạng thái Like (Giữ nguyên logic cũ)
    const btnLike = document.getElementById('btn-like');
    const isLiked = currentUser && currentUser.likedNovelIds && currentUser.likedNovelIds.includes(novel.id);
    const likeText = document.getElementById('like-text');
    const countEl = document.getElementById('stat-likes');
    
    // Set trạng thái ban đầu
    if (isLiked) {
        btnLike.classList.add('liked');
        likeText.innerText = "Đã thích";
    } else {
        btnLike.classList.remove('liked');
        likeText.innerText = "Thích";
    }
    
    // Sự kiện Like (logic không reload giữ nguyên)
    btnLike.onclick = async () => {
        if(!currentUser) return alert("Đăng nhập để thích truyện nha!");
        await toggleNovelLike(currentUser.id, novel.id);
        const isLikedNow = btnLike.classList.contains('liked');
        let currentCount = parseInt(countEl.innerText) || 0;
        if (isLikedNow) {
            btnLike.classList.remove('liked');
            likeText.innerText = "Thích";
            countEl.innerText = Math.max(0, currentCount - 1); 
        } else {
            btnLike.classList.add('liked');
            likeText.innerText = "Đã thích";
            countEl.innerText = currentCount + 1;
        }
    };

    // QUAN TRỌNG: Điền dữ liệu cũ vào Modal Sửa (chạy ngay khi trang load)
    document.getElementById('edit-title').value = novel.title;
    document.getElementById('edit-author').value = novel.author;
    document.getElementById('edit-cover').value = novel.coverUrl;
    document.getElementById('edit-desc').value = novel.description;
}

function renderChapters(chapters) {
    document.getElementById('chap-count').innerText = chapters.length;
    document.getElementById('stat-chapters').innerText = chapters.length;
    
    const container = document.getElementById('chapter-list-container');
    
    if (chapters.length === 0) {
        container.innerHTML = '<p class="text-slate-500 italic p-4" style="grid-column: 1/-1; text-align:center;">Chưa có chương nào.</p>';
        document.getElementById('btn-read-now').style.display = 'none';
        return;
    }

    // Cập nhật nút Đọc Ngay (Link vào chương 1)
    document.getElementById('btn-read-now').href = `chapter.html?id=${chapters[0].id}`; 

    // Phân quyền nút Xóa Chương
    const userRole = currentUser ? (currentUser.role ? currentUser.role.toLowerCase() : 'user') : '';
    const isOwner = currentUser && currentNovel && currentUser.id === currentNovel.uploaderId;
    const canDelete = userRole === 'admin' || userRole === 'mod' || isOwner;

    container.innerHTML = chapters.map((chap, index) => `
        <div class="chapter-item group relative">
            <a href="chapter.html?id=${chap.id}" style="flex:1; display:flex; justify-content:space-between; align-items:center;">
                <span class="font-medium group-hover:text-blue-600 truncate mr-2" style="font-weight:600;">
                    Chương ${index + 1}: ${chap.title}
                </span>
                <span class="chapter-time">${new Date(chap.createdAt).toLocaleDateString()}</span>
            </a>
            ${canDelete ? `
                <button onclick="confirmDelete('${chap.id}')" class="text-slate-300 hover:text-red-600 ml-2 p-1" title="Xóa chương này" style="cursor:pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            ` : ''}
        </div>
    `).join('');
}

function renderComments(comments) {
    document.getElementById('cmt-count').innerText = comments.length;
    const list = document.getElementById('comment-list');
    const loginPrompt = document.getElementById('login-prompt');
    const formContainer = document.getElementById('comment-form-container');
    const myAvatar = document.getElementById('my-avatar-cmt');

    // Xử lý ẩn hiện Form nhập liệu
    if (currentUser) {
        loginPrompt.classList.add('hidden');
        formContainer.classList.remove('hidden');
        myAvatar.src = currentUser.avatar || 'https://via.placeholder.com/40';
    } else {
        loginPrompt.classList.remove('hidden');
        formContainer.classList.add('hidden');
    }
    
    if (comments.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-400 py-8 italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
        return;
    }

    list.innerHTML = comments.map(cmt => {
        const likesCount = cmt.likedBy ? cmt.likedBy.length : 0;
        // Check xem mình đã like chưa để tô màu xanh
        const isLiked = currentUser && cmt.likedBy && cmt.likedBy.includes(currentUser.id);
        const likeClass = isLiked ? 'active' : '';
        const likeText = likesCount > 0 ? likesCount : 'Thích';

        // Badge Role cho comment (nếu có)
        let roleBadge = '';
        if (cmt.role === 'Admin') roleBadge = `<span class="badge badge-admin" style="margin-left:5px; transform:scale(0.8);">Admin</span>`;
        else if (cmt.role === 'Mod') roleBadge = `<span class="badge badge-mod" style="margin-left:5px; transform:scale(0.8);">Mod</span>`;

        return `
        <div class="comment-item group">
            <img src="${cmt.userAvatar}" class="my-avatar-small">
            <div style="flex:1">
                <div class="comment-bubble">
                    <div class="comment-author">
                        ${cmt.username} ${roleBadge}
                    </div>
                    <div class="comment-content">${cmt.content}</div>
                </div>
                
                <div class="comment-actions">
                    <span style="color:#94a3b8">${new Date(cmt.createdAt).toLocaleDateString()}</span>
                    <span class="action-link ${likeClass}" onclick="handleLikeComment('${cmt.id}')">
                        ${isLiked ? '❤️' : ''} ${likeText}
                    </span>
                    <span class="action-link" onclick="toggleReplyForm('${cmt.id}')">Trả lời</span>
                </div>

                <div id="reply-form-${cmt.id}" class="reply-input-wrapper hidden">
                    <img src="${currentUser ? currentUser.avatar : ''}" class="w-6 h-6 rounded-full border" style="width:30px; height:30px;">
                    <input id="reply-input-${cmt.id}" class="reply-input" placeholder="Viết câu trả lời..." onkeydown="if(event.key==='Enter') submitReply('${cmt.id}')">
                    <button onclick="submitReply('${cmt.id}')" class="btn-send-reply">Gửi</button>
                </div>

                ${cmt.replies && cmt.replies.length > 0 ? `
                    <div class="reply-list">
                        ${cmt.replies.map(rep => `
                            <div class="flex gap-3">
                                <img src="${rep.userAvatar}" class="w-8 h-8 rounded-full border border-slate-200" style="width:32px; height:32px;">
                                <div>
                                    <div class="bg-slate-100 px-3 py-2 rounded-2xl rounded-tl-none inline-block">
                                        <div class="font-bold text-xs text-slate-900 flex items-center mb-1">
                                            ${rep.username}
                                            ${rep.role === 'Admin' ? '<span class="badge badge-admin" style="transform:scale(0.7);">Admin</span>' : ''}
                                        </div>
                                        <div class="text-sm text-slate-700">${rep.content}</div>
                                    </div>
                                    <div class="ml-1 mt-1 text-[10px] text-slate-400">
                                        ${new Date(rep.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `}).join('');
}

window.handleLikeComment = async (cmtId) => {
    if(!currentUser) return alert("Đăng nhập đi bạn êi!");
    // Gọi hàm DB (Đã có trong db-service.js)
    const { toggleCommentLike, getCommentsByNovel } = await import('./db-service.js');
    await toggleCommentLike(cmtId, currentUser.id);
    
    // Refresh lại comment
    const comments = await getCommentsByNovel(novelId);
    renderComments(comments);
};

// --- 4. LOGIC TABS ---
window.switchTab = (tabName) => {
    // Ẩn hết content
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));

    // Hiện tab được chọn
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Highlight button
    const btns = document.querySelectorAll('.tab-link');
    if (tabName === 'intro') btns[0].classList.add('active');
    if (tabName === 'chapters') btns[1].classList.add('active');
    if (tabName === 'comments') btns[2].classList.add('active');
};

// --- 5. LOGIC ADMIN / MODALS (PHÂN QUYỀN CHUẨN) ---

function checkAuthUI() {
    // Luôn kiểm tra xem phần tử có tồn tại không trước khi truy cập classList
    const adminActions = document.getElementById('admin-actions');
    const commentBox = document.getElementById('comment-box');
    const loginPrompt = document.getElementById('login-prompt');

    // 1. Logic Comment Box
    if (commentBox && loginPrompt) {
        if (currentUser) {
            commentBox.classList.remove('hidden');
            loginPrompt.classList.add('hidden');
        } else {
            commentBox.classList.add('hidden');
            loginPrompt.classList.remove('hidden');
        }
    }

    // 2. Logic Admin Actions (Chỗ bị crash)
    if (adminActions) { // CRITICAL CHECKPOINT
        const userRole = currentUser ? (currentUser.role || 'User') : '';
        const isOwner = currentNovel && currentUser && currentUser.id === currentNovel.uploaderId;
        const isSuperUser = userRole === 'Admin' || userRole === 'Mod';

        if (isSuperUser || isOwner) {
            adminActions.classList.remove('hidden');
        } else {
            adminActions.classList.add('hidden');
        }
    }
}

// Mở/Đóng Modal
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.openAddChapterModal = () => window.openModal('modal-add-chapter');
window.openEditNovelModal = () => window.openModal('modal-edit-novel');

// --- 6. LOGIC FORM SUBMIT ---

// Thêm chương
window.saveNewChapter = async () => {
    const title = document.getElementById('inp-chap-title').value;
    const content = document.getElementById('inp-chap-content').value;

    if (!title || !content) return alert("Nhập đủ thông tin đi!");

    try {
        await addChapter(novelId, title, content);
        alert("Đã thêm chương!");
        window.closeModal('modal-add-chapter');
        // Reload chương
        const chapters = await getChapters(novelId);
        renderChapters(chapters);
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

// Sửa truyện
window.saveNovelInfo = async () => {
    const data = {
        title: document.getElementById('edit-title').value,
        author: document.getElementById('edit-author').value,
        coverUrl: document.getElementById('edit-cover').value,
        description: document.getElementById('edit-desc').value
    };

    try {
        await updateNovel(novelId, data);
        alert("Cập nhật thành công!");
        window.closeModal('modal-edit-novel');
        window.location.reload(); // Reload để cập nhật ảnh bìa và tiêu đề ngay lập tức
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

// Xóa chương
window.confirmDelete = (chapId) => {
    deleteChapterId = chapId;
    window.openModal('modal-delete-confirm');
};

document.getElementById('btn-confirm-delete').onclick = async () => {
    if (!deleteChapterId) return;
    try {
        await deleteChapter(deleteChapterId);
        alert("Đã xóa chương!");
        window.closeModal('modal-delete-confirm');
        const chapters = await getChapters(novelId);
        renderChapters(chapters);
    } catch (e) {
        alert("Lỗi xóa: " + e.message);
    }
};

// Bình luận
window.submitComment = async () => {
    const content = document.getElementById('cmt-input').value;
    if (!content.trim()) return;

    try {
        await addComment(novelId, currentUser, content);
        document.getElementById('cmt-input').value = "";
        const comments = await getCommentsByNovel(novelId);
        renderComments(comments);
    } catch (e) {
        alert("Lỗi comment: " + e.message);
    }
};

// Trả lời bình luận
window.toggleReplyForm = (cmtId) => {
    const form = document.getElementById(`reply-form-${cmtId}`);
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    form.classList.toggle('hidden');
};

window.submitReply = async (cmtId) => {
    const input = document.getElementById(`reply-input-${cmtId}`);
    const content = input.value;
    if (!content.trim()) return;

    try {
        await replyToComment(cmtId, currentUser, content);
        const comments = await getCommentsByNovel(novelId);
        renderComments(comments);
    } catch (e) {
        alert("Lỗi reply: " + e.message);
    }
};