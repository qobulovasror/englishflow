# EnglishFlow — To'liq audit hisoboti

> Sana: 2026-07-16 · Branch: `feat/extension-prod-url` · Ko'lam: backend (NestJS), web (Vue 3), mobile (Flutter), brauzer kengaytmasi (WXT), infra/CI.
>
> Metod: har domen bo'yicha alohida chuqur o'qish (kod bo'yicha, faraz emas). Eng muhim da'volar (`revokedAt` dead code, test pool tasodifiyligi yo'qligi, web token `localStorage`da, seed bcrypt=10) qo'lda `grep` bilan qayta tasdiqlangan.

## 0. Umumiy xulosa

Loyiha MVP darajasidan ancha yuqoriga o'sgan: auth dizayni jiddiy (bcrypt cost 12, opaque 256-bit refresh/reset tokenlar SHA-256 bilan hash qilinib saqlanadi, global JWT guard + `@Public()`, `passwordChangedAt` invalidatsiya, RBAC + `RolesGuard`, throttling, health/readiness, cleanup cron). Mobil token endi Keychain/Keystore'da, quiz server tomonda baholanadi — eski ikkita eng katta xavf **tuzatilgan**.

Ammo bitta izchil mavzu barcha uchta clientda takrorlanadi va eng katta xavf shu: **sessiya holati (token) yagona manbaga ega emas** — komponentlar bir-biriga xabar bermay desinxron bo'lib qoladi. Bu web'da redirect loop + XSS, mobil'da sessiya o'lganda "qulflanib qolish", backend'da esa e'lon qilingan reuse-detection himoyasining **umuman ishlamasligiga** olib keladi.

### Eng muhim 8 ta (darhol e'tibor)

| # | Sohа | Muammo | Jiddiylik |
|---|------|--------|:---------:|
| 1 | Backend | Refresh-token **reuse detection dead code** — o'g'irlangan token aniqlanmaydi (`revokedAt` hech yozilmaydi) | HIGH |
| 2 | Web | Access token `localStorage`da — XSS bilan o'g'irlanadi; interceptor Pinia store'ni tozalamaydi → **login redirect loop** | HIGH |
| 3 | Mobile | Refresh muvaffaqiyatsiz bo'lsa in-memory auth holati tozalanmaydi → **dead-session lockout** | HIGH |
| 4 | Mobile | `GoRouter` har auth o'zgarishida qayta yaratiladi → navigatsiya stack reset | HIGH |
| 5 | Backend | Test savol pooli **deterministik** (orderBy/random yo'q) — 500 so'zli user doim bir xil ~10 so'zdan test | HIGH |
| 6 | Backend | Cascade delete **boshqa userlar** progressini yo'q qiladi (public deck/word/account o'chirishda) | HIGH |
| 7 | Extension | Settings'dagi API URL validatsiyasiz, sessiya tozalanmaydi → tokenlar **ixtiyoriy origin**ga yuboriladi | HIGH |
| 8 | DevOps | Prod konteyner `npx prisma migrate deploy` ni prune'dan **keyin** chaqiradi — CLI yo'q, registry'dan yuklaydi | HIGH |

### Jiddiylik statistikasi

| Soha | HIGH | MEDIUM | LOW |
|------|:----:|:------:|:---:|
| Backend xavfsizlik | 0 | 2 | 5 |
| Backend logika | 3 | 8 | 8 |
| Web frontend | 2 | 5 | 10 |
| Mobile | 3 | 8 | 7 |
| Extension | 1 | 4 | 8 |
| DevOps/infra | 2 | 8 | 10 |

> Eslatma: backend xavfsizlik agentida CRITICAL/HIGH exploitable topilmadi — dizayn kuchli; qolgan HIGH'lar logika va client tomonda.

---

## 1. Backend — Xavfsizlik & Auth

### 1.1 MEDIUM

**B-SEC-M1 — Refresh-token reuse detection dead code (o'g'irlik hech aniqlanmaydi)** · `src/modules/auth/refresh-tokens.service.ts:60-93`
`rotate()` eski tokenni **hard-delete** qiladi (`prisma.refreshToken.delete`), `revokedAt`ni hech qachon yozmaydi (grep bilan tasdiqlandi: `revokedAt` faqat 63-qatorda o'qiladi). Shu sabab reuse-branch:
```ts
if (existing.revokedAt) {           // 63 — hech qachon true bo'lmaydi
  await this.revokeAllForUser(existing.userId);
  throw new UnauthorizedException('Refresh token reuse detected');
}
```
umuman ishga tushmaydi. Replay qilingan token `!existing`ga tushib oddiy "Invalid refresh token" qaytaradi. Controller docstring va schema comment "revoked token replay = butun zanjir revoke" deb va'da beradi — bu himoya **mavjud emas**. O'g'ri refresh tokenni o'g'irlab rotate qilsa, yangi yaroqli zanjir oladi; qonuniy user chiqib ketadi, o'g'irlik esa 30 kungacha sezilmaydi.
**Fix (best practice — rotating refresh token family):** rotationda delete o'rniga **soft-revoke** — qatorni saqla, `revokedAt = now()`, yangi tokenni `familyId`/`replacedById` bilan bog'la. Revoked (yo'q emas) tokenni replay `revokeAllForUser`ni ishga tushiradi. Eski revoked qatorlarni tungi `CleanupService` tozalaydi. (Bu OWASP "Refresh Token Rotation with Automatic Reuse Detection" pattern.)

**B-SEC-M2 — `/auth/forgot-password` timing orqali email enumeration** · `src/modules/auth/auth.service.ts:103-124`
Noma'lum email darhol `return`; ro'yxatdan o'tgan email DB insert + prod'da awaited SMTP round-trip qiladi. Latency farqi orqali qaysi email akkauntga ega ekanini bilib olish mumkin — endpointning anti-enumeration maqsadini buzadi (login yo'li `DUMMY_HASH` bilan himoyalangan, bu esa emas).
**Fix:** issue+send'ni request yo'lidan chiqar (javobdan **keyin** fire-and-forget), yoki ikkala branch bir xil ish bajarsin / constant-time padding qo'sh.

### 1.2 LOW

- **B-SEC-L3** — Emaillar normalizatsiya qilinmaydi (`toLowerCase`/`trim` yo'q). `User@x.com` va `user@x.com` alohida akkaunt; registratsiya case bilan login mos kelmasligi mumkin. · `users.service.ts:35`, `auth.service.ts:40`
- **B-SEC-L4** — Seed ma'lum parolli akkaunt yaratadi (`demo@englishflow.com`/`password123`, bcrypt=10). Prod DB'ga run bo'lsa ochiq kredensial. `NODE_ENV !== 'production'` bilan gate qil. · `prisma/seed.ts:127`
- **B-SEC-L5** — `helmet()` yo'q (HSTS, X-Content-Type-Options, X-Frame-Options). Prod HTTPS uchun qo'sh. · `src/main.ts:31`
- **B-SEC-L6** — Reset/verify tokenlar oldingilarini invalidate qilmaydi; parol o'zgargach ham eski reset link yaroqli (1 soat TTL ichida). `resetPassword`/`changePassword`da barcha `PASSWORD_RESET` tokenlarni `usedAt`ga belgila. · `auth-tokens.service.ts:29`
- **B-SEC-L7** — Prod'da JWT_SECRET placeholder qabul qilinadi (faqat `min(32)` tekshiriladi; `.env.example` placeholderi shartni qondiradi). Prod'da ma'lum placeholderlarni rad et. · `env.validation.ts:36`

### 1.3 Yaxshi holat (kalibrlash uchun)
bcrypt cost 12 · opaque tokenlar SHA-256 hashlangan · atomik single-use consume · global whitelist+forbidNonWhitelisted (mass-assignment/self-elevation bloklangan) · role har requestda DB'dan yangi · CORS explicit allowlist (reflection yo'q) · throttling 120/min global + 10/min auth · refresh cookie httpOnly+secure(prod)+sameSite=lax+path=/auth · 5xx xabarlari prod'da maskalangan.

---

## 2. Backend — Logika, ma'lumot yaxlitligi, performance

### 2.1 HIGH

**B-LOG-H1 — Test savol pooli deterministik** · `src/modules/tests/tests.service.ts:25-29`
`userWord.findMany({ take: 20 })` — `orderBy`/random **yo'q** (grep bilan tasdiqlandi). Postgres barqaror birinchi 10 qatorni (odatda insert tartibi) qaytaradi, shuning uchun 500 so'zli user abadiy bir xil ~10 eng eski so'zdan test topshiradi; yangi o'rganilganlar hech tekshirilmaydi. Distractorlar ham shu 10 so'zdan.
**Fix:** server tomonda tasodifiy sampla — `ORDER BY random() LIMIT 10` (raw query) yoki barcha id' larni olib Fisher-Yates bilan 10 tanla.

**B-LOG-H2 — Progress statistikasi yakunlanmagan testlarni 0-ball deb hisoblaydi** · `src/modules/progress/progress.service.ts:54-69`
`test.findMany/count/aggregate`da `submittedAt: { not: null }` filtri yo'q, `startTest` esa `score: 0` bilan Test qatorini oldindan yozadi. 5 ta quiz boshlab tashlab, 1 tasini 5/5 topshirsa dashboard `total: 6, averageScore: 0.83` ko'rsatadi (to'g'risi `total:1, average:5`).
**Fix:** uchala query'ga `where: { userId, submittedAt: { not: null } }` qo'sh.

**B-LOG-H3 — Cascade zanjiri boshqa userlar progressini yo'q qiladi** · `prisma/schema.prisma:137,132,228,97`; `decks.service.ts:216,338`, `admin.service.ts:239`
Public deckka boshqalar enroll bo'ladi (ularning `UserWord`+`Review` qatorlari deck so'zlariga ishora qiladi). Egasi deckni o'chirsa — yoki admin egani o'chirsa (User→Deck→Word→UserWord/Review cascade) — **har bir enrolled userning SM-2 holati va review logi o'chadi**, streaklari/trendlari retroaktiv kichrayadi, ogohlantirish yo'q.
**Fix:** deck/word soft-delete, yoki `Review.wordId`da `onDelete: SetNull` + foreign enrollmentli deckni o'chirishni blokla (yoki enrollda so'zlarni nusxala).

### 2.2 MEDIUM

- **B-LOG-M1** — `submitTest` double-submit race: submit-once check write tranzaksiyasidan **tashqarida**. Ikki parallel submit ikkalasi ham baholanadi. Fix: `updateMany({ where: { id, userId, submittedAt: null }})` + count===0 tekshir. · `tests.service.ts:89-99`
- **B-LOG-M2** — Admin import dedupe cross-case duplikatni o'tkazib yuboradi (`in` case-sensitive, `wordKey()` lowercase). Fix: `mode: 'insensitive'` yoki `(deckId, lower(word), lower(translation))` functional unique index. · `admin.service.ts:370-379`
- **B-LOG-M3** — Streak/goal/trend **UTC kunga** qattiq bog'langan (`toISOString().slice(0,10)`). UTC+5 (o'zbek auditoriyasi) foydalanuvchi 04:00da review qilsa oldingi UTC kuniga tushadi → `todayCount` 0, streak uziladi. Fix: user timezone/offset saqla, mahalliy kalendar kuni bo'yicha bucket. · `progress.service.ts:26`, `streak.ts`, `trend.ts:31`
- **B-LOG-M4** — Enrolldan keyin deckka qo'shilgan so'zlar enrolled userlarga **yetmaydi** (UserWord back-fill/sync yo'q); `getDeckProgress` faqat UserWordli so'zlarni sanaydi → deck "100% o'rganilgan" ko'rinadi. Schema comment "re-sync" va'da qiladi lekin implement qilinmagan — **yakunlanmagan feature**. Fix: `addWords`da barcha enrollee uchun UserWord `createMany(skipDuplicates)`. · `decks.service.ts:221-252`
- **B-LOG-M5** — `getUserProgress` har dashboardda 366 kunlik xom Review qatorlarini yuklaydi (~36k qator/hit). Fix: `$queryRaw SELECT DISTINCT date_trunc('day', ...)` yoki `groupBy`. · `progress.service.ts:77-80`
- **B-LOG-M6** — SM-2: AGAIN kartani ertagacha yo'qotadi (`interval=1` → +24h), same-session relearn step yo'q; q=0 EF jazosi qattiq (−0.8/lapse, ikki AGAIN 2.5→1.3 flooriga). Fix: AGAIN uchun qisqa relearn (`now+10min`, interval 0) + yumshoqroq EF jazo (Anki −0.2). · `sm2.ts:59-64,77`
- **B-LOG-M7** — So'z o'chirilsa uning Review qatorlari cascade o'chadi ("append-only log" deb hujjatlangan bo'lsa-da) → bugungi goal/streak retroaktiv tushadi. Fix: `Review.wordId` nullable + `SetNull` yoki word matnini denormalizatsiya qil. · `schema.prisma:97`
- **B-LOG-M8** — `reviewWord` idempotent emas: double-tap 2 Review qatori qo'yadi (todayCount/streak/trend shishiradi). Fix: findFirstni tranzaksiyaga kirit + dedupe (bir necha soniya oynasi yoki idempotency key). · `learning.service.ts:73-120`

### 2.3 LOW
- **B-LOG-L1** — `getRandomWordsForUser` dead code + noto'g'ri nom (`createdAt: asc` qaytaradi, random emas). O'chir. · `words.service.ts:106-112`
- **B-LOG-L2** — Bir xil tarjimali so'zlar quiz optionida ikki marta + false-positive baholash. Distractorlarni `translation !== word.translation` bilan filtrla + dedupe. · `tests.service.ts:57-63`
- **B-LOG-L3** — `selectedAnswer` cheksiz (`@IsString()` only). `@MaxLength(200)` qo'sh. · `submit-test.dto.ts`
- **B-LOG-L4** — `enroll` `enrolledCount` sifatida butun deck hajmini qaytaradi (skipDuplicates 0 qo'shsa ham). `createMany` `count`dan foydalan. · `decks.service.ts:162-168`
- **B-LOG-L5** — Kunlik yangi-karta cap per-**pull**, per-day emas — `GET /learning/daily` qayta chaqirsa yana 20 yangi. · `learning.service.ts:18,47`
- **B-LOG-L6** — Tashlab ketilgan `Test`/`TestQuestion` qatorlari cheksiz o'sadi (cleanup faqat tokenlarni tozalaydi). `submittedAt: null AND createdAt < now-24h` sweep qo'sh. · `cleanup.service.ts:32`
- **B-LOG-L7** — Hot per-user querylar uchun composite index yo'q: `@@index([userId, createdAt])` (Test), `@@index([userId, status])` (UserWord). · `schema.prisma:252,232`
- **B-LOG-L8** — `GET /words?status=` foydalanuvchining o'z deck so'zlarini (UserWordsiz) yashiradi; per-status count `total`ga mos kelmaydi. · `words.service.ts:39-44`

### 2.4 Yaxshi holat
**correctAnswer leak YO'Q** (eski memory issue tuzatilgan — `startTest` javobida yo'q, `excludeExtraneousValues` extralarni oladi, faqat submit natijasida qaytadi) · submit ownership enforce qilingan · scoring pure integer (float muammosi yo'q) · shuffle to'g'ri non-mutating Fisher-Yates · pagination to'g'ri (1-based, cap 100, item+count bitta `$transaction`) · streak matematikasi UTC inputlari uchun to'g'ri · word+UserWord, review+log, enroll, submit yozuvlari tranzaksion · N+1 topilmadi.

---

## 3. Web frontend (Vue 3)

### 3.1 HIGH

**FE-H1 — Access token `localStorage`da (XSS-exfiltratable)** · `services/api.ts:24,39,91`, `stores/auth.ts:28,41`
`localStorage.setItem('token', accessToken)` — har qanday XSS (yoki zararli dependency) yaroqli bearer token + cached user'ni o'qib replay qiladi. Bu yerda `localStorage` **keraksiz**: ilova har boot'da httpOnly refresh cookie'dan silent-restore qiladi (`main.ts:17`).
**Fix:** access tokenni faqat Pinia xotirasida sakla; request interceptor store'dan o'qisin; `TOKEN_KEY`/`USER_KEY`ni o'chir; `tryRestore()`dan keyin `/users/me`ni qayta ol.

**FE-H2 — Interceptor `clearSession()` Pinia store'ni tozalamaydi → login redirect loop** · `services/api.ts:65-68`
`clearSession()` faqat `localStorage`ni tozalaydi; `authStore.token` ref o'zgarmaydi, `isAuthenticated` `true` qoladi. Guard (`router/index.ts:167`) userni `/dashboard`ga qaytaradi → API 401 → refresh → redirectToLogin → qaytadan… **cheksiz loop**; qo'lda hard reload'siz login formaga chiqib bo'lmaydi. Refresh success ham store'ni yangilamaydi (stale).
**Fix:** yagona manba — interceptor auth store'ga chaqirsin (yoki event emit qilsin), `token`/`user` birga yangilanadi/tozalanadi.

> FE-H1 va FE-H2 bir ildizdan: **token yagona manbaga ega emas** (`localStorage` vs Pinia). Ikkalasini bitta refactor bilan yopish kerak.

### 3.2 MEDIUM
- **FE-M1** — Dual type system: generatsiya `types/api.ts` (2690 qator) va `api-helpers.ts` **hech joyda import qilinmaydi**; butun ilova qo'lda `types/index.ts` ishlatadi. Drift allaqachon bor (`selectedAnswer`, `refreshToken`). Migratsiyani tugat yoki generatsiya fayllarni o'chir. · `types/`
- **FE-M2** — TestPage: floating submit promise (`submitTest` awaited emas), quiz view'da error/loading yo'q, retry/double-click **duplicate answer** push qiladi. Fix: `nextQuestion`ni loading bilan gate, `:loading` button, await+catch, error render, javob berilganini push qilma. · `TestPage.vue:31-42,104`
- **FE-M3** — Tizimli unhandled promise rejection: storelar `throw e`, sahifalar catch qilmaydi (Login, Register, LearnPage, WordsPage, Onboarding skip). Konvensiya tanla (store error state yoki har caller catch). · bir nechа fayl
- **FE-M4** — Catch-all 404 route yo'q → noto'g'ri URL bo'sh oq sahifa. `{ path: '/:pathMatch(.*)*' }` qo'sh. · `router/index.ts`
- **FE-M5** — LearnPage rating tugmalari in-flight'da disable qilinmaydi → double-submit race (birinchi so'zni olib tashlaydi, ikkinchisi **keyingi ko'rilmagan** so'zni baholaydi → SM-2 buziladi). `submitting` ref qo'sh. · `LearnPage.vue:120-131`

### 3.3 LOW
- **FE-L1** — Comment "in-memory token" deydi, kod ikki qator narida `localStorage` — noto'g'ri hujjat. (H1 bilan tuzat.)
- **FE-L2** — Register placeholder "Min 6 characters" vs validatsiya 8. Moslashtir.
- **FE-L3** — Optional maydonlarni tozalab bo'lmaydi (`|| undefined` → PATCH eski qiymatni saqlaydi). Cleared uchun `null` yubor.
- **FE-L4** — DeckDetailPage route paramni bir marta cache qiladi → deck-to-deck stale. `route.params.id`ni watch qil.
- **FE-L5** — `decks.service.ts` `mine()` = `getMyDecks()` duplikat, hech chaqirilmaydi. O'chir.
- **FE-L6** — Dashboard/Progress `catch {}` xatolarni yutadi → xatoda "Welcome, add words" adashtiruvchi empty-state. Error holatini ajrat.
- **FE-L7** — LearnPage feedback `setTimeout` unmountda tozalanmaydi + feedback keyingi karta ostida ko'rinadi.
- **FE-L8** — `refreshToken` web JSON body'da (client ignore qiladi lekin JS-readable). Web uchun cookie-only javob varianti.
- **FE-L9** — `.env.example` yo'q, Vite dev proxy yo'q → `VITE_API_URL` unset bo'lsa hamma request 404.
- **FE-L10** — Guard `localStorage`dan kelgan user role/onboarding'ga ishonadi (UI-only spoofing; backend real enforce qiladi). H1 fix bilan yo'qoladi.

### 3.4 Yaxshi holat
`v-html` yo'q (XSS sink yo'q) · `any` yo'q · secret/hardcoded URL yo'q (`VITE_API_URL`) · correctAnswer test start'da yo'q · 401 `router.push` (window.location emas) · refresh single-flight lock · guard Pinia store o'qiydi · forgot-password enumeration-safe.

---

## 4. Mobile (Flutter)

### 4.1 HIGH

**MOB-H1 — Refresh muvaffaqiyatsiz bo'lsa in-memory holat tozalanmaydi → dead-session lockout** · `refresh_interceptor.dart:32,41`
Refresh failure'da `tokenStorage.clearAll()` chaqiriladi, lekin `auth_provider` xabardor qilinmaydi — `AuthState.token` set qolib, `isAuthenticated` `true` bo'lib qoladi. Router guard hech qachon `/login`ga redirect qilmaydi; user har request 401 bo'ladigan ekranda **qamalib** qoladi (app restart'gacha).
**Fix:** interceptor sessiya o'limini signal qilsin (callback/StreamController/`forceLogout()`), router reaksiya qilsin.

**MOB-H2 — `GoRouter` har auth mutatsiyada qayta yaratiladi** · `app_router.dart:33`, `main.dart:23`
`ref.watch(authProvider)` `Provider<GoRouter>` ichida — har `copyWith` (jumladan `isLoading` toggle) yangi GoRouter quradi, `initialLocation: '/splash'`dan boshlaydi. Profilda daily goal yangilash userni splash orqali `/home`ga sakratadi; login ekran login o'rtasida remount bo'ladi.
**Fix:** routerni bir marta yarat; `redirect` re-evaluationni `refreshListenable` bilan boshqar.

**MOB-H3 — Default base URL cleartext HTTP + emulator manzili, release'da jimgina** · `app_constants.dart:5-8`
`defaultValue: 'http://10.0.2.2:3000'` — `--dart-define=BASE_URL` bermay release build dev cleartext URLga ishora qiladi (hozir iOS ATS bloklaydi, lekin android/ regeneratsiya bo'lsa tokenlar shifrsiz ketadi).
**Fix:** release'da BASE_URL unset bo'lsa fail fast (`kReleaseMode` assert), default prod HTTPS, dev URLlar flavor/define ortida.

### 4.2 MEDIUM
- **MOB-M1** — Refresh coalescing race: `_inFlight ??= _refresh()` keyin har awaiter `_inFlight = null` — kech awaiterlar boshqaning future'ini clobber qiladi → parallel `/auth/refresh`, single-use token bilan **butun zanjir revoke**. Fix: future'ni lokal ushlab `whenComplete`da faqat `identical` bo'lsa tozala. · `refresh_interceptor.dart:37-38`
- **MOB-M2** — Har 401 refresh/clearSession'ni ishga tushiradi (kredensial xatosi ham). Retry'dan keyin 401 bo'lsa `clearAll()` **yaroqli** sessiyani o'chiradi. Fix: refreshni token-expiry'ga scope qil, `/auth/login|register|reset`ni chiqar. · `refresh_interceptor.dart:25-34`
- **MOB-M3** — Refresh Dio timeoutsiz (main 15s, bu 0) → osilgan refresh barcha coalesced requestlarni cheksiz bloklaydi. · `refresh_interceptor.dart:63`
- **MOB-M4** — `_refresh`da `raw as Map` cast faqat `on DioException` bilan qamalgan; non-JSON body `TypeError` → unhandled async exception. · `refresh_interceptor.dart:82`
- **MOB-M5** — Quiz submit xatosi haqiqiy 0-ball sifatida ko'rsatiladi (`return 0` + `pushReplacement`), user javoblari tashlanadi. Fix: xatoni ko'rsat + retry. · `test_provider.dart:82`, `quiz_screen.dart:205`
- **MOB-M6** — SRS reviewlar fire-and-forget, jimgina yo'qoladi (`.catchError((_) {})`); summary "done" deb sanaydi, server SM-2 yangilanmaydi — ma'lumot buzilishi. Fix: navbatga qo'y/retry yoki summaryda flag. · `learning_provider.dart:46`
- **MOB-M7** — Logoutda provider holati reset qilinmaydi (`ref.invalidate` hech joyda) → ikkinchi akkauntga kirsa oldingi user so'zlari/progressi ko'rinadi. Fix: logoutda feature providerlarni invalidate. · `auth_provider.dart:222`
- **MOB-M8** — Words ro'yxati 100 da cap, pagination ulanmagan (`hasMore`/`getWordsPage` ishlatilmaydi) → >100 so'zli user qolganini ko'rolmaydi. **Yakunlanmagan feature.** · `words_service.dart:41`

### 4.3 LOW
- **MOB-L1** — Route'larda `state.extra as Map`/`as WordModel` guardsiz cast → deep link/hot restart'da null crash. · `app_router.dart:150,166,188`
- **MOB-L2** — SafeLogInterceptor `options.uri` query redaksiyasiz, non-Map body `_redact`ni chetlab o'tadi (debug-only). · `safe_log_interceptor.dart:39,72`
- **MOB-L3** — Certificate pinning yo'q (production uchun SPKI pinning ko'rib chiq).
- **MOB-L4** — Email validator yaroqli TLDlarni rad etadi (`{2,4}`) + boshida nuqtaga ruxsat. · `validators.dart:8`
- **MOB-L5** — Dead dependency/kod: `shared_preferences`, `hive`/`hive_flutter` (box ochiladi, hech ishlatilmaydi), `flutter_svg`, `gap`, `flutter_animate`, `shimmer`, `cached_network_image`, `json_annotation`, `riverpod_annotation` — 0 import; `speak_button.dart` `audioUrl` ishlatilmaydi. · `pubspec.yaml`
- **MOB-L6** — `android/` scaffold umuman yo'q (faqat `ios/`), lekin default URL android emulatorga (`10.0.2.2`) ishora qiladi.
- **MOB-L7** — `dynamic` widget helperlar (`quiz_screen.dart:57`, `flashcard_screen.dart`) — compile-time tekshiruv yo'q.

### 4.4 Yaxshi holat
Token `flutter_secure_storage` (Android `encryptedSharedPreferences`, iOS `first_unlock` Keychain) — **SharedPreferences EMAS** · correctAnswer leak yo'q (server-side grade) · network logging debug-only + password/token/auth header redaksiya · auth guardlar to'liq (H1/H2 modulo).

---

## 5. Brauzer kengaytmasi (WXT + Vue, MV3/MV2)

### 5.1 HIGH

**EXT-H1 — Runtime API URL validatsiyasiz → tokenlar ixtiyoriy originga** · `lib/storage.ts:50-52`, `background.ts:105`, `Settings.vue:16`
`setApiUrl(url)` faqat trailing slash oladi — `new URL()` parse yo'q, https majburiy emas, allowlist yo'q. URL o'zgargach sessiya **tozalanmaydi**, shuning uchun keyingi popup ochilishi eski access tokenni yangi originga yuboradi, 401→refresh yo'li esa **refresh tokenni body'da** shu originga POST qiladi. `http://` qabul qilinadi → tokenlar/parollar plaintext. Typosquat/zararli "self-hosted server" URL akkauntni to'liq phish qiladi.
**Fix:** `new URL()` bilan validatsiya, `https:` majburiy (dev'da faqat `http://localhost`), UI'da tasdiq, origin o'zgarsa `clearSession()`. Prod build'da sozlamani umuman olib tashlashni ko'rib chiq.

### 5.2 MEDIUM
- **EXT-M1** — Content script har sahifaga (`<all_urls>`) statik inject — "read/change all your data" ogohlantirishi; on-demand yo'l (context-menu + `scripting`) allaqachon bor. Statik injectni olib tashla yoki opt-in ortiga qo'y. · `content/index.ts:10`
- **EXT-M2** — Background message handler sender validatsiyasiz + payloadni ko'r-ko'rona cast (`LOGIN`, `SET_API_URL` har content-script kontekstidan erishiladigan). `sender.id === runtime.id` tekshir; privileged oplarni extension page'lariga cheklab qo'y. · `background.ts:30-38`
- **EXT-M3** — Access+refresh tokenlar `chrome.storage.local`da shifrsiz, barcha extension kontekstlarига o'qiladi (comment "faqat background" deydi lekin faqat konvensiya bilan). Access tokenni `storage.session` (`TRUSTED_CONTEXTS`)ga o'tkaz. · `storage.ts:10-15`
- **EXT-M4** — "API server" feature yarim-buzilgan: `host_permissions` compile-time (faqat `WXT_API_URL` origini), lekin URL runtime'da o'zgaradi → boshqa originga fetch CORS'ga tushadi. `optional_host_permissions` + `permissions.request()`. · `wxt.config.ts:12-27`

### 5.3 LOW
- **EXT-L1** — `deckId` URL pathga encode qilinmay interpolatsiya (`/decks/${deckId}/words`) → crafted qiymat POST'ni qayta yo'naltiradi. `encodeURIComponent` + UUID validatsiya. · `resources.ts:33`
- **EXT-L2** — `JSON.parse(text)` guardsiz → nginx 502/HTML 401 `SyntaxError`, `ApiError`ga aylanmaydi, 401 maxsus ishlanmaydi. try/catch. · `api.ts:23`
- **EXT-L3** — `audioUrl` third-party JSON'dan validatsiyasiz `new Audio().play()` + backendga saqlanadi. Faqat `https:` + host allowlist. · `SavePanel.vue:55`
- **EXT-L4** — Double-injection race → UI dublikati. Content script guard (`window.__efInjected`). · `background.ts:53-78`
- **EXT-L5** — Esc-to-close unauth panel holatida ulanmagan (auth check'dan keyin). · `SavePanel.vue:23-44`
- **EXT-L6** — Prod host permission kengroq (butun `mindcore.uz/*`), faqat `/api/*` chaqiriladi. Pattern'ga path qo'sh. · `wxt.config.ts:17`
- **EXT-L7** — Firefox MV2 build `content.css`ni barcha saytlarga ochadi (fingerprinting). Chrome MV3 `use_dynamic_url`.
- **EXT-L8** — `extension/.env` faqat **root** `.gitignore`ning `.env` qatori bilan himoyalangan (tasodifiy). `extension/.gitignore`ga aniq `.env` qo'sh.

### 5.4 Yaxshi holat
XSS toza (`v-html`/`innerHTML`/`eval` yo'q, hamma narsa Vue `{{ }}` shadow-root ichida) · CSP zaiflatilmagan (MV3 default) · prod API HTTPS · `.env`larda secret yo'q · refresh single-flight (backend rotationga mos) · token page kontekstiga kirmaydi.

---

## 6. DevOps / Infra / CI / Test

### 6.1 HIGH

**OPS-H1 — Prod konteyner Prisma CLI prune'dan keyin `migrate deploy` chaqiradi** · `Dockerfile:19,40`, `package.json:62`
`npm prune --omit=dev` `prisma` CLI'ni (devDependency) olib tashlaydi, keyin CMD `npx prisma migrate deploy` — lokal binar yo'q, **pinlanmagan latest** `prisma`ni registry'dan yuklaydi. Har start registry kirish talab qiladi (air-gapped'da fail); major mos kelmasa migratsiyalar buziladi. CI'da ko'rinmaydi (image build/boot qilinmaydi).
**Fix:** `prisma`ni `dependencies`ga ko'chir, YOKI runner stage'da prune'dan oldin `COPY --from=builder /app/node_modules/prisma`, YOKI eng yaxshisi — migratsiyani alohida job/init-container'da pinlangan `npx prisma@5.8.x` bilan, CMD faqat `node dist/main`.

**OPS-H2 — Migratsiyalar prod'dan oldin real DB'da hech ishlatilmaydi** · `.github/workflows/ci.yml`, `test/helpers/prisma-stub.ts`
Barcha "e2e" testlar in-memory stub'ni override qiladi. CI Postgres ishga tushirmaydi, `migrate deploy` qilmaydi, 11 migratsiyani validatsiya qilmaydi. H1 bilan birga — migratsiya birinchi marta **prod boot'da** ishlaydi.
**Fix:** backend CI'ga Postgres 16 `services:` qo'sh, `migrate deploy` real DB'ga run, e2e smoke subset'ni real `PrismaService` bilan ishga tushir.

### 6.2 MEDIUM
- **OPS-M1** — Lint/format hamma joyda o'lik: `package.json` eslint/prettier'ga ishora qiladi lekin o'rnatilmagan, config yo'q, CI lint qilmaydi. ESLint+Prettier qo'sh (backend+frontend) + CI step. · `package.json:10,15`
- **OPS-M2** — Dependency/security scan yo'q (dependabot/CodeQL/npm audit/image scan yo'q). Stack eskirmoqda (NestJS 10, Prisma 5.8, Vite 5). `.github/dependabot.yml` + `npm audit --audit-level=high` CI step.
- **OPS-M3** — E2E-in-CI docker image hech build qilinmaydi (H1 latent buzilish CI'ni yiqitmaydi). `docker build` job qo'sh (buildx cache).
- **OPS-M4** — `.dockerignore` juda yupqa (5 qator); `extension/node_modules`, `mobile/.dart_tool`, `coverage`, `test`, `docs`, `openapi.json` (140KB), `.DS_Store`, `extension/.env` build kontekstiga kiradi. `**/node_modules`, `mobile`, `extension`, `**/.env*`, `*.md`, `*.tsbuildinfo` qo'sh. · `.dockerignore`
- **OPS-M5** — Postgres `0.0.0.0`da publish + `.env.example` `POSTGRES_PASSWORD=postgres`ga yo'naltiradi. `127.0.0.1:` bind + example'ni `CHANGE_ME`ga. · `docker-compose.yml:10`, `.env.example:52`
- **OPS-M6** — Observability bo'shliqlari: structured log yo'q (plain-text Nest Logger), metrics yo'q, error tracking yo'q. `nestjs-pino` (JSON+req-id) + `@sentry/nestjs` + `/metrics`. (request-ID middleware + health split allaqachon bor — yaxshi.) · `logging.interceptor.ts`
- **OPS-M7** — Hujjatlar kodga zid: README "no test suite yet" (29 unit + 8 e2e bor); ARCHITECTURE "Known gaps" cleanup/RBAC/recovery'ni "yo'q" deb sanaydi (uchalasi mavjud); Models jadvali Deck/Enrollment/Review/AuthToken'ni tashlab ketgan. Bitta hujjat passi. · `README.md:179`, `docs/ARCHITECTURE.md`
- **OPS-M8** — Frontend'da 0 test, extension'da 0 CI. Vitest + store testlar; extension CI job (`tsc --noEmit`/build). · `frontend/package.json`

### 6.3 LOW
- **OPS-L1** — Backend `HEALTHCHECK`/compose healthcheck yo'q (endpointlar bor). `HEALTHCHECK CMD wget .../health` + `condition: service_healthy`.
- **OPS-L2** — Base image faqat tag bilan pinlangan (`node:20-alpine`). Digest bilan pinla.
- **OPS-L3** — GitHub Actions unpinned (`@v4`) + `permissions:` block yo'q. SHA'ga pinla + `permissions: contents: read`.
- **OPS-L4** — Frontend CI job keraksiz serial (`needs: backend`) — committed `openapi.json`ga verifikatsiya qiladi. `needs`ni olib tashla (CI vaqti ~yarim).
- **OPS-L5** — Coverage o'lchanadi lekin enforce qilinmaydi (`coverageThreshold` yo'q). Floor qo'sh.
- **OPS-L6** — Migration-at-boot deploy'ni schema'ga bog'laydi (replikalar poyga; failed migration crash-loop). Alohida migrate step.
- **OPS-L7** — `env_file: .env` backend konteynerga aloqasiz varlarni (POSTGRES_*, WEB_PORT) kiritadi. Explicit `environment:` list.
- **OPS-L8** — `.DS_Store` gitignore qilinmagan (untracked `.DS_Store`, `extension/.DS_Store` bor). `.gitignore`ga qo'sh.
- **OPS-L9** — Env bootstrap 8 e2e specda takrorlangan. Jest `setupFiles`ga ko'chir.
- **OPS-L10** — Frontend nginx master root sifatida (stock `nginx:1.27-alpine`). `nginxinc/nginx-unprivileged`.

### 6.4 Yaxshi holat
Backend Dockerfile: multi-stage, `npm ci`, yaxshi layer tartibi, devDeps prune, `NODE_ENV=production`, non-root `app` user, `tini` · docker-compose: modern (version yo'q), hardcoded parol yo'q (`${...:?}` fail-fast), Postgres healthcheck + `service_healthy` gating · CI bor (build+unit+e2e+openapi-sync backend, type-check+build frontend, analyze+test mobile) · secret gigienasi: `.env` gitignored, JWT secret ≥32 Joi bilan enforce · request-ID propagatsiya · health/readiness split · cleanup cron.

---

## 7. Cross-cutting mavzular (ildiz sabablar)

1. **Sessiya holati yagona manbaga ega emas** (FE-H1/H2, MOB-H1, B-SEC-M1, EXT-H1). Web: `localStorage` vs Pinia desinxron. Mobile: storage tozalanadi, in-memory yo'q. Backend: rotation delete qiladi, reuse-detection uchun soft-revoke kerak. Extension: URL o'zgarsa sessiya tozalanmaydi. **Yagona "auth lifecycle" refaktori** hammasini yopadi.

2. **Client-side race conditions** (FE-M2/M5, MOB-M1/M8, B-LOG-M1/M8). Double-tap/double-submit hamma joyda: quiz submit, review rating, refresh coalescing. In-flight guard + server idempotency pattern.

3. **UTC-only vaqt** (B-LOG-M3). Streak/goal/trend UTC+5 auditoriya uchun noto'g'ri. Timezone-aware bucketing.

4. **Cascade delete ma'lumot yo'qotadi** (B-LOG-H3/M7, B-SEC — admin delete). Soft-delete/SetNull strategiyasi kerak (ROADMAP'da "ataylab qoldirilgan" deb tan olingan — endi ustuvor).

5. **CI real DB'ni sinamaydi** (OPS-H1/H2/M3). Stub-only e2e + build qilinmagan image = migratsiya/schema drift prod'gacha yashirin.

6. **Hujjat-kod drifti** (OPS-M7, FE-L1). Ishlaydigan feature'lar "yo'q" deb, keraksiz kod "in-memory" deb hujjatlangan.

---

## 8. Ustuvor bartaraf qilish yo'l xaritasi

### Sprint 1 — Xavfsizlik & sessiya (1-hafta, eng yuqori ROI)
1. **Auth lifecycle refaktori** (FE-H1+H2, MOB-H1, EXT-H1): web tokenni Pinia xotirasiga, interceptor store'ga chaqirsin; mobile refresh-failure `forceLogout` signal; extension URL o'zgarsa `clearSession`+validatsiya.
2. **Refresh reuse detection** (B-SEC-M1): rotationda soft-revoke + `familyId`, replay = chain revoke.
3. **MOB-H2**: GoRouter bir marta + `refreshListenable`.
4. **B-LOG-H3 tez yamoq**: foreign enrollmentli deck/word/user delete'ni blokla (to'liq soft-delete keyingi sprintда).

### Sprint 2 — Logika to'g'riligi (1-hafta)
5. **B-LOG-H1** test pool `ORDER BY random()`.
6. **B-LOG-H2** progress `submittedAt: { not: null }` filtri.
7. **Race guardlar**: B-LOG-M1 (submit atomik), M8 (review idempotent), FE-M2/M5, MOB-M1.
8. **B-LOG-M3** timezone-aware streak/goal/trend.
9. **B-LOG-M6** SM-2 relearn step + EF jazo yumshatish.

### Sprint 3 — Infra & sifat (1-hafta)
10. **OPS-H1** Prisma CLI/migrate strategiyasi.
11. **OPS-H2** CI'da real Postgres + migrate deploy + e2e smoke.
12. **OPS-M1** ESLint/Prettier + CI gate. **OPS-M2** dependabot + npm audit.
13. **OPS-M6** structured logging (pino) + Sentry.
14. **OPS-M7** README/ARCHITECTURE hujjat passi.

### Sprint 4 — Ma'lumot yaxlitligi & polish
15. **Soft-delete/audit log** (B-LOG-H3/M7 to'liq) — `Review.wordId` SetNull, deck/word soft-delete.
16. **B-LOG-M4** enroll'dan keyin word sync (UserWord back-fill).
17. **FE-M1** dual type system birlashtiruvi.
18. **MOB-M5/M6/M8** quiz submit xato, SRS retry queue, words pagination.
19. Qolgan LOW'lar (index, dead code, .DS_Store, cleanup sweep).

---

## 9. Best-practice fix'lar bo'yicha eslatmalar (research)

- **Refresh token rotation + reuse detection**: OWASP tavsiyasi — har rotationda eski tokenni **saqlab** `revokedAt` belgila, `familyId` bilan bog'la; revoked (yo'q emas) token replay = butun family revoke. Bu davosiz o'g'irlikni aniqlaydigan yagona amaliy usul (stateless JWT'da mumkin emas).
- **Web token saqlash**: OWASP — access tokenni faqat JS xotirasida (memory), refresh tokenni `httpOnly`+`Secure`+`SameSite` cookie'da. Loyiha allaqachon refresh cookie ishlatadi, faqat access tokenni `localStorage`'dan xotiraga ko'chirish kerak — bu XSS exfiltration yuzasini yopadi.
- **SM-2/relearning**: klassik SM-2 q<3 bo'lsa same-session takrorlaydi; Anki relearn step (~10 min) ishlatadi. AGAIN'da EF jazosi Anki'da −0.2 (bu yerdagi −0.8 juda qattiq). Modern alternativa — **FSRS** (Free Spaced Repetition Scheduler), lekin SM-2 tuzatilgan holda MVP uchun yetarli.
- **CI + migratsiya**: 12-factor — migratsiya release fazasida (deploy pipeline job), runtime boot'da emas. CI'da ephemeral Postgres `services:` bilan `migrate deploy` + real e2e smoke drift'ni ushlaydi.
- **Timezone SRS**: user IANA timezone saqla (yoki client offset yubor); "kun" chegarasini mahalliy kalendarda hisobla — SRS ilovalari uchun standart (Anki "next day starts at" sozlamasi).
- **Extension token isolation**: MV3 — access token `chrome.storage.session` + `setAccessLevel('TRUSTED_CONTEXTS')` (memory-only, background-restricted); message handler'da `sender.id === runtime.id` majburiy.

---

*Audit 6 parallel domen-agenti bilan bajarildi; har finding file:line bilan. Eng muhim da'volar (revokedAt dead code, test pool, localStorage token, seed bcrypt) qo'lda tasdiqlandi. Bu hujjat 2026-07-16 holatini aks ettiradi.*

---

## 10. O'zgarishlar jurnali

### Sprint 1 — Xavfsizlik & sessiya (2026-07-16, bajarildi)

Quyidagi HIGH/MEDIUM'lar tuzatildi:

- **B-SEC-M1** ✅ — `RefreshTokensService.rotate` endi eski tokenni delete o'rniga **soft-revoke** qiladi (`revokedAt`); revoked token replay reuse-detection'ni ishga tushiradi (`revokeAllForUser`). `CleanupService` revoked qatorlarni ham tozalaydi. Migration kerak emas (`revokedAt` allaqachon schema'da). Testlar yangilandi.
- **FE-H1 + FE-H2** ✅ — Web access token endi faqat **xotirada** (`api.ts` module-level, `setAccessToken`/`getAccessToken`); `localStorage` token/user olib tashlandi. Interceptor `registerSessionHandlers` orqali Pinia store'ni sinxron tozalaydi/yangilaydi → redirect loop yo'q. `tryRestore` refresh cookie'ga tayanadi.
- **MOB-H1** ✅ — `RefreshInterceptor`ga `onSessionExpired` callback; refresh muvaffaqiyatsiz bo'lsa `AuthNotifier.onSessionExpired()` in-memory holatni tozalaydi → router `/login`ga redirect (lockout yo'q).
- **MOB-H2** ✅ — `routerProvider` endi bir marta quriladi; auth o'zgarishlari `ValueNotifier` + `refreshListenable` orqali redirect'ni qayta baholaydi (GoRouter qayta yaratilmaydi).
- **MOB-M1** ✅ — Refresh coalescing race tuzatildi (`identical` bilan faqat initiator future'ni tozalaydi) — backend reuse-detection bilan endi muhim. **MOB-M3** ✅ — bare refresh Dio timeoutlarni meros oladi.
- **EXT-H1** ✅ — `normalizeApiUrl` URL'ni validatsiya qiladi (https majburiy, localhost bundan mustasno); origin o'zgarsa `setApiUrl` sessiyani tozalaydi; Settings.vue aniq error ko'rsatadi va origin o'zgarganda logout qiladi.
- **B-LOG-H3 (qisman)** ✅ — `DecksService.remove` boshqa userlar enroll bo'lgan deckni o'chirishni **bloklaydi** (`ConflictException`) — jimgina progress yo'qolishini oldini oladi. To'liq soft-delete Sprint 4'da. Admin moderatsiya path'i ataylab tegilmagan.

### Sprint 2 — Logika to'g'riligi (2026-07-16, bajarildi)

Backend correctness + frontend race guardlar:

- **B-LOG-H1** ✅ — `startTest` endi wordId'larni tanlab, Fisher-Yates bilan tasodifiy pool sample qiladi (`ORDER BY`siz eng eski 10 o'rniga). `word.findMany({ id: { in } })` bilan yuklaydi.
- **B-LOG-H2** ✅ — Progress `test` findMany/count/aggregate'ga `submittedAt: { not: null }` — yakunlanmagan/tashlangan testlar totalga va o'rtachaga kirmaydi.
- **B-LOG-M1** ✅ — `submitTest` submit-once guard atomik: tranzaksiya ichida `updateMany({ submittedAt: null })` bilan claim; parallel submit'da yutqazgan count 0 oladi va rad etiladi.
- **B-LOG-M8** ✅ — `reviewWord` endi to'liq tranzaksiya ichida o'qiydi + double-tap dedup oynasi (2s): takroriy review no-op, ikkinchi Review qatori qo'shilmaydi.
- **B-LOG-M6** ✅ — SM-2: AGAIN endi `interval=0` + ~10 min relearn step (ertaga emas); Anki-uslub yumshoq EF jazo (−0.2, avvalgi −0.8 o'rniga); EF faqat muvaffaqiyatda formula bilan yangilanadi.
- **B-LOG-M3** ✅ — Progress/trends **timezone-aware**: `tzOffsetMinutes` query param (default 0=UTC, backwards-compatible); streak/goal/trend mahalliy kalendar kuni bo'yicha bucket qilinadi. `bucketByDay`/progress.service offset-aware; yangi `ProgressQueryDto`.
- **FE-M2** ✅ — TestPage: `nextQuestion` async + loading guard + await/catch, xatoda javob rollback, quiz view'da error + loading button.
- **FE-M5** ✅ — LearnPage: `submitting` guard + rating tugmalar disable + error catch + `setTimeout` unmount'da tozalanadi.

Testlar yangilandi (sm2, tests, learning, decks, cleanup unit) va e2e prisma-stub kengaytirildi (`test.updateMany`, `deckEnrollment.count`, `refreshToken.update`, `submittedAt`/`id.in` filtrlari).

### Test natijasi (Sprint 1+2, 2026-07-16)

Barcha suite yashil:
- Backend unit **226/226**, e2e **82/82**.
- Web `vue-tsc` toza, extension `vue-tsc` toza.
- Mobile `flutter analyze` **0 error**, `flutter test` **83/83**.

Test paytida topilib tuzatilgan: (a) `progress.controller.spec` offset arg; (b) `auth.e2e` lokal stub'ga `refreshToken.update`; (c) **mobile `top_level_cycle`** — `dioProvider`→`authProvider` sikli aniq tip annotatsiya bilan uzildi.

### Sprint 3 — Infra & sifat (2026-07-16, qisman)

Config/infra/docs (kod build/deploy o'zgarishlari, backend unit 226/226 yashil qoldi):

- **OPS-H1** ✅ — `prisma` devDeps'dan **dependencies**'ga ko'chirildi (lockfile yangilandi) → `npm prune --omit=dev` endi CLI'ni saqlaydi; `npx prisma migrate deploy` boot'da lokal binardan ishlaydi (registry fetch yo'q, offline). Dockerfile'ga `HEALTHCHECK /health` (OPS-L1) + izohlar.
- **OPS-H2** ✅ — CI'ga alohida `migrations` job: real Postgres 16 service + `prisma migrate deploy` + `migrate status` (11 migratsiyani toza DB'da tekshiradi).
- **OPS-M2** ✅ — `.github/dependabot.yml` (npm root/frontend/extension, pub, github-actions) + CI'da `npm audit --audit-level=high` (advisory, continue-on-error).
- **OPS-M4** ✅ — `.dockerignore` kengaytirildi (`**/node_modules`, subprojectlar, test/docs/coverage, `**/.env*`, `.DS_Store`, `*.tsbuildinfo`, openapi.json).
- **OPS-M5** ✅ — docker-compose Postgres `127.0.0.1`'ga bog'landi; `.env.example`'da prod-parol ogohlantirishi.
- **OPS-M7** ✅ — README + ARCHITECTURE kodga moslashtirildi: test suite mavjud (226 unit + 82 e2e), RBAC/cleanup/recovery bajarilgan, Models jadvali (Deck/DeckEnrollment/Review/AuthToken + SM-2/role/submittedAt ustunlar), rotation soft-revoke, mobil `flutter_secure_storage`, env jadvali to'ldirildi, extension qo'shildi, "Known gaps" yangilandi.
- **OPS-L3** ✅ — CI'ga `permissions: contents: read`. **OPS-L4** ✅ — frontend job `needs: backend`'dan ajratildi (parallel). **OPS-L8** ✅ — `.gitignore`'ga `.DS_Store`.

- **OPS-M1** ✅ — ESLint (typescript-eslint 7) + Prettier o'rnatildi: `.eslintrc.js`, `.prettierrc`, `lint`/`lint:fix`/`format`/`format:check` scriptlar. Kod juda toza edi — atigi 5 muammo (2 error `no-var-requires` test'da, 3 dead-var), hammasi tuzatildi. `prettier --write` 78 faylni bir marta formatladi (cosmetik), CI'ga `lint` + `format:check` gate qo'shildi. Test'lar keyin ham 226/82 yashil; openapi.json + frontend api.ts regeneratsiya qilindi (tzOffsetMinutes paramlar).

- **OPS-M6 (qisman)** ✅ — **pino structured logging** (`nestjs-pino`): `LoggerModule.forRootAsync` + `buildLoggerParams` (dev'da pretty, prod/test'da JSON, test'da silent). Har so'rov `req.id` bilan avtomatik loglanadi; `genReqId` upstream `x-request-id`ni saqlaydi yoki uuid yaratadi va response header'ga qaytaradi (eski `RequestIdMiddleware` + `LoggingInterceptor` olib tashlandi). Lean serializer (header/body loglanmaydi) + redact + `/health*` chiqarib tashlangan + `customLogLevel` (5xx→error, 4xx→warn). Runtime tasdiqlandi (JSON + reqId chiqadi). **Sentry error tracking hali yo'q — DSN kerak.**

- **OPS-M1 (frontend)** ✅ — Frontend ESLint (Vue 3 + TS): `eslint-plugin-vue` (vue3-essential) + typescript-eslint 7 + prettier, `.eslintrc.cjs` + `.prettierrc` + `.prettierignore` (generated `api.ts` chiqarilgan). Kod toza edi — **0 lint muammo**; `prettier --write` 40 faylni formatladi (cosmetik). CI frontend job'iga `lint` + `format:check` gate qo'shildi. Type-check + build keyin ham yashil.

**Ataylab qoldirildi (tashqi xizmat / keyingi):**
- **Sentry** (`@sentry/nestjs`) — DSN foydalanuvchidan kerak.
- Extension CI job (OPS-M8) — `tsc --noEmit`/build gate.
- **OPS-M3** (docker build CI job), **OPS-L2** (image digest pin), **OPS-L10** (nginx unprivileged), real-DB e2e — keyingi.

### Sprint 4 — Ma'lumot yaxlitligi & polish (2026-07-17, boshlandi)

- **MOB-H3** ✅ — Mobil `AppConstants.baseUrl` endi runtime getter: `--dart-define=BASE_URL` ustun; aks holda **release'da prod HTTPS** (`https://englishflow.mindcore.uz/api`), debug'da emulator URL. Release endi cleartext dev URL bilan jimgina chiqmaydi. `flutter analyze` toza, mobil test 83/83.
- **B-LOG-M7** ✅ — `Review.wordId` endi **nullable + `onDelete: SetNull`** (avval Cascade edi). So'z o'chirilsa append-only review logi **saqlanadi** (streak/trend retroaktiv kichrmaydi). Migration `20260717000000_review_word_set_null` real Postgres 16'da qo'llanib tekshirildi; SetNull xatti-harakati end-to-end tasdiqlandi (so'z o'chirildi → review `wordId=null` bilan omon qoldi). Backend build/lint/226-unit/82-e2e yashil.

**Soft-delete — qolgan katta qism:** to'liq app-bo'ylab soft-delete (User/Deck/Word'ga `deletedAt` + barcha querylarga filtr + restore) hali yo'q — bu keng refactor (ROADMAP'da ataylab alohida PR deb belgilangan). Deck o'chirishdagi data-loss allaqachon **bloklangan** (Sprint 1 `DecksService.remove` guard), so'z o'chirishdagi tarix yo'qolishi endi **SetNull bilan yopildi** — eng katta ikki data-loss vektori zararsizlantirildi. `deletedAt`-asosli to'liq soft-delete (o'chirilganni qayta tiklash imkoni) keyingi bosqich.

**Sprint 4 davomi (2026-07-17):**

- **B-LOG-M4** ✅ — Deck'ka so'z qo'shilganda enrolled userlar uchun UserWord **back-fill** (`backfillEnrolledUserWords` helper, skipDuplicates). `addWords` + `adminAddWords` + admin `importWords` (transaction'ga o'raldi) uchalasiga qo'llandi. Endi enroll'dan keyin qo'shilgan so'zlar userlarga yetadi, deck progress "100% learned" yolg'on ko'rsatmaydi. Testlar qo'shildi (decks +2, admin +2), e2e stub `deckEnrollment.findMany` scalar deckId/select userId qo'llab-quvvatlaydi. Backend 230 unit + 82 e2e yashil.
- **MOB-M5** ✅ — `submitQuiz` endi `int?` (null=fail); quiz submit xatosida soxta 0-ball emas, SnackBar + retry.
- **MOB-M6** ✅ — SRS review fire-and-forget endi xatoni **hisoblaydi** (`failedReviews`); session summary'da "N review saqlanmadi" ogohlantirishi (avval jimgina yo'qolardi).
- **MOB-M8** ✅ — Words pagination ulandi: `WordsState` (page/hasMore/isLoadingMore), provider `loadMore`, ekranda scroll-to-load + footer spinner. >100 so'zli user hammani ko'radi. Mobil test 85/85 (+2 loadMore).
- **FE-M4** ✅ — Catch-all `/:pathMatch(.*)*` route + `NotFoundPage` (avval noto'g'ri URL bo'sh sahifa edi).
- **FE-M3** ✅ — Unhandled promise rejectionlar yopildi: LoginPage, RegisterPage, OnboardingPage `skip`, WordsPage `handleAdd`/`handleUpdate`/`handleDelete` (xato store.error orqali ko'rsatiladi, muvaffaqiyatda form reset). Frontend lint/format/type-check/build yashil.

**Sprint 4 — LOW/MEDIUM tozalash batch (2026-07-17):**

Backend: email normalizatsiya (B-SEC-L3), reset-token invalidatsiya (B-SEC-L6), helmet security headers (B-SEC-L5), JWT placeholder reject (B-SEC-L7), seed demo prod-guard (B-SEC-L4), dead-code `getRandomWordsForUser` olib tashlandi (B-LOG-L1), `selectedAnswer` MaxLength (B-LOG-L3), composite indexlar +migration (B-LOG-L7), admin import case-insensitive dedup (B-LOG-M2).
Extension: message sender validation (EXT-M2), `encodeURIComponent(deckId)` (EXT-L1), `JSON.parse` guard (EXT-L2), `.gitignore` `.env` (EXT-L8).
Mobil: permissive email validator (MOB-L4).

### Reviewer pass (2026-07-17) — 3 parallel code-reviewer agent + fixlar

- **HIGH (regressiya, tuzatildi):** `refresh-tokens.service.rotate` soft-revoke bilan concurrency'da single-use kafolatini yo'qotgan edi (`update` PK bo'yicha har doim muvaffaqiyat). **Atomik conditional claim** (`updateMany({ revokedAt: null })`, count 0 → reuse) bilan tuzatildi. Spec + e2e stublar `updateMany` bilan yangilandi.
- **Warning (tuzatildi):** mobil `loadMore` filter o'zgarganda stale sahifani append qilardi — filter-capture guard + `loadWords`da `isLoadingMore` reset.
- **Nit (tuzatildi):** quiz retry oxirgi javobni takror qo'shardi (backend Map dedup tufayli zararsiz edi) — submitdan oldin `answers` persist qilinmaydi; TestPage `handleStart` catch; back-fill cartesian `createManyAndReturn` bilan faqat yangi so'z×enrollee delta'ga cheklandi (B-LOG back-fill perf).
- **Tasdiqlangan to'g'ri (reviewerlar):** token single-source-of-truth (web), reuse-detection reachability, email normalize izchilligi, reset-token invalidation, tz math, SM-2, migratsiyalar, pino/helmet, extension sender/URL validation, mobil refresh coalescing/router.

Yakuniy: backend **232 unit + 82 e2e**, mobil **86 test** + 0 analyze error, web/extension lint+type-check+build toza.

### A tier — katta refactorlar (2026-07-17)

- **A1 / FE-M1** ✅ — Web dual-type tizimi **birlashtirildi**. Generatsiya `types/api.ts` va `api-helpers.ts` (buggy nullable codegen, hech kim import qilmaydi) + `generate:types` script + `openapi-typescript` devDep **olib tashlandi**; qo'lda `types/index.ts` yagona manba (30 fayl uni ishlatadi). CI frontend "verify generated types" qadami, eslint/prettier ignore'lar, README/ARCHITECTURE yangilandi. Type-check/build/lint yashil.
- **A2 / B-LOG-H3 (to'liq)** ✅ — **Deck soft-delete**: `Deck.deletedAt` + migration; ~18 deck query'ga `deletedAt: null` filtri (barcha `findUnique`→`findFirst`); `remove`/`adminRemove` endi arxivlaydi (hard-delete + block guard o'rniga). Endi egasi ulashilgan deckni o'chira oladi — enrollee'lar UserWord/Review progressi **saqlanadi** (real Postgres'da tasdiqlandi: deck arxivlandi, so'z+UserWord omon qoldi). Unit spec (232) + e2e (82) yangilandi.

### B tier — tashqi resurs / qurilma (2026-07-17)

- **B1 / OPS-M6 Sentry** ✅ — `@sentry/node` **DSN-ixtiyoriy** integratsiya: `SENTRY_DSN` o'rnatilmasa **to'liq no-op** (ilova bir xil ishlaydi), o'rnatilsa faol. `initSentry` main.ts'da erta chaqiriladi; `AllExceptionsFilter` 5xx/noma'lum xatolarni `captureException` bilan yuboradi (requestId/method/path context). `.env.example` + README yangilandi. Build + 232 unit + 82 e2e yashil (no-op yo'l tekshirildi). **Faollashtirish uchun faqat `SENTRY_DSN` qo'ying.**

**B2/B3 — brauzer/qurilma sinovi kerak (bloklangan):** extension permission o'zgarishlari (EXT-M1 content-script scope, M3 `storage.session`, M4 `host_permissions` — Chrome/Firefox'da UX sinash), mobil cert-pinning (MOB-L3 — server SPKI hash + qurilma), android scaffold (MOB-L6). Bu kodlarni yozsam bo'ladi, lekin bu muhitda **tasdiqlab bo'lmaydi** (brauzer/qurilma yo'q) — "verify before done" buziladi.

**Qolgan C/D tier LOW/MEDIUM:** progress perf (B-LOG-M5), forgot-password timing (B-SEC-M2), abandoned test cleanup (B-LOG-L6), mobil M2/M4/M7, web L3/L4/L6, extension L3/L4, va boshqa trivial nitlar.
