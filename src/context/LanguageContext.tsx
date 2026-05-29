import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "no" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  no: {
    HOME: "HEIM",
    BOOKS: "BØKER",
    REFLECTIONS: "REFLEKSJONAR",
    DIARY: "DAGBOK",
    MUSIC: "MUSIKK",
    PHOTO: "FOTO",
    VIDEO: "VIDEO",
    ABOUT: "OM MEG",
    CONTACT: "KONTAKT",
    HOME_SUBTITLE: "Forteljingar om framtid, menneske og val som former oss.",
    SEE_BOOKS: "SJÅ BØKER",
    LATEST_REFLECTIONS: "Nyaste refleksjonar",
    ALL_REFLECTIONS: "ALLE REFLEKSJONAR",
    NEW_ARTICLE: "Ny Artikkel",
    NO_ARTICLES: "Ingen refleksjonar publisert enno.",
    BACK_TO_HOME: "TILBAKE TIL HEIM",
    READ_MORE: "LES MEIR",
    PHOTO_COLLECTION: "Fotografi som fangar øyeblikk",
    SEE_GALLERY: "SJÅ GALLERI",
    MY_MUSIC: "Musikk som rører ved sjela",
    HEAR_MUSIC: "HØYR MUSIKK",
    THE_NORDIC_STORYTELLER: "THE NORDIC STORYTELLER"
  },
  en: {
    HOME: "HOME",
    BOOKS: "BOOKS",
    REFLECTIONS: "REFLECTIONS",
    DIARY: "DIARY",
    MUSIC: "MUSIC",
    PHOTO: "PHOTO",
    VIDEO: "VIDEO",
    ABOUT: "ABOUT",
    CONTACT: "CONTACT",
    HOME_SUBTITLE: "Stories about the future, humanity, and choices that shape us.",
    SEE_BOOKS: "SEE BOOKS",
    LATEST_REFLECTIONS: "Latest reflections",
    ALL_REFLECTIONS: "ALL REFLECTIONS",
    NEW_ARTICLE: "New Article",
    NO_ARTICLES: "No reflections published yet.",
    BACK_TO_HOME: "BACK TO HOME",
    READ_MORE: "READ MORE",
    PHOTO_COLLECTION: "Photography capturing moments",
    SEE_GALLERY: "SEE GALLERY",
    MY_MUSIC: "Music that touches the soul",
    HEAR_MUSIC: "HEAR MUSIC",
    THE_NORDIC_STORYTELLER: "THE NORDIC STORYTELLER"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("site_language");
    return (saved === "en" || saved === "no") ? saved : "no";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("site_language", lang);
  };

  const t = (key: string) => {
    const word = translations[language][key as keyof typeof translations["no"]];
    return word || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
