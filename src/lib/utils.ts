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

