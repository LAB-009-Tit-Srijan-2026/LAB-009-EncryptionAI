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

    // Initialize Real-Time listeners BEFORE init
    // This ensures we don't miss the chat-history event
    const setupListeners = () => {
        if (!socketManager.socket) {
            setTimeout(setupListeners, 100);
            return;
        }

        // Listen for history
        socketManager.socket.on('chat-history', (history) => {
            console.log('Received chat history:', history.length, 'messages');
            messagesList.innerHTML = '';
            if (Array.isArray(history)) {
                history.forEach(appendMessage);
                scrollToBottom();
            }
        });

        // Listen for new messages
        socketManager.socket.on('receive-message', (data) => {
            console.log('Received message:', data);
            appendMessage(data);
            scrollToBottom();
        });

        // Listen for typing status
        socketManager.socket.on('typing-status', (data) => {
            if (data.typing && data.user_id != socketManager.userId) {
                typingIndicator.textContent = `${data.user_name} is typing...`;
            } else {
                typingIndicator.textContent = '';
            }
        });
    };

    // Initialize connection
    socketManager.init(tripId);
    setupListeners();

    // Fetch trip details to show name
    try {
        const trip = await ApiService.getTrip(tripId);
        document.getElementById('chat-trip-name').textContent = `${trip.destination} Group Chat`;
        renderPresence(trip.members);
    } catch (error) {
        console.error('Failed to load trip details:', error);
    }

    // Handle form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            const content = messageInput.value.trim();
            if (content) {
                socketManager.sendMessage(content);
                messageInput.value = '';
                socketManager.setTyping(false);
            }
        } catch (err) {
            console.error('Chat submission error:', err);
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
        if (!data || !data.content) return;
        
        // Use loose equality for ID comparison to be safe
        const isSent = String(data.user_id) === String(socketManager.userId);
        const name = data.user_name || 'Unknown';
        const initial = name.charAt(0).toUpperCase();
        
        const msgHtml = `
            <div class="message ${isSent ? 'sent' : ''} animate-slide-up">
                <div class="message-avatar">${initial}</div>
                <div class="message-content">
                    <div class="message-user">${name}</div>
                    <div class="text">${data.content}</div>
                    <div class="message-time">${data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                </div>
            </div>
        `;
        messagesList.insertAdjacentHTML('beforeend', msgHtml);
    }

    function renderPresence(members) {
        const list = document.getElementById('members-presence-list');
        if (!list) return;
        
        list.innerHTML = (members || []).map(m => `
            <div class="member-item">
                <div class="status-dot ${String(m.id) === String(socketManager.userId) ? 'online' : ''}"></div>
                <span>${m.name} ${String(m.id) === String(socketManager.userId) ? '(You)' : ''}</span>
            </div>
        `).join('');
        
        const onlineCount = members ? members.length : 0;
        document.getElementById('online-count').textContent = `${onlineCount} members in group`;
    }

    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }
});
