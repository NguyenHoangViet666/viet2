import { monitorAuthState, logoutUser } from './auth.js';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from './db-service.js';

const ICONS = {
    BOOK: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    SEARCH: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    BELL: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    USER: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    LOGOUT: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`
};

export async function renderNavbar() {
    const navbarContainer = document.getElementById('navbar');
    if (!navbarContainer) return;

    navbarContainer.innerHTML = `
    <nav class="navbar">
      <div class="container nav-content">
        <div class="nav-left" style="display: flex; align-items: center;">
            <a href="index.html" class="logo">
              ${ICONS.BOOK} <span>BetoBook</span>
            </a>
            <div class="nav-links" style="margin-left: 30px;">
                 <a href="category.html?type=Translated" class="nav-item">Truyện Dịch</a>
                 <a href="category.html?type=Original" class="nav-item">Sáng Tác</a>
            </div>
        </div>

        <div class="search-container">
            <div class="search-icon-glass">${ICONS.SEARCH}</div>
            <input type="text" id="nav-search-input" class="search-input" placeholder="Tìm truyện, tác giả...">
        </div>

        <div class="nav-actions" id="nav-user-action">
            <div style="width: 80px; height: 30px; background: #eee; border-radius: 4px;"></div>
        </div>
      </div>
    </nav>
    `;

    // Logic Tìm kiếm
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }

    // Logic Auth & Notification
    monitorAuthState((user) => {
        const userActionDiv = document.getElementById('nav-user-action');
        
        if (user) {
            // FIX: Check Role viết hoa
            let roleHtml = '';
            const role = user.role || 'User';
            
            if (role === 'Admin') {
                roleHtml = `<span class="nav-role-badge nav-role-admin">Admin</span>`;
            } else if (role === 'Mod') {
                roleHtml = `<span class="nav-role-badge nav-role-mod">Mod</span>`;
            }

            userActionDiv.innerHTML = `
                <div style="position: relative;" id="notif-container">
                    <button id="btn-notif-toggle" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 5px; position: relative;">
                        ${ICONS.BELL}
                        <span id="notif-badge" style="position: absolute; top: 0; right: 0; background: red; color: white; font-size: 10px; width: 15px; height: 15px; border-radius: 50%; display: none; align-items: center; justify-content: center;">0</span>
                    </button>
                    <div id="notif-dropdown" class="hidden" style="position: absolute; right: 0; top: 40px; width: 300px; background: white; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; z-index: 1000; overflow: hidden;"></div>
                </div>

                <div style="width: 1px; height: 24px; background: #e2e8f0; margin: 0 10px;"></div>

                <div class="user-menu" onclick="window.location.href='profile.html'" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                        <div style="font-weight: bold; font-size: 0.9rem; color: #334155;">
                            ${user.username} ${roleHtml} 
                        </div>
                    </div>
                    <img src="${user.avatar || 'https://via.placeholder.com/40'}" class="user-avatar">
                </div>
                
                <button id="btn-navbar-logout" style="border:none; background:none; cursor:pointer; color:#ef4444; padding: 5px; margin-left: 5px;" title="Đăng xuất">
                    ${ICONS.LOGOUT}
                </button>
            `;

            document.getElementById('btn-navbar-logout').addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm('Bạn muốn đăng xuất?')) logoutUser();
            });

            initNotifications(user.id);

        } else {
            userActionDiv.innerHTML = `
                <a href="login.html" class="btn-login">
                    ${ICONS.USER} <span>Đăng nhập</span>
                </a>
            `;
        }
    });
}

// ... (Hàm initNotifications giữ nguyên như cũ) ...
async function initNotifications(userId) {
    let notifications = [];
    const badge = document.getElementById('notif-badge');
    const dropdown = document.getElementById('notif-dropdown');
    const toggleBtn = document.getElementById('btn-notif-toggle');

    if(!badge || !dropdown || !toggleBtn) return;

    const fetchAndRender = async () => {
        notifications = await getUserNotifications(userId);
        const unreadCount = notifications.filter(n => !n.isRead).length;

        if (unreadCount > 0) {
            badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        renderDropdownContent();
    };

    const renderDropdownContent = () => {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        let headerHTML = `<div style="padding: 10px; border-bottom: 1px solid #eee; background: #f8fafc; display:flex; justify-content:space-between;"><b>Thông báo</b> ${unreadCount>0 ? '<button id="btn-mark-all" style="color:blue; font-size:0.8rem">Đã đọc hết</button>':''}</div>`;
        let listHTML = `<div style="max-height: 300px; overflow-y: auto;">`;

        if (notifications.length === 0) {
            listHTML += `<div style="padding: 20px; text-align: center; color: #999; font-size: 0.9rem;">Chưa có thông báo nào.</div>`;
        } else {
            notifications.forEach(notif => {
                const bg = !notif.isRead ? '#eff6ff' : 'white';
                listHTML += `
                    <div class="notif-item" style="padding: 10px; border-bottom: 1px solid #eee; background: ${bg}; cursor: pointer; display: flex; gap: 10px;" data-id="${notif.id}" data-link="${notif.link}">
                        <img src="${notif.actorAvatar || 'https://via.placeholder.com/40'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 0.85rem;">${notif.title}</div>
                            <div style="font-size: 0.8rem; color: #555;">${notif.message}</div>
                            <div style="font-size: 0.7rem; color: #999;">${new Date(notif.createdAt).toLocaleDateString()}</div>
                        </div>
                        ${!notif.isRead ? '<div style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-top: 5px;"></div>' : ''}
                    </div>
                `;
            });
        }
        listHTML += `</div>`;
        dropdown.innerHTML = headerHTML + listHTML;

        dropdown.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.getAttribute('data-id');
                const link = item.getAttribute('data-link');
                await markNotificationAsRead(id);
                let targetLink = link;
                if(link.includes('/novel/') && !link.includes('.html')) {
                    const parts = link.split('/');
                    if(parts.length >= 3) targetLink = `novel-detail.html?id=${parts[2]}`;
                }
                window.location.href = targetLink;
            });
        });
        
        const btnMarkAll = document.getElementById('btn-mark-all');
        if(btnMarkAll) btnMarkAll.onclick = async () => { await markAllNotificationsAsRead(userId); fetchAndRender(); };
    };

    toggleBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); };
    document.onclick = (e) => { if (!toggleBtn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden'); };

    fetchAndRender();
    setInterval(fetchAndRender, 60000);
}