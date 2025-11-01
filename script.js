// Script per favicon dinamica (Modifica 1)
(function() {
    const setFavicon = () => {
        const favicon = document.getElementById('favicon');
        if (!favicon) return;
        
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        favicon.href = isDark ? 'logo2.png' : 'logo1.png';
    };

    // Imposta all'avvio
    setFavicon();
    
    // Aggiorna se l'utente cambia tema
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setFavicon);
    }
})();

// Le funzioni esistenti rimangono qui...
function toggleStickerPicker() {
const stickerPicker = document.getElementById('stickerPicker');
if (stickerPicker.style.display === 'flex') {
stickerPicker.style.display = 'none';
} else {
stickerPicker.style.display = 'flex';
generateStickerPreviews();
}
}
function generateStickerPreviews() {
const stickerPicker = document.getElementById('stickerPicker');
stickerPicker.innerHTML = '';
const numberOfStickers = 28;
for (let i = 1; i <= numberOfStickers; i++) {
const img = document.createElement('img');
img.src = `stiker${i}.png`;
img.alt = `Sticker ${i}`;
img.classList.add('sticker-preview');
img.onclick = () => insertSticker(`stiker${i}.png`);
stickerPicker.appendChild(img);
}
}
function insertSticker(stickerPath) {
    const postText = document.getElementById('postText');
    const fullStickerUrl = `https://nexiflow.netlify.app/${stickerPath}`;
    const stickerHtml = `<img src="${fullStickerUrl}" alt="sticker" style="width: 50px; height: auto; vertical-align: middle; margin: 0 5px;" />`;
    postText.value += stickerHtml;
    document.getElementById('stickerPicker').style.display = 'none';
    checkPublishButtonState();
}
const API_KEY = "$2a$10$KNFCGq2q1AWerjl1Jhy/hOdyDhPwIGGztn7zrkggd3vU5dFiGdvLe";

// NUOVI BIN ID
const POST_BIN_ID = "68960092f7e7a370d1f76798";
const VIDEO_BIN_ID = "689600c7f7e7a370d1f767d7";
const USER_BIN_ID = "68e15e1e43b1c97be95a5d2b";
const MESSAGES_BIN_ID = "68e15fc5ae596e708f0615c4";
const STATUS_BIN_ID = "68e3c0a343b1c97be95c57d0"; 

const BASE_URL = `https://api.jsonbin.io/v3/b/${POST_BIN_ID}`;
const VIDEO_URL = `https://api.jsonbin.io/v3/b/${VIDEO_BIN_ID}`;
const USER_URL = `https://api.jsonbin.io/v3/b/${USER_BIN_ID}`;
const MESSAGES_URL = `https://api.jsonbin.io/v3/b/${MESSAGES_BIN_ID}`;
const STATUS_URL = `https://api.jsonbin.io/v3/b/${STATUS_BIN_ID}`;
const headers = { "Content-Type": "application/json", "X-Master-Key": API_KEY };

const spotifyClientId = 'f77ae12dd0e7405192d95390c8b1b418';
const redirectUri = 'https://nexiflow.netlify.app';
let currentUser = null;
let usersData = {};
let allPosts = [];
let allVideos = [];
let allUsers = [];
let allStatuses = [];
let allMessagesData = { privateMessages: {}, groupChats: {}, channels: {} };
let currentPostType = 'text';
let currentEmbedFormat = 'horizontal';
let currentVideoPageFormat = 'vertical';
let newVideoFormat = 'horizontal';
let currentOpenChat = { id: null, type: null };
let pollingInterval = null;
let tempRecoveryData = null;


function showElement(elementId) { document.getElementById(elementId).classList.remove('hidden'); }
function hideElement(elementId) { document.getElementById(elementId).classList.add('hidden'); }
function toggleElement(elementId) { document.getElementById(elementId).classList.toggle('hidden'); }

// MODIFICA: La funzione ora gestisce la creazione immediata di un nuovo utente senza chiedere il paese.
async function handleCredentialResponse(response) {
    const decodedToken = parseJwt(response.credential);
    
    // FETCH LATEST USERS FIRST
    await loadAllUsers();
    let user = allUsers.find(u => u.email === decodedToken.email);

    if (user) {
        // L'utente esiste, procedi con il login normale
        currentUser = user;
        localStorage.setItem("currentUserEmail", currentUser.email);
        showAppContent();
    } else {
        // L'utente non esiste, controlliamo se ci sono vecchi post (recupero account)
        const oldPost = allPosts.find(p => p.authorEmail === decodedToken.email);
        if (oldPost) {
            // Post trovati! Inizia il flusso di recupero sicuro
            alert("Abbiamo trovato dei post precedenti associati a questa email. Per completare il recupero del tuo account, imposta una password per Nexiflow.");
            tempRecoveryData = {
                name: decodedToken.name,
                email: decodedToken.email,
                profilePic: decodedToken.picture,
                bio: "Account recuperato tramite Google",
                country: "",
                blockedUsers: [],
                followers: [],
                following: []
            };
            document.getElementById('setPasswordModal').classList.add('active');
        } else {
            // Nessun post trovato, è un utente veramente nuovo. Creazione e accesso immediati.
            const newUser = {
                name: decodedToken.name,
                email: decodedToken.email,
                profilePic: decodedToken.picture,
                bio: "Accesso tramite Google",
                password: null, 
                country: "", // Il paese viene lasciato vuoto di default
                blockedUsers: [],
                followers: [],
                following: []
            };
            
            try {
                // Append and update
                const updatedUsers = await readLatestUsers();
                updatedUsers.push(newUser);
                await updateUsersOnServer(updatedUsers);
                
                allUsers = updatedUsers; // Update local state
                currentUser = newUser;
                localStorage.setItem("currentUserEmail", currentUser.email);
                showAppContent();
            } catch(err) {
                alert("Errore durante la creazione del tuo account.");
                console.error(err);
            }
        }
    }
}

async function completeAccountRecovery() {
    const password = document.getElementById('recoveryPassword').value;
    if (password.length < 6) {
        alert("La password deve essere di almeno 6 caratteri.");
        return;
    }

    tempRecoveryData.password = password;
    currentUser = tempRecoveryData;
    
    try {
        const updatedUsers = await readLatestUsers();
        updatedUsers.push(currentUser);
        await updateUsersOnServer(updatedUsers);

        allUsers = updatedUsers; // Update local state
        localStorage.setItem("currentUserEmail", currentUser.email);
        document.getElementById('setPasswordModal').classList.remove('active');
        alert(`Account recuperato con successo! Benvenuto, ${currentUser.name}!`);
        showAppContent();
    } catch (err) {
        alert("Si è verificato un errore durante il recupero dell'account.");
        console.error(err);
    } finally {
        tempRecoveryData = null;
    }
}

// Questa funzione ora è deprecata per il login con Google, ma la lasciamo per usi futuri eventuali.
async function saveCountry() {
    const country = document.getElementById("countrySelect").value;
    if (!country) {
        alert("Seleziona un Paese!");
        return;
    }
    currentUser.country = country;
    
    try {
        const users = await readLatestUsers();
        if (!users.find(u => u.email === currentUser.email)) {
            users.push(currentUser);
        }
        await updateUsersOnServer(users);
        allUsers = users;
        localStorage.setItem("currentUserEmail", currentUser.email);
        hideElement("countryModal");
        showAppContent();
    } catch(err) {
        alert("Errore nel salvataggio del profilo.");
        console.error(err);
    }
}

function parseJwt(token) {
var base64Url = token.split('.')[1];
var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
}).join(''));
return JSON.parse(jsonPayload);
}

// =================== DATA POLLING & INTELLIGENT RENDERING ===================

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        if (!currentUser) return;
        await refreshData();
    }, 2000);
}

function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = null;
}

async function refreshData() {
    try {
        const [postsRes, messagesRes, statusRes] = await Promise.all([
            fetch(BASE_URL + "/latest", { headers }),
            fetch(MESSAGES_URL + "/latest", { headers }),
            fetch(STATUS_URL + "/latest", { headers })
        ]);

        if (!postsRes.ok || !messagesRes.ok || !statusRes.ok) return;

        const newPostsData = await postsRes.json();
        const newMessagesData = await messagesRes.json();
        const newStatusData = await statusRes.json();

        // Aggiorna post
        const newPosts = newPostsData.record.posts || [];
        if (newPosts.length > allPosts.length) {
            const addedPosts = newPosts.slice(0, newPosts.length - allPosts.length);
            allPosts = newPosts;
            renderNewPosts(addedPosts);
        }

        // Aggiorna messaggi
        const newMessagesRecord = newMessagesData.record || { privateMessages: {}, groupChats: {}, channels: {} };
        if (JSON.stringify(allMessagesData) !== JSON.stringify(newMessagesRecord)) {
            allMessagesData = newMessagesRecord;
            if (document.getElementById('chatPage').style.display !== 'none') {
                renderConversationList();
                if (currentOpenChat.id) renderMessages(true);
            }
        }

        // Aggiorna stati e notifica
        const newStatuses = newStatusData.record.statuses || [];
        if (JSON.stringify(allStatuses) !== JSON.stringify(newStatuses)) {
            allStatuses = newStatuses;
            if (document.getElementById('statusPage').style.display !== 'none') {
                 renderStatusBubbles();
            }
            checkForNewStatuses();
        }

    } catch (err) {
        console.error("Errore durante l'aggiornamento dei dati:", err);
    }
}

async function readLatestUsers() {
    try {
        const res = await fetch(USER_URL + "/latest", { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return data.record.users || [];
    } catch (err) {
        console.error("Errore nel leggere gli utenti:", err);
        return [];
    }
}

async function loadAllUsers() {
    allUsers = await readLatestUsers();
    usersData = allUsers.reduce((map, user) => {
        map[user.email] = user;
        return map;
    }, {});
}


async function loadAllData() {
    try {
        const [postsRes, videosRes, usersRes, messagesRes, statusRes] = await Promise.all([
            fetch(BASE_URL + "/latest", { headers }),
            fetch(VIDEO_URL + "/latest", { headers }),
            fetch(USER_URL + "/latest", { headers }),
            fetch(MESSAGES_URL + "/latest", { headers }),
            fetch(STATUS_URL + "/latest", { headers })
        ]);
        const postsData = await postsRes.json();
        const videosData = await videosRes.json();
        const usersDataRaw = await usersRes.json();
        const messagesData = await messagesRes.json();
        const statusData = await statusRes.json();

        allPosts = postsData.record.posts || [];
        allVideos = videosData.record.videos || [];
        allUsers = usersDataRaw.record.users || [];
        allMessagesData = messagesData.record || { privateMessages: {}, groupChats: {}, channels: {} };
        allStatuses = statusData.record.statuses || [];
        
        allMessagesData.privateMessages = allMessagesData.privateMessages || {};
        allMessagesData.groupChats = allMessagesData.groupChats || {};
        allMessagesData.channels = allMessagesData.channels || {};

        usersData = allUsers.reduce((map, user) => {
            map[user.email] = user;
            return map;
        }, {});

        renderPosts(allPosts);
        checkForNewStatuses(); // Controlla le notifiche per gli stati

    } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
    }
}
async function updateUsersOnServer(users) {
try { await fetch(USER_URL, { method: "PUT", headers, body: JSON.stringify({ users }) }); }
catch (error) { console.error("Errore nell'aggiornamento degli utenti:", error); }
}
async function updatePostsOnServer(posts) {
try { await fetch(BASE_URL, { method: "PUT", headers, body: JSON.stringify({ posts }) }); }
catch (error) { console.error("Errore nell'aggiornamento dei post:", error); }
}
async function updateVideosOnServer(videos) {
try { await fetch(VIDEO_URL, { method: "PUT", headers, body: JSON.stringify({ videos }) }); }
catch (error) { console.error("Errore nell'aggiornamento dei video:", error); }
}
async function updateMessagesOnServer() {
    try {
        await fetch(MESSAGES_URL, {
            method: "PUT",
            headers,
            body: JSON.stringify(allMessagesData)
        });
    } catch (error) {
        console.error("Errore nell'aggiornamento dei messaggi:", error);
    }
}
async function updateStatusesOnServer(statuses) {
    try {
        await fetch(STATUS_URL, { method: "PUT", headers, body: JSON.stringify({ statuses }) });
    } catch (error) {
        console.error("Errore nell'aggiornamento degli stati:", error);
    }
}
function showLoginPage() {
showElement('loginPage');
hideElement('registerPage');
document.getElementById('loginEmail').focus();
}
function showRegisterPage() {
hideElement('loginPage');
showElement('registerPage');
document.getElementById('registerName').focus();
}
function selectProfilePic(element, type) {
const selector = type === 'register' ?
document.getElementById('registerProfilePicSelector') :
document.getElementById('editProfilePicSelector');
selector.querySelectorAll('.profile-pic-option').forEach(img => {
img.classList.remove('selected');
});
element.classList.add('selected');
const customPicInput = document.getElementById('customProfilePicInput');
if (customPicInput) customPicInput.value = '';
}

async function registerUser() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const selectedPic = document.querySelector('#registerProfilePicSelector .selected');
    let profilePic = selectedPic ? selectedPic.dataset.value : 'profilo1.png';

    if (!name || !email || !password) {
        alert("Compila tutti i campi!");
        return;
    }
    
    // FETCH LATEST USERS FIRST
    const existingUsers = await readLatestUsers();
    
    if (existingUsers.find(u => u.email === email)) {
        alert("Esiste già un utente con questa email.");
        return;
    }

    const oldPost = allPosts.find(p => p.authorEmail === email);
    let recoveredData = {};
    if (oldPost) {
        if (confirm("Abbiamo trovato dei post precedenti associati a questa email. Vuoi provare a recuperare i dati del tuo vecchio profilo (nome, immagine)?")) {
            recoveredData.name = oldPost.author;
            recoveredData.profilePic = oldPost.authorPic;
            alert(`Dati recuperati! Il tuo nome utente sarà "${recoveredData.name}". Potrai cambiarlo nelle impostazioni.`);
        }
    }

    const newUser = {
        name: recoveredData.name || name,
        email,
        password,
        profilePic: recoveredData.profilePic || profilePic,
        bio: "", country: "", blockedUsers: [],
        followers: [], following: []
    };

    try {
        existingUsers.push(newUser);
        await updateUsersOnServer(existingUsers);
        allUsers = existingUsers; // Update local state
        alert("Registrazione completata! Ora puoi accedere.");
        showLoginPage();
    } catch(err) {
        alert("Errore durante la registrazione.");
        console.error(err);
    }
}


async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const user = allUsers.find(u => u.email === email);

    if (user) {
        if (user.password === password) {
            currentUser = user;
            localStorage.setItem("currentUserEmail", email);
            alert(`Benvenuto, ${currentUser.name}!`);
            showAppContent();
        } else {
            alert("Password non corretta. Riprova.");
        }
    } else {
        const oldPost = allPosts.find(p => p.authorEmail === email);
        if (oldPost) {
            alert("Nessun account trovato con questa email, ma abbiamo rilevato dei post a tuo nome. Per recuperarli, registrati di nuovo usando la stessa email.");
            showRegisterPage();
            document.getElementById('registerEmail').value = email;
        } else {
            alert("Utente non trovato. Controlla l'email o registrati.");
        }
    }
}
function logoutUser() {
currentUser = null;
localStorage.removeItem("currentUserEmail");
stopPolling();
// Mostra authContent e nascondi appContent
const authContent = document.getElementById('authContent');
if (authContent) authContent.classList.remove('hidden');
hideElement('appContent');
showLoginPage();
}
function showAuthContent() {
// Mostra authContent e nascondi appContent
const authContent = document.getElementById('authContent');
if (authContent) authContent.classList.remove('hidden');
hideElement('appContent');
showLoginPage();
}
function showAppContent() {
hideElement('authContent');
showElement('appContent');
updateUserInfo();
showMainContent();
startPolling();
}
function updateUserInfo() {
if (currentUser) {
document.getElementById("userNameDisplay").textContent = currentUser.name;
document.getElementById("userProfilePic").src = currentUser.profilePic;
}
}
function showMainContent() {
hideElement('videoPage'); hideElement('userProfilePage');
hideElement('settingsPage'); hideElement('chatPage');
hideElement('statusPage'); showElement('mainContent');
}
function showVideoPage() {
hideElement('mainContent'); hideElement('userProfilePage');
hideElement('settingsPage'); hideElement('chatPage');
hideElement('statusPage'); showElement('videoPage');
showVideos(currentVideoPageFormat);
}
function showSettingsPage() {
if (!currentUser) return;
hideElement('mainContent'); hideElement('videoPage');
hideElement('userProfilePage'); hideElement('chatPage');
hideElement('statusPage'); showElement('settingsPage');
document.getElementById('editName').value = currentUser.name;
document.getElementById('editBio').value = currentUser.bio || '';
document.getElementById('customProfilePicInput').value = ''; 
const picSelector = document.getElementById('editProfilePicSelector');
picSelector.querySelectorAll('.profile-pic-option').forEach(img => img.classList.remove('selected'));
const currentPic = picSelector.querySelector(`img[data-value='${currentUser.profilePic}']`);
if (currentPic) { currentPic.classList.add('selected'); }
}

// =================================== CODICE CHAT (INVARIATO) ===================================
function showChatPage() {
    if (!currentUser) { alert("Devi essere loggato per usare la chat."); return; }
    hideElement('mainContent'); hideElement('videoPage'); hideElement('userProfilePage');
    hideElement('settingsPage'); hideElement('statusPage'); showElement('chatPage');
    renderConversationList();
    showElement('chat-welcome-screen');
    document.getElementById('chat-window').style.display = 'none';
}
function renderConversationList() {
    const container = document.getElementById('conversation-list');
    const myConversations = [];
    Object.keys(allMessagesData.privateMessages).forEach(key => {
        if (key.includes(currentUser.email)) {
            const recipientEmail = key.split('_to_').find(email => email !== currentUser.email);
            const recipient = usersData[recipientEmail];
            if (!recipient) return;
            const messages = allMessagesData.privateMessages[key]; const lastMessage = messages[messages.length - 1];
            if (lastMessage) myConversations.push({ id: key, type: 'private', name: recipient.name, pic: recipient.profilePic, lastMessage: lastMessage.text, date: new Date(lastMessage.date) });
        }
    });
    Object.keys(allMessagesData.groupChats).forEach(key => {
        const group = allMessagesData.groupChats[key];
        if (group.members.includes(currentUser.email)) {
            const lastMessage = group.messages[group.messages.length - 1];
            myConversations.push({ id: key, type: 'group', name: group.name, pic: group.pic || 'profilo_gruppo.png', lastMessage: lastMessage ? `${usersData[lastMessage.senderEmail]?.name.split(' ')[0]}: ${lastMessage.text}` : 'Nessun messaggio', date: lastMessage ? new Date(lastMessage.date) : new Date(group.createdAt) });
        }
    });
    Object.keys(allMessagesData.channels).forEach(key => {
        const channel = allMessagesData.channels[key];
        if (channel.members.includes(currentUser.email)) {
            const lastMessage = channel.messages[channel.messages.length - 1];
            myConversations.push({ id: key, type: 'channel', name: `📢 ${channel.name}`, pic: channel.pic || 'profilo_canale.png', lastMessage: lastMessage ? lastMessage.text : 'Nessun messaggio', date: lastMessage ? new Date(lastMessage.date) : new Date(channel.createdAt) });
        }
    });
    myConversations.sort((a, b) => b.date - a.date);
    container.innerHTML = myConversations.map(conv => createConversationElement(conv)).join('');
    if (myConversations.length === 0) container.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-tertiary);">Nessuna conversazione.</p>';
}
function createConversationElement(conv) {
    const isActive = currentOpenChat.id === conv.id ? 'active' : '';
    return `<div class="conversation-item ${isActive}" onclick="openConversation('${conv.id}', '${conv.type}')">
        <img src="${conv.pic}" class="profile-pic" />
        <div class="conversation-info">
            <div class="user-name-conv">${conv.name}</div>
            <div class="last-message">${conv.lastMessage}</div>
        </div>
    </div>`;
}
function openConversation(id, type) {
    currentOpenChat = { id, type };
    hideElement('chat-welcome-screen');
    document.getElementById('chat-window').style.display = 'flex';
    renderConversationList();
    renderMessages(false);
    const messageInput = document.getElementById('chatMessageInput');
    const sendButton = document.querySelector('.send-chat-btn');
    const optionsContainer = document.getElementById('chatOptionsContainer');
    const recipientPic = document.getElementById('chatRecipientPic');
    const recipientName = document.getElementById('chatRecipientName');
    if (type === 'private') {
        const recipientEmail = id.split('_to_').find(email => email !== currentUser.email);
        const recipient = usersData[recipientEmail];
        recipientName.textContent = recipient.name; recipientPic.src = recipient.profilePic;
        optionsContainer.classList.remove('hidden'); messageInput.disabled = false; sendButton.disabled = false;
    } else if (type === 'group') {
        const group = allMessagesData.groupChats[id];
        recipientName.textContent = group.name; recipientPic.src = group.pic || 'profilo_gruppo.png';
        optionsContainer.classList.add('hidden'); messageInput.disabled = false; sendButton.disabled = false;
    } else if (type === 'channel') {
        const channel = allMessagesData.channels[key];
        recipientName.textContent = `📢 ${channel.name}`; recipientPic.src = channel.pic || 'profilo_canale.png';
        optionsContainer.classList.add('hidden');
        const canWrite = channel.admins.includes(currentUser.email);
        messageInput.disabled = !canWrite; sendButton.disabled = !canWrite;
        messageInput.placeholder = canWrite ? "Scrivi un messaggio..." : "Solo gli amministratori possono inviare messaggi.";
    }
    document.getElementById('chatMessageInput').focus();
}
function renderMessages(isUpdate) {
    const chatBody = document.getElementById('chatMessageHistory');
    const shouldScroll = !isUpdate || (chatBody.scrollTop + chatBody.clientHeight >= chatBody.scrollHeight - 50);
    let messages = [];
    if (currentOpenChat.type === 'private') messages = allMessagesData.privateMessages[currentOpenChat.id] || [];
    else if (currentOpenChat.type === 'group') messages = allMessagesData.groupChats[currentOpenChat.id]?.messages || [];
    else if (currentOpenChat.type === 'channel') messages = allMessagesData.channels[currentOpenChat.id]?.messages || [];
    if (chatBody.children.length === messages.length && isUpdate) return;
    chatBody.innerHTML = '';
    if (messages.length === 0) {
        chatBody.innerHTML = '<p style="text-align: center; color: var(--text-tertiary);">Inizia la conversazione!</p>';
        return;
    }
    messages.forEach(msg => {
        const sender = usersData[msg.senderEmail]; if (!sender) return;
        const messageElement = document.createElement('div');
        const isSent = msg.senderEmail === currentUser.email;
        messageElement.className = `chat-message ${isSent ? 'sent' : 'received'}`;
        let senderNameHTML = (currentOpenChat.type === 'group' && !isSent) ? `<div class="sender-name">${sender.name}</div>` : '';
        messageElement.innerHTML = `${senderNameHTML}<div>${msg.text}</div>`;
        chatBody.appendChild(messageElement);
    });
    if (shouldScroll) chatBody.scrollTop = chatBody.scrollHeight;
}
async function sendMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    if (!text || !currentOpenChat.id) return;
    const newMessage = { senderEmail: currentUser.email, text, date: new Date().toISOString() };
    if (currentOpenChat.type === 'private') {
        if (!allMessagesData.privateMessages[currentOpenChat.id]) allMessagesData.privateMessages[currentOpenChat.id] = [];
        allMessagesData.privateMessages[currentOpenChat.id].push(newMessage);
    } else if (currentOpenChat.type === 'group') allMessagesData.groupChats[currentOpenChat.id].messages.push(newMessage);
    else if (currentOpenChat.type === 'channel') allMessagesData.channels[currentOpenChat.id].messages.push(newMessage);
    input.value = '';
    renderMessages(true);
    await updateMessagesOnServer();
    renderConversationList();
}
function populateUserSelection(containerId) {
    const container = document.getElementById(containerId); container.innerHTML = '';
    allUsers.forEach(user => {
        if (user.email === currentUser.email) return;
        const item = document.createElement('div'); item.className = 'user-selection-item';
        item.innerHTML = `<input type="checkbox" id="user-select-${user.email}-${containerId}" value="${user.email}"><label for="user-select-${user.email}-${containerId}"><img src="${user.profilePic}" class="profile-pic" style="width: 32px; height: 32px; vertical-align: middle; margin-right: 8px;">${user.name}</label>`;
        container.appendChild(item);
    });
}
function showCreateGroupModal() { populateUserSelection('groupUserSelection'); document.getElementById('createGroupModal').classList.add('active'); }
function hideCreateGroupModal() { document.getElementById('createGroupModal').classList.remove('active'); }
async function createGroup() {
    const name = document.getElementById('groupNameInput').value.trim(); if (!name) { alert("Inserisci un nome per il gruppo."); return; }
    const selectedUsers = [currentUser.email];
    document.querySelectorAll('#groupUserSelection input:checked').forEach(input => selectedUsers.push(input.value));
    if (selectedUsers.length < 2) { alert("Un gruppo deve avere almeno 2 membri."); return; }
    const picFile = document.getElementById('groupPicInput').files[0]; let picUrl = 'profilo_gruppo.png';
    if (picFile) { try { const uploadResult = await uploadToCloudinary(picFile); picUrl = uploadResult.url; } catch (error) { alert("Errore nel caricamento dell'immagine."); return; } }
    const groupId = `group_${Date.now()}`;
    allMessagesData.groupChats[groupId] = { name, pic: picUrl, members: selectedUsers, admins: [currentUser.email], messages: [], createdAt: new Date().toISOString() };
    await updateMessagesOnServer(); hideCreateGroupModal(); renderConversationList(); alert(`Gruppo "${name}" creato con successo!`);
}
function showCreateChannelModal() { populateUserSelection('channelUserSelection'); document.getElementById('createChannelModal').classList.add('active'); }
function hideCreateChannelModal() { document.getElementById('createChannelModal').classList.remove('active'); }
async function createChannel() {
    const name = document.getElementById('channelNameInput').value.trim(); if (!name) { alert("Inserisci un nome per il canale."); return; }
    const selectedUsers = [currentUser.email];
    document.querySelectorAll('#channelUserSelection input:checked').forEach(input => selectedUsers.push(input.value));
    const picFile = document.getElementById('channelPicInput').files[0]; let picUrl = 'profilo_canale.png';
    if (picFile) { try { const uploadResult = await uploadToCloudinary(picFile); picUrl = uploadResult.url; } catch (error) { alert("Errore nel caricamento dell'immagine."); return; } }
    const channelId = `channel_${Date.now()}`;
    allMessagesData.channels[channelId] = { name, pic: picUrl, members: selectedUsers, admins: [currentUser.email], messages: [], createdAt: new Date().toISOString() };
    await updateMessagesOnServer(); hideCreateChannelModal(); renderConversationList(); alert(`Canale "${name}" creato con successo!`);
}
function showAddContactModal() { populateAddContactList(); document.getElementById('addContactModal').classList.add('active'); }
function hideAddContactModal() { document.getElementById('addContactModal').classList.remove('active'); }
function populateAddContactList() {
    const container = document.getElementById('addContactUserList'); container.innerHTML = '';
    allUsers.forEach(user => {
        if (user.email === currentUser.email) return;
        const item = document.createElement('div'); item.className = 'conversation-item'; item.style.cursor = 'pointer'; item.onclick = () => startNewPrivateChat(user.email);
        item.innerHTML = `<img src="${user.profilePic}" class="profile-pic" /><div class="conversation-info"><div class="user-name-conv">${user.name}</div><div class="last-message">${user.email}</div></div>`;
        container.appendChild(item);
    });
}
function startNewPrivateChat(recipientEmail) { hideAddContactModal(); startPrivateChatFromPost(recipientEmail); }
function toggleChatOptions() { const menu = document.getElementById('chat-options-menu'); menu.style.display = menu.style.display === 'block' ? 'none' : 'block'; }
async function blockAndReportUser() {
    if (currentOpenChat.type !== 'private') return;
    const recipientEmail = currentOpenChat.id.split('_to_').find(email => email !== currentUser.email);
    const recipientName = usersData[recipientEmail].name;
    if (!confirm(`Sei sicuro di voler bloccare ${recipientName} e segnalare la conversazione? L'utente non potrà più inviarti messaggi.`)) return;
    if (!currentUser.blockedUsers) currentUser.blockedUsers = [];
    if (!currentUser.blockedUsers.includes(recipientEmail)) { 
        currentUser.blockedUsers.push(recipientEmail);
        const users = await readLatestUsers();
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            await updateUsersOnServer(users);
            allUsers = users;
        }
    }
    const messages = allMessagesData.privateMessages[currentOpenChat.id] || [];
    const last30Messages = messages.slice(-30);
    const reportBody = `Segnalazione utente:\n- Utente Segnalato: ${recipientName} (${recipientEmail})\n- Utente che Segnala: ${currentUser.name} (${currentUser.email})\n\nUltimi 30 messaggi:\n\n` + last30Messages.map(msg => `[${new Date(msg.date).toLocaleString('it-IT')}] ${usersData[msg.senderEmail].name}: ${msg.text}`).join('\n');
    const subject = `Segnalazione Utente Nexiflow: ${recipientName}`;
    window.location.href = `mailto:nexiquar@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportBody)}`;
    alert(`${recipientName} è stato bloccato. La conversazione verrà segnalata.`); showChatPage();
}
function getConversationKey(email1, email2) { return [email1, email2].sort().join('_to_'); }
// =================================== FINE CODICE CHAT ===================================


// =================================== CODICE STATI CON NOTIFICA ===================================
let statusViewerData = { currentIndex: 0, userStatuses: [], timeoutId: null };
function getSeenStatuses() { return JSON.parse(localStorage.getItem('seenStatuses')) || []; }
function setSeenStatuses(seenIds) { localStorage.setItem('seenStatuses', JSON.stringify(seenIds)); }

function checkForNewStatuses() {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeStatuses = allStatuses.filter(s => new Date(s.createdAt).getTime() > twentyFourHoursAgo);
    const seenStatuses = getSeenStatuses();
    const hasUnseen = activeStatuses.some(s => !seenStatuses.includes(s.id));
    const notificationDot = document.getElementById('status-notification-dot');
    if (hasUnseen) {
        notificationDot.classList.remove('hidden');
    } else {
        notificationDot.classList.add('hidden');
    }
}
function showStatusPage() {
    hideElement('mainContent'); hideElement('videoPage'); hideElement('userProfilePage');
    hideElement('settingsPage'); hideElement('chatPage'); showElement('statusPage');
    renderStatusBubbles();
}
function renderStatusBubbles() {
    const container = document.getElementById('status-list'); container.innerHTML = '';
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeStatuses = allStatuses.filter(status => new Date(status.createdAt).getTime() > twentyFourHoursAgo);
    if (activeStatuses.length === 0) {
        container.innerHTML = '<p style="padding: 1rem;">Nessuno stato pubblicato nelle ultime 24 ore.</p>';
        return;
    }
    const statusesByUser = activeStatuses.reduce((acc, status) => {
        if (!acc[status.authorEmail]) acc[status.authorEmail] = [];
        acc[status.authorEmail].push(status);
        acc[status.authorEmail].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return acc;
    }, {});
    Object.keys(statusesByUser).forEach(authorEmail => {
        const user = usersData[authorEmail]; if (!user) return;
        const statusElement = document.createElement('div');
        statusElement.style.textAlign = 'center'; statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => openStatusViewer(authorEmail);
        statusElement.innerHTML = `<img src="${user.profilePic}" class="profile-pic" style="border: 3px solid var(--primary);"><p class="text-xs font-semibold">${user.name.split(' ')[0]}</p>`;
        container.appendChild(statusElement);
    });
}
function openStatusViewer(authorEmail) {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const userStatuses = allStatuses
        .filter(s => s.authorEmail === authorEmail && new Date(s.createdAt).getTime() > twentyFourHoursAgo)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (userStatuses.length === 0) return;
    
    // AGGIUNGI STATI AI VISTI
    let seenStatuses = getSeenStatuses();
    userStatuses.forEach(s => { if (!seenStatuses.includes(s.id)) seenStatuses.push(s.id); });
    setSeenStatuses(seenStatuses);
    checkForNewStatuses(); // Aggiorna il pallino

    statusViewerData.userStatuses = userStatuses; statusViewerData.currentIndex = 0;
    const modal = document.getElementById('statusModal');
    const viewer = document.getElementById('status-viewer');
    const user = usersData[authorEmail];
    const progressBarsHTML = userStatuses.map((_, index) => `<div class="status-progress-bar-container"><div class="status-progress-bar" id="progress-bar-${index}"></div></div>`).join('');
    viewer.innerHTML = `<div class="status-header"><div class="status-progress-container">${progressBarsHTML}</div><div class="status-user-info"><img src="${user.profilePic}" class="profile-pic" /><span>${user.name}</span></div><span class="close-modal" onclick="closeStatusModal()">×</span></div><div class="status-content"></div><div class="status-nav-prev" onclick="changeStatus('prev')">‹</div><div class="status-nav-next" onclick="changeStatus('next')">›</div>`;
    modal.classList.add('active');
    const style = document.createElement('style'); style.id = 'status-viewer-styles';
    style.innerHTML = `.status-header{position:absolute;top:0;left:0;right:0;padding:15px;z-index:10;display:flex;flex-direction:column;gap:10px}.status-progress-container{display:flex;gap:4px;width:100%}.status-progress-bar-container{flex:1;background:rgba(255,255,255,0.3);border-radius:2px;height:3px}.status-progress-bar{height:100%;background:white;width:0%;border-radius:2px;transition:width 5s linear}.status-user-info{display:flex;align-items:center;gap:10px;color:white;font-weight:500}.status-user-info .profile-pic{width:32px;height:32px}.status-content{width:100%;height:100%;display:flex;align-items:center;justify-content:center}.status-content video,.status-content img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px}.status-nav-prev,.status-nav-next{position:absolute;top:50%;transform:translateY(-50%);font-size:3rem;color:white;cursor:pointer;user-select:none;z-index:11;padding:0 20px}.status-nav-prev{left:0}.status-nav-next{right:0}.close-modal{position:absolute;top:15px;right:15px;z-index:12;font-size:2.5rem !important;cursor:pointer}`;
    document.head.appendChild(style);
    showCurrentStatus();
}
function showCurrentStatus() {
    const status = statusViewerData.userStatuses[statusViewerData.currentIndex];
    const contentContainer = document.querySelector('#status-viewer .status-content');
    if (statusViewerData.timeoutId) clearTimeout(statusViewerData.timeoutId);
    document.querySelectorAll('.status-progress-bar').forEach((bar, index) => {
        bar.style.transition = 'none'; bar.style.width = index < statusViewerData.currentIndex ? '100%' : '0%';
    });
    contentContainer.innerHTML = `<video src="${status.videoUrl}" autoplay muted playsinline></video>`;
    const video = contentContainer.querySelector('video');
    video.oncanplay = () => {
        const duration = video.duration * 1000;
        const progressBar = document.getElementById(`progress-bar-${statusViewerData.currentIndex}`);
        progressBar.offsetHeight; progressBar.style.transition = `width ${duration / 1000}s linear`;
        progressBar.style.width = '100%';
        statusViewerData.timeoutId = setTimeout(() => changeStatus('next'), duration);
    };
    video.onerror = () => { setTimeout(() => changeStatus('next'), 3000); };
}
function changeStatus(direction) {
    if (direction === 'next') {
        if (statusViewerData.currentIndex < statusViewerData.userStatuses.length - 1) {
            statusViewerData.currentIndex++; showCurrentStatus();
        } else closeStatusModal();
    } else if (direction === 'prev') {
        if (statusViewerData.currentIndex > 0) {
            statusViewerData.currentIndex--; showCurrentStatus();
        }
    }
}
function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (statusViewerData.timeoutId) clearTimeout(statusViewerData.timeoutId);
    document.getElementById('status-viewer').innerHTML = '';
    const style = document.getElementById('status-viewer-styles'); if (style) style.remove();
    modal.classList.remove('active');
}
document.getElementById('statusUploadInput').addEventListener('change', async function(event) {
    const file = event.target.files[0]; if (!file || !currentUser) return;
    alert("Caricamento del tuo stato in corso...");
    try {
        const { url: videoUrl } = await uploadToCloudinary(file);
        const newStatus = { id: Date.now(), authorEmail: currentUser.email, videoUrl: videoUrl, createdAt: new Date().toISOString() };
        allStatuses.unshift(newStatus); await updateStatusesOnServer(allStatuses);
        alert("Stato pubblicato con successo!"); renderStatusBubbles(); checkForNewStatuses();
    } catch (error) {
        alert("Si è verificato un errore durante il caricamento."); console.error("Errore pubblicazione stato:", error);
    } finally { event.target.value = ''; }
});
// =================================== FINE CODICE STATI ===================================


// ========================= CODICE FOLLOWER (CORRETTO E SICURO) ============================
async function toggleFollow(targetUserEmail) {
    if (!currentUser || !targetUserEmail || currentUser.email === targetUserEmail) return;

    // Lavora sempre sulla copia master dei dati per evitare inconsistenze
    const allUsersServerCopy = await readLatestUsers();
    
    const userFollowing = allUsersServerCopy.find(u => u.email === currentUser.email);
    const userToFollow = allUsersServerCopy.find(u => u.email === targetUserEmail);

    if (!userFollowing || !userToFollow) {
        console.error("Azione Follow fallita: utente non trovato nei dati del server.");
        return;
    }

    // Assicura che gli array esistano (per compatibilità con vecchi account)
    userFollowing.following = userFollowing.following || [];
    userToFollow.followers = userToFollow.followers || [];

    const isFollowing = userFollowing.following.includes(targetUserEmail);

    if (isFollowing) {
        // Unfollow: Rimuovi l'email da entrambi gli array
        userFollowing.following = userFollowing.following.filter(email => email !== targetUserEmail);
        userToFollow.followers = userToFollow.followers.filter(email => email !== userFollowing.email);
    } else {
        // Follow: Aggiungi l'email a entrambi gli array
        userFollowing.following.push(targetUserEmail);
        userToFollow.followers.push(userFollowing.email);
    }
    
    // Aggiorna l'oggetto currentUser globale per riflettere le modifiche immediatamente nell'UI
    currentUser = userFollowing;
    allUsers = allUsersServerCopy; // Aggiorna la copia locale

    // Salva l'intero array aggiornato sul server
    await updateUsersOnServer(allUsersServerCopy);
    
    // Ricarica la pagina del profilo per mostrare il nuovo stato
    showUserProfile(targetUserEmail);
}
// =================================== FINE CODICE FOLLOWER ===================================



function toggleTheme() {
document.body.classList.toggle('dark-mode');
const isDark = document.body.classList.contains('dark-mode');
const logo = isDark ? 'logo2.png' : 'logo1.png';
document.getElementById('logo').src = logo;
}
function toggleInput() { document.getElementById('inputArea').classList.toggle('active'); }
function setPostType(type, button) {
currentPostType = type;
document.querySelectorAll('#inputArea .post-type-selector button').forEach(btn => btn.classList.remove('active'));
button.classList.add('active');
hideElement('post-text-fields'); hideElement('post-video-fields');
hideElement('post-embed-fields'); hideElement('post-twitter-fields'); hideElement('post-upload-fields');
if (type === 'text') { showElement('post-text-fields'); document.getElementById('postText').focus(); }
else if (type === 'video') { showElement('post-video-fields'); document.getElementById('videoLink').focus(); }
else if (type === 'embed') { showElement('post-embed-fields'); document.getElementById('embedCode').focus(); }
else if (type === 'twitter') { showElement('post-twitter-fields'); document.getElementById('twitterLink').focus(); }
else if (type === 'upload') { showElement('post-upload-fields'); document.getElementById('fileUploadInput').focus(); }
checkPublishButtonState();
}
function setVideoFormat(format) {
currentEmbedFormat = format;
document.querySelectorAll('#post-embed-fields .post-type-selector button').forEach(btn => btn.classList.remove('active'));
document.getElementById(`embed-format-${format}`).classList.add('active');
}
function checkPublishButtonState() {
let isReady = false;
if (currentPostType === 'text' && document.getElementById('postText').value.trim() !== '') isReady = true;
else if (currentPostType === 'video' && document.getElementById('videoLink').value.trim() !== '') isReady = true;
else if (currentPostType === 'embed' && document.getElementById('embedCode').value.trim() !== '') isReady = true;
else if (currentPostType === 'twitter' && document.getElementById('twitterLink').value.trim() !== '') isReady = true;
else if (currentPostType === 'upload' && document.getElementById('fileUploadInput').files.length > 0) isReady = true;
document.getElementById('publishBtn').disabled = !isReady;
}
document.addEventListener('DOMContentLoaded', function() {
const inputs = ['postText', 'videoLink', 'embedCode', 'twitterLink', 'fileUploadInput'];
inputs.forEach(id => { const element = document.getElementById(id); if (element) element.addEventListener('input', checkPublishButtonState); });
});
function getFormattedDate() {
const now = new Date();
return now.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
}
async function uploadToCloudinary(file) {
    const CLOUD_NAME = "dl5nvyusl"; const UPLOAD_PRESET = "nexiflow_uploads";
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    const formData = new FormData();
    formData.append('file', file); formData.append('upload_preset', UPLOAD_PRESET);
    try {
        const response = await fetch(url, { method: 'POST', body: formData });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`Errore Cloudinary: ${errorData.error.message}`); }
        const data = await response.json();
        return { url: data.secure_url, resourceType: data.resource_type };
    } catch (error) { console.error("Errore durante l'upload su Cloudinary:", error); throw error; }
}
async function publishPost() {
    const publishBtn = document.getElementById('publishBtn'); if (publishBtn.disabled) return;
    publishBtn.disabled = true; publishBtn.textContent = 'Pubblicazione...';
    let newPost = { id: Date.now(), author: currentUser.name, authorEmail: currentUser.email, authorPic: currentUser.profilePic, date: getFormattedDate(), upvotes: 0, downvotes: 0, comments: [], type: currentPostType };
    try {
        if (currentPostType === 'upload') {
            const fileInput = document.getElementById('fileUploadInput'); const file = fileInput.files[0]; if (!file) throw new Error("Nessun file selezionato!");
            alert(`Sto caricando il file. L'operazione potrebbe richiedere qualche istante...`);
            const { url, resourceType } = await uploadToCloudinary(file);
            newPost.content = url; newPost.fileType = resourceType;
            newPost.description = document.getElementById('uploadCaption').value.trim();
        } else {
            const content = (currentPostType === 'text') ? document.getElementById('postText').value : (currentPostType === 'video') ? document.getElementById('videoLink').value : (currentPostType === 'embed') ? document.getElementById('embedCode').value : document.getElementById('twitterLink').value;
            if (!content.trim()) throw new Error("Il contenuto non può essere vuoto.");
            newPost.content = content;
            newPost.description = (currentPostType === 'text') ? '' : (currentPostType === 'video') ? document.getElementById('videoDescription').value : document.getElementById('embedDescription').value;
            if (currentPostType === 'embed') newPost.embedFormat = currentEmbedFormat;
        }
        allPosts.unshift(newPost);
        renderNewPosts([newPost]);
        document.getElementById('postText').value = ''; document.getElementById('videoDescription').value = ''; document.getElementById('videoLink').value = ''; document.getElementById('embedDescription').value = ''; document.getElementById('embedCode').value = ''; document.getElementById('twitterLink').value = ''; document.getElementById('fileUploadInput').value = ''; document.getElementById('uploadCaption').value = '';
        if (document.getElementById('inputArea').classList.contains('active')) toggleInput();
        await updatePostsOnServer(allPosts);
    } catch (error) {
        console.error("Errore durante la pubblicazione:", error); alert(`Si è verificato un errore during la pubblicazione: ${error.message}`);
        allPosts.shift(); renderPosts(allPosts);
    } finally {
        publishBtn.textContent = 'Pubblica su Nexiflow'; publishBtn.disabled = false; checkPublishButtonState();
    }
}
function embedFromLink(link) {
if (link.includes('youtu.be')) { const id = link.split('youtu.be/')[1].split('?')[0]; return `https://www.youtube.com/embed/${id}`; }
else if (link.includes('youtube.com')) { const urlParams = new URLSearchParams(new URL(link).search); const id = urlParams.get('v'); return `https://www.youtube.com/embed/${id}`; }
return link;
}
function srcFromEmbed(embedCode) {
const parser = new DOMParser(); const doc = parser.parseFromString(embedCode, 'text/html'); const iframe = doc.querySelector('iframe'); return iframe ? iframe.src : '';
}
function createPostElement(post) {
    const postElement = document.createElement('div'); postElement.className = 'post'; postElement.dataset.id = post.id;
    const isMyPost = currentUser && post.authorEmail === currentUser.email;
    // Rimossa la variabile 'pumpkinHtml'
    const pumpkinHtml = '';
    const deleteButton = isMyPost ? `<button class="action-button" onclick="deletePost(${post.id})" title="Elimina post"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>` : '';
    const privateMessageButton = !isMyPost ? `<button class="footer-button" onclick="startPrivateChatFromPost('${post.authorEmail}')"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg> Messaggio</button>` : '';
    let postContent = '';
    if (post.type === 'text') postContent = `<div class="post-content">${post.content}</div>`;
    else if (post.type === 'video') postContent = `${post.description ? `<div class="post-content">${post.description}</div>` : ''}<div class="post-embed"><iframe src="${embedFromLink(post.content)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    else if (post.type === 'embed') postContent = `${post.description ? `<div class="post-content">${post.description}</div>` : ''}<div class="post-embed"><iframe class="${post.embedFormat === 'vertical' ? 'vertical-video' : ''}" src="${srcFromEmbed(post.content)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    else if (post.type === 'twitter') postContent = `<blockquote class="twitter-tweet"><a href="${post.content}"></a></blockquote>`;
    else if (post.type === 'upload') {
        let mediaElement = '';
        if (post.fileType === 'image') mediaElement = `<img src="${post.content}" alt="Immagine caricata">`;
        else if (post.fileType === 'video') mediaElement = `<video src="${post.content}" controls></video>`;
        postContent = `${post.description ? `<div class="post-content">${post.description}</div>` : ''}<div class="post-uploaded-content">${mediaElement}</div>`;
    }
    // Icone 🎃 e 👻 sostituite con SVG
    postElement.innerHTML = `${pumpkinHtml}<div class="post-header"><a href="#" class="post-author" onclick="showUserProfile('${post.authorEmail}')"><img src="${post.authorPic}" class="profile-pic" alt="Foto Profilo"><div class="author-info"><div class="author-name">${post.author}</div><div class="post-date">${post.date}</div></div></a><div class="post-actions">${deleteButton}</div></div>${postContent}<div class="post-footer"><div class="vote-section"><button class="vote-button" onclick="votePost(${post.id}, 'up')"><svg class="icon" style="width:1em; height:1em; vertical-align: -0.1em;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/></svg> <span>${post.upvotes || 0}</span></button><div class="vote-count">${(post.upvotes || 0) - (post.downvotes || 0)}</div><button class="vote-button" onclick="votePost(${post.id}, 'down')"><svg class="icon" style="width:1em; height:1em; vertical-align: -0.1em;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4 4a.5.5 0 0 1-.708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/></svg> <span>${post.downvotes || 0}</span></button></div><div class="post-actions-footer"><button class="footer-button" onclick="toggleComments(${post.id})"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.5a1 1 0 0 0-.8.4l-1.9 2.533a1 1 0 0 1-1.6 0L5.3 12.4a1 1 0 0 0-.8-.4H2a2 2 0 0 1-2-2V2zm3.5 1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zm0 2.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5z"/></svg> Commenta</button>${privateMessageButton}<button class="footer-button" onclick="translatePost(${post.id})"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 6.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2a.25.25 0 0 0-.25.25v.5c0 .138.112.25.25.25h2a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75v-1.5z"/><path d="M11 6.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2a.25.25 0 0 0-.25.25v.5c0 .138.112.25.25.25h2a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75v-1.5z"/></svg> Traduci</button><button class="footer-button" onclick="summarizePost(${post.id})"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H4z"/><path d="M4.5 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zM4.5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm4.5 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/></svg> Riassumi</button><button class="footer-button" onclick="copyEmbedCode(${post.id})"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg> Incorpora</button></div></div><div class="comments-section" id="comments-section-${post.id}"><h4>Commenti:</h4><div class="comment-list" id="comments-${post.id}"></div><form class="comment-form" onsubmit="event.preventDefault(); addComment(${post.id});"><input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Scrivi un commento..." required /><button type="submit" class="comment-submit">Invia</button></form></div>`;
    renderComments(post.id, post.comments || [], postElement);
    if (post.type === 'twitter' && window.twttr) window.twttr.widgets.load(postElement);
    return postElement;
}
function copyEmbedCode(postId) {
    const post = allPosts.find(p => p.id === postId); if (!post) return;

    const baseUrl = "https://nexiflow.netlify.app/";

    const authorPicUrl = post.authorPic.startsWith('http') ? post.authorPic : baseUrl + post.authorPic;
    
    let processedContent = post.content;
    if (post.type === 'text') {
        processedContent = post.content.replace(/src="stiker/g, `src="${baseUrl}stiker`);
    }

    let contentHtml = '';
    if (post.type === 'text') {
        contentHtml = `<p style="font-size: 16px; line-height: 1.5; margin: 0; white-space: pre-wrap; word-wrap: break-word;">${processedContent}</p>`;
    } else if (post.type === 'upload') {
        if (post.fileType === 'image') contentHtml = `<img src="${post.content}" style="max-width: 100%; border-radius: 8px;" alt="Immagine del post">`;
        else if (post.fileType === 'video') contentHtml = `<video src="${post.content}" controls style="max-width: 100%; border-radius: 8px;"></video>`;
    } else if (post.type === 'embed' || post.type === 'video') {
        contentHtml = `<p style="margin-bottom: 8px; white-space: pre-wrap; word-wrap: break-word;">${post.description || ''}</p><iframe src="${post.type === 'video' ? embedFromLink(post.content) : srcFromEmbed(post.content)}" style="width: 100%; height: 250px; border: none; border-radius: 8px;" allowfullscreen></iframe>`;
    }

    const embedHtml = `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-family:'Inter',sans-serif;max-width:500px;background:#ffffff"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><img src="${authorPicUrl}" style="width:32px;height:32px;border-radius:50%"><div><strong style="font-size:14px;color:#0f172a">${post.author}</strong><p style="font-size:12px;color:#94a3b8;margin:0">${post.date}</p></div></div>${contentHtml}<div style="margin-top:12px;font-size:12px;color:#475569">Pubblicato su <a href="https://nexiflow.netlify.app" target="_blank" style="color:#00D4FF;text-decoration:none">Nexiflow™</a></div></div>`;
    const iframeCode = `<iframe srcdoc="${embedHtml.replace(/"/g, '"')}" style="width: 100%; max-width: 520px; height: 350px; border: none; overflow: hidden;" scrolling="no"></iframe>`;
    
    navigator.clipboard.writeText(iframeCode).then(() => {
        alert('Codice di incorporamento copiato!');
    }, () => {
        alert('Errore nel copiare il codice.');
    });
}
function renderPosts(posts) {
    const container = document.getElementById('postsContainer'); container.innerHTML = '';
    posts.forEach(post => container.appendChild(createPostElement(post)));
}
function renderNewPosts(newPosts) {
    const container = document.getElementById('postsContainer');
    newPosts.reverse().forEach(post => {
        const postElement = createPostElement(post); postElement.style.animation = 'slideDown 0.5s ease-out';
        container.insertBefore(postElement, container.firstChild);
    });
}
async function startPrivateChatFromPost(recipientEmail) {
    if (!currentUser) { alert("Devi essere loggato per inviare messaggi."); return; }
    if (currentUser.email === recipientEmail) { alert("Non puoi inviare messaggi a te stesso."); return; }
    const conversationKey = getConversationKey(currentUser.email, recipientEmail);
    if (!allMessagesData.privateMessages[conversationKey]) allMessagesData.privateMessages[conversationKey] = [];
    showChatPage();
    setTimeout(() => openConversation(conversationKey, 'private'), 100);
}
async function votePost(id, type) {
const post = allPosts.find(p => p.id === id); if (!post) return;
if (type === 'up') post.upvotes = (post.upvotes || 0) + 1; else post.downvotes = (post.downvotes || 0) + 1;
await updatePostsOnServer(allPosts);
const postElement = document.querySelector(`.post[data-id='${id}']`);
if(postElement) {
    postElement.querySelector('.vote-button span').textContent = post.upvotes;
    postElement.querySelector('.vote-count').textContent = post.upvotes - post.downvotes;
    postElement.querySelectorAll('.vote-button')[1].querySelector('span').textContent = post.downvotes;
}
}
async function deletePost(id) {
    if (!currentUser) { alert("Devi essere loggato."); return; }
    const post = allPosts.find(p => p.id === id); if (!post) return;
    if (post.authorEmail !== currentUser.email) { alert("Puoi eliminare solo i tuoi post."); return; }

    if (!currentUser.password) {
        alert("Per eliminare i post, devi prima impostare una password per il tuo account Nexiflow nelle Impostazioni. Questo è necessario anche se accedi con Google.");
        showSettingsPage();
        return;
    }

    const password = prompt("Inserisci la tua password di Nexiflow per confermare l'eliminazione:");
    if (password === null) return;
    if (password !== currentUser.password) {
        alert("Password non corretta.");
        return;
    }

    allPosts = allPosts.filter(p => p.id !== id);
    await updatePostsOnServer(allPosts);
    const postElement = document.querySelector(`.post[data-id='${id}']`);
    if (postElement) {
        postElement.remove();
    }
}
function toggleComments(postId) {
const commentsSection = document.getElementById(`comments-section-${postId}`);
commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
if (commentsSection.style.display === 'block') document.getElementById(`comment-input-${postId}`).focus();
}
async function addComment(postId) {
const post = allPosts.find(p => p.id === postId);
const commentInput = document.getElementById(`comment-input-${postId}`); const text = commentInput.value.trim();
if (!text || !currentUser || !post) return;
if (!post.comments) post.comments = [];
post.comments.push({ author: currentUser.name, authorEmail: currentUser.email, authorPic: currentUser.profilePic, text: text, date: getFormattedDate() });
await updatePostsOnServer(allPosts);
renderComments(postId, post.comments);
commentInput.value = '';
}
function renderComments(postId, comments, containerElement = document) {
const commentList = containerElement.querySelector(`#comments-${postId}`); if (!commentList) return;
commentList.innerHTML = '';
comments.forEach(comment => {
const commentElement = document.createElement('div'); commentElement.className = 'comment';
commentElement.innerHTML = `<strong>${comment.author}</strong>: ${comment.text}<div class="post-date">${comment.date}</div>`;
commentList.appendChild(commentElement);
});
}
function toggleVideoInput() { document.getElementById('videoInputArea').classList.toggle('active'); }
function setNewVideoFormat(format) {
newVideoFormat = format;
document.querySelectorAll('#videoInputArea .post-type-selector button').forEach(btn => btn.classList.remove('active'));
document.getElementById(`new-video-format-${format}`).classList.add('active');
}
function showVideos(format, button) {
currentVideoPageFormat = format;
const videoGrid = document.getElementById('videoGrid'); videoGrid.innerHTML = '';
document.querySelectorAll('#videoPage .post-type-selector button').forEach(btn => btn.classList.remove('active'));
if (button) button.classList.add('active');
const filteredVideos = allVideos.filter(v => v.format === format);
if (filteredVideos.length === 0) { videoGrid.innerHTML = `<p class="text-center">Nessun video di questo tipo pubblicato.</p>`; return; }
filteredVideos.forEach(video => {
const videoElement = document.createElement('div'); videoElement.className = 'post fade-in'; videoElement.dataset.id = video.id;
const isMyVideo = currentUser && video.authorEmail === currentUser.email;
// Icona ❌ sostituita con SVG
const deleteButton = isMyVideo ? `<button class="action-button" onclick="deleteVideo(${video.id})" title="Elimina video"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>` : '';
videoElement.innerHTML = `<div class="post-header"><a href="#" class="post-author" onclick="showUserProfile('${video.authorEmail}')"><img src="${video.authorPic}" class="profile-pic" alt="Foto Profilo"><div class="author-info"><div class="author-name">${video.author}</div><div class="post-date">${video.date}</div></div></a><div class="post-actions">${deleteButton}</div></div><div class="post-embed" onclick="openVideoModal('${video.embedCode}', '${video.format}')"><iframe class="${video.format === 'vertical' ? 'vertical-video' : ''}" src="${video.embedCode.includes('youtube.com') ? embedFromLink(video.embedCode) : srcFromEmbed(video.embedCode)}" title="Video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><div class="post-content">${video.description}</div><div class="post-footer"><div class="vote-section"><button class="vote-button" onclick="voteVideo(${video.id}, 'up')"><svg class="icon" style="width:1em; height:1em; vertical-align: -0.1em;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/></svg> <span>${video.upvotes || 0}</span></button><div class="vote-count">${(video.upvotes || 0) - (video.downvotes || 0)}</div><button class="vote-button" onclick="voteVideo(${video.id}, 'down')"><svg class="icon" style="width:1em; height:1em; vertical-align: -0.1em;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4 4a.5.5 0 0 1-.708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/></svg> <span>${video.downvotes || 0}</span></button></div></div>`;
videoGrid.appendChild(videoElement);
});
}
async function publishNewVideo() {
const embedCode = document.getElementById('newVideoEmbedCode').value.trim();
const description = document.getElementById('newVideoDescription').value.trim();
if (!embedCode || !currentUser) return;
const newVideo = { id: Date.now(), author: currentUser.name, authorEmail: currentUser.email, authorPic: currentUser.profilePic, description: description, embedCode: embedCode, format: newVideoFormat, date: getFormattedDate(), upvotes: 0, downvotes: 0, };
allVideos.unshift(newVideo); await updateVideosOnServer(allVideos);
showVideos(newVideoFormat);
document.getElementById('newVideoDescription').value = ''; document.getElementById('newVideoEmbedCode').value = '';
document.getElementById('publishVideoBtn').disabled = true; toggleVideoInput();
}
async function voteVideo(id, type) {
const video = allVideos.find(v => v.id === id); if (!video) return;
if (type === 'up') video.upvotes = (video.upvotes || 0) + 1; else video.downvotes = (video.downvotes || 0) + 1;
await updateVideosOnServer(allVideos); showVideos(currentVideoPageFormat);
}
async function deleteVideo(id) {
if (!confirm("Sei sicuro di voler eliminare questo video?")) return;
allVideos = allVideos.filter(v => v.id !== id); await updateVideosOnServer(allVideos); showVideos(currentVideoPageFormat);
}
function openVideoModal(embedCode, format) {
const videoModal = document.getElementById('videoModal');
const modalVideoContainer = document.getElementById('modalVideoContainer');
modalVideoContainer.innerHTML = `<iframe style="width:${format==='vertical'?'360px':'854px'};height:${format==='vertical'?'640px':'480px'};max-width:90vw;max-height:80vh" src="${embedCode.includes('youtube.com')?embedFromLink(embedCode):srcFromEmbed(embedCode)}?autoplay=1" title="Video player" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>`;
videoModal.style.display = 'flex';
}
function closeModal() {
const videoModal = document.getElementById('videoModal');
document.getElementById('modalVideoContainer').innerHTML = '';
videoModal.style.display = 'none';
}
async function showUserProfile(email) {
    if (email === currentUser.email) { showSettingsPage(); return; }
    
    // Assicurati di avere i dati più recenti
    await loadAllUsers();
    
    const user = allUsers.find(u => u.email === email); 
    if (!user) {
        alert("Utente non trovato.");
        return;
    }

    hideElement('mainContent'); hideElement('videoPage'); hideElement('settingsPage');
    hideElement('chatPage'); hideElement('statusPage'); showElement('userProfilePage');

    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;
    
    // Assicurati che l'utente corrente abbia un array following
    if (!currentUser.following) currentUser.following = [];
    
    const isFollowing = currentUser.following.includes(user.email);
    const followButtonText = isFollowing ? 'Smetti di seguire' : 'Segui';
    const followButtonClass = isFollowing ? '' : 'primary';

    document.getElementById('profileInfo').innerHTML = `<img src="${user.profilePic}" class="profile-pic" alt="Foto Profilo"><div><div class="user-name">${user.name}</div><div class="text-sm text-tertiary" style="margin-bottom:0.5rem"><span><b>${followersCount}</b> follower</span> • <span><b>${followingCount}</b> seguiti</span></div><div class="text-sm">${user.bio||'Nessuna bio disponibile.'}</div><div style="margin-top:1rem;display:flex;gap:0.5rem"><button class="nav-button ${followButtonClass}" onclick="toggleFollow('${user.email}')">${followButtonText}</button><button class="nav-button" onclick="startPrivateChatFromPost('${user.email}')"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg> Messaggio</button></div></div>`;
    const userPosts = allPosts.filter(post => post.authorEmail === email); renderUserPosts(userPosts);
    const userVideos = allVideos.filter(video => video.authorEmail === email); renderUserVideos(userVideos);
}
function renderUserPosts(posts) {
const container = document.getElementById('userPostsContainer'); container.innerHTML = '';
if (posts.length === 0) { container.innerHTML = '<p>Nessun post da questo utente.</p>'; return; }
posts.forEach(post => {
const postElement = document.createElement('div'); postElement.className = 'post'; let postContent = '';
if (post.type === 'text') postContent = `<div class="post-content">${post.content}</div>`;
else if (post.type === 'video') postContent = `<div class="post-content">${post.description}</div><div class="post-embed"><iframe src="${embedFromLink(post.content)}" frameborder="0" allowfullscreen></iframe></div>`;
else if (post.type === 'embed') postContent = `<div class="post-content">${post.description}</div><div class="post-embed"><iframe src="${srcFromEmbed(post.content)}" frameborder="0" allowfullscreen></iframe></div>`;
postElement.innerHTML = `${postContent}<div class="post-date">${post.date}</div>`;
container.appendChild(postElement);
});
}
function renderUserVideos(videos) {
const container = document.getElementById('userVideosContainer'); container.innerHTML = '';
if (videos.length === 0) { container.innerHTML = '<p>Nessun video da questo utente.</p>'; return; }
videos.forEach(video => {
const videoElement = document.createElement('div'); videoElement.className = 'post';
videoElement.innerHTML = `<div class="post-embed" onclick="openVideoModal('${video.embedCode}','${video.format}')"><iframe class="${video.format==='vertical'?'vertical-video':''}" src="${video.embedCode.includes('youtube.com')?embedFromLink(video.embedCode):srcFromEmbed(video.embedCode)}" title="Video player" frameborder="0" allowfullscreen></iframe></div><div class="post-content">${video.description}</div><div class="post-date">${video.date}</div>`;
container.appendChild(videoElement);
});
}
document.getElementById('searchInput').addEventListener('input', filterUsers);
function filterUsers() {
const query = document.getElementById('searchInput').value.toLowerCase();
const searchResults = document.getElementById('searchResults'); searchResults.innerHTML = '';
if (query.length < 2) { searchResults.style.display = 'none'; return; }
const filtered = allUsers.filter(user => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
if (filtered.length > 0) {
searchResults.style.display = 'block';
filtered.forEach(user => {
const resultItem = document.createElement('a'); resultItem.href = '#'; resultItem.className = 'search-result-item';
resultItem.innerHTML = `<img src="${user.profilePic}" class="profile-pic" /> ${user.name}`;
resultItem.onclick = (e) => { e.preventDefault(); showUserProfile(user.email); searchResults.style.display = 'none'; document.getElementById('searchInput').value = ''; };
searchResults.appendChild(resultItem);
});
} else { searchResults.style.display = 'none'; }
}
document.addEventListener('click', (event) => {
const searchContainer = document.querySelector('.search-container');
if (!searchContainer.contains(event.target)) document.getElementById('searchResults').style.display = 'none';
const chatOptionsContainer = document.getElementById('chatOptionsContainer');
if (chatOptionsContainer && !chatOptionsContainer.contains(event.target)) document.getElementById('chat-options-menu').style.display = 'none';
});
async function saveSettings() {
    if (!currentUser) return;
    const saveButton = document.querySelector('#settingsPage .auth-button');
    saveButton.disabled = true; saveButton.textContent = 'Salvataggio...';
    
    const newName = document.getElementById('editName').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const customPicFile = document.getElementById('customProfilePicInput').files[0];
    const selectedPicElement = document.querySelector('#editProfilePicSelector .selected');
    let newProfilePic = currentUser.profilePic;
    
    if (!newName) { 
        alert("Il nome non può essere vuoto."); 
        saveButton.disabled = false; 
        saveButton.textContent = 'Salva Modifiche'; 
        return; 
    }
    
    if (customPicFile) {
        alert("Caricamento nuova immagine profilo...");
        try { 
            const uploadResult = await uploadToCloudinary(customPicFile); 
            newProfilePic = uploadResult.url; 
        }
        catch (error) { 
            alert("Errore nel caricamento dell'immagine."); 
            saveButton.disabled = false; 
            saveButton.textContent = 'Salva Modifiche'; 
            return; 
        }
    } else if (selectedPicElement) {
        newProfilePic = selectedPicElement.dataset.value;
    }
    
    try {
        const users = await readLatestUsers();
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        
        if (userIndex !== -1) {
            users[userIndex].name = newName;
            users[userIndex].bio = newBio;
            users[userIndex].profilePic = newProfilePic;
            
            await updateUsersOnServer(users);
            
            // Update local state AFTER successful server update
            allUsers = users;
            currentUser = users[userIndex];
            
            localStorage.setItem("currentUserEmail", currentUser.email);
            alert("Impostazioni salvate!");
            updateUserInfo();
            showMainContent();
        } else {
            alert("Errore: utente non trovato nel database.");
        }
    } catch (error) { 
        console.error("Errore nel salvataggio:", error); 
        alert("Errore nel salvataggio delle impostazioni."); 
    }
    finally { 
        saveButton.disabled = false; 
        saveButton.textContent = 'Salva Modifiche'; 
    }
}
async function translatePost(postId) {
const post = allPosts.find(p => p.id === postId); if (!post) return;
const targetLang = currentUser?.country === "Russia" ? "ru" : "it"; const text = post.content;
try {
const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=AIzaSyB0YBCf6G5xxMt_-SQb9MOCmxFkFXzc_Zo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, target: targetLang }) });
const data = await res.json(); const translated = data.data.translations[0].translatedText;
alert("Traduzione: " + translated);
} catch (err) { console.error("Errore traduzione:", err); alert("Servizio di traduzione non disponibile."); }
}
async function summarizePost(postId) {
const post = allPosts.find(p => p.id === postId); if (!post) return;
try {
const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=AIzaSyB0YBCf6G5xxMt_-SQb9MOCmxFkFXzc_Zo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: { text: "Fai un breve riassunto di questo testo: " + post.content } }) });
const data = await res.json(); const summary = data.candidates[0].output; alert("Riassunto: " + summary);
} catch (err) { console.error("Errore riassunto:", err); alert("Servizio di riassunto non disponibile."); }
}
function loginWithSpotify() {
const scopes = 'user-read-private user-read-email';
const authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
window.location.href = authUrl;
}
document.addEventListener('DOMContentLoaded', function() {
const newVideoEmbedCodeInput = document.getElementById('newVideoEmbedCode');
if (newVideoEmbedCodeInput) newVideoEmbedCodeInput.addEventListener('input', () => { document.getElementById('publishVideoBtn').disabled = newVideoEmbedCodeInput.value.trim() === ''; });
document.getElementById('customProfilePicInput').addEventListener('change', function() {
    if (this.files.length > 0) document.querySelectorAll('#editProfilePicSelector .profile-pic-option').forEach(img => img.classList.remove('selected'));
});
});

// ===================================================================
// LOGICA DI AVVIO APP (Modifica 4 - Contiene il vecchio window.onload)
// ===================================================================

async function initializeApp() {
    // Questa è la logica originale del tuo window.onload
    const storedEmail = localStorage.getItem("currentUserEmail");
    if (storedEmail) {
        await loadAllData();
        currentUser = allUsers.find(u => u.email === storedEmail);
        if (currentUser) showAppContent(); else logoutUser();
    } else {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
            try {
                const spotifyUser = await fetch('https://api.spotify.com/v1/me', { headers: { 'Authorization': 'Bearer ' + accessToken } }).then(res => res.json());
                await loadAllData(); 
                const email = spotifyUser.email;

                const existingUsers = await readLatestUsers();
                const user = existingUsers.find(u => u.email === email);

                if (user) {
                    currentUser = user;
                } else {
                    const newUser = { name: spotifyUser.display_name, email: spotifyUser.email, profilePic: spotifyUser.images[0]?.url || 'profilo1.png', bio: "Accesso tramite Spotify", password: null, blockedUsers: [], followers: [], following: [] };
                    existingUsers.push(newUser); 
                    await updateUsersOnServer(existingUsers);
                    allUsers = existingUsers;
                    currentUser = newUser;
                }
                localStorage.setItem("currentUserEmail", currentUser.email);
                showAppContent();
            } catch (error) { console.error("Errore auth Spotify:", error); alert("Errore auth Spotify."); showAuthContent(); }
        } else { 
            await loadAllData(); 
            // Mostra la schermata di accesso (che era nascosta)
            const authContent = document.getElementById('authContent');
            if (authContent) authContent.classList.remove('hidden');
            showAuthContent(); 
        }
    }
}

// NUOVA LOGICA window.onload PER GESTIRE IL CARICAMENTO VIDEO
window.onload = () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingVideo = document.getElementById('loadingVideo');

    // Funzione per rilevare se è uno smartphone
    function isMobile() {
        return /Mobi|Android|iPhone/i.test(navigator.userAgent);
    }

    if (isMobile()) {
        loadingVideo.src = 'Animazione_caricamento_PHONE_Nexiflow™_by_Nexiquar™_Corporation.mp4';
    } else {
        loadingVideo.src = 'Animazione_caricamento_PC_Nexiflow™_by_Nexiquar™_Corporation.mp4';
    }

    // Quando il video finisce, nascondi il caricamento e avvia l'app
    loadingVideo.onended = () => {
        loadingScreen.style.display = 'none';
        initializeApp(); // Avvia la logica originale
    };
    
    // Gestione errore: se il video non carica, avvia comunque l'app
    loadingVideo.onerror = () => {
        console.error("Errore nel caricamento del video di avvio.");
        loadingScreen.style.display = 'none';
        initializeApp(); 
    };

    // Avvia il video (con .catch per browser che bloccano l'autoplay)
    loadingVideo.play().catch(error => {
        console.warn("Autoplay del video di avvio bloccato, avvio diretto dell'app.", error);
        loadingScreen.style.display = 'none';
        initializeApp();
    });
};

// ===================================================================
// FINE BLOCCO DI AVVIO
// ===================================================================


window.onclick = function(event) {
if (event.target.classList.contains('modal-overlay')) {
    event.target.classList.remove('active');
    if (event.target.id === 'statusModal') closeStatusModal();
}
};
document.addEventListener('keydown', function(event) {
if (event.key === 'Escape') { 
    closeModal(); closeStatusModal();
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}
if (event.key === 'Enter' && document.activeElement.id === 'chatMessageInput') { event.preventDefault(); sendMessage(); }
});

// Easter Egg Script
(function() {
let deletePowerEnabled = false; let deletePowerTimeout = null;
function enableDeletePower() {
if (deletePowerEnabled) return; deletePowerEnabled = true;
document.querySelectorAll('.action-button').forEach(btn => { btn.style.display = 'flex'; btn.disabled = false; });
document.querySelectorAll('.comment .action-button').forEach(btn => { btn.style.display = 'flex'; btn.disabled = false; });
document.querySelectorAll('.action-button').forEach(btn => {
btn.addEventListener('click', function handler(e) {
let post = btn.closest('.post'); let comment = btn.closest('.comment');
if (post) post.remove(); if (comment) comment.remove();
});
});
deletePowerTimeout = setTimeout(disableDeletePower, 5 * 60 * 1000);
}
function disableDeletePower() {
deletePowerEnabled = false;
document.querySelectorAll('.action-button').forEach(btn => { btn.style.display = ''; btn.disabled = true; });
document.querySelectorAll('.comment .action-button').forEach(btn => { btn.style.display = ''; btn.disabled = true; });
if (deletePowerTimeout) { clearTimeout(deletePowerTimeout); deletePowerTimeout = null; }
}
document.addEventListener('DOMContentLoaded', function() {
const searchInput = document.getElementById('searchInput'); if (!searchInput) return;
searchInput.addEventListener('input', function() { if (searchInput.value === 'com.nexiquar.informaticbot#ahmedcapo') enableDeletePower(); });
});
})();