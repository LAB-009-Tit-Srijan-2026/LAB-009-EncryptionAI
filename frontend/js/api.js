const API_BASE_URL = 'http://localhost:8000';

class ApiService {
    static getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (includeAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return headers;
    }

    static async handleResponse(response) {
        if (!response.ok) {
            let errorMessage = 'Something went wrong';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                console.error("Could not parse error response", e);
            }
            throw new Error(errorMessage);
        }
        return response.json();
    }

    // --- Auth ---
    static async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });
        return this.handleResponse(response);
    }

    static async register(name, email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: this.getHeaders(false),
            body: JSON.stringify({ name, email, password }),
        });
        return this.handleResponse(response);
    }

    static async getMe() {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    // --- Trips ---
    static async createTrip(data) {
        const response = await fetch(`${API_BASE_URL}/trips/`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse(response);
    }

    static async getTrips() {
        const response = await fetch(`${API_BASE_URL}/trips/`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async getTrip(id) {
        const response = await fetch(`${API_BASE_URL}/trips/${id}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    // --- Itinerary ---
    static async generateItinerary(tripId) {
        const response = await fetch(`${API_BASE_URL}/itinerary/generate/${tripId}`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async getItinerary(tripId) {
        const response = await fetch(`${API_BASE_URL}/itinerary/${tripId}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    // --- Expenses ---
    static async addExpense(data) {
        const response = await fetch(`${API_BASE_URL}/expenses/`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse(response);
    }

    static async getTripExpenses(tripId) {
        const response = await fetch(`${API_BASE_URL}/expenses/trip/${tripId}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async getTripSplit(tripId) {
        const response = await fetch(`${API_BASE_URL}/expenses/trip/${tripId}/split`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async addMember(tripId, email) {
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}/members`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ email }),
        });
        return this.handleResponse(response);
    }

    // --- Booking ---
    static async searchHotels(city, budget) {
        const response = await fetch(`${API_BASE_URL}/booking/hotels?city=${city}&budget=${budget}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async searchTransport(city) {
        const response = await fetch(`${API_BASE_URL}/booking/transport?city=${city}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async searchActivities(city) {
        const response = await fetch(`${API_BASE_URL}/booking/activities?city=${city}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    static async getBookingRecommendations(tripId) {
        const response = await fetch(`${API_BASE_URL}/booking/recommendations/${tripId}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }
}
