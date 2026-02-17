# Mealory Admin Panel API Documentation

## Overview
Це документ описує всі ендпоінти, типи даних та структури для створення адміністративної панелі Mealory за допомогою ШІ.

## Технологічний стек
- **Backend**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL з Prisma ORM
- **Authentication**: JWT + OAuth (Google, Apple)
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer

## Базовий URL
```
http://localhost:3000
```

## Аутентифікація
Більшість ендпоінтів вимагають JWT токен в заголовку:
```
Authorization: Bearer <jwt_token>
```

## Ролі користувачів
- `user` - звичайний користувач
- `admin` - адміністратор
- `super_admin` - супер адміністратор

---

# 1. АУТЕНТИФІКАЦІЯ (Auth)

## 1.1 Реєстрація
```
POST /auth/register
```

**Request Body:**
```typescript
{
  email: string;
  password: string;
  name: string;
}
```

**Response:**
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin' | 'super_admin';
    subscriptionTier: 'free' | 'pro' | 'family_pro';
  };
  accessToken: string;
  refreshToken: string;
}
```

## 1.2 Логін
```
POST /auth/login
```

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:** такий самий як при реєстрації

## 1.3 Вихід
```
POST /auth/logout
Authorization: Bearer <token>
```

## 1.4 OAuth (Google/Apple)
```
GET /auth/google
GET /auth/google/callback
GET /auth/apple
GET /auth/apple/callback
```

## 1.5 Відновлення пароля
```
POST /auth/password-reset/request
POST /auth/password-reset/confirm
```

---

# 2. АДМІНІСТРУВАННЯ (Admin)

## 2.1 Аналітика - огляд
```
GET /admin/analytics/overview
Authorization: Bearer <admin_token>
```

**Response:**
```typescript
{
  users: {
    total: number;
    active: number;
    newThisWeek: number;
    withFamilies: number;
  };
  families: {
    total: number;
    active: number;
    avgSize: number;
  };
  subscriptions: {
    free: number;
    pro: number;
    familyPro: number;
  };
  menus: {
    generatedLast30Days: number;
    avgPerFamily: number;
  };
  products: {
    total: number;
    active: number;
    byCategory: Record<string, number>;
  };
}
```

## 2.2 Аналітика користувачів
```
GET /admin/analytics/users?page=1&limit=10&period=7d
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page?: number` - номер сторінки (default: 1)
- `limit?: number` - кількість записів (default: 10)
- `period?: string` - період (напр. '7d', '30d', '90d')

## 2.3 Користувачі - список
```
GET /admin/users?page=1&limit=20&search=john&role=user&subscriptionTier=pro&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page?: number` - номер сторінки (default: 1)
- `limit?: number` - кількість записів (default: 20)
- `search?: string` - пошук по `email` або `name`
- `role?: 'user' | 'admin' | 'super_admin'`
- `subscriptionTier?: 'free' | 'pro' | 'family_pro'`
- `sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'name'` (default: `createdAt`)
- `sortOrder?: 'asc' | 'desc'` (default: `desc`)

**Response:**
```typescript
{
  items: Array<{
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin' | 'super_admin';
    subscriptionTier: 'free' | 'pro' | 'family_pro';
    authProvider: 'local' | 'google' | 'apple';
    familyId?: string;
    isFamilyHead: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

## 2.4 Сім'ї - список
```
GET /admin/families?page=1&limit=20&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page?: number` - номер сторінки (default: 1)
- `limit?: number` - кількість записів (default: 20)
- `sortBy?: 'createdAt' | 'updatedAt'` (default: `createdAt`)
- `sortOrder?: 'asc' | 'desc'` (default: `desc`)

**Response:**
```typescript
{
  items: Array<{
    id: string;
    weeklyBudget?: number;
    budgetUsed: number;
    budgetPeriodStart?: Date;
    budgetPeriodEnd?: Date;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      users: number;
      members: number;
      menus: number;
      shoppingLists: number;
      inventory: number;
    };
  }>;
  total: number;
  page: number;
  limit: number;
}
```

## 2.5 Остання активність
```
GET /admin/activity/recent?limit=20
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `limit?: number` - кількість записів в кожній категорії (default: 20, max: 100)

**Response:**
```typescript
{
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin' | 'super_admin';
    subscriptionTier: 'free' | 'pro' | 'family_pro';
    createdAt: Date;
    updatedAt: Date;
  }>;
  families: Array<{
    id: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  menus: Array<{
    id: string;
    familyId: string;
    weekStart: Date;
    weekEnd: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  supportTickets: Array<{
    id: string;
    userId: string;
    subject: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    createdAt: Date;
    updatedAt: Date;
  }>;
}
```

## 2.6 Support Tickets - список
```
GET /admin/support/tickets?page=1&limit=10&status=pending&priority=high
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `status?: 'pending' | 'in_progress' | 'resolved' | 'closed'`
- `priority?: 'low' | 'normal' | 'high' | 'urgent'`

**Response:**
```typescript
{
  items: [{
    id: string;
    userId: string;
    subject: string;
    message: string;
    status: SupportTicketStatusType;
    priority: SupportTicketPriorityType;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
  }];
  total: number;
  page: number;
  limit: number;
}
```

## 2.7 Support Ticket - деталі
```
GET /admin/support/tickets/:id
Authorization: Bearer <admin_token>
```

## 2.8 Оновлення статусу тікету
```
PATCH /admin/support/tickets/:id/status
Authorization: Bearer <admin_token>
```

**Request Body:**
```typescript
{
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
}
```

## 2.6 Системне здоров'я
```
GET /admin/system/health
Authorization: Bearer <admin_token>
```

**Response:**
```typescript
{
  database: boolean;
  openai: boolean;
  uptime: number;
  memory: object;
  version: string;
}
```

---

# 3. ПРОДУКТИ (Products)

## 3.1 Створення продукту (Admin only)
```
POST /products
Authorization: Bearer <admin_token>
```

**Request Body:**
```typescript
{
  name: string;
  nameEn?: string;
  category: ProductCategoryType;
  averagePrice: number;
  priceHistory: object;
  baseUnit: MeasurementUnit;
  standardPackaging?: number;
  calories?: number;
  protein?: number;
  fats?: number;
  carbs?: number;
  allergens: object;
  imageUrl?: string;
}
```

## 3.2 Список продуктів
```
GET /products?page=1&limit=10&category=meat&isActive=true&search=м'ясо&sortBy=name&sortOrder=asc
```

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `category?: ProductCategoryType`
- `isActive?: boolean`
- `search?: string`
- `sortBy?: 'name' | 'category' | 'price' | 'createdAt'`
- `sortOrder?: 'asc' | 'desc'`

## 3.3 Деталі продукту
```
GET /products/:id
```

## 3.4 Оновлення продукту (Admin only)
```
PATCH /products/:id
Authorization: Bearer <admin_token>
```

## 3.5 Оновлення ціни (Admin only)
```
PATCH /products/:id/price
Authorization: Bearer <admin_token>
```

**Request Body:**
```typescript
{
  averagePrice: number;
}
```

## 3.6 Видалення продукту (Admin only)
```
DELETE /products/:id
Authorization: Bearer <admin_token>
```

---

# 4. МЕНЮ (Menu)

## 4.1 Генерація меню
```
POST /menu/generate
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  familyId: string;
  weekStart: string; // ISO date
  preferences?: {
    excludedCategories?: ProductCategoryType[];
    dietaryRestrictions?: string[];
    budgetLimit?: number;
  };
}
```

## 4.2 Регенерація меню
```
POST /menu/:menuId/regenerate
Authorization: Bearer <token>
```

## 4.3 Регенерація дня
```
POST /menu/days/:dayId/regenerate
Authorization: Bearer <token>
```

## 4.4 Регенерація страви
```
POST /menu/meals/:mealId/regenerate
Authorization: Bearer <token>
```

## 4.5 Поточне меню
```
GET /menu/current
Authorization: Bearer <token>
```

## 4.6 Оновлення статусу страви
```
PATCH /menu/meals/:mealId/status
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  status: 'pending' | 'cooking' | 'completed' | 'skipped' | 'auto_skipped';
}
```

---

# 5. СІМЕЇ (Families)

## 5.1 Генерація запрошення
```
POST /families/:familyId/members/:memberId/generate-invite
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  inviteToken: string;
  inviteUrl: string;
  expiresAt: Date;
}
```

---

# 6. ТИПИ ДАНИХ

## 6.1 Enum значення

**ProductCategory:**
```typescript
type ProductCategoryType = 
  | 'meat' | 'poultry' | 'fish' | 'dairy' | 'eggs'
  | 'vegetables' | 'fruits' | 'grains' | 'pasta' | 'bakery'
  | 'oils' | 'spices' | 'sweets' | 'beverages' | 'canned'
  | 'frozen' | 'nuts' | 'other';
```

**MeasurementUnit:**
```typescript
type MeasurementUnitType = 'kg' | 'g' | 'l' | 'ml' | 'piece';
```

**UserRole:**
```typescript
type UserRoleType = 'user' | 'admin' | 'super_admin';
```

**SubscriptionTier:**
```typescript
type SubscriptionTierType = 'free' | 'pro' | 'family_pro';
```

**SupportTicketStatus:**
```typescript
type SupportTicketStatusType = 'pending' | 'in_progress' | 'resolved' | 'closed';
```

**SupportTicketPriority:**
```typescript
type SupportTicketPriorityType = 'low' | 'normal' | 'high' | 'urgent';
```

**MealType:**
```typescript
type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
```

**MealStatus:**
```typescript
type MealStatusType = 'pending' | 'cooking' | 'completed' | 'skipped' | 'auto_skipped';
```

## 6.2 Основні моделі даних

**User:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  height?: number;
  weight?: number;
  goal?: 'weight_loss' | 'weight_gain' | 'healthy_eating' | 'maintain_weight';
  isFamilyHead: boolean;
  familyId?: string;
  role: UserRoleType;
  subscriptionTier: SubscriptionTierType;
  trialEndsAt?: Date;
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Family:**
```typescript
interface Family {
  id: string;
  weeklyBudget?: number;
  budgetUsed: number;
  budgetPeriodStart?: Date;
  budgetPeriodEnd?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Product:**
```typescript
interface Product {
  id: string;
  name: string;
  nameEn?: string;
  category: ProductCategoryType;
  averagePrice: number;
  priceHistory: object;
  baseUnit: MeasurementUnitType;
  standardPackaging?: number;
  calories?: number;
  protein?: number;
  fats?: number;
  carbs?: number;
  allergens: object;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Menu:**
```typescript
interface Menu {
  id: string;
  familyId: string;
  weekStart: Date;
  weekEnd: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Meal:**
```typescript
interface Meal {
  id: string;
  dayId: string;
  familyMemberId?: string;
  mealType: MealType;
  status: MealStatusType;
  scheduledTime?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

# 7. РЕКОМЕНДАЦІЇ ДЛЯ АДМІНКИ

## 7.1 Основні сторінки адмін панелі:

### Dashboard
- Загальна статистика (користувачі, сім'ї, підписки)
- Графіки активності
- Останні support tickets
- Системний статус

### Користувачі
- Список користувачів з пагінацією та фільтрацією
- Детальна інформація про користувача
- Редагування ролей та підписок
- Статистика активності

### Продукти
- Каталог продуктів з пошуком та фільтрацією
- Додавання/редагування/видалення продуктів
- Управління цінами
- Імпорт/експорт продуктів

### Support
- Список support tickets
- Деталі тікетів
- Зміна статусів
- Статистика по тікетах

### Налаштування
- Системні параметри
- Управління доступом
- Логи та моніторинг

## 7.2 UI компоненти:
- Таблиці з пагінацією та сортуванням
- Фільтри та пошук
- Модальні вікна для редагування
- Графіки та діаграми
- Форми з валідацією
- Нотифікації

## 7.3 Права доступу:
- Адміністратор має доступ до всіх функцій
- Супер адміністратор може керувати адміністраторами
- Звичайні користувачі не мають доступу до адмін панелі

---

# 8. СТРУКТУРА ПРОЕКТУ

```
src/
├── admin/           # Адміністративні функції
├── auth/            # Аутентифікація
├── families/        # Управління сім'ями
├── menu/            # Меню та рецепти
├── products/        # Продукти
├── profile/         # Профілі користувачів
├── shopping-list/   # Списки покупок
├── inventory/       # Інвентар
├── support/         # Support tickets
└── common/          # Спільні компоненти
```

---

# 10. ПОСИЛАННЯ

- Swagger UI: `http://localhost:3000/api`
- Backend репозиторій: `/Users/svatoslavarosenko/mealory-core-backend`
- Prisma schema: `prisma/schema.prisma`

---

# 11. ПРИКЛАДИ ЗАПИТІВ

## Отримання токена адміністратора:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## Отримання статистики:
```bash
curl -X GET http://localhost:3000/admin/analytics/overview \
  -H "Authorization: Bearer <token>"
```

## Створення продукту:
```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Куряче філе",
    "category": "poultry",
    "averagePrice": 120.50,
    "baseUnit": "kg",
    "calories": 165,
    "protein": 31.0
  }'
```

---

Цей документ містить всю необхідну інформацію для створення повноцінної адміністративної панелі Mealory.
