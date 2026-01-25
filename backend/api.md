# CaffeeOS API Documentation

Base URL: `/api/v1`

## Authentication (`/auth`)
| Method | Endpoint | Description | Body Params |
|--------|----------|-------------|-------------|
| POST | `/signup` | Register new user | `name`, `email`, `password` |
| POST | `/verify-otp` | Verify email OTP | `email`, `otp` |
| POST | `/login` | User login | `email`, `password` |
| POST | `/forgot-password` | Request password reset | `email` |
| POST | `/reset-password` | Reset password | `email`, `otp`, `newPassword` |
| GET | `/me` | Get current user | - |
| POST | `/logout` | Logout | - |

## Shops (`/shops`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List all shops | - |
| POST | `/` | Create shop | Body: `name` |
| GET | `/:id` | Get shop details | - |
| PATCH | `/:id` | Update shop | Body: `name`, `address`, `phone`, `gstIn`, `fssai`, `logo` (file) |
| PATCH | `/:id/settings` | Update settings | Body: `upiId`, `gstPercent`, `serviceCharge`, `printLanguage`, `bgImages` (files) |
| DELETE | `/:id` | Delete shop | - |

## Floors (`/`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/shops/:shopId/floors` | List floors | - |
| POST | `/shops/:shopId/floors` | Create floor | Body: `name`, `sequence` |
| PATCH | `/floors/:id` | Update floor | Body: `name`, `sequence` |
| DELETE | `/floors/:id` | Delete floor | - |

## Tables (`/tables`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/floors/:floorId/tables` | List tables | - |
| POST | `/` | Create table | Body: `name`, `floorId`, `shape`, `capacity`, `x`, `y` |
| PATCH | `/:id` | Update table | Body: `name`, `shape`, `capacity`, `x`, `y` |
| PATCH | `/bulk` | Bulk update | Body: `updates` array |
| DELETE | `/:id` | Delete table | - |
| GET | `/:id/qr` | Get Table QR | Response: PNG image |
| GET | `/shops/:shopId/qr-sheet` | Download keys | Response: PDF |

## Categories (`/categories`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List categories | Query: `shopId` |
| POST | `/` | Create category | Body: `name`, `color`, `shopId` |
| PATCH | `/:id` | Update category | Body: `name`, `color` |
| PATCH | `/resequence` | Reorder cats | Body: `categories` [{id, sequence}] |
| DELETE | `/:id` | Delete category | - |

## Products (`/products`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List products | Query: `shopId`, `categoryId`, `search`, `active` |
| POST | `/` | Create product | Body: `name`, `basePrice`, `categoryId`, `shopId`, `image` (file) |
| GET | `/:id` | Get product | - |
| PATCH | `/:id` | Update product | Body: `name`, `basePrice`, `categoryId`, `active` |
| DELETE | `/:id` | Delete product | - |
| POST | `/:id/variants` | Add variant | Body: `name`, `price`, `isVegetarian` |

## Customers (`/customers`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List customers | Query: `shopId`, `search` |
| POST | `/` | Create customer | Body: `name`, `phone`, `email`, `shopId` |
| GET | `/:id` | Get customer | - |
| PATCH | `/:id` | Update customer | Body: `name`, `phone`, `email` |
| DELETE | `/:id` | Delete customer | - |
| POST | `/bulk-delete` | Bulk delete | Body: `ids` [] |

## Sessions (`/sessions`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List sessions | Query: `shopId`, `status` |
| GET | `/current` | Get active session | Query: `shopId` |
| GET | `/pos/data` | Get POS sync data | Query: `shopId` |
| POST | `/start` | Start session | Body: `shopId`, `openingCash` |
| POST | `/:id/close` | Close session | Body: `closingCash` |

## Orders (`/orders`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List orders | Query: `shopId` or `sessionId`, `status` |
| POST | `/` | Create order | Body: `shopId`, `sessionId`, `items`, `customerName`, `tableId` |
| GET | `/:id` | Get details | - |
| PATCH | `/:id` | Update order | Body: `status`, `notes`, `discount` |
| POST | `/calculate` | Calc totals | Body: `items`, `discount` |
| DELETE | `/:id` | Delete order | - |

## Payments (`/payments`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/` | List payments | Query: `shopId`, `method`, `date` |
| GET | `/upi-qr` | Generate UPI QR | Query: `shopId`, `amount` |
| POST | `/validate` | Process payment | Body: `orderId`, `payments` array |

## Kitchen (`/kitchen`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/tickets` | Get KDS tickets | Query: `shopId`, `status` |
| PATCH | `/tickets/:id/status`| Update ticket | Body: `status` |
| PATCH | `/tickets/:id/items/:itemId` | Update item | Body: `isPrepared` |

## Mobile Ordering (`/m`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/:token` | Get shop info | - |
| GET | `/:token/menu` | Get menu | - |
| POST | `/:token/orders` | Place order | Body: `items`, `customerName`, `phone` |

## Reports (`/reports`)
| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| GET | `/dashboard` | Dashboard stats | Query: `shopId`, `from`, `to` |
| GET | `/export` | Export CSV/PDF | Query: `shopId`, `type` |
