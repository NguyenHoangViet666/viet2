import { renderNavbar } from './ui.js';
import { monitorAuthState } from './auth.js';
import { 
    getNovels, getUsers, addNovel, deleteNovel, deleteUser, 
    updateUserRole, approveNovel, updateUserProfileData, uploadImage, toggleNovelFeature 
} from './db-service.js';

let currentUser = null;
let allNovels = [];
let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    monitorAuthState(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;
        renderUserInfo();
        await refreshData();
    });

    // Gán sự kiện
    document.getElementById('inp-avatar').addEventListener('change', handleAvatarUpload);
    document.getElementById('form-add-novel').addEventListener('submit', handleAddNovel);
});

// --- HÀM TẢI & UPDATE DỮ LIỆU (KHÔNG CẦN F5) ---
async function refreshData() {
    try {
        // 1. Lấy danh sách truyện
        allNovels = await getNovels();
        
        // Tab Tủ truyện
        const likedNovels = allNovels.filter(n => currentUser.likedNovelIds && currentUser.likedNovelIds.includes(n.id));
        renderLikedNovels(likedNovels);

        // Tab Truyện đã đăng
        const myNovels = allNovels.filter(n => n.uploaderId === currentUser.id);
        renderPostedNovels(myNovels);

        // Tab Quản trị (Admin & Mod)
        const userRole = currentUser.role || 'User';
        if (userRole === 'Admin' || userRole === 'Mod') {
            document.getElementById('tab-admin-btn').classList.remove('hidden');
            renderPendingNovels();
            renderAdminAllNovels();
            
            // FIX QUAN TRỌNG: Cả Admin và Mod đều được lấy danh sách User
            if (userRole === 'Admin' || userRole === 'Mod') { 
                allUsers = await getUsers();
                renderUsersList();
            }
        }
        
        document.getElementById('loading-screen').classList.add('hidden');
    } catch (e) {
        console.error("Lỗi tải data:", e);
    }
}

// --- CÁC HÀM RENDER UI ---

function renderUserInfo() {
    document.getElementById('user-avatar').src = currentUser.avatar || 'https://via.placeholder.com/150';
    document.getElementById('user-name').innerText = currentUser.username;
    document.getElementById('user-email').innerText = currentUser.email;
    
    const badge = document.getElementById('user-role-badge');
    const roleName = currentUser.role || 'User';

    if (roleName === 'Admin') badge.innerHTML = `<span class="badge badge-admin">Admin</span>`;
    else if (roleName === 'Mod') badge.innerHTML = `<span class="badge badge-mod">Mod</span>`;
    else badge.innerHTML = `<span class="badge badge-user">Thành viên</span>`;
}

function renderLikedNovels(list) {
    const container = document.getElementById('liked-list');
    if (list.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-slate-400">Chưa thích truyện nào.</p>';
        return;
    }
    container.innerHTML = list.map(n => `
        <a href="novel-detail.html?id=${n.id}" class="novel-card">
            <div class="card-thumb"><img src="${n.coverUrl}"></div>
            <div class="card-body"><h3 class="card-title text-sm">${n.title}</h3></div>
        </a>
    `).join('');
}

function renderPostedNovels(list) {
    const container = document.getElementById('posted-list');
    if (list.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-4">Bạn chưa đăng truyện nào.</p>';
        return;
    }
    container.innerHTML = list.map(n => `
        <div class="admin-table-row bg-white rounded border border-slate-200">
            <div class="flex items-center gap-4">
                <img src="${n.coverUrl}" class="w-12 h-16 object-cover rounded">
                <div>
                    <a href="novel-detail.html?id=${n.id}" class="font-bold hover:text-blue-600">${n.title}</a>
                    <div class="mt-1">
                        ${n.isPending ? '<span class="badge badge-pending">Chờ duyệt</span>' : '<span class="badge badge-mod">Đã duyệt</span>'}
                        <span class="text-xs text-slate-400 ml-2">${n.status}</span>
                    </div>
                </div>
            </div>
            <button onclick="deleteMyNovel('${n.id}')" class="text-red-400 hover:text-red-600 p-2" title="Xóa">🗑️</button>
        </div>
    `).join('');
}

function renderPendingNovels() {
    const list = allNovels.filter(n => n.isPending);
    const container = document.getElementById('pending-list');
    
    if (list.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400">Không có truyện chờ duyệt.</p>';
        return;
    }
    
    container.innerHTML = list.map(n => `
        <div class="bg-white p-4 rounded border border-slate-200 flex gap-4">
            <img src="${n.coverUrl}" class="w-20 h-28 object-cover rounded">
            <div class="flex-1">
                <h4 class="font-bold text-lg">${n.title}</h4>
                <p class="text-sm text-slate-500 mb-2">Tác giả: ${n.author} • ${n.type}</p>
                <div class="flex gap-2">
                    <button onclick="approveNovelAction('${n.id}')" class="btn-action bg-green-600 text-white border-none hover:bg-green-700">✓ Duyệt</button>
                    <button onclick="deleteMyNovel('${n.id}')" class="btn-action text-red-600 border-red-200 hover:bg-red-50">✕ Từ chối</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAdminAllNovels() {
    const container = document.getElementById('admin-all-novels-list');
    if (!container) return;

    container.innerHTML = allNovels.map(n => `
        <div class="admin-table-row bg-white rounded border border-slate-200">
            <div class="flex items-center gap-4">
                <img src="${n.coverUrl || 'https://via.placeholder.com/150'}" class="w-12 h-16 object-cover rounded shadow-sm border border-slate-100">
                <div>
                    <a href="novel-detail.html?id=${n.id}" class="font-bold text-slate-800 hover:text-blue-600 text-sm md:text-base">${n.title}</a>
                    <div class="flex items-center mt-1 gap-2">
                        <span class="text-xs text-slate-500">by ${n.author}</span>
                        ${n.isPending ? '<span class="badge badge-admin">Chờ duyệt</span>' : '<span class="badge badge-mod">Công khai</span>'}
                        ${n.isFeatured ? '<span class="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">★ Hot</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${!n.isPending ? `
                <button onclick="toggleFeatureAction('${n.id}')" class="p-2 rounded-full hover:bg-yellow-50 transition-colors" title="${n.isFeatured ? 'Bỏ nổi bật' : 'Thêm nổi bật'}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${n.isFeatured ? 'orange' : 'none'}" stroke="${n.isFeatured ? 'orange' : '#cbd5e1'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>` : ''}
                <button onclick="deleteMyNovel('${n.id}')" class="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
        </div>
    `).join('');
}

function renderUsersList() {
    const container = document.getElementById('user-list');
    const myRole = currentUser.role || 'User';

    container.innerHTML = allUsers.map(u => {
        const targetRole = u.role || 'User';
        
        // Badge
        let badgeClass = 'badge-user';
        let roleDisplay = 'User';
        if (targetRole === 'Admin') { badgeClass = 'badge-admin'; roleDisplay = 'Admin'; }
        else if (targetRole === 'Mod') { badgeClass = 'badge-mod'; roleDisplay = 'Mod'; }

        // Logic Nút Thăng Cấp (Chỉ Admin mới có quyền)
        let actionBtn = '';
        
        if (myRole === 'Admin' && u.id !== currentUser.id) {
            if (targetRole === 'User') {
                actionBtn = `<button onclick="promoteUser('${u.id}', 'User')" class="btn-action">Thăng Mod</button>`;
            } else if (targetRole === 'Mod') {
                actionBtn = `<button onclick="promoteUser('${u.id}', 'Mod')" class="btn-action">Thăng Admin</button>`;
            } else if (targetRole === 'Admin') {
                actionBtn = `<button onclick="promoteUser('${u.id}', 'Admin')" class="btn-action text-red-600 border-red-200 hover:bg-red-50">Giáng chức</button>`;
            }
        }

        // Logic Nút Xóa (Admin xóa hết trừ mình, Mod chỉ xóa User)
        let deleteBtn = '';
        if (u.id !== currentUser.id) {
            if (myRole === 'Admin') {
                deleteBtn = `<button onclick="deleteUserAction('${u.id}')" class="btn-delete-icon" title="Xóa user"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
            } else if (myRole === 'Mod' && targetRole === 'User') {
                deleteBtn = `<button onclick="deleteUserAction('${u.id}')" class="btn-delete-icon" title="Xóa user"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
            }
        }

        return `
        <div class="admin-table-row">
            <div class="user-info-group">
                <img src="${u.avatar || 'https://via.placeholder.com/150'}" class="user-avatar-small">
                <div class="user-text">
                    <div class="user-name-bold">${u.username} <span class="badge ${badgeClass}">${roleDisplay}</span></div>
                    <div class="user-email-small">${u.email}</div>
                </div>
            </div>
            <div class="action-group">${actionBtn}${deleteBtn}</div>
        </div>
        `;
    }).join('');
}

// --- ACTIONS HANDLER ---

window.updateUsername = async () => {
    const newName = document.getElementById('inp-username').value.trim();
    if(!newName) return alert("Nhập tên mới đi!");
    await updateUserProfileData(currentUser.id, { username: newName });
    document.getElementById('user-name').innerText = newName;
    document.getElementById('edit-profile-form').classList.add('hidden');
    alert("Đổi tên thành công!");
};

window.deleteMyNovel = async (id) => { if(confirm("Xóa truyện này vĩnh viễn?")) { await deleteNovel(id); refreshData(); } };
window.approveNovelAction = async (id) => { await approveNovel(id); refreshData(); };
window.deleteUserAction = async (id) => { if(confirm("Xóa user này?")) { await deleteUser(id); refreshData(); } };

window.promoteUser = async (id, currentRoleString) => {
    let newRole = 'User';
    let msg = "";

    if (currentRoleString === 'User') { newRole = 'Mod'; msg = "Thăng lên Moderator?"; } 
    else if (currentRoleString === 'Mod') { newRole = 'Admin'; msg = "Thăng lên Admin?"; } 
    else if (currentRoleString === 'Admin') { newRole = 'User'; msg = "Giáng chức xuống Thành viên?"; }

    if(confirm(msg)) {
        await updateUserRole(id, newRole);
        refreshData();
    }
};

window.toggleFeatureAction = async (id) => { try { await toggleNovelFeature(id); refreshData(); } catch (e) { alert(e.message); } };

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    if(confirm("Upload ảnh này làm avatar nhé?")) {
        try {
            const url = await uploadImage(file, 'avatars');
            await updateUserProfileData(currentUser.id, { avatar: url });
            location.reload();
        } catch (e) { alert("Lỗi upload: " + e.message); }
    }
}

async function handleAddNovel(e) {
    e.preventDefault();
    const data = {
        title: document.getElementById('new-title').value,
        author: document.getElementById('new-author').value,
        coverUrl: document.getElementById('new-cover').value || 'https://via.placeholder.com/300x450',
        description: document.getElementById('new-desc').value,
        type: document.getElementById('new-type').value,
        status: document.getElementById('new-status').value,
        genres: [], length: 'Truyện dài', uploaderId: currentUser.id
    };
    const isAutoApprove = currentUser.role === 'Admin' || currentUser.role === 'Mod';
    try {
        await addNovel(data, !isAutoApprove);
        alert(isAutoApprove ? "Đăng thành công!" : "Đã gửi! Chờ duyệt.");
        window.location.reload();
    } catch (e) { alert("Lỗi: " + e.message); }
}

// --- TABS UTILS (Đã fix ẩn hiện avatar) ---
window.switchProfileTab = (tabName) => {
    document.querySelectorAll('.profile-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.profile-tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    const btns = document.querySelectorAll('.profile-tab-btn');
    if(tabName==='info') btns[0].classList.add('active');
    if(tabName==='liked') btns[1].classList.add('active');
    if(tabName==='posted') btns[2].classList.add('active');
    if(tabName==='admin') btns[3].classList.add('active');

    const avatarEl = document.querySelector('.avatar-container');
    if (avatarEl) {
        avatarEl.style.display = tabName === 'info' ? 'block' : 'none';
    }
};

window.switchAdminSubTab = (subTab) => {
    document.getElementById('admin-approvals').classList.add('hidden');
    document.getElementById('admin-users').classList.add('hidden');
    document.getElementById('admin-novels').classList.add('hidden');
    document.getElementById(`admin-${subTab}`).classList.remove('hidden');
};

window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');