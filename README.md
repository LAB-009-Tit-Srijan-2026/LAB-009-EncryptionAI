# 🌍 AI Group Travel & Expense Ecosystem

A modern, full-stack collaborative travel platform that leverages **Generative AI** to plan itineraries, track group expenses, and facilitate real-time communication.

---

## ✨ Key Features

- **🤖 AI Itinerary Planner**: Generate detailed multi-day travel plans using Google Gemini based on your budget, destination, and interests.
- **💸 Group Expense Management**: Track shared costs, see who paid what, and manage group budgets seamlessly.
- **💬 Real-time Chat**: Coordinate with your travel group instantly via a built-in Socket.IO chat system.
- **📸 AI Receipt Scanner**: Extract expense data automatically from receipt images using Gemini OCR.
- **🏨 Smart Bookings**: Manage trip bookings and travel details in one central location.
- **🔐 Secure Auth**: Robust user authentication system using JWT and Bcrypt.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **AI**: Google Generative AI and machine learning reccomendation system
- **Database**: MySQL with SQLAlchemy ORM
- **Real-time**: Python-SocketIO
- **Security**: JWT (JSON Web Tokens) 

### Frontend
- **Languages**: HTML5, Vanilla JavaScript, CSS3
- **Communication**: Fetch API & Socket.IO Client
- **Design**: Modern, responsive UI with custom CSS variables

---

## 📂 Project Structure

```text
├── backend/
│   ├── ai/            # AI logic (AI recommendation system and Image to text OCR)
│   ├── database/      # DB connection and session management
│   ├── models/        # SQLAlchemy database models
│   ├── routes/        # FastAPI API endpoints
│   ├── schemas/       # Pydantic data validation models
│   ├── sockets/       # Socket.IO event handlers
│   ├── main.py        # Application entry point
│   └── requirements.txt
└── frontend/
    ├── css/           # Custom styling and design tokens
    ├── js/            # Client-side logic and API integration
    └── *.html         # Frontend pages (MPA architecture)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.9+
- MySQL Server
- 

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Create a `.env` file in the `backend/` folder.
   - Copy content from `.env.example` and add your **GEMINI_API_KEY** and MySQL credentials.

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### 3. Frontend Setup
1. Simply open `frontend/index.html` in your browser.
2. Ensure the backend is running to allow the frontend to communicate with the API.

---



## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---
