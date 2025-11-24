import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'ja' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
    >
      {currentLanguage === 'en' ? (
        <>
          <span className="text-lg">🇯🇵</span>
          <span className="text-sm font-medium">日本語</span>
        </>
      ) : (
        <>
          <span className="text-lg">🇺🇸</span>
          <span className="text-sm font-medium">English</span>
        </>
      )}
    </Button>
  );
};

export default LanguageSwitcher;
