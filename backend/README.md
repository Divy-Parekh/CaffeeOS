# CaffeeOS Backend Architecture & Documentation

This repository contains the backend for **CaffeeOS**, a complex, enterprise-grade POS system for Cafes. It is built to support multi-shop management, real-time kitchen displays, mobile ordering, and detailed reporting.

## 1. System Architecture & Tech Stack

The backend follows a **Service-Controller-Repository** pattern.

*   **Runtime:** Node.js (Express.js/NestJS)
*   **Database:** PostgreSQL (Port 5432) via **Prisma ORM**
*   **Caching & OTP:** Redis (Port 6379)
*   **Real-time:** Socket.io (Bi-directional communication for POS, Kitchen, and Customer displays)
*   **Email:** Nodemailer (SMTP)
*   **PDF Generation:** Puppeteer (Receipts, Reports, QR codes)
*   **Storage:** Multer + Cloud Storage (AWS S3/Cloudinary) for images/3D models.

---

## 2. Database Schema (Prisma)

The database handles multi-tenancy (Shops) and complex order flows.

```prisma
// schema.prisma

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(STAFF) // ADMIN, STAFF
  shops         Shop[]    @relation("ShopUsers")
  sessions      Session[]
  createdAt     DateTime  @default(now())
}

model Shop {
  id                String    @id @default(uuid())
  name              String
  currency          String    @default("INR")
  users             User[]    @relation("ShopUsers")
  
  // Settings
  upiId             String?   // If set, UPI is enabled
  isCashEnabled     Boolean   @default(true)
  isDigitalEnabled  Boolean   @default(false)
  isUpiEnabled      Boolean   @default(false)
  
  // Mobile Ordering
  selfOrderEnabled  Boolean   @default(false)
  mobileBgImages    String[]  // URLs
  themeColor        String    @default("#000000")
  
  // Relations
  sessions          Session[]
  floors            Floor[]
  products          Product[]
  categories        Category[]
  customers         Customer[]
  orders            Order[]
}

model Floor {
  id        String  @id @default(uuid())
  name      String
  shopId    String
  shop      Shop    @relation(fields: [shopId], references: [id])
  tables    Table[]
}

model Table {
  id            String  @id @default(uuid())
  name          String
  capacity      Int
  isActive      Boolean @default(true)
  currentRes    String? // "2/4" representation
  token         String  @unique // For QR access: abcd.com/s/{token}
  floorId       String
  floor         Floor   @relation(fields: [floorId], references: [id])
}

model Category {
  id        String    @id @default(uuid())
  name      String
  color     String    // Hex code
  sequence  Int       // For drag-and-drop ordering
  shopId    String
  shop      Shop      @relation(fields: [shopId], references: [id])
  products  Product[]
}

model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  image       String?  // URL
  model3d     String?  // URL to .glb file
  basePrice   Float
  taxPercent  Float
  uom         String   // Unit (Kg, Litre, Unit)
  
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  
  variants    ProductVariant[]
}

model ProductVariant {
  id          String  @id @default(uuid())
  attribute   String  // e.g., "Size"
  value       String  // e.g., "Large"
  extraPrice  Float   // e.g., +50.00
  productId   String
  product     Product @relation(fields: [productId], references: [id])
}

model Session {
  id          String    @id @default(uuid())
  shopId      String
  shop        Shop      @relation(fields: [shopId], references: [id])
  userId      String    // Responsible staff
  user        User      @relation(fields: [userId], references: [id])
  
  status      SessionStatus @default(OPEN) // OPEN, CLOSED
  openedAt    DateTime  @default(now())
  closedAt    DateTime?
  
  openingCash Float     @default(0.0)
  closingCash Float?
  totalRevenue Float    @default(0.0)
  
  orders      Order[]
}

model Order {
  id            String        @id @default(uuid())
  orderNumber   String        // e.g., "ORD-001"
  shopId        String
  sessionId     String
  session       Session       @relation(fields: [sessionId], references: [id])
  
  customerId    String?
  customer      Customer?     @relation(fields: [customerId], references: [id])
  
  status        OrderStatus   @default(DRAFT) // DRAFT, CONFIRMED, PAID, CANCELLED
  kitchenStatus KitchenStatus @default(TO_COOK) // TO_COOK, PREPARING, COMPLETED
  
  totalAmount   Float
  taxAmount     Float
  finalAmount   Float
  
  notes         String?
  items         OrderItem[]
  payments      Payment[]
  createdAt     DateTime      @default(now())
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  
  productName String  // Snapshot of name at time of order
  quantity    Int
  unitPrice   Float
  subTotal    Float
  
  variantInfo String? // JSON string or relation for specific variant details
}

model Payment {
  id          String        @id @default(uuid())
  orderId     String
  order       Order         @relation(fields: [orderId], references: [id])
  method      PaymentMethod // CASH, UPI, DIGITAL
  amount      Float
  createdAt   DateTime      @default(now())
}

model Customer {
  id        String   @id @default(uuid())
  name      String
  email     String?
  phone     String?
  address   Json?    // { street, city, state, country }
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id])
  orders    Order[]
}

enum Role {
  ADMIN
  STAFF
}

enum SessionStatus {
  OPEN
  CLOSED
}

enum OrderStatus {
  DRAFT
  CONFIRMED
  PAID
  CANCELLED
}

enum KitchenStatus {
  TO_COOK
  PREPARING
  COMPLETED
}

enum PaymentMethod {
  CASH
  UPI
  DIGITAL
}
```

---

## 3. API Specifications & Logic

### A. Authentication (Redis + Nodemailer)
*   `POST /auth/signup`: Generates OTP, stores in Redis (`key: email`, `val: otp`, `ttl: 5min`), sends Email.
*   `POST /auth/verify-otp`: Checks Redis. If valid, creates User in Postgres.
*   `POST /auth/login`: Returns JWT Token.
*   `POST /auth/forgot-password`: Sends OTP via Email.

### B. Shop & Dashboard
*   `GET /shops`: Returns list with card details (last open time, revenue).
*   `POST /shops`: Create new shop.
*   `PATCH /shops/:id/settings`: Update settings. If `upiId` provided, generates QR using `qrcode` lib.

### C. Floor & Table
*   `GET /shops/:shopId/floors`: Returns Floors + Tables.
*   `POST /tables`: Create table.
*   `PATCH /tables/bulk`: Bulk activate/deactivate.
*   `GET /tables/:id/qr`: Uses **Puppeteer** to generate a PDF with the table's QR code (`abcd.com/s/TOKEN`).

### D. Products
*   `GET /products`: Filter by Category, Search.
*   `POST /products`: Multipart upload for `image` and `model3d` (.glb).
*   `PATCH /categories/resequence`: Drag-and-drop ordering updates `sequence`.

### E. POS Session & Terminal
*   `POST /sessions/start`: Open session with `openingCash`.
*   `POST /sessions/close`: Close session, calculate revenue.
*   `GET /pos/data`: Offline-first payload (Products, Categories, Customers, Active Tables).

### F. Order & Payment (The Core Flow)
1.  **Calculate**: `POST /orders/calculate` aids frontend with totals/tax.
2.  **Send to Kitchen**: `POST /orders`
    *   Creates Order (Status: CONFIRMED).
    *   **Socket Emit**: `new_ticket` to `kitchen_{shopId}` room.
3.  **Validate Payment**: `POST /payments/validate`
    *   Accepts multiple payment methods (e.g., partial Cash + partial UPI).
    *   Logic: Verify `sum(payments) == order.finalAmount`.
    *   Update Order -> PAID.
    *   **Socket Emit**: `payment_success` to `customer_display_{shopId}`.
    *   (Optional) Email Bill.

### G. Kitchen Display System (KDS)
*   `GET /kitchen/tickets`: Filter by `KitchenStatus`.
*   `PATCH /kitchen/tickets/:id/status`: Move from TO_COOK -> PREPARING -> COMPLETED.
    *   **Socket Emit**: `order_status_change` to POS.
*   `PATCH /kitchen/tickets/:id/item/:itemId`: Toggle "strike-through" on individual items.

### H. Reporting
*   `GET /reports/dashboard`: Charts data (Sales, Top Products).
*   `GET /reports/export`: Uses **Puppeteer** to render HTML template -> PDF.

---

## 4. Real-Time (Socket.io)

Events are namespaced by Shop ID.

```javascript
io.on('connection', (socket) => {
  socket.on('join_shop', (shopId) => {
    socket.join(shopId);
    socket.join(`kitchen_${shopId}`);
    socket.join(`customer_display_${shopId}`);
  });

  // Kitchen -> POS
  socket.on('kitchen_update', (data) => io.to(data.shopId).emit('order_status_change', data));

  // POS -> Customer Display
  socket.on('update_cart_display', (data) => io.to(`customer_display_${data.shopId}`).emit('refresh_display', data));
});
```

## 5. Mobile Ordering Flow

1.  User scans QR (`/s/{token}`).
2.  Frontend validates token -> gets Shop/Table info.
3.  User places order (`POST /orders/mobile`).
4.  Backend emits `new_ticket` to Kitchen immediately.

