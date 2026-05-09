document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
        showToast('No trip ID provided.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    // Set nav links
    document.getElementById('nav-itinerary').href = `itinerary.html?id=${tripId}`;
    document.getElementById('nav-expenses').href = `expenses.html?id=${tripId}`;
    document.getElementById('nav-chat').href = `chat.html?id=${tripId}`;

    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const messagesList = document.getElementById('messages-list');
    const typingIndicator = document.getElementById('typing-indicator');

    // Initialize Real-Time connection
    socketManager.init(tripId);

    // Fetch trip details to show name
    try {
        const trip = await ApiService.getTrip(tripId);
        document.getElementById('chat-trip-name').textContent = `${trip.destination} Group Chat`;
        renderPresence(trip.members);
    } catch (error) {
        showToast(error.message, 'error');
    }

    // Listen for new messages
    socketManager.socket.on('receive-message', (data) => {
        appendMessage(data);
        scrollToBottom();
    });

    // Listen for typing status
    socketManager.socket.on('typing-status', (data) => {
        if (data.typing) {
            typingIndicator.textContent = `${data.user_name} is typing...`;
        } else {
            typingIndicator.textContent = '';
        }
    });

    // Handle form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (content) {
            socketManager.sendMessage(content);
            messageInput.value = '';
            socketManager.setTyping(false);
        }
    });

    // Handle typing indicator
    let typingTimeout;
    messageInput.addEventListener('input', () => {
        socketManager.setTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socketManager.setTyping(false);
        }, 2000);
    });

    function appendMessage(data) {
        const isSent = data.user_id === socketManager.userId;
        const msgHtml = `
            <div class="message ${isSent ? 'sent' : ''} animate-slide-up">
                <div class="message-avatar">${data.user_name.charAt(0)}</div>
                <div class="message-content">
                    <div class="message-user">${data.user_name}</div>
                    <div class="text">${data.content}</div>
                    <div class="message-time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            </div>
        `;
        messagesList.insertAdjacentHTML('beforeend', msgHtml);
    }

    function renderPresence(members) {
        const list = document.getElementById('members-presence-list');
        list.innerHTML = members.map(m => `
            <div class="member-item">
                <div class="status-dot ${m.id === socketManager.userId ? 'online' : ''}"></div>
                <span>${m.name} ${m.id === socketManager.userId ? '(You)' : ''}</span>
            </div>
        `).join('');
        document.getElementById('online-count').textContent = `1 member online`;
    }

    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }
});
