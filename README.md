# 🎨 Art Heist: The Game

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://render.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A real-time, multiplayer web game where players team up to pull off the perfect art heist. Built with a modern tech stack featuring FastAPI, React, and WebSockets for a fast and interactive experience.

**Live Demo:** [**https://heistgame-frontend.onrender.com**](https://heistgame-frontend.onrender.com)

## ✨ Features

- **Real-Time Multiplayer:** Play with friends in a shared game state, powered by WebSockets.
- **Game Lobbies:** Create new games or join existing ones with a unique game ID.
- **Dynamic Gameplay:** The game state is managed on the backend and synchronized across all clients.
- **Scalable Backend:** Built with the high-performance FastAPI framework.
- **Modern Frontend:** A responsive and interactive user interface built with React.

## 🛠️ Tech Stack

| Area         | Technology                                       |
|--------------|--------------------------------------------------|
| **Frontend** | React, Vite, JavaScript                          |
| **Backend**  | Python, FastAPI, Uvicorn[standard]                        |
| **Database** | Valkey (a fork of Redis) for in-memory game state |
| **Real-Time**| WebSockets                                       |
| **Deployment**| Docker, Render (Infrastructure as Code)          |

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v20 or later)
- [Python](https://www.python.org/) (v3.11 or later)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/products/docker-desktop/) (to run a local Valkey/Redis instance)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/Art-Heist-Game.git
    cd Art-Heist-Game
    ```

2.  **Run a local Valkey/Redis database:**
    The backend requires a running Valkey or Redis instance. The easiest way to start one is with Docker.
    ```sh
    docker run -d --name heist-redis -p 6379:6379 redis/redis-stack-server:latest
    ```

3.  **Set up the Backend:**
    ```sh
    # Navigate to the backend directory
    cd HeistGAME

    # Create and activate a virtual environment
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

    # Install dependencies
    pip install -r requirements.txt

    # Run the development server
    uvicorn main:app --reload
    ```
    The backend will be running at `http://127.0.0.1:8000`.

4.  **Set up the Frontend:**
    Open a *new terminal* and navigate to the frontend directory.
    ```sh
    # Navigate to the frontend directory from the project root
    cd "HeistGAME Frontend"

    # Install dependencies
    npm install

    # Run the development server
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173`. You can now open this URL in your browser to play the game locally!

## 📁 Project Structure

This project is a monorepo containing both the frontend and backend services.

```
Art-Heist-Game/
├── HeistGAME/              # Backend (FastAPI)
│   ├── modules/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── "HeistGAME Frontend"/   # Frontend (React)
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .gitignore              # Global gitignore for the monorepo
└── render.yaml             # Infrastructure as Code for Render deployment
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📜 License

This project is licensed under the MIT License - see the LICENSE.md file for details.

---