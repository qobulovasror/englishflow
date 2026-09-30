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

**Holat: rejalashtirilgan**

- [ ] Mobil sinov javoblari tarmoq yoki server xatosida saqlanishi, xato soxta 0 ball bo‘lib ko‘rinmasligini tekshirish.
- [ ] Ilova yopilganda sinovni davom ettirishni baholash. Davom ettirish imkoni bo‘lmasa, tushunarli tiklash yoki yangidan boshlash yo‘lini berish.
- [ ] Web va mobil ilovada chiqish, sessiya tugashi yoki boshqa foydalanuvchi kirishida avvalgi foydalanuvchining saqlangan holati tozalanishini tekshirish.
- [ ] Takror yuborilgan yoki bir vaqtda kelgan takrorlash va sinov so‘rovlari ikki marta hisoblanmasligini tekshirish.
- [ ] Umumiy to‘plam yoki so‘z o‘chirilganda boshqa foydalanuvchilarning o‘rganish tarixi saqlanishini ta’minlash; ajratish, yashirish va o‘chirish qoidalarini belgilash.
- [ ] Elektron pochta manzilini yagona shaklga keltirish, parol tiklashda hisob mavjudligini oshkor qilmaslik, avvalgi tiklash havolalarini bekor qilish va maxfiy kalitlarni tekshirish.
- [ ] Ishlab turgan muhitda SMTP sozlamalari va xat yetkazish xatolarini kuzatishni tekshirish.
- [ ] Ma’lumot ko‘chishi, takrorlash, sinov yuborish, to‘plamga qo‘shilish va o‘chirishning muhim oqimlariga haqiqiy PostgreSQL bilan tekshiruv qo‘shish.
- [ ] Kengaytmaning ruxsatlari, API manzili almashishi va token saqlashini amaldagi brauzerlarda tekshirish.

## 2-bosqich — Kundalik o‘rganish va boshlang‘ich sozlash

**Holat: rejalashtirilgan**

- [ ] Dastlabki sozlash hamda profilda o‘rganish maqsadi va kunlik vaqt/yangi so‘z miqdorini tanlash imkonini qo‘shish.
- [ ] Kunlik yangi so‘z chegarasini barcha so‘rovlar bo‘yicha va foydalanuvchining mahalliy kuni asosida hisoblash.
- [ ] Bosh sahifada bugun takrorlanadigan so‘zlar, yangi so‘zlar, taxminiy vaqt va bitta aniq boshlash tugmasini ko‘rsatish.
- [ ] To‘rtta baholash tugmasining ma’nosini tushuntirish; dars jarayoni, yakun, xato va qayta urinish holatlarini aniq ko‘rsatish.
- [ ] Ko‘p kechikkan takrorlashlarni qismlarga bo‘lib bajarish imkonini berish va tugallanmagan ishni tugallangan deb ko‘rsatmaslik.

## 3-bosqich — Kuchliroq mashqlar va so‘z mazmuni

**Holat: rejalashtirilgan**

- [ ] Inglizchadan ona tiliga, teskari yo‘nalishda eslash, yozib javob berish, gapni to‘ldirish va tinglab tanish mashqlarini tanlov sifatida qo‘shish.
- [ ] So‘zlarni talaffuz yozuvi, so‘z turkumi, birikmalar, misol gap va tekshirilgan tarjima bilan boyitish.
- [ ] Qiyin so‘zlar va sinovda noto‘g‘ri javob berilgan so‘zlarni maqsadli takrorlashga taklif qilish.
- [ ] Hozirgi SM-2 natijalarini o‘lchagandan keyin FSRS usulini sinash; avvalgi jadvalni saqlash va ortga qaytarish yo‘lini tayyorlash.
- [ ] Administrator boshqaradigan so‘zlar uchun tahrirlash va sifat nazoratini qo‘shish.

## 4-bosqich — Mobil ilovada internetsiz ishlash va brauzer kengaytmasi

**Holat: rejalashtirilgan**

- [ ] Mobil ma’lumot saqlash va takrorlash hodisalarini takrorlamasdan sinxronlash usulini loyihalash.
- [ ] Internetsiz takrorlash, keyin yuborish navbati, ziddiyatlarni hal qilish va sinxronlash holatini ko‘rsatishni qo‘shish.
- [ ] Kengaytma tokenlarini ajratish, sayt ruxsatlari, API manzilini tekshirish va faqat kerakli sahifada ishga tushirishni ko‘rib chiqish.
- [ ] So‘z saqlanganini tasdiqlash, tarjimani tuzatish va kengaytma ichidan takrorlashni yaxshilash.

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
- [ ] Zaxira nusxa, tiklash, ma’lumotlar bazasi o‘zgarishini ortga qaytarish, ma’lumotni o‘chirish so‘rovlari va ishlab turgan muhitga joylashni tekshirish.
- [ ] README, arxitektura, audit va yangilanish qaydlarini amalda ishlayotgan imkoniyatlarga moslab yangilash.
