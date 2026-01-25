# CaffeeOS - Modern Cafe POS System

A complete Point of Sale system for cafes with real-time kitchen display, mobile ordering via QR codes, and comprehensive reporting.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL & Redis)

### 1. Start Databases (Docker)

```bash
# PostgreSQL
docker run -d --name caffeeos-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=caffeeos -p 5432:5432 postgres:15

# Redis
docker run -d --name caffeeos-redis -p 6379:6379 redis:7
```

### 2. Setup Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

Backend runs at `http://localhost:3000`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Login

- **Email:** admin@caffeeos.com
- **Password:** admin123

## 📱 Mobile Ordering with Ngrok

To enable QR code scanning from mobile devices:

```bash
ngrok http 3000
```

Update `backend/.env`:
```
NGROK_URL=https://your-url.ngrok-free.app
```

Table QR codes will automatically use the ngrok URL.

## 🏗️ Architecture

```
CaffeeOS/
├── backend/          # Node.js + Express + Prisma
│   ├── src/
│   │   ├── controllers/   # 13 controllers
│   │   ├── routes/        # 14 route files
│   │   ├── services/      # OTP, Email, QR, PDF
│   │   ├── middlewares/   # Auth, Upload, Error
│   │   └── config/        # DB, Redis, Socket.io
│   └── prisma/            # Schema + Seed
│
└── frontend/         # React + Vite
    └── src/
        ├── pages/         # 15+ page components
        ├── layouts/       # Auth, Dashboard
        ├── store/         # Zustand stores
        ├── api/           # API client
        └── services/      # Socket.io

```

## ✨ Features

- **Authentication**: Login, Signup with OTP, Password Reset
- **Multi-Shop**: Create and manage multiple shops
- **POS Terminal**: Full-featured point of sale with categories, cart, and payment
- **Kitchen Display**: Real-time ticket system with Socket.io
- **Mobile Ordering**: QR code based self-ordering from tables
- **Products & Categories**: Full catalog management with image upload
- **Customer CRM**: Customer database with order history
- **Payments**: Cash, UPI, Card with receipt generation
- **Reports**: Dashboard analytics with PDF export

## 🔌 API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | 7 endpoints |
| Shops | 6 endpoints |
| Floors/Tables | 12 endpoints |
| Categories | 5 endpoints |
| Products | 7 endpoints |
| Customers | 6 endpoints |
| Sessions | 5 endpoints |
| Orders | 6 endpoints |
| Payments | 3 endpoints |
| Kitchen | 3 endpoints |
| Mobile | 4 endpoints |
| Reports | 2 endpoints |

## 📧 Email Configuration

Update `backend/.env` with your SMTP credentials:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📄 License

MIT
