class SocketManager {
    constructor() {
        this.socket = null;
        this.tripId = null;
        this.userId = null;
        this.userName = null;
    }

    init(tripId) {
        if (this.socket) return;
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        this.tripId = tripId;
        this.userId = user.id;
        this.userName = user.name;

        // Connect to Socket.IO server (same host as backend)
        this.socket = io('http://localhost:8000', {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Connected to real-time server');
            this.socket.emit('join-trip', {
                trip_id: this.tripId,
                user_id: this.userId
            });
        });

        this.socket.on('user-joined', (data) => {
            showToast(`A member joined the trip!`, 'info');
        });

        this.socket.on('remote-update', (data) => {
            showToast(data.message, 'info');
            // Notify current page to refresh data if needed
            window.dispatchEvent(new CustomEvent('sync-data', { detail: data }));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from real-time server');
        });
    }

    sendMessage(content) {
        if (!this.socket) return;
        this.socket.emit('send-message', {
            trip_id: this.tripId,
            user_id: this.userId,
            user_name: this.userName,
            content: content,
            timestamp: new Date().toISOString()
        });
    }

    notifyUpdate(type) {
        if (!this.socket) return;
        this.socket.emit('notify-update', {
            trip_id: this.tripId,
            user_name: this.userName,
            type: type
        });
    }

    setTyping(isTyping) {
        if (!this.socket) return;
        this.socket.emit('typing', {
            trip_id: this.tripId,
            user_id: this.userId,
            user_name: this.userName,
            typing: isTyping
        });
    }
}

const socketManager = new SocketManager();
