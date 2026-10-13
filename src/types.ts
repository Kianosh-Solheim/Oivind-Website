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
  
  // Bokpromosjon og Salgsside-innstillingar (Norsk):
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

  // Språkspesifikke felt for Engelsk (English edition):
  promoHeadlineEn?: string;
  promoBadgeEn?: string;
  promoDescriptionEn?: string;
  promoExcerptEn?: string;
  promoHighlightsEn?: string[];
  promoQuotesEn?: BookQuote[];
  promoShippingTextEn?: string;
  authorNoteEn?: string;

  isHeroFocus?: boolean;       // Hovudfokus på framsida (erstattar vanleg hero)
  showReviews?: boolean;       // Om omtaler og «Kva seier lesarane?» skal visast
  showPromoQuotes?: boolean;   // Alias for showReviews
  showFreeBookletButton?: boolean; // Om knapp til /gratishefte skal visast på framsida
}

export interface ElementLocation {
  id: string;
  pagePath: string;            // f.eks. "/salg/i-morgon-er-alt-annleis" eller "/"
  pageTitle?: string;          // f.eks. "I morgon er alt annleis - Salg"
  selector: string;           // CSS veljar eller element-sti
  tag: string;                // f.eks. "H1", "SECTION", "DIV"
  textSnippet?: string;       // Tekstbit frå elementet
  elementName?: string;       // Skildrande namn
  position?: { top: number; left: number };
}

export type RequestScope = 'small' | 'medium' | 'large' | 'feature';
export type RequestType = 'change' | 'feature';
export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';
export type PriceAdjustmentType = 'agreed' | 'lower' | 'higher';
export type PaymentStatus = 'unpaid' | 'invoiced' | 'paid' | 'not_applicable';

export interface ChangeRequest {
  id?: string;
  title: string;
  type: RequestType;          // 'change' | 'feature'
  scope: RequestScope;        // 'small' | 'medium' | 'large' | 'feature'
  description: string;
  selectedLocations: ElementLocation[];
  willingToPay?: string;      // F.eks. "1500 kr" (krevst/spørst for middels, stor, ny funksjon)
  deadline?: string;          // F.eks. "Innan 2 veker" / dato
  requestedByEmail: string;   // F.eks. "oivindsolheim@gmail.com"
  requestedByName?: string;
  assignedToEmail: string;    // F.eks. "kianoshsolheim@gmail.com"
  status: RequestStatus;      // 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined'
  developerNotes?: string;    // Svar/kommentarar frå Kianosh
  adjustedPrice?: string;     // Justert pris frå Kianosh (f.eks. "2 200 kr" eller "800 kr")
  priceAdjustmentType?: PriceAdjustmentType; // 'agreed' | 'lower' | 'higher'
  priceNote?: string;         // Merknad om kvifor prisen bør vere lågare eller høgare basert på arbeidet
  paymentStatus?: PaymentStatus; // 'unpaid' | 'invoiced' | 'paid' | 'not_applicable'
  paidAmount?: string;        // Registrert betalt beløp
  paidAt?: any;
  collectionName?: 'change_requests' | 'stats';
  docType?: string;
  createdAt?: any;
  updatedAt?: any;
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

export interface Song {
  id?: string;
  title: string;
  slug?: string;
  lyrics: string;
  description?: string;
  genre?: string;
  releaseYear?: number;
  coverImageUrl?: string;
  coverImageCaption?: string;
  audioUrl?: string;
  audioFormat?: string;       // e.g. 'mp3' | 'm4a' | 'opus' | 'ogg' | 'wav'
  audioFileName?: string;
  durationSeconds?: number;
  allowDownload?: boolean;
  published: boolean;
  language?: 'no' | 'en' | 'both' | string;
  translationId?: string;
  collectionName?: 'songs' | 'stats';
  docType?: string;
  createdAt?: any;
  updatedAt?: any;
}

