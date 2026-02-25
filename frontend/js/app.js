/**
 * ChatApp - Main Application
 * SPA with auth, chats, friends, groups, emoji & GIF support
 */

import { authAPI, userAPI, friendAPI, messageAPI, groupAPI, giphyAPI } from './services/api.js';
import { initSocket, getSocket, disconnectSocket } from './services/socket.js';

// State
let currentUser = null;
let friends = [];
let friendRequests = [];
let groups = [];
let activeChat = null; // { type: 'private'|'group', id, user?, group? }
let typingTimeout = null;
let debounceTimer = null;

// Common emojis for picker
const EMOJIS = '😀 😃 😄 😁 😆 😅 🤣 😂 🙃 😉 😊 😇 🙂 🙂 😋 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😈 👿 👹 👺 💀 ☠️ 👻 👽 👾 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾'.split(' ');

// DOM refs
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => el.querySelectorAll(sel);

// ---- Auth ----
function showAuth() {
  $('#auth-screen').classList.add('active');
  $('#main-screen').classList.remove('active');
  activeChat = null;
  disconnectSocket();
}

function showMain() {
  $('#auth-screen').classList.remove('active');
  $('#main-screen').classList.add('active');
  loadUserData();
  renderChatList();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const isLogin = $('#auth-tabs .tab.active').dataset.tab === 'login';
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const username = $('#auth-username').value.trim();
  const errEl = $('#auth-error');

  errEl.classList.add('hidden');
  errEl.textContent = '';

  try {
    let data;
    if (isLogin) {
      data = await authAPI.login(email, password);
    } else {
      if (!username) {
        errEl.textContent = 'Username is required';
        errEl.classList.remove('hidden');
        return;
      }
      data = await authAPI.register(username, email, password);
    }
    localStorage.setItem('token', data.token);
    currentUser = data;
    initSocket(data.token);
    showMain();
  } catch (err) {
    errEl.textContent = err.message || 'Authentication failed';
    errEl.classList.remove('hidden');
  }
}

function handleAuthTabs(e) {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  $$('.auth-tabs .tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  const isLogin = tab.dataset.tab === 'login';
  $('#auth-username').classList.toggle('hidden', isLogin);
  $('#auth-submit').textContent = isLogin ? 'Login' : 'Register';
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  showAuth();
}

// ---- Profile ----
async function loadUserData() {
  try {
    currentUser = await userAPI.getProfile();
    friends = await friendAPI.getFriends();
    friendRequests = await friendAPI.getRequests();
    groups = await groupAPI.getGroups();
    renderSidebarUser();
    renderChatList();
  } catch {
    logout();
  }
}

function renderSidebarUser() {
  const u = currentUser;
  if (!u) return;
  const img = $('#sidebar-avatar img');
  img.src = u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : window.location.origin + u.profilePicture) : '';
  img.alt = u.username;
  $('#sidebar-avatar .avatar-fallback').textContent = (u.username || '?').charAt(0).toUpperCase();
  $('#sidebar-username').textContent = u.username;
  $('.sidebar-user .status').textContent = u.isOnline ? 'Online' : 'Offline';
  $('.sidebar-user .status').classList.toggle('online', u.isOnline);
}

function openProfileModal() {
  $('#profile-username').value = currentUser?.username || '';
  $('#profile-bio').value = currentUser?.bio || '';
  const av = $('#profile-avatar');
  av.querySelector('img').src = currentUser?.profilePicture ? (currentUser.profilePicture.startsWith('http') ? currentUser.profilePicture : window.location.origin + currentUser.profilePicture) : '';
  av.querySelector('.avatar-fallback').textContent = (currentUser?.username || '?').charAt(0).toUpperCase();
  $('#profile-modal').classList.remove('hidden');
}

async function saveProfile(e) {
  e.preventDefault();
  const username = $('#profile-username').value.trim();
  const bio = $('#profile-bio').value.trim();
  const fileInput = $('#profile-picture-input');
  try {
    const payload = { username, bio };
    if (fileInput.files[0]) payload.profilePicture = fileInput.files[0];
    currentUser = await userAPI.updateProfile(payload);
    renderSidebarUser();
    $('#profile-modal').classList.add('hidden');
  } catch (err) {
    alert(err.message);
  }
}
// Sidebar Tabs Click Handler
$$('.sidebar-tab').forEach((t) => {
  t.onclick = () => {
    $$('.sidebar-tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    viewMode.current = t.dataset.view;
    renderChatList();
  };
});

// ---- Chat List ----
const viewMode = { current: 'chats' };

function renderChatList() {
  const container = $('#chats-list');
  container.innerHTML = '';

  if (viewMode.current === 'chats') {
    container.appendChild(createAddButton('New Chat', openNewChatModal));
    friends.forEach((f) => {
      container.appendChild(createChatItem(f, 'private', f._id));
    });
    groups.forEach((g) => {
      container.appendChild(createChatItem(g, 'group', g._id));
    });
  } else if (viewMode.current === 'friends') {
    container.appendChild(createAddButton('Add Friend', openNewChatModal));
    if (friendRequests.length > 0) {
      const section = document.createElement('div');
      section.className = 'requests-section';
      section.innerHTML = '<p class="section-label">Friend Requests</p>';
      friendRequests.forEach((r) => {
        const req = r.requester;
        const div = document.createElement('div');
        div.className = 'list-item request-item';
        div.innerHTML = `
          <div class="user-avatar">
            <img src="${req.profilePicture ? (req.profilePicture.startsWith('http') ? req.profilePicture : window.location.origin + req.profilePicture) : ''}" alt="" onerror="this.style.display='none'">
            <span class="avatar-fallback">${(req.username || '?').charAt(0)}</span>
          </div>
          <div class="list-item-info">
            <h4>${req.username}</h4>
            <p>${req.email}</p>
          </div>
          <div class="request-actions">
            <button class="icon-btn btn-accept" data-id="${req._id}" title="Accept">✓</button>
            <button class="icon-btn btn-decline" data-id="${req._id}" title="Decline">✕</button>
          </div>
        `;
        div.querySelector('.btn-accept').onclick = async (e) => {
          e.stopPropagation();
          await friendAPI.acceptRequest(req._id);
          friends = await friendAPI.getFriends();
          friendRequests = await friendAPI.getRequests();
          renderChatList();
        };
        div.querySelector('.btn-decline').onclick = async (e) => {
          e.stopPropagation();
          await friendAPI.declineRequest(req._id);
          friendRequests = await friendAPI.getRequests();
          renderChatList();
        };
        section.appendChild(div);
      });
      container.appendChild(section);
    }
    const sectionLabel = document.createElement('p');
    sectionLabel.className = 'section-label';
    sectionLabel.textContent = 'Friends';
    sectionLabel.style.marginTop = '1rem';
    container.appendChild(sectionLabel);
    friends.forEach((f) => {
      container.appendChild(createFriendItem(f));
    });
  } else if (viewMode.current === 'groups') {
    container.appendChild(createAddButton('New Group', openNewGroupModal));
    groups.forEach((g) => {
      container.appendChild(createChatItem(g, 'group', g._id));
    });
  }
}

function createAddButton(text, onClick) {
  const btn = document.createElement('button');
  btn.className = 'add-btn';
  btn.textContent = `+ ${text}`;
  btn.onclick = onClick;
  return btn;
}

function createChatItem(item, type, id) {
  const name = item.username || item.name;
  const isActive = activeChat?.type === type && activeChat?.id === id;
  const div = document.createElement('div');
  div.className = `list-item ${isActive ? 'active' : ''}`;
  div.dataset.type = type;
  div.dataset.id = id;
  const online = item.isOnline;
  div.innerHTML = `
    <div class="avatar-wrap">
      <div class="user-avatar">
        <img src="${item.profilePicture ? (item.profilePicture.startsWith('http') ? item.profilePicture : window.location.origin + item.profilePicture) : ''}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.textContent='${(name || 'G').charAt(0)}'">
        <span class="avatar-fallback">${(name || 'G').charAt(0)}</span>
      </div>
      ${type === 'private' ? `<span class="status-dot ${online ? 'online' : 'offline'}"></span>` : ''}
    </div>
    <div class="list-item-info">
      <h4>${name}</h4>
      <p>${type === 'group' ? (item.members?.length || 0) + ' members' : (online ? 'Online' : 'Offline')}</p>
    </div>
  `;
  div.onclick = () => selectChat(type, id, item);
  return div;
}

function createFriendItem(f) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.dataset.id = f._id;
  const name = f.username;
  div.innerHTML = `
    <div class="avatar-wrap">
      <div class="user-avatar">
        <img src="${f.profilePicture ? (f.profilePicture.startsWith('http') ? f.profilePicture : window.location.origin + f.profilePicture) : ''}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.textContent='${(name || '?').charAt(0)}'">
        <span class="avatar-fallback">${(name || '?').charAt(0)}</span>
      </div>
      <span class="status-dot ${f.isOnline ? 'online' : 'offline'}"></span>
    </div>
    <div class="list-item-info">
      <h4>${name}</h4>
      <p>${f.isOnline ? 'Online' : 'Offline'}</p>
    </div>
  `;
  div.onclick = () => selectChat('private', f._id, f);
  return div;
}

// ---- Chat ----
async function selectChat(type, id, item) {
  activeChat = { type, id, user: type === 'private' ? item : null, group: type === 'group' ? item : null };
  $$('.list-item').forEach((el) => el.classList.remove('active'));
  const li = $(`.list-item[data-type="${type}"][data-id="${id}"]`);
  if (li) li.classList.add('active');

  $('#welcome-view').classList.add('hidden');
  $('#chat-view').classList.remove('hidden');
  $('#chat-view').classList.add('active');

  // On mobile, focus on the chat and hide sidebar to use full screen
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';
  }

  const title = type === 'private' ? (item?.username || 'User') : (item?.name || 'Group');
  $('#chat-title').textContent = title;
  $('#chat-subtitle').textContent = type === 'private' ? (item?.isOnline ? 'Online' : 'Offline') : `${item?.members?.length || 0} members`;
  // ---- Block Button Sync ----
  if (type === 'private') {
    const btn = document.getElementById("btn-block-user");

    const isBlocked = currentUser?.blockedUsers?.includes(id);

    if (isBlocked) {
      btn.textContent = "Unblock User";
      btn.dataset.blocked = "true";
    } else {
      btn.textContent = "Block User";
      btn.dataset.blocked = "false";
    }
  }
  const dot = $('#chat-status-dot');
  dot.classList.toggle('online', type === 'private' && item?.isOnline);
  dot.classList.toggle('offline', type !== 'group' && !item?.isOnline);
  const av = $('.chat-header .chat-avatar');
  av.querySelector('img').src = item?.profilePicture ? (item.profilePicture.startsWith('http') ? item.profilePicture : window.location.origin + item.profilePicture) : '';
  av.querySelector('.avatar-fallback').textContent = (title || '?').charAt(0);

  const socket = getSocket();
  if (type === 'private') {
    socket.emit('leave_group', { groupId: activeChat.group?._id });
    socket.emit('join_chat', { userId: id });
  } else {
    socket.emit('leave_chat', { userId: activeChat.user?._id });
    socket.emit('join_group', { groupId: id });
  }

  // Load history
  const messagesEl = $('#messages');
  messagesEl.innerHTML = '';
  try {
    let messages;
    if (type === 'private') {
      messages = await messageAPI.getMessages(id);
    } else {
      messages = await groupAPI.getMessages(id);
    }
    messages.forEach((m) => appendMessage(m, type));
  } catch (err) {
    console.error(err);
  }
  messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
}

function appendMessage(m, type) {
  const senderId = m.sender?._id || m.sender;
  const isSent = senderId === currentUser?._id || senderId?.toString?.() === currentUser?._id?.toString?.();
  const div = document.createElement('div');
  div.className = `message ${isSent ? 'sent' : 'received'}`;
  div.dataset.id = m._id;

  let content = m.content;
  if (m.type === 'gif' && m.gifUrl) {
    content = `<img src="${m.gifUrl}" alt="GIF" class="gif-img">`;
  }

  div.innerHTML = `
    <div class="message-bubble">${content}</div>
    <div class="message-meta">${formatTime(m.createdAt)}${isSent && m.isDelivered ? ' ✓✓' : ''}</div>
  `;
  $('#messages').appendChild(div);
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sendMessage() {
  const input = $('#message-input');
  const content = input.value.trim();
  if (!content || !activeChat) return;

  if (activeChat.type === 'private' && activeChat.user?.isBlocked) {
    alert("You cannot message this user.");
    return;
  }

  const socket = getSocket();
  const type = 'text';

  if (activeChat.type === 'private') {
    socket.emit('send_message', { receiverId: activeChat.id, content, type });
  } else {
    socket.emit('send_group_message', { groupId: activeChat.id, content, type });
  }

  input.value = '';
  hideEmojiPicker();
  hideGifPicker();
}

function sendGif(url) {
  if (!activeChat) return;
  const socket = getSocket();
  if (activeChat.type === 'private') {
    socket.emit('send_message', { receiverId: activeChat.id, content: url, type: 'gif', gifUrl: url });
  } else {
    socket.emit('send_group_message', { groupId: activeChat.id, content: url, type: 'gif', gifUrl: url });
  }
  hideGifPicker();
}

// Typing indicator
function onInputTyping() {
  if (!activeChat) return;
  const socket = getSocket();
  if (activeChat.type === 'private') {
    socket.emit('typing_start', { receiverId: activeChat.id });
  } else {
    socket.emit('group_typing_start', { groupId: activeChat.id });
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (activeChat?.type === 'private') socket.emit('typing_stop', { receiverId: activeChat.id });
    else if (activeChat?.type === 'group') socket.emit('group_typing_stop', { groupId: activeChat.id });
  }, 1500);
}

// Emoji picker
function toggleEmojiPicker() {
  const picker = $('#emoji-picker');
  const gif = $('#gif-picker');
  gif.classList.add('hidden');
  picker.classList.toggle('hidden');
  if (!picker.classList.contains('hidden') && !picker.innerHTML) {
    picker.innerHTML = EMOJIS.map((e) => `<span data-emoji="${e}">${e}</span>`).join('');
    picker.querySelectorAll('span').forEach((s) => {
      s.onclick = () => {
        $('#message-input').value += s.dataset.emoji;
      };
    });
  }
}

function hideEmojiPicker() {
  $('#emoji-picker').classList.add('hidden');
}

// GIF picker
function toggleGifPicker() {
  const picker = $('#gif-picker');
  $('#emoji-picker').classList.add('hidden');
  picker.classList.toggle('hidden');
  if (!picker.classList.contains('hidden')) {
    $('#gif-search').value = '';
    $('#gif-results').innerHTML = '';
  }
}

function hideGifPicker() {
  $('#gif-picker').classList.add('hidden');
}

async function searchGifs() {
  const q = $('#gif-search').value.trim();
  if (q.length < 2) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const gifs = await giphyAPI.search(q, 12);
      const container = $('#gif-results');
      container.innerHTML = gifs.map((g) => `<img src="${g.url}" alt="${g.title || ''}" data-url="${g.url}">`).join('');
      container.querySelectorAll('img').forEach((img) => {
        img.onclick = () => sendGif(img.dataset.url);
      });
    } catch (err) {
      console.error(err);
    }
  }, 400);
}

// Modals
function openNewChatModal() {
  $('#new-chat-modal').classList.remove('hidden');
  $('#user-search-input').value = '';
  $('#user-search-results').innerHTML = '';
}

function closeNewChatModal() {
  $('#new-chat-modal').classList.add('hidden');
}

async function searchUsers() {
  const q = $('#user-search-input').value.trim();
  if (q.length < 2) {
    $('#user-search-results').innerHTML = '';
    return;
  }
  try {
    const users = await userAPI.search(q);
    const friendsIds = new Set(friends.map((f) => f._id));
    const html = users
      .filter((u) => !friendsIds.has(u._id))
      .map(
        (u) => `
      <div class="search-result-item" data-id="${u._id}">
        <div class="user-avatar">
          <img src="${u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : window.location.origin + u.profilePicture) : ''}" alt="" onerror="this.style.display='none'">
          <span class="avatar-fallback">${(u.username || '?').charAt(0)}</span>
        </div>
        <div>
          <strong>${u.username}</strong>
          <br><small>${u.email}</small>
        </div>
      </div>
    `
      )
      .join('');
    $('#user-search-results').innerHTML = html || '<p style="padding:1rem;color:var(--text-muted)">No users found</p>';
    $('#user-search-results').querySelectorAll('.search-result-item').forEach((el) => {
      el.onclick = async () => {
        try {
          await friendAPI.sendRequest(el.dataset.id);
          friends = await friendAPI.getFriends();
          renderChatList();
          closeNewChatModal();
        } catch (err) {
          alert(err.message);
        }
      };
    });
  } catch (err) {
    console.error(err);
  }
}

function openNewGroupModal() {
  $('#new-group-modal').classList.remove('hidden');
  $('#group-name').value = '';
  $('#group-description').value = '';
  const container = $('#group-member-select');
  container.innerHTML = friends
    .map(
      (f) => `
    <label><input type="checkbox" value="${f._id}"> ${f.username}</label>
  `
    )
    .join('');
}

function closeNewGroupModal() {
  $('#new-group-modal').classList.add('hidden');
}

async function createGroup(e) {
  e.preventDefault();
  const name = $('#group-name').value.trim();
  const description = $('#group-description').value.trim();
  const checks = $$('#group-member-select input:checked');
  const memberIds = Array.from(checks).map((c) => c.value);
  try {
    await groupAPI.createGroup(name, description, memberIds);
    groups = await groupAPI.getGroups();
    renderChatList();
    closeNewGroupModal();
  } catch (err) {
    alert(err.message);
  }
}

function closeGroupInfo() {
  $('#group-info-modal').classList.add('hidden');
}

// ---- Socket events ----
function setupSocketEvents() {
  const socket = getSocket();
  if (!socket) return;

  socket.on('message', (m) => {
    if (!activeChat || activeChat.type !== 'private' || !currentUser) return;

    const otherId = activeChat.id?.toString?.() || activeChat.id;
    const senderId = (m.sender && (m.sender._id || m.sender))?.toString();
    const receiverId = (m.receiver && (m.receiver._id || m.receiver))?.toString();
    const meId = currentUser._id?.toString?.() || currentUser._id;

    // Make sure this message belongs to the currently open conversation
    if (!senderId || !receiverId) return;
    if (senderId !== meId && receiverId !== meId) return;

    const partnerId = senderId === meId ? receiverId : senderId;
    if (partnerId !== otherId) return;

    appendMessage(m, 'private');
    $('#messages').parentElement.scrollTop = $('#messages').parentElement.scrollHeight;
  });

  socket.on('group_message', (m) => {
    if (activeChat?.type === 'group' && m.group === activeChat.id) {
      appendMessage(m, 'group');
      $('#messages').parentElement.scrollTop = $('#messages').parentElement.scrollHeight;
    }
  });

  socket.on('typing', ({ userId }) => {
    if (activeChat?.type === 'private' && activeChat.id === userId) {
      $('#typing-indicator').textContent = 'typing...';
      $('#typing-indicator').classList.remove('hidden');
    }
  });

  socket.on('stop_typing', ({ userId }) => {
    if (activeChat?.type === 'private' && activeChat.id === userId) {
      $('#typing-indicator').classList.add('hidden');
    }
  });

  socket.on('group_typing', () => {
    if (activeChat?.type === 'group') {
      $('#typing-indicator').textContent = 'typing...';
      $('#typing-indicator').classList.remove('hidden');
    }
  });

  socket.on('group_stop_typing', () => {
    if (activeChat?.type === 'group') {
      $('#typing-indicator').classList.add('hidden');
    }
  });

  socket.on('user_online', ({ userId }) => {
    updateFriendStatus(userId, true);
  });

  socket.on('user_offline', ({ userId }) => {
    updateFriendStatus(userId, false);
  });
}

function updateFriendStatus(userId, online) {
  const f = friends.find((x) => x._id === userId);
  if (f) {
    f.isOnline = online;
    renderChatList();
  }
  if (activeChat?.type === 'private' && activeChat.id === userId) {
    $('#chat-subtitle').textContent = online ? 'Online' : 'Offline';
    $('#chat-status-dot').classList.toggle('online', online);
  }
}

// ---- Init ----
function init() {
  const token = localStorage.getItem('token');
  if (token) {
    initSocket(token);
    showMain();
    setupSocketEvents();
  } else {
    showAuth();
  }

  // Auth
  $('#auth-form').onsubmit = handleAuthSubmit;
  $('#auth-tabs').onclick = handleAuthTabs;
  $('#forgot-password-link').onclick = () => {
    $('#forgot-password-modal').classList.remove('hidden');
  };
  $('#close-forgot-password').onclick = () => {
    $('#forgot-password-modal').classList.add('hidden');
  };
  $('#forgot-password-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#forgot-email').value.trim();
    if (!email) return;
    try {
      await authAPI.forgotPassword(email);
      alert('If that email is registered, a reset link has been generated. In development, check the server console for the link/token.');
      $('#forgot-password-modal').classList.add('hidden');
    } catch (err) {
      alert(err.message || 'Failed to request password reset');
    }
  };

  $('#close-reset-password').onclick = () => {
    $('#reset-password-modal').classList.add('hidden');
  };
  $('#reset-password-form').onsubmit = async (e) => {
    e.preventDefault();
    const token = $('#reset-token').value.trim();
    const email = $('#reset-email').value.trim();
    const newPassword = $('#reset-new-password').value;
    if (!token || !email || !newPassword) return;
    try {
      await authAPI.resetPassword(token, email, newPassword);
      alert('Password has been reset. You can now log in.');
      $('#reset-password-modal').classList.add('hidden');
    } catch (err) {
      alert(err.message || 'Failed to reset password');
    }
  };

  // Sidebar
  $('#btn-profile').onclick = openProfileModal;
  $('#btn-logout').onclick = logout;
  $('#btn-change-password').onclick = async () => {
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      alert('Password updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to change password');
    }
  };
  $('#btn-chat-info').onclick = () => {

    if (!activeChat) return;

    if (activeChat.type === 'group') {
      // keep your existing group logic
      $('#group-info-title').textContent = activeChat.group.name;
      $('#group-info-content').innerHTML = `
      <p>${activeChat.group.description || 'No description'}</p>
    `;
      $('#group-info-modal').classList.remove('hidden');
      return;
    }

    // PRIVATE CHAT INFO
    const user = activeChat.user;
    if (!user) return;

    $('#info-username').textContent = user.username;
    $('#info-email').textContent = user.email;
    $('#info-bio').textContent = user.bio || 'No bio';

    $('#chat-info-modal').classList.remove('hidden');
  };
  $('#close-chat-info').onclick = () => {
    $('#chat-info-modal').classList.add('hidden');
  };

  document.getElementById('btn-block-user').addEventListener('click', async function () {
    if (!activeChat || activeChat.type !== 'private') return;

    const isBlocked = this.dataset.blocked === "true";

    try {
      if (isBlocked) {
        await friendAPI.unblockUser(activeChat.id);
        this.textContent = "Block User";
        this.dataset.blocked = "false";
        alert("User unblocked");
        currentUser.blockedUsers =
          currentUser.blockedUsers.filter(uid => uid !== activeChat.id);

      } else {
        await friendAPI.blockUser(activeChat.id);
        this.textContent = "Unblock User";
        this.dataset.blocked = "true";
        alert("User blocked");
        currentUser.blockedUsers.push(activeChat.id);
      }
    }
    catch (err) {
      alert(err.message);
    }
  });
  const btn = document.getElementById("btn-block-user");
  btn.textContent = "Block User";
  btn.dataset.blocked = "false";

  // $('#btn-unblock-user').onclick = async () => {
  //   if (!activeChat || activeChat.type !== 'private') return;

  //   try {
  //     await friendAPI.unblockUser(activeChat.id);
  //     alert("User unblocked");
  //   } catch (err) {
  //     alert(err.message);
  //   }
  // };

  // Profile modal
  $('#profile-form').onsubmit = saveProfile;
  $('#close-profile').onclick = () => $('#profile-modal').classList.add('hidden');
  $('#btn-change-avatar').onclick = () => $('#profile-picture-input').click();
  $('#profile-picture-input').onchange = (e) => {
    if (e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        $('#profile-avatar img').src = ev.target.result;
        $('#profile-avatar img').style.display = 'block';
        $('#profile-avatar .avatar-fallback').style.display = 'none';
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // New chat
  $('#close-new-chat').onclick = closeNewChatModal;
  $('#user-search-input').oninput = searchUsers;

  // New group
  $('#new-group-form').onsubmit = createGroup;
  $('#close-new-group').onclick = closeNewGroupModal;

  // Group info
  $('#close-group-info').onclick = closeGroupInfo;

  // Chat
  $('#btn-back').onclick = () => {
    $('#chat-view').classList.add('hidden');
    $('#chat-view').classList.remove('active');
    $('#welcome-view').classList.remove('hidden');
    activeChat = null;
    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar').style.display = 'flex';
    }
  };

  $('#message-input').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      onInputTyping();
    }
  };

  $('#btn-send').onclick = sendMessage;
  $('#btn-emoji').onclick = (e) => { e.stopPropagation(); toggleEmojiPicker(); };
  $('#btn-gif').onclick = (e) => { e.stopPropagation(); toggleGifPicker(); };
  $('#gif-search').oninput = searchGifs;

  // Close pickers when clicking outside
  document.addEventListener('click', () => {
    hideEmojiPicker();
    hideGifPicker();
  });
  document.querySelectorAll('#emoji-picker, #gif-picker').forEach((el) => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });

  // Re-setup socket events when reconnecting
  const sock = getSocket();
  if (sock) {
    sock.on('connect', () => setupSocketEvents());
  }
}
init();
