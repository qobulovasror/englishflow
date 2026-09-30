# EnglishFlow tizimini rivojlantirish rejasi

Ushbu hujjat tahlilda belgilangan ishlarni bosqichma-bosqich bajarish ro‘yxatidir. Har bir bosqich tekshiriladi, mustaqil taqrizchiga ko‘rsatiladi, zarur tuzatishlar kiritiladi va keyin saqlanadi.

## Ish tartibi

- Auditdagi ma’lumotlarni o‘zgarmas haqiqat deb qabul qilmaymiz; avval amaldagi kod bilan solishtiramiz.
- Har bir o‘zgarishni tegishli tekshiruvlardan o‘tkazamiz va topilgan xatolarni tuzatamiz.
- Har bir bosqichni alohida ko‘rib chiqish oson bo‘ladigan hajmda saqlaymiz va mustaqil taqrizchiga tekshirtiramiz.
- Ma’lumotlarga ta’sir qiladigan o‘zgarishlar uchun ko‘chirish hamda orqaga qaytarish tartibini belgilaymiz.
- Ishga aloqasi bo‘lmagan foydalanuvchi o‘zgarishlarini saqlaymiz va bu ishlarning saqlangan nusxalariga qo‘shmaymiz.

## 0-bosqich — Boshlang‘ich holat va reja

**Holat: yakunlandi**

- [x] Audit va yo‘l xaritasidagi muhim ma’lumotlar kod bilan solishtirildi.
- [x] Ushbu hujjat asosiy ishlar ro‘yxatiga aylandi; avvaldan mavjud `docs/ANALYSIS.md` fayli o‘zgartirilmadi.
- [x] Dastlabki tekshiruv xulosalari qayd etildi.

### Dastlabki tekshiruv xulosalari

- Kodda refresh tokenni qayta ishlatishni aniqlash, mobil sinov yuborilmasa javoblarni qayta urinishgacha xotirada saqlash, sessiya tugaganda mobil kirish holatini tozalash va mobil yo‘naltirgichni qayta yaratmaslik imkoniyatlari mavjud. Bularni qaytadan yozmaymiz; tegishli qismlarni o‘zgartirganda tekshiramiz.
- Elektron xat jo‘natishni SMTP sozlamalari bilan yoqish mumkin. Ishlab turgan muhitdagi sozlama va yetkazilishni kuzatish hali tekshirilishi kerak.
- Tasdiqlangan kamchiliklar: 20 ta yangi so‘zlik cheklov bitta `/learning/daily` javobiga taalluqli; umumiy to‘plamdan so‘z o‘chirish uning o‘zini va bog‘liq o‘rganish tarixini o‘chirishi mumkin; mobil ilova yopilsa faol sinov javoblari xotiradan yo‘qoladi.
- Audit va yo‘l xaritasida eski yoki zid ma’lumotlar bor. Har bir mavzu bo‘yicha ish boshlaganda amaldagi kodni tekshirib, hujjatlardagi holatni yangilaymiz.
- Ish boshida `docs/ANALYSIS.md` avvaldan mavjud va git tomonidan kuzatilmaydigan fayl edi. Uni o‘zgartirmaymiz va bu ishlarning saqlangan nusxalariga qo‘shmaymiz.

## 1-bosqich — Ishonchlilik va ma’lumotlar yaxlitligi

**Holat: yakunlandi**

- [x] Mobil sinov javoblari tarmoq yoki server xatosida saqlanishi, xato soxta 0 ball bo‘lib ko‘rinmasligi tekshirildi; test holati qurilma xotirasida saqlanib tiklanadi.
- [x] Ilova yopilganda faol sinovni davom ettirish qo‘shildi; buzilgan saqlangan holat aniqlansa yangi sinov boshlanadi.
- [x] Web va mobil ilovada sessiya almashishi hamda chiqishda saqlangan holat tozalanishi amaldagi kod bilan tekshirildi.
- [x] Takror yoki bir vaqtda kelgan sinov yuborishlari uchun atomar himoya va yuborilgan natijani qayta berish qo‘shildi; SM-2 ko‘rib chiqish oqimi ham tekshirildi.
- [x] To‘plamdan so‘z ajratilganda, shuningdek tarixli so‘z o‘chirilganda, o‘rganuvchilarning progressi va tarixi saqlanadi. Tekshiruv hamda o‘chirish Serializable tranzaksiyada bajariladi.
- [x] Elektron pochta yagona shaklga keltirilishi va tiklash tokenining eski havolalarni bekor qilishi tekshirildi; hisobni aniqlatmaydigan javob va xatolarni jurnallash qo‘shildi.
- [x] Ishlab turgan muhit uchun SMTP talablarini konfiguratsiyada majburiy qilish va sozlama namunasi yangilandi. Haqiqiy serverdagi yetkazilish sinovi joylashtirish bosqichida bajariladi.
- [x] Muhim real PostgreSQL oqimlari uchun integratsion test va CI vazifasi qo‘shildi. Mahalliy bazaga ulanish bo‘lmagani sabab bu testlar CI’da bajariladi.
- [x] Kengaytma manbasi ko‘rib chiqildi: ruxsatlar cheklangan, tokenlar faqat background storage’da, API manzili o‘zgarsa sessiya tozalanadi, HTTP faqat localhost’da ruxsat etiladi.

## 2-bosqich — Kundalik o‘rganish va boshlang‘ich sozlash

**Holat: yakunlandi**

- [x] Onboarding va profilda kunlik takrorlash maqsadi hamda kunlik yangi so‘z sonini tanlash qo‘shildi; qiymatlar foydalanuvchi sozlamalarida saqlanadi.
- [x] Yangi so‘z limiti barcha so‘rovlar uchun, ilova yuborgan mahalliy vaqt mintaqasi bo‘yicha tranzaksiyada hisoblanadi. Ilova qayta ochilganda hali baholanmagan kartalar davom ettiriladi.
- [x] Web va mobil bosh sahifada bugungi takrorlashlar, yangi so‘zlar, taxminiy davomiylik va bitta boshlash tugmasi ko‘rsatiladi.
- [x] To‘rtta baholash tugmasiga eslab qolish darajasini tushuntiruvchi yozuv va yordamchi yorliq qo‘shildi; darsni qayta tekshirish va xatoda kartani saqlab qolish oqimi bor.
- [x] Ko‘p kechikkan takrorlashlar 100 tadan beriladi; qolganini alohida so‘rab davom ettirish mumkin. Yangi kartalar 50 tadan oshmaydi, tugallanmaganlari keyingi sessiyaga qoladi.
- [x] Kunlik yangi so‘z soni va `UserWord.introducedAt` uchun ma’lumotlar bazasi migratsiyasi, API hujjati, unit, E2E hamda CI’da ishlaydigan PostgreSQL integratsion sinovi qo‘shildi.

**Eslatma:** vaqt zonasi qurilmadan yuboriladi va bu limit o‘rganish sur’atini boshqarish uchun mo‘ljallangan. Uni xavfsizlik yoki to‘lov cheklovi sifatida ishlatmaslik kerak.

## 3-bosqich — Kuchliroq mashqlar va so‘z mazmuni

**Holat: taqriz yakunlandi; saqlanmoqda**

- [x] Inglizchadan ona tiliga, teskari yo‘nalishda eslash, yozib javob berish, gapni to‘ldirish va tinglab tanish mashqlarini web hamda mobil ilovada tanlash qo‘shildi.
- [x] So‘zlar talaffuz yozuvi, so‘z turkumi, birikmalar, misol gap va audio bilan boyitildi; yangi maydonlar shaxsiy so‘z, to‘plam, CSV/JSON importi va administrator tahririda ishlaydi.
- [x] Qiyin so‘zlar hamda oldingi sinovlarda noto‘g‘ri javob berilgan so‘zlar uchun maqsadli mashq qo‘shildi.
- [x] Administrator so‘zlarni tahrirlashi, kontent maydonlarini tekshirishi va importdan oldin faylni ko‘rib chiqishi mumkin.
- [x] Mavjud SM-2 jadvallari va algoritmi xavfsiz saqlandi. FSRS sinovi natijalarni o‘lchashga tayanadi, shuning uchun taqqoslash 7-bosqichda bazaviy ko‘rsatkichlar yig‘ilgach bajariladi; hozirgi o‘rganuvchilar jadvali migratsiya qilinmaydi.

## 4-bosqich — Mobil ilovada internetsiz ishlash va brauzer kengaytmasi

**Holat: taqrizdan o‘tdi; saqlanmoqda**

- [x] Hive’dagi mahalliy kesh va javoblar navbati server so‘rovlaridan ajratildi; kesh va navbatning kaliti foydalanuvchi identifikatoriga bog‘landi.
- [x] Takrorlash natijalari UUID so‘rov identifikatori bilan saqlanadi. API bir xil identifikatorni qayta olganda SM-2 va jurnalni ikkinchi marta o‘zgartirmaydi; migratsiya hamda unit va E2E tekshiruvlari qo‘shildi.
- [x] Internetsiz holatda kunlik kartalarni Hive keshidan davom ettirish, yuborilmagan javoblarni navbatga qo‘yish va navbatdagilar sonini ko‘rsatish qo‘shildi; internet qaytgach darsni ochishda yuborish qayta uriniladi.
- [x] Kengaytma auditida tokenlar fon servisidagi storage bilan cheklangani, URL manzili HTTPS/localhost bilan tasdiqlanishi, server almashganda sessiya o‘chirilishi va tanlov faqat faol sahifadan olinishi tasdiqlandi.
- [x] Saqlash panelidagi tarjimani foydalanuvchi tahrirlay oladi va saqlagach bugungi takrorlashni ochish tugmasi bor.

## 5-bosqich — Foydalanuvchini qaytishga undash

**Holat: rejalashtirilgan**

- [ ] Foydalanuvchi tanlagan vaqtda ishlaydigan, dam olish kunlari, tezlik chegarasi va oson o‘chirish sozlamasi bor eslatmalarni qo‘shish.
- [ ] Tanaffusni jazolamaydigan, haqiqiy o‘rganish yutug‘iga asoslangan nishon va rag‘batlar qo‘shish.
- [ ] Ommaviy reytingdan oldin do‘st bilan shaxsiy bellashuv imkonini baholash; ijtimoiy imkoniyatlar ixtiyoriy bo‘lishi kerak.
- [ ] Dastlabki sozlashni tugatish, birinchi darsni yakunlash, 7/30 kun ichida qaytish, darsni tashlab ketish va eslatmalarni o‘chirish ko‘rsatkichlarini yig‘ish.
- [ ] Imkoniyatlarni ilovada o‘tkazilgan vaqt bilan emas, o‘rganish natijasi va qaytish ko‘rsatkichlari bilan cheklangan sinovda baholash.

## 6-bosqich — Ma’lumot ko‘chirish va to‘plam ulashish

**Holat: rejalashtirilgan**

- [ ] CSV fayllaridan olish/chiqarish, oldindan ko‘rish, takroriy va xato qatorlarni tuzatish imkonini qo‘shish.
- [ ] Anki bilan mos ma’lumot olib kirish/chiqarishni baholab, qo‘llab-quvvatlanadigan maydonlarni hujjatlashtirish.
- [ ] Egalik, ko‘rinish va nazorat qoidalari aniq bo‘lgan xavfsiz to‘plam ulashish va nusxalashni qo‘shish.
- [ ] CEFR darajasi, mavzu, o‘rganish maqsadi va mazmun sifati bo‘yicha qidirish hamda saralashni qo‘shish.
- [ ] O‘qituvchi va sinf boshqaruvi imkoniyatlarini talab tasdiqlangandan keyin alohida baholash.

## 7-bosqich — Ishga tushirishga tayyorgarlik va tizim parvarishi

**Holat: rejalashtirilgan**

- [ ] Yaratilgan API va dastur turlarini muvofiqlashtirish, qo‘lda takrorlangan turlarni xavfsiz kamaytirish.
- [ ] Kirish, o‘rganish va xato holatlari uchun muhim web saqlagichlari hamda tarkibiy qismlariga tekshiruv qo‘shish.
- [ ] API xatolari, xat yetkazish, sinxronlash navbati va ma’lumotlar bazasi holatini kuzatish.
- [ ] SM-2 bo‘yicha boshlang‘ich eslab qolish natijalarini o‘lchash; yetarli ma’lumot to‘plangach FSRSni kichik guruhda alohida taqqoslash. Har ikki algoritm uchun jadvalni alohida saqlab, sinov guruhini avvalgi jadvalga xavfsiz qaytarish yo‘lini belgilash.
- [ ] README, arxitektura, audit va yangilanish qaydlarini amalda ishlayotgan imkoniyatlarga moslab yangilash.
