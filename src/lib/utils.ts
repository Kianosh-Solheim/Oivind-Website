export function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

export function stripHtml(html: string) {
  if (!isHtml(html)) return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const plainText = stripHtml(text);
  // Matches words (alphanumeric and some punctuation correctly, but split by space is easiest)
  const words = plainText.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'o')
    .replace(/[åÅ]/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type BuyLinkType = 'amazon' | 'stripe' | 'other' | 'none';

export function getBuyLinkType(url?: string | null): BuyLinkType {
  if (!url || typeof url !== 'string' || !url.trim()) return 'none';
  const clean = url.trim().toLowerCase();
  if (/amazon\.[a-z.]+|amzn\.(to|eu)/i.test(clean)) {
    return 'amazon';
  }
  if (/stripe\.com/i.test(clean)) {
    return 'stripe';
  }
  return 'other';
}

export function getBuyButtonText(url?: string | null, language: 'no' | 'en' = 'no', price?: number): string {
  const type = getBuyLinkType(url);
  if (type === 'amazon') {
    return language === 'en' ? 'Buy on Amazon' : 'Kjøp frå Amazon';
  }
  if (type === 'stripe') {
    if (price && price > 0) {
      return language === 'en' ? `Buy book (kr ${price},-)` : `Kjøp boka (kr ${price},-)`;
    }
    return language === 'en' ? 'Buy book (Stripe)' : 'Kjøp boka (Stripe)';
  }
  return language === 'en' ? 'Buy book' : 'Kjøp boka';
}

export function getPaymentTrustText(url?: string | null, language: 'no' | 'en' = 'no'): string {
  const type = getBuyLinkType(url);
  if (type === 'amazon') {
    return language === 'en' ? 'Buy from Amazon' : 'Kjøp frå Amazon';
  }
  if (type === 'stripe') {
    return language === 'en' ? 'Secure payment with Stripe' : 'Trygg betaling med Stripe';
  }
  return language === 'en' ? 'Secure & easy payment' : 'Trygg og enkel betaling';
}

export interface ResolvedBookBuyLinks {
  noLink: string;
  enLink: string;
  primaryLink: string;
  primaryLinkType: BuyLinkType;
  primaryIsAmazon: boolean;
  primaryIsStripe: boolean;
  secondaryLink: string;
  secondaryLinkType: BuyLinkType;
  secondaryLang: 'no' | 'en' | null;
  hasBothEditions: boolean;
  hasLinkForCurrentLang: boolean;
}

export function hasBookSalesLinkForLanguage(
  book?: { buyLink?: string; buyLinkEn?: string; language?: 'no' | 'en' | 'both' } | null,
  language: 'no' | 'en' = 'no'
): boolean {
  if (!book) return false;
  const noLink = (book.buyLink || '').trim();
  const enLink = (book.buyLinkEn || '').trim();

  if (language === 'en') {
    if (enLink) return true;
    if (book.language === 'en' && noLink) return true;
    return false;
  } else {
    if (noLink && book.language !== 'en') return true;
    return false;
  }
}

export function isBookAvailableInLanguage(
  book?: {
    buyLink?: string;
    buyLinkEn?: string;
    language?: 'no' | 'en' | 'both';
  } | null,
  language: 'no' | 'en' = 'no'
): boolean {
  if (!book) return false;
  return hasBookSalesLinkForLanguage(book, language);
}

export function hasBookLanguageInfo(
  book?: {
    language?: 'no' | 'en' | 'both';
    title?: string;
    description?: string;
    promoDescription?: string;
    promoHeadline?: string;
    promoExcerpt?: string;
    titleEn?: string;
    descriptionEn?: string;
    promoDescriptionEn?: string;
    promoHeadlineEn?: string;
    promoExcerptEn?: string;
  } | null,
  language: 'no' | 'en' = 'no'
): boolean {
  if (!book) return false;
  if (language === 'en') {
    const hasEnContent = Boolean(
      (book.titleEn && book.titleEn.trim()) ||
      (book.descriptionEn && book.descriptionEn.trim()) ||
      (book.promoDescriptionEn && book.promoDescriptionEn.trim()) ||
      (book.promoHeadlineEn && book.promoHeadlineEn.trim()) ||
      (book.promoExcerptEn && book.promoExcerptEn.trim())
    );
    if (hasEnContent) return true;
    if (
      book.language === 'en' &&
      Boolean(
        (book.description && book.description.trim()) ||
        (book.promoDescription && book.promoDescription.trim())
      )
    ) {
      return true;
    }
    return false;
  } else {
    if (book.language === 'en') {
      return false;
    }
    return Boolean(
      (book.description && book.description.trim()) ||
      (book.promoDescription && book.promoDescription.trim()) ||
      (book.promoHeadline && book.promoHeadline.trim()) ||
      (book.promoExcerpt && book.promoExcerpt.trim())
    );
  }
}

export function resolveBookBuyLinks(
  book?: { buyLink?: string; buyLinkEn?: string; language?: 'no' | 'en' | 'both' } | null,
  language: 'no' | 'en' = 'no'
): ResolvedBookBuyLinks {
  const noLink = (book?.buyLink || '').trim();
  const enLink = (book?.buyLinkEn || '').trim();
  const hasBothEditions = Boolean(noLink && enLink && noLink !== enLink);
  const hasLinkForCurrentLang = hasBookSalesLinkForLanguage(book, language);

  const primaryLink = language === 'en' ? (enLink || noLink) : (noLink || enLink);
  const primaryLinkType = getBuyLinkType(primaryLink);

  const secondaryLink = hasBothEditions ? (language === 'en' ? noLink : enLink) : '';
  const secondaryLang: 'no' | 'en' | null = hasBothEditions ? (language === 'en' ? 'no' : 'en') : null;
  const secondaryLinkType = getBuyLinkType(secondaryLink);

  return {
    noLink,
    enLink,
    primaryLink,
    primaryLinkType,
    primaryIsAmazon: primaryLinkType === 'amazon',
    primaryIsStripe: primaryLinkType === 'stripe',
    secondaryLink,
    secondaryLinkType,
    secondaryLang,
    hasBothEditions,
    hasLinkForCurrentLang
  };
}

export function getSecondaryEditionButtonLabel(
  secondaryLang: 'no' | 'en',
  secondaryLink: string,
  uiLanguage: 'no' | 'en' = 'no'
): string {
  const type = getBuyLinkType(secondaryLink);
  if (secondaryLang === 'en') {
    if (uiLanguage === 'no') {
      return type === 'amazon' ? 'Kjøp boka på engelsk (Amazon)' : 'Kjøp boka på engelsk';
    }
    return type === 'amazon' ? 'Buy the book in English (Amazon)' : 'Buy the book in English';
  } else {
    if (uiLanguage === 'en') {
      return type === 'stripe'
        ? 'Kjøp boka på norsk / Buy in Norwegian'
        : type === 'amazon'
          ? 'Buy the book in Norwegian (Amazon)'
          : 'Kjøp boka på norsk / Buy in Norwegian';
    }
    return type === 'stripe' ? 'Kjøp boka på norsk (Stripe)' : 'Kjøp boka på norsk';
  }
}



