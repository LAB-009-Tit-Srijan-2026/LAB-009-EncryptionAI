import socketio
from typing import Dict, Set

# Create a Socket.IO AsyncServer
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Track online users: {user_id: socket_id}
online_users: Dict[int, str] = {}

@sio.event
async def connect(sid, environ):
    print(f"Connected: {sid}")

@sio.event
async def disconnect(sid):
    # Remove user from tracking
    user_id_to_remove = None
    for uid, socket_id in online_users.items():
        if socket_id == sid:
            user_id_to_remove = uid
            break
    if user_id_to_remove:
        del online_users[user_id_to_remove]
    print(f"Disconnected: {sid}")

@sio.on("join-trip")
async def join_trip(sid, data):
    trip_id = data.get("trip_id")
    user_id = data.get("user_id")
    
    if trip_id and user_id:
        online_users[user_id] = sid
        await sio.enter_room(sid, f"trip_{trip_id}")
        print(f"User {user_id} joined trip {trip_id} room")
        
        # Notify others
        await sio.emit("user-joined", {"user_id": user_id}, room=f"trip_{trip_id}", skip_sid=sid)

@sio.on("send-message")
async def send_message(sid, data):
    trip_id = data.get("trip_id")
    user_id = data.get("user_id")
    user_name = data.get("user_name")
    content = data.get("content")
    
    if all([trip_id, user_id, content]):
        # Broadcast to room
        message_data = {
            "user_id": user_id,
            "user_name": user_name,
            "content": content,
            "timestamp": data.get("timestamp")
        }
        await sio.emit("receive-message", message_data, room=f"trip_{trip_id}")

@sio.on("typing")
async def typing(sid, data):
    trip_id = data.get("trip_id")
    user_id = data.get("user_id")
    user_name = data.get("user_name")
    is_typing = data.get("typing")
    
    await sio.emit("typing-status", {
        "user_id": user_id,
        "user_name": user_name,
        "typing": is_typing
    }, room=f"trip_{trip_id}", skip_sid=sid)

@sio.on("notify-update")
async def notify_update(sid, data):
    trip_id = data.get("trip_id")
    update_type = data.get("type") # 'expense', 'itinerary', 'member'
    user_name = data.get("user_name")
    
    await sio.emit("remote-update", {
        "type": update_type,
        "user_name": user_name,
        "message": f"{user_name} updated the {update_type}!"
    }, room=f"trip_{trip_id}", skip_sid=sid)
