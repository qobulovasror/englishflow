# EnglishFlow — Roadmap

> Holat sanasi: 2026-06-29. Tahlil `main` branch (decks-onboarding merge qilingan) bo'yicha.

## 1. Umumiy maqsad (Vision)

EnglishFlow — ingliz tili **lug'atini interval takrorlash (spaced repetition / SM-2)** orqali o'rgatuvchi platforma. Uchta client bitta backendga ulanadi: **Web (Vue 3)**, **Mobile (Flutter)**, **Backend (NestJS + PostgreSQL/Prisma)**.

Foydalanuvchi yo'li:
1. Ro'yxatdan o'tadi → CEFR darajasini (A1–C2) tanlaydi (onboarding).
2. Tayyor (curated) decklarga yoziladi yoki o'z so'zlarini qo'shadi.
3. Har kuni SM-2 algoritmi rejalashtirgan flashcard'larni takrorlaydi (Again/Hard/Good/Easy).
4. Test (MCQ quiz) orqali bilimini tekshiradi.
5. Progress sahifasida o'sishini kuzatadi.

**Asosiy qiymat:** ilmiy isbotlangan interval takrorlash + tuzilgan o'quv kontenti (decklar) + uch platformada bir xil tajriba.

---

## 2. Funksiyalar holati

Belgilar: ✅ tugallangan · ⚠️ qisman/yaxshilash kerak · ❌ yo'q

| Domen | Backend | Web | Mobile | Izoh |
|-------|:---:|:---:|:---:|------|
| **Auth** (register/login/refresh rotation/logout) | ✅ | ✅ | ✅ | Token rotation + reuse detection mustahkam |
| **Parolni tiklash / email tasdiqlash** | ❌ | ❌ | ❌ | Recovery flow yo'q |
| **Onboarding** (CEFR daraja + deck tanlash) | ✅ | ✅ | ✅ | To'liq, enforce qilingan |
| **Shaxsiy so'zlar (Words CRUD)** | ⚠️ | ⚠️ | ✅ | Backend: edit yo'q, faqat create/delete. Web: pagination UI yo'q, status filtri yo'q |
| **Decklar — browse + enroll** | ✅ | ✅ | ✅ | Faqat o'qish + yozilish |
| **Deck yaratish/tahrirlash (user/admin)** | ❌ | ❌ | ❌ | Schema tayyor (`createdById`, `isPublic`), API yo'q. "Phase C" izohi schema'da bor |
| **Learning — SM-2 SRS** | ✅ | ✅ | ✅ | Kunlik due + 20 yangi karta cap, 4-tugma grading |
| **Tests (MCQ quiz)** | ✅ | ✅ | ✅ | Server-authoritative, submit-once |
| **Progress / analitika** | ⚠️ | ⚠️ | ⚠️ | Faqat global stats. Per-deck, streak, trend yo'q |
| **Profil** (email/parol o'zgartirish) | ✅ | ✅ | ✅ | Akkaunt o'chirish yo'q |
| **RBAC / admin panel** | ❌ | ❌ | ❌ | `RolesGuard` bor, `User.roles` ustuni yo'q |
| **Audio / talaffuz (TTS)** | ❌ | ❌ | ❌ | So'zlar faqat matn |
| **Streak / kunlik maqsad / bildirishnoma** | ❌ | ❌ | ❌ | Engagement mexanizmi yo'q |
| **Offline rejim (mobile)** | ❌ | — | ❌ | Sync yo'q |

### Texnik/infra ochiq ishlar
- ⚠️ Refresh-token cleanup cron (eskirgan satrlar yig'ilib qoladi; `expiresAt` indeks tayyor).
- ⚠️ Soft-delete / audit log yo'q (User/Word hard-delete cascade).
- ⚠️ Backend test coverage ~32% (hot path'lar 90–100%, lekin kengaytirish kerak).
- ⚠️ Mobile: widget/provider testlari yo'q (faqat model/parser testlari).
- ⚠️ Dual type system (web): qo'lda yozilgan `types/index.ts` + generatsiya `types/api.ts`.

---

## 3. Bosqichma-bosqich reja

Tartib **qiymat × xarajat** bo'yicha. Har bosqich mustaqil yetkazib beriladigan (shippable) bo'lakcha.

### Bosqich 1 — Polish & mavjud bo'shliqlarni yopish (kam xarajat, tez g'alaba)
Maqsad: hozirgi MVP'ni "tugallangan" his qildirish.
- **Web:** Words sahifasiga pagination/"load more" UI (store'da `loadMore` bor, ulanmagan).
- **Web:** Words'ga status filtri (NEW/LEARNING/LEARNED) va saralash.
- **Web:** Library qidiruviga debounce + "natija yo'q" holati.
- **Web:** mobil uchun hamburger menyu (sidebar).
- **Backend:** `PATCH /words/:id` — so'zni tahrirlash.
- **Learning UX (3 client):** kartada "keyingi takror N kundan keyin" ko'rsatish.

### Bosqich 2 — Foydalanuvchi decklari (schema'dagi "Phase C")
Maqsad: foydalanuvchi o'z to'plamlarini yaratsin/ulashsin.
- **Backend:** `POST/PATCH/DELETE /decks` + decklarga so'z qo'shish/olib tashlash. Shaxsiy so'zlarni "personal deck"ka bog'lash (`Word.deckId`).
- **Backend:** `isPublic` decklarni ulashish (havola/ko'rinish nazorati).
- **Web + Mobile:** deck yaratish/tahrirlash ekranlari, "mening decklarim"ni boshqarish.
- **Migration:** mavjud shaxsiy so'zlar uchun personal deck backfill.

### Bosqich 3 — Engagement (streak, maqsad, bildirishnoma)
Maqsad: kundalik qaytib kelishni oshirish.
- **Backend:** streak hisoblash (`UserWord`/review log asosida), kunlik maqsad (kartalar soni), `GET /progress`ga qo'shish.
- **Web + Mobile:** dashboard'da streak + kunlik maqsad halqasi.
- **Mobile:** push/local bildirishnoma ("bugun N karta tayyor").
- (Ixtiyoriy) review log jadvali — keyingi analitika uchun poydevor.

### Bosqich 4 — Analitika chuqurligi
Maqsad: foydalanuvchi va kontent sifati haqida ko'proq tushuncha.
- **Backend:** per-deck progress, haftalik/oylik trend, leech (ko'p `lapses`) aniqlash.
- **Web + Mobile:** trend grafiklari (heatmap/chart), per-deck breakdown.
- **Tests:** so'z bo'yicha xato darajasi (item analysis), test natijasini SRS'ga qaytarish (ixtiyoriy).

### Bosqich 5 — Audio / talaffuz
Maqsad: eshitish orqali o'rganish.
- **Backend/Content:** so'zlarga audio URL yoki TTS integratsiyasi.
- **Web + Mobile:** flashcard va so'z ro'yxatida "tinglash" tugmasi.

### Bosqich 6 — Akkaunt va xavfsizlik yetukligi
Maqsad: production-grade akkaunt boshqaruvi.
- **Backend:** email tasdiqlash, parolni tiklash (ikkalasi `passwordChangedAt`ni qayta ishlatadi), akkaunt o'chirish.
- **Backend:** RBAC — `User.roles` ustuni + admin endpointlar (deck/so'z moderatsiyasi). `RolesGuard` allaqachon tayyor.
- **Admin panel (web):** kontent boshqaruvi.

### Bosqich 7 — Infra & sifat (cross-cutting, davomli)
Maqsad: barqarorlik va ishonch.
- **Backend:** eskirgan refresh-tokenlar uchun kunlik cleanup cron.
- **Backend:** soft-delete + audit log (kerakli joylarda).
- **Tests:** backend coverage'ni oshirish; mobile widget/provider testlari.
- **Web:** dual type system'ni birlashtirish (faqat generatsiya qilingan turlar).
- **Mobile:** offline review + sync (eng yirik ish — alohida rejalashtiriladi).

---

## 4. Tavsiya etilgan boshlang'ich

Eng yaxshi keyingi qadam — **Bosqich 1 (Polish)** + **Bosqich 2 (Foydalanuvchi decklari)**: birinchisi MVP'ni sayqallaydi, ikkinchisi schema'da allaqachon mo'ljallangan tabiiy davom. Engagement (Bosqich 3) bulardan keyin eng yuqori ROI beradi.
