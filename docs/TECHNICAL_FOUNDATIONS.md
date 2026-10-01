# O‘zgarishlarning asoslari va joriy etilishi

Bu hujjat EnglishFlow’dagi so‘nggi imkoniyatlar qaysi amaliy g‘oyalarga tayanganini va ular tizimda qanday ishlashini tushuntiradi. Tashqi manbalar dizayn yo‘nalishini beradi; mahsulotdagi aniq qoidalar esa ilovaning mavjud arxitekturasi va foydalanuvchi oqimlariga moslab tanlangan.

## 1. Eslab qolish va takrorlash jadvali

**Asosiy g‘oya:** so‘zni vaqt oralig‘i bilan qayta eslash, javobni baholash va keyingi takrorlash vaqtini shu bahoga moslash.

**Joriy etilishi:** EnglishFlow’dagi mavjud SM-2 mexanizmi saqlangan. Takrorlash ekranidagi Again/Hard/Good/Easy javobi navbatdagi intervalni hisoblashga uzatiladi. Bugungi reja muddati kelgan kartalarni ko‘rsatadi. Testlar esa so‘zni eslashning turli yo‘llarini taklif qiladi. Anki hujjatlarida ham takrorlash javob natijasidan keyingi intervalni belgilash uchun foydalanishi va FSRS alohida rejalashtirish usuli ekani bayon qilingan: [Anki — Background](https://docs.ankiweb.net/background.html), [Deck options](https://docs.ankiweb.net/deck-options.html).

**Chegara:** FSRS’ga o‘tish bu hujjatlashtirilgan ishlarning bir qismi emas; amaldagi jadval SM-2.

## 2. Kunlik maqsad va shaxsiy ritm

**Asosiy g‘oya:** foydalanuvchiga bugun nimani bajarish kerakligini tushunarli ko‘rsatish va kunlik yuklamani boshqarish.

**Joriy etilishi:** bosh sahifa muddati kelgan takrorlashlar, yangi so‘zlar rejasi, taxminiy vaqt va maqsad bajarilishini jamlaydi. Shu ko‘rsatkichlar foydalanuvchini to‘g‘ridan-to‘g‘ri dars yoki deckka olib boradi. Taraqqiyot va yutuqlar o‘qish natijasini ko‘rsatadi; eslatmalarni foydalanuvchi o‘zi sozlaydi.

## 3. Offline ishlash va ma’lumotni sinxronlash

**Asosiy g‘oya:** internet vaqtincha bo‘lmaganda o‘qishni uzmaslik, lekin yakuniy jadval va natijani serverda izchil saqlash. Android’ning offline-first tavsiyasi mahalliy va tarmoq manbalarini, offline yozuvlar navbatini, sinxronlashni va ma’lumotlar to‘qnashuvini alohida ko‘rib chiqadi: [Android Developers — Offline-first data layer](https://developer.android.com/topic/architecture/data-layer/offline-first?hl=en).

**Joriy etilishi:** mobil ilova ko‘rilgan ma’lumotlarni mahalliy keshlaydi va internet yo‘q paytda javoblarni foydalanuvchiga tegishli navbatda ushlab turadi. Sinxronlash urinishida so‘rov identifikatori takroriy yuborishdan keladigan dublikatni oldini olishga xizmat qiladi. Server qabul qilganidan keyin navbatdagi javob o‘chiriladi; xato javoblar foydalanuvchiga ko‘rsatiladi.

**Chegara:** mahalliy navbat internet uzilishi paytida bajarilgan javoblarni vaqtincha saqlaydi; server jadvalining doimiy manbasi bo‘lib qoladi.

## 4. Import/eksportda moslik va ma’lumot tekshiruvi

**Asosiy g‘oya:** foydalanuvchining so‘zlar to‘plamini boshqa vositalardan olib kirish va kerak bo‘lsa qayta olib chiqish.

**Joriy etilishi:** Anki matn importida ishlatiladigan ajratgich va ustun sarlavhalariga mos TSV shakli qo‘llanadi. Importdan oldin ko‘rib chiqish, noto‘g‘ri qatorlarni ajratish, takroriy so‘zlarni tekshirish va hajm/qator cheklovi qo‘llanadi. CSV eksportida jadval dasturlarida formula sifatida talqin qilinishi mumkin bo‘lgan qiymatlar himoyalanadi. Anki matn fayllarida ustunlarni sarlavha bilan belgilash va vergul, nuqtali vergul yoki tab ajratgichidan foydalanish mumkin: [Anki — Text files](https://docs.ankiweb.net/importing/text-files.html).

**Chegara:** bu matnli format import/eksporti; Anki’ning media fayllari yoki `.apkg` to‘plami bilan to‘liq moslikni anglatmaydi.

## 5. Kirish ma’lumotlarini himoyalash

**Asosiy g‘oya:** sessiya tokenlarini JavaScript o‘qiy oladigan doimiy brauzer omborida saqlamaslik.

**Joriy etilishi:** web mijoz access tokenni xotirada saqlaydi, sessiyani yangilash esa HTTP-only cookie orqali bajariladi. Shu sabab sahifa skriptlari refresh tokenni to‘g‘ridan-to‘g‘ri o‘qiy olmaydi. OWASP sessiya va HTML5 xavfsizlik qo‘llanmalari tokenlarni `localStorage`/`sessionStorage`da saqlamaslikni tavsiya qiladi: [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## 6. Decklarni topish va shaxsiylashtirish

**Asosiy g‘oya:** tayyor materialni topish oson bo‘lsin, nusxa olgandan keyin esa foydalanuvchi uni o‘z ehtiyojiga moslasin.

**Joriy etilishi:** kutubxona qidiruv, CEFR, mavzu va maqsad filtrlarini hamda bir nechta saralash usulini beradi. Ruxsat etilgan ochiq/tizim decki tranzaksiya ichida shaxsiy nusxaga aylantiriladi. Egasi bo‘lmagan deckni o‘zgartira olmaydi; nusxa esa foydalanuvchining decki bo‘ladi. Admin kurator bahosi va umumiy ko‘rsatkichlarni boshqaradi.

## 7. CI va test ma’lumotining ishonchliligi

**Asosiy g‘oya:** integratsiya testi haqiqiy PostgreSQL cheklovlarini tekshirishi, fixture’lar esa bir testdan ikkinchisiga dublikat qoldirmasligi kerak.

**Joriy etilishi:** hisobni o‘chirish testi o‘zining learner/word juftligi uchun avvalgi review tarixini tozalaydi va `(userId, wordId)` yagona kaliti bo‘yicha progress qatorini qayta ishlatadi. Bu umumiy fixture’da `UserWord` qatorining takroran yaratilishidan keladigan unique constraint xatosini bartaraf etadi. `npm run test:db` PostgreSQL integratsiya testlarini ishga tushiradi; migratsiyalar CI’da PostgreSQL 16’da qo‘llanadi.
