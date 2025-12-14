# 🍽️ DYNE – SmartDine (Student Food Discovery App)

DYNE is a **student-focused food discovery web application** that helps users find nearby restaurants, dishes, and budget-friendly food options using filters, maps, and an AI assistant.

The project is built with:
- **React (Frontend)**
- **Node.js + Express (Backend)**
- **FastAPI + ML (Optional AI Engine)**

---

## 🚀 Features

- 🔍 Filter restaurants by area, cuisine, rating, distance
- 🗺️ Live map navigation using OpenStreetMap
- 🤖 AI food assistant (Dyne) for recommendations
- 🍛 Dish browser with menu view
- 📍 “Near Me” discovery
- 🧮 Price calculator
- 🔐 User & Admin authentication
- 🎓 Designed specifically for students

---

## 🏗️ Project Structure

smartdine/
-- frontend/(React app(vite))
-- backend(Node.js,Express.js)
-- ai(FastAPI)
--README.md

---

## 🧰 Prerequisites

Make sure you have the following installed:

- **Node.js v18+**
- **npm v9+**
- **Python 3.10+**
- **Git**

---

Check versions:
```bash
node -v
npm -v
python3 --version
git --version

---

BACKEND

cd backend
npm install

CREATE AN .env file
PORT=3000
JWT_SECRET=smartdine_super_secret_key

to start:
npm start

runs at:
http://localhost:3000

----
FRONTEND

cd frontend
npm run dev

runs at:
http://localhost:5173

---

AI

cd ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

to run:
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

runs at:
http://localhost:8001

----

Demo Credentials:

User:
email: looo@gmail.com
password: 123456

Admin:
email: nishanth@gmail.com
password: 123456
