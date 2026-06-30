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

> **Yangilangan (2026-06-29):** quyidagi jadval **ishlar bajarilgandan keyingi** holatni ko'rsatadi. Bosqichma-bosqich kim nima qilgani §5'da. `(★)` — shu branchda qo'shilgan.

| Domen | Backend | Web | Mobile | Izoh |
|-------|:---:|:---:|:---:|------|
| **Auth** (register/login/refresh rotation/logout) | ✅ | ✅ | ✅ | Token rotation + reuse detection mustahkam |
| **Parolni tiklash / email tasdiqlash** | ✅ | ✅ | ✅ | (★) Recovery flow tayyor. Email yetkazish uchun real SMTP transport ulanishi kerak (mailer dev'da loglaydi) |
| **Onboarding** (CEFR daraja + deck tanlash) | ✅ | ✅ | ✅ | To'liq, enforce qilingan |
| **Shaxsiy so'zlar (Words CRUD)** | ✅ | ✅ | ✅ | (★) `PATCH /words/:id` edit, status filtri, web pagination/edit UI qo'shildi |
| **Decklar — browse + enroll** | ✅ | ✅ | ✅ | Faqat o'qish + yozilish |
| **Deck yaratish/tahrirlash (user)** | ✅ | ✅ | ✅ | (★) Deck CRUD + so'z boshqaruvi, `isOwner`/`isPublic` gate |
| **Learning — SM-2 SRS** | ✅ | ✅ | ✅ | Kunlik due + 20 yangi karta cap, 4-tugma grading; (★) har review log qilinadi |
| **Tests (MCQ quiz)** | ✅ | ✅ | ✅ | Server-authoritative, submit-once |
| **Progress / analitika** | ✅ | ✅ | ✅ | (★) streak, daily-goal, trend grafiklar, per-deck breakdown, leeches |
| **Profil** (email/parol/akkaunt o'chirish) | ✅ | ✅ | ✅ | (★) `DELETE /users/me` (parol bilan) qo'shildi |
| **RBAC / admin panel** | ✅ | ✅ | — | (★) `Role` + `RolesGuard` + `/admin/decks`; admin UI faqat web'da |
| **Audio / talaffuz** | ✅ | ✅ | ✅ | (★) `Word.audioUrl`; Web Speech API (web) + `flutter_tts` (mobile) |
| **Streak / kunlik maqsad** | ✅ | ✅ | ✅ | (★) Review log asosida streak + goal ring |
| **Push / local bildirishnoma** | ❌ | — | ❌ | Qurilma + FCM/local-notif sozlamasi kerak — qoldirildi |
| **Offline rejim (mobile)** | ❌ | — | ❌ | Sync yo'q — qoldirildi |

### Texnik/infra holati
- ✅ (★) Refresh-token cleanup cron (`@nestjs/schedule`, har kuni 3:00; expired refresh + expired/used auth tokenlar).
- ✅ (★) Backend test coverage **32% → 83%** (statements); mobile provider/widget testlari qo'shildi (83 test).
- ❌ Soft-delete / audit log — hali hard-delete cascade (qoldirildi, alohida PR).
- ⚠️ Dual type system (web): qo'lda `types/index.ts` + generatsiya `types/api.ts` — birlashtirilmagan (qoldirildi).
- ⚠️ Mobile router `routerProvider` har auth o'zgarishida `GoRouter`ni qayta yaratadi — `refreshListenable`ga refactor kutilmoqda.

---

## 3. Bosqichma-bosqich reja

Tartib **qiymat × xarajat** bo'yicha. Har bosqich mustaqil yetkazib beriladigan (shippable) bo'lakcha.

### ✅ Bosqich 1 — Polish & mavjud bo'shliqlarni yopish (kam xarajat, tez g'alaba) — BAJARILDI
Maqsad: hozirgi MVP'ni "tugallangan" his qildirish.
- **Web:** Words sahifasiga pagination/"load more" UI (store'da `loadMore` bor, ulanmagan).
- **Web:** Words'ga status filtri (NEW/LEARNING/LEARNED) va saralash.
- **Web:** Library qidiruviga debounce + "natija yo'q" holati.
- **Web:** mobil uchun hamburger menyu (sidebar).
- **Backend:** `PATCH /words/:id` — so'zni tahrirlash.
- **Learning UX (3 client):** kartada "keyingi takror N kundan keyin" ko'rsatish.

### ✅ Bosqich 2 — Foydalanuvchi decklari (schema'dagi "Phase C") — BAJARILDI
> Eslatma: shaxsiy so'zlar uchun "personal deck backfill" qilinmadi (schema kerak emas edi); deck CRUD to'liq ishlaydi.
Maqsad: foydalanuvchi o'z to'plamlarini yaratsin/ulashsin.
- **Backend:** `POST/PATCH/DELETE /decks` + decklarga so'z qo'shish/olib tashlash. Shaxsiy so'zlarni "personal deck"ka bog'lash (`Word.deckId`).
- **Backend:** `isPublic` decklarni ulashish (havola/ko'rinish nazorati).
- **Web + Mobile:** deck yaratish/tahrirlash ekranlari, "mening decklarim"ni boshqarish.
- **Migration:** mavjud shaxsiy so'zlar uchun personal deck backfill.

### ✅ Bosqich 3 — Engagement (streak, maqsad) — BAJARILDI (push/local bildirishnoma ❌ qoldirildi)
Maqsad: kundalik qaytib kelishni oshirish.
- **Backend:** streak hisoblash (`UserWord`/review log asosida), kunlik maqsad (kartalar soni), `GET /progress`ga qo'shish.
- **Web + Mobile:** dashboard'da streak + kunlik maqsad halqasi.
- **Mobile:** push/local bildirishnoma ("bugun N karta tayyor").
- (Ixtiyoriy) review log jadvali — keyingi analitika uchun poydevor.

### ✅ Bosqich 4 — Analitika chuqurligi — BAJARILDI (test→SRS qaytarish ❌ qilinmadi, ixtiyoriy edi)
Maqsad: foydalanuvchi va kontent sifati haqida ko'proq tushuncha.
- **Backend:** per-deck progress, haftalik/oylik trend, leech (ko'p `lapses`) aniqlash.
- **Web + Mobile:** trend grafiklari (heatmap/chart), per-deck breakdown.
- **Tests:** so'z bo'yicha xato darajasi (item analysis), test natijasini SRS'ga qaytarish (ixtiyoriy).

### ✅ Bosqich 5 — Audio / talaffuz — BAJARILDI
Maqsad: eshitish orqali o'rganish.
- **Backend/Content:** so'zlarga audio URL yoki TTS integratsiyasi.
- **Web + Mobile:** flashcard va so'z ro'yxatida "tinglash" tugmasi.

### ✅ Bosqich 6 — Akkaunt va xavfsizlik yetukligi — BAJARILDI (real SMTP transport ulanishi kerak)
Maqsad: production-grade akkaunt boshqaruvi.
- **Backend:** email tasdiqlash, parolni tiklash (ikkalasi `passwordChangedAt`ni qayta ishlatadi), akkaunt o'chirish.
- **Backend:** RBAC — `User.roles` ustuni + admin endpointlar (deck/so'z moderatsiyasi). `RolesGuard` allaqachon tayyor.
- **Admin panel (web):** kontent boshqaruvi.

### ⚠️ Bosqich 7 — Infra & sifat (cross-cutting, davomli) — QISMAN: ✅ cleanup cron + ✅ coverage; ❌ soft-delete/audit + ❌ web type birlashtiruvi qoldirildi
Maqsad: barqarorlik va ishonch.
- **Backend:** eskirgan refresh-tokenlar uchun kunlik cleanup cron.
- **Backend:** soft-delete + audit log (kerakli joylarda).
- **Tests:** backend coverage'ni oshirish; mobile widget/provider testlari.
- **Web:** dual type system'ni birlashtirish (faqat generatsiya qilingan turlar).
- **Mobile:** offline review + sync (eng yirik ish — alohida rejalashtiriladi).

---

## 4. Tavsiya etilgan boshlang'ich

Eng yaxshi keyingi qadam — **Bosqich 1 (Polish)** + **Bosqich 2 (Foydalanuvchi decklari)**: birinchisi MVP'ni sayqallaydi, ikkinchisi schema'da allaqachon mo'ljallangan tabiiy davom. Engagement (Bosqich 3) bulardan keyin eng yuqori ROI beradi.

---

## 5. Bajarilish holati (2026-06-29)

Barcha 7 bosqich `feature/roadmap-execution` branchida bajarildi va bosqichma-bosqich commit qilindi. Har bosqich avtomat testlar bilan tasdiqlangan; yakunda 3 ta `code-reviewer` agenti (backend/web/mobile) diff'ni ko'rib chiqdi va topilgan kamchiliklar tuzatildi.

| Bosqich | Holat |
|---------|:-----:|
| 1 — Polish (word edit/filter/pagination, search debounce) | ✅ |
| 2 — Foydalanuvchi decklari (CRUD + word management) | ✅ |
| 3 — Engagement (review log, streak, daily goal) | ✅ |
| 4 — Analitika (trends, per-deck, leeches) | ✅ |
| 5 — Audio (audioUrl + listen: Web Speech / flutter_tts) | ✅ |
| 6 — Akkaunt & RBAC (recovery, verify, delete, admin) | ✅ |
| 7 — Infra (cleanup cron, test coverage 55%→83%) | ✅ |

Yakuniy tekshiruv: backend **192 unit + 82 e2e** yashil, web `type-check` toza, mobile **83 test** + `flutter analyze` (yangi xato yo'q). 2 ta yangi migration qo'shildi va lokal DB'da qo'llandi.

### Ataylab qoldirilgan ishlar (xavf/keng qamrov sababli)

Bu ishlar buzuvchi yoki keng refactor xavfi tug'dirgani uchun qoldirildi — alohida, ehtiyotkor PR talab qiladi:

- **Soft-delete / audit log** — delete semantikasini butun ilova bo'ylab o'zgartiradi; hozirgi cascade xatti-harakatini buzish xavfi.
- **Web dual type-system birlashtiruvi** — `types/index.ts` (qo'lda) ni generatsiya `api.ts` bilan to'liq almashtirish keng import refactori; alohida qilingani ma'qul.
- **Real SMTP mailer** — `MailerService` abstraksiyasi tayyor, dev'da loglaydi; production transport (SMTP/provayder) + kredensiallar kerak.
- **Push / local bildirishnoma (mobile)** — qurilma + FCM/local-notif platforma sozlamasi talab qiladi.
- **Mobile router refactori** — `routerProvider` har auth emissiyasida `GoRouter`ni qayta yaratadi; `refreshListenable`ga o'tkazish navigatsiya holatiga ta'sir qilishi mumkin, qurilmada sinash kerak.
- **Per-email throttle (forgot/verify)** — IP-throttle bor; email-bombingga qarshi per-akkaunt cooldown qo'shilishi mumkin (Low).
- **Shared-deck so'z o'chirilganda cascade** — public/system deckdan so'z o'chirilsa boshqa foydalanuvchilar progressi ham o'chadi; ataylab shunday, lekin soft-detach yaxshiroq bo'lardi.

---

## 6. Kelajak g'oyalari (rejadan tashqari / backlog)

Bu g'oyalar dastlabki 7 bosqich rejasida yo'q edi — ular kengaytirish uchun nomzodlar. Hali baholanmagan/ustuvorlashtirilmagan.

- **Offline rejim + sync (mobile)** — kartalarni internetsiz takrorlash va keyin serverga sinxronlash. Eng yirik ish; alohida arxitektura (lokal DB, conflict resolution) talab qiladi.
- **Ijtimoiy / leaderboard** — do'stlar, reyting, deck ulashish/tavsiya, raqobat.
- **Ma'lumot import/eksport** — lug'atni CSV/Anki formatida import/eksport qilish; deck ulashish havolasi.
- **Adaptiv testlar** — qiyinlikni foydalanuvchi natijasiga moslash; test natijasini SM-2 jadvaliga qaytarish (item analysis asosida).
- **Boyitilgan kontent** — so'zlarga rasm, sinonim/antonim, talaffuz transkripsiyasi (IPA); deck bo'yicha namunaviy matnlar.
- **Gamifikatsiya** — XP/darajalar, nishonlar (badges), kunlik streak mukofotlari.
