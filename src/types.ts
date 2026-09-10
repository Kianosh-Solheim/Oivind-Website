export interface BookQuote {
  quote: string;
  author?: string;
  source?: string;
}

export interface Book {
  id?: string;
  title: string;
  description: string;
  publishedYear: number;
  coverImageUrl?: string;
  isbn?: string;
  buyLink?: string;
  pageCount?: number;
  language?: 'no' | 'en' | 'both';
  titleEn?: string;
  descriptionEn?: string;
  buyLinkEn?: string;
  price?: number;
  
  // Bokpromosjon og Salgsside-innstillingar:
  promoActive?: boolean;
  promoSlug?: string;          // e.g. "navnet-pa-boken" -> /salg/navnet-pa-boken
  promoHeadline?: string;      // Hero-ingress / slagord
  promoBadge?: string;         // f.eks. "Signert utgåve", "Ny roman", "Spesialtilbod"
  promoDescription?: string;   // Utdjupande tekst om boka
  promoExcerpt?: string;       // Utdrag / smakebit frå boka
  promoHighlights?: string[];  // 3-4 kulepunkt
  promoQuotes?: BookQuote[];   // Sitater og omtaler
  promoDirectSale?: boolean;   // Om kunden kan bestille direkte med skjema
  promoSpecialPrice?: number;  // Kampanjepris
  promoShippingText?: string;  // Fraktinformasjon (f.eks. "Fri frakt rett i postkassa di")
  authorNote?: string;         // Personleg helsing frå forfattaren
  isHeroFocus?: boolean;       // Hovudfokus på framsida (erstattar vanleg hero)
}

export interface Article {
  id?: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
  imageCaption?: string;
  translationId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Order {
  id?: string;
  bookId?: string;
  bookTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  quantity?: number;
  totalPrice?: number;
  paymentMethod?: 'vipps' | 'invoice' | 'stripe';
  dedication?: string; // Valfri personleg helsing i boka
  status: 'new' | 'completed' | 'cancelled';
  createdAt: any;
}

export interface AboutSettings {
  bioNo: string;
  bioEn: string;
  shortBioNo: string;
  shortBioEn: string;
  imageUrl: string;
}
