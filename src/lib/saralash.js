// Ro'yxatlarni (arizalar, talabalar) guruh nomi bo'yicha alifbo tartibida
// saralash uchun umumiy yordamchi. Guruhi bo'lmagan (masalan, "express"
// toifadagi) talabalar oxirida qoladi. Asl massivni o'zgartirmaydi.
export function guruhBoyichaSaralash(royxat) {
  return [...royxat].sort((a, b) => {
    const gA = a.guruhlar?.nomi || "";
    const gB = b.guruhlar?.nomi || "";
    if (!gA && gB) return 1;
    if (gA && !gB) return -1;
    const solishtirish = gA.localeCompare(gB, "uz", { numeric: true });
    if (solishtirish !== 0) return solishtirish;
    return (a.ism_familya || "").localeCompare(b.ism_familya || "", "uz");
  });
}
