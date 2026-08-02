"use client";

import { createContext, useContext, useEffect, useState } from "react";

const SAQLASH_KALITI = "xavfsiz-imtihon-tema";
const TemaKonteksti = createContext({ tema: "kunduzgi", almashtirish: () => {} });

export function TemaProvider({ children }) {
  const [tema, setTema] = useState("kunduzgi");

  useEffect(() => {
    const saqlangan = window.localStorage.getItem(SAQLASH_KALITI);
    const tizim = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "tungi" : "kunduzgi";
    setTema(saqlangan === "tungi" || saqlangan === "kunduzgi" ? saqlangan : tizim);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "tungi");
  }, [tema]);

  function almashtirish() {
    setTema((oldi) => {
      const yangi = oldi === "tungi" ? "kunduzgi" : "tungi";
      window.localStorage.setItem(SAQLASH_KALITI, yangi);
      return yangi;
    });
  }

  return <TemaKonteksti.Provider value={{ tema, almashtirish }}>{children}</TemaKonteksti.Provider>;
}

export function useTema() {
  return useContext(TemaKonteksti);
}
