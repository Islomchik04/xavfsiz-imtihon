"use client";

import { useRef } from "react";

// Oddiy <form method="get"> o'rniga — filtrlar (Toifa, Filial, Guruh,
// Saralash va h.k.) o'zgarganda "Qidirish" tugmasini bosishni kutmasdan,
// AVTOMATIK ravishda yuboriladi. Select/checkbox/radio darhol yuboradi;
// matn maydonlari (masalan qidiruv) esa yozish to'xtagandan keyin (kichik
// kechikish bilan) — aks holda har harf kiritilganda sahifa qayta
// yuklanib, fokus va kursor holatini yo'qotib qo'yardi.
//
// "Qidirish" tugmasi baribir formada qoladi — JavaScript ishlamasa yoki
// foydalanuvchi darhol yubormoqchi bo'lsa, qo'lda ham yuborish mumkin.
export default function AutoQidiruvFormi({ children, className, method = "get" }) {
  const formRef = useRef(null);
  const kechikishRef = useRef(null);

  function ozgarganda(e) {
    const nishon = e.target;
    clearTimeout(kechikishRef.current);
    if (nishon.tagName === "SELECT" || nishon.type === "checkbox" || nishon.type === "radio") {
      formRef.current?.requestSubmit();
    } else {
      kechikishRef.current = setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 500);
    }
  }

  return (
    <form ref={formRef} method={method} className={className} onChange={ozgarganda}>
      {children}
    </form>
  );
}
