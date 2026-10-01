# Nilufar uchun tug'ilgan kun tabrigi

Nilufarning 47 yoshiga atalgan, telefon va kompyuter uchun moslashtirilgan 3D sayohat.

## Ishga tushirish

```bash
npm install
npm run dev
```

Brauzerda terminal ko'rsatgan manzilni oching.

## Tayyorlash

```bash
npm run build
npm run preview
```

Tayyor fayllar `dist` jildida paydo bo'ladi.

## Sayt manzili

Hozirgi sayt VPS serverida ishlaydi:

http://194.147.90.153:8747/

Server ildizidan ishlaydigan nusxani tayyorlash:

```bash
npm run build -- --base ./
```

`dist` ichidagi fayllar `/var/www/nilufar47` jildiga joylashtiriladi. GitHub Pages uchun odatiy yig'ishdagi `/HolyFakeprojectsyte/` yo'li saqlangan; Pages nashri ombor administratorining sozlashini talab qiladi.
