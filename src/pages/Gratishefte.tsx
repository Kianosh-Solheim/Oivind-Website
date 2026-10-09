import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  BookOpen,
  Printer,
  Share2,
  ArrowRight,
  Layers,
  BookMarked,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedDocs } from '../lib/dbCache';
import { Book } from '../types';
import { slugify } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { MiniPdf } from '../lib/miniPdf';

type BookletLang = 'no' | 'en';

interface QuestionPageData {
  number: string;
  badgeNumber: string;
  kicker: string;
  title: string;
  subtitle: string;
  paragraphs: string[];
  exampleLabel: string;
  exampleText: string;
  tryLabel: string;
  tryPrompt: string;
  aphorism: string;
  pageNumber: string;
}

interface BookletContent {
  langLabel: string;
  pdfFilename: string;
  footerLeftBold: string;
  footerLeftSub: string;
  cover: {
    kicker: string;
    titleLines: string[];
    subtitle: string;
    author: string;
    domain: string;
    pageNumber: string;
  };
  intro: {
    kicker: string;
    title: string;
    paragraphs: string[];
    callout: string;
    footnote: string;
    pageNumber: string;
  };
  questions: QuestionPageData[];
  summary: {
    kicker: string;
    title: string;
    lead: string;
    items: string[];
    closingQuote: string;
    furtherKicker: string;
    furtherBoldTitle: string;
    furtherTextBefore: string;
    furtherTextAfter: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaUrl: string;
    isExternalCta: boolean;
    pageNumber: string;
  };
}

export const BOOKLET_DATA: Record<BookletLang, BookletContent> = {
  no: {
    langLabel: 'Norsk (Nynorsk)',
    pdfFilename: 'Tenk-Sjolv-Fem-sporsmal-om-KI-Oivind-H-Solheim.pdf',
    footerLeftBold: 'TENK SJØLV! · EIT GRATIS HEFTE',
    footerLeftSub: 'Utarbeidd med utgangspunkt i boka TENK SJØLV! © Øivind H. Solheim.',
    cover: {
      kicker: 'EI GRATIS LESARRETTLEIING',
      titleLines: [
        'FEM SPØRSMÅL',
        'DU BØR STILLA',
        'FØR DU STOLAR',
        'PÅ EIT SVAR',
        'FRÅ KI'
      ],
      subtitle: 'Bruk kunstig intelligens. Vern om di eiga dømmekraft.',
      author: 'Øivind H. Solheim',
      domain: 'oivind.solheim.online',
      pageNumber: '01 / 08'
    },
    intro: {
      kicker: 'FØR DU BYRJAR',
      title: 'Eit godt svar er ikkje alltid eit sant svar.',
      paragraphs: [
        'Eg har arbeidd med språk, læring og skriving gjennom eit langt liv. Spørsmålet om kva det vil seia å tenka sjølv, har følgt meg lenge. Då kunstig intelligens kom inn i kvardagen vår, fekk dette spørsmålet ei ny form.',
        'No kan vi få eit raskt, velformulert svar på nesten kva som helst. Det er ei stor hjelp. Men eit overtydande språk er ikkje det same som dokumentasjon. KI kan svara trygt og høfleg, også når han tar feil.',
        'Dei fem spørsmåla i dette heftet er ikkje ein test som garanterer sanning. Dei er ei lita øving i å halda vår eiga vurderingsevne levande, særleg før vi deler noko vidare eller tar ei avgjerd som betyr noko.'
      ],
      callout: 'Å tenka sjølv betyr ikkje å tenka åleine. Det betyr å ta ansvar for det vi vel å tru på.',
      footnote: 'Særleg viktig når svaret gjeld helse, økonomi, juridiske spørsmål, offentlege påstandar eller andre viktige val.',
      pageNumber: '02 / 08'
    },
    questions: [
      {
        number: '01',
        badgeNumber: '1',
        kicker: 'SPØRSMÅL 01',
        title: 'Kva veit eg eigentleg – og kva blir berre påstått?',
        subtitle: 'Skil fakta frå tolking, og sikker kunnskap frå gissing.',
        paragraphs: [
          'Eit KI-svar kan høyrest like sikkert ut når grunnlaget er godt, som når det er mangelfullt. Det er freistande å la den trygge tonen erstatta vår eiga vurdering. Eg har oppdaga kor lett det er å gjera nettopp det.',
          'Stopp ved sterke ord som «alle», «bevist», «garantert» og «forsking viser». Kva er faktisk dokumentert? Kva er ei tolking? Og kva veit vi enno ikkje?'
        ],
        exampleLabel: 'DØME',
        exampleText: 'KI seier: «Forskarane er samde om at denne metoden fungerer.» Er det dokumentert semje, eller ei forenkling?',
        tryLabel: 'PRØV DETTE MED KI',
        tryPrompt: '«Skil mellom dokumenterte fakta, tolkingar og usikre påstandar i svaret ditt. Fortel kva du ikkje kan stadfesta.»',
        aphorism: 'Ein sikker tone er ikkje eit prov.',
        pageNumber: '03 / 08'
      },
      {
        number: '02',
        badgeNumber: '2',
        kicker: 'SPØRSMÅL 02',
        title: 'Kvar kjem opplysningane frå?',
        subtitle: 'Eit svar blir ikkje meir truverdig berre fordi det har kjelder i botnen.',
        paragraphs: [
          'Når eg les ein artikkel eller ei bok, kan eg undersøkja kven som står bak. Eit KI-system kan gi meg ei ferdig framstilling der vegen tilbake til kjeldene er mindre synleg.',
          'Be derfor om etterprøvbare kjelder. Opna dei. Sjekk om dei finst, om dei er relevante, og om dei faktisk støttar påstanden. Eit pent kjeldenamn eller ei lenkje er ikkje nok. KI kan også visa til kjelder som er feil eller ikkje eksisterer.'
        ],
        exampleLabel: 'DØME',
        exampleText: 'KI viser til ein «ny studie» om læring. Finn du studien, datoen og resultata – og seier han det KI hevdar?',
        tryLabel: 'PRØV DETTE MED KI',
        tryPrompt: '«Vis til konkrete, etterprøvbare kjelder med tittel, dato og lenkje. Sei tydeleg frå dersom du ikkje har sikre kjelder.»',
        aphorism: 'Gå til kjelda, ikkje berre til referansen.',
        pageNumber: '04 / 08'
      },
      {
        number: '03',
        badgeNumber: '3',
        kicker: 'SPØRSMÅL 03',
        title: 'Kva manglar – og kva talar imot?',
        subtitle: 'Eit godt svar skal tåla at vi spør kva som kan vera feil.',
        paragraphs: [
          'Sjølv eit korrekt svar kan vera misvisande dersom viktig informasjon er utelaten. Kanskje byggjer konklusjonen på eitt perspektiv, medan andre erfaringar eller forklaringar ikkje får plass.',
          'Eg prøver derfor å møta mine eigne oppfatningar med same kritiske blikk som eg møter andre sine. Be KI om motargument, moglege feilkjelder og alternative forklaringar. Det handlar ikkje om å mistenkja alt, men om å forstå meir.'
        ],
        exampleLabel: 'DØME',
        exampleText: 'KI rår deg til å ta i bruk eit nytt digitalt verktøy. Kva med personvern, kostnader og ulemper?',
        tryLabel: 'PRØV DETTE MED KI',
        tryPrompt: '«Kva er dei sterkaste innvendingane mot dette svaret? Kva relevant informasjon kan vera utelaten?»',
        aphorism: 'Spør ikkje berre: Kvifor ja? Spør også: Kvifor ikkje?',
        pageNumber: '05 / 08'
      },
      {
        number: '04',
        badgeNumber: '4',
        kicker: 'SPØRSMÅL 04',
        title: 'Kven sine interesser blir tente?',
        subtitle: 'Undersøk kven som definerer problemet og kva svaret skal brukast til.',
        paragraphs: [
          'Informasjon blir ikkje formidla i eit tomrom. Selskap, organisasjonar og menneske har mål og interesser. Det kan prega kva dei framhevar, kva dei gløymer og kva dei vil at vi skal gjera.',
          'Det betyr ikkje at alle prøver å lura oss. Men det er klokt å spørja om svaret er forma av kommersielle interesser, uklare føresetnader eller einsidige perspektiv. Kven får fordelar, og kven blir ikkje høyrd?'
        ],
        exampleLabel: 'DØME',
        exampleText: 'KI peikar ut «det beste kjøpet». Kva kriterium ligg bak – pris, kvalitet, annonsering eller berre tilgjengelege data?',
        tryLabel: 'PRØV DETTE MED KI',
        tryPrompt: '«Kven sine interesser og perspektiv er representerte her? Kva føresetnader eller moglege bindingar bør eg kjenna til?»',
        aphorism: 'Spør kven som tener på framstillinga.',
        pageNumber: '06 / 08'
      },
      {
        number: '05',
        badgeNumber: '5',
        kicker: 'SPØRSMÅL 05',
        title: 'Kva må eg framleis avgjera sjølv?',
        subtitle: 'Bruk KI til å tenka betre – ikkje til å sleppa å tenka.',
        paragraphs: [
          'KI kan hjelpa meg å orientera meg, finna alternativ, undersøka argument og formulera meg meir presist. Eg bruker sjølv teknologien slik. Men spørsmålet om kva eg meiner, kva eg vil og kva ansvar eg tar, kan eg ikkje overlata til eit svar på skjermen.',
          'Når saka er viktig, bør eg stoppa opp og spørja: Forstår eg dette godt nok? Kva verdiar betyr noko her? Kven blir påverka? Og kan eg stå inne for avgjerda dersom svaret viser seg å vera feil?'
        ],
        exampleLabel: 'DØME',
        exampleText: 'KI skriv eit skarpt svar til eit menneske du er usamd med. Er det slik du sjølv ønskjer å møta den andre?',
        tryLabel: 'PRØV DETTE MED KI',
        tryPrompt: '«Hjelp meg å vurdera alternativ og konsekvensar. Still kritiske spørsmål, men ikkje ta avgjerda for meg.»',
        aphorism: 'Hjelp er verdifullt. Ansvaret er mitt.',
        pageNumber: '07 / 08'
      }
    ],
    summary: {
      kicker: 'TA SPØRSMÅLA MED DEG',
      title: 'Fem spørsmål. Ei enkel vane.',
      lead: 'Før du stolar på eit viktig KI-svar, spør deg sjølv:',
      items: [
        'Kva er dokumentert – og kva er berre påstått?',
        'Kvar kjem opplysningane frå?',
        'Kva manglar – og kva talar imot?',
        'Kven sine interesser blir tente?',
        'Kva må eg framleis avgjera sjølv?'
      ],
      closingQuote: 'Eg ønskjer ikkje at vi skal leggja bort kunstig intelligens. Eg ønskjer at vi skal bruka han utan å gi frå oss det som alltid har vore vårt ansvar: å spørja, vurdera og velja.',
      furtherKicker: 'VIL DU GÅ VIDARE?',
      furtherTextBefore: 'I ',
      furtherBoldTitle: 'TENK SJØLV! – Kunstig intelligens og ansvaret for vår eiga tenking',
      furtherTextAfter: ' undersøker eg korleis KI påverkar læring, språk, merksemd, dømmekraft og demokrati – og kva vi kan gjera for å halda vår eiga tenking levande.',
      ctaTitle: 'LES MEIR OG FINN BOKA',
      ctaSubtitle: 'oivind.solheim.online/',
      ctaUrl: '/boker',
      isExternalCta: false,
      pageNumber: '08 / 08'
    }
  },
  en: {
    langLabel: 'English',
    pdfFilename: 'Think-For-Yourself-Five-Questions-AI-Oivind-H-Solheim.pdf',
    footerLeftBold: 'THINK FOR YOURSELF! · A FREE BOOKLET',
    footerLeftSub: 'Based on the book THINK FOR YOURSELF! © Øivind H. Solheim.',
    cover: {
      kicker: 'A FREE READER’S GUIDE',
      titleLines: [
        'FIVE QUESTIONS',
        'TO ASK BEFORE',
        'YOU TRUST AN',
        'ANSWER FROM AI'
      ],
      subtitle: 'Use artificial intelligence. Keep your own judgment alive.',
      author: 'Øivind H. Solheim',
      domain: 'oivind.solheim.online',
      pageNumber: '01 / 08'
    },
    intro: {
      kicker: 'BEFORE YOU BEGIN',
      title: 'A convincing answer is not always a true one.',
      paragraphs: [
        'I have spent much of my life working with language, learning and writing. The question of what it means to think for ourselves has stayed with me for decades. Artificial intelligence has given that old question a new urgency.',
        'We can now receive a fluent answer to almost anything in seconds. That is an extraordinary help. But fluent language is not evidence. AI can sound calm and certain even when an answer is wrong.',
        'These five questions are not a test that guarantees truth. They are a simple way to keep our judgment active, especially before we share a claim or make a decision that matters.'
      ],
      callout: 'Thinking for yourself does not mean thinking alone. It means taking responsibility for what you choose to believe.',
      footnote: 'Especially important for answers involving health, money, law, public claims, or other consequential decisions.',
      pageNumber: '02 / 08'
    },
    questions: [
      {
        number: '01',
        badgeNumber: '1',
        kicker: 'QUESTION 01',
        title: 'What do I actually know – and what is only a claim?',
        subtitle: 'Separate facts from interpretations, and evidence from guesswork.',
        paragraphs: [
          'An AI answer can sound equally confident when it is well supported and when important evidence is missing. It is tempting to mistake a confident tone for a reliable conclusion. I know how easily that can happen.',
          'Pause when you see words such as “everyone,” “proven,” “guaranteed,” or “research shows.” What has been established? What is an interpretation? What is still uncertain?'
        ],
        exampleLabel: 'EXAMPLE',
        exampleText: 'AI says: “Researchers agree that this method works.” Is there documented agreement, or is the claim an oversimplification?',
        tryLabel: 'TRY THIS WITH AI',
        tryPrompt: '“Separate verified facts, interpretations and uncertain claims in your answer. Tell me what you cannot confirm.”',
        aphorism: 'Confidence is not proof.',
        pageNumber: '03 / 08'
      },
      {
        number: '02',
        badgeNumber: '2',
        kicker: 'QUESTION 02',
        title: 'Where does this information come from?',
        subtitle: 'A reference is useful only when it can actually be checked.',
        paragraphs: [
          'When I read a book or an article, I can investigate who is behind it. An AI system may give me a polished summary while making the path back to the original sources less visible.',
          'Ask for sources you can verify. Open them. Check whether they exist, whether they are relevant, and whether they actually support the claim. A credible-looking title or link is not enough. AI systems can also produce incorrect or invented references.'
        ],
        exampleLabel: 'EXAMPLE',
        exampleText: 'AI mentions a “recent study” about learning. Can you find the study, its date and findings – and does it say what AI claims?',
        tryLabel: 'TRY THIS WITH AI',
        tryPrompt: '“Give specific, verifiable sources with titles, dates and links. Say clearly if you do not have reliable sources.”',
        aphorism: 'Check the source, not merely the citation.',
        pageNumber: '04 / 08'
      },
      {
        number: '03',
        badgeNumber: '3',
        kicker: 'QUESTION 03',
        title: 'What is missing – and what argues against it?',
        subtitle: 'A useful answer should survive serious questions about its limits.',
        paragraphs: [
          'Even a factually correct answer can mislead if important information is left out. A conclusion may reflect one perspective while other experiences or explanations receive little attention.',
          'I try to question my own assumptions as carefully as I question those of other people. Ask AI for counterarguments, possible errors and alternative explanations. This is not about distrusting everything. It is about understanding more.'
        ],
        exampleLabel: 'EXAMPLE',
        exampleText: 'AI recommends a new digital tool. What about privacy, cost, trade-offs and limitations?',
        tryLabel: 'TRY THIS WITH AI',
        tryPrompt: '“What are the strongest objections to this answer? What relevant information might have been left out?”',
        aphorism: 'Do not ask only: Why yes? Also ask: Why not?',
        pageNumber: '05 / 08'
      },
      {
        number: '04',
        badgeNumber: '4',
        kicker: 'QUESTION 04',
        title: 'Whose interests does this answer serve?',
        subtitle: 'Consider who defines the problem and how the answer may be used.',
        paragraphs: [
          'Information is never communicated in a vacuum. Companies, organizations and individuals have goals and interests. These can shape what they emphasize, what they overlook, and what they hope we will do.',
          'This does not mean that everyone is trying to deceive us. But it is worth asking whether commercial interests, hidden assumptions or one-sided perspectives have shaped the answer. Who benefits, and whose voice is missing?'
        ],
        exampleLabel: 'EXAMPLE',
        exampleText: 'AI names the “best product.” Best according to what – price, quality, advertising, or simply the available data?',
        tryLabel: 'TRY THIS WITH AI',
        tryPrompt: '“Whose interests and perspectives are represented here? What assumptions or possible conflicts of interest should I know about?”',
        aphorism: 'Ask who stands to gain from the framing.',
        pageNumber: '06 / 08'
      },
      {
        number: '05',
        badgeNumber: '5',
        kicker: 'QUESTION 05',
        title: 'What must I still decide for myself?',
        subtitle: 'Use AI to think better – not to avoid thinking.',
        paragraphs: [
          'AI can help me explore a subject, compare alternatives, test arguments and find more precise words. I use it that way myself. But questions about what I believe, what I value and what responsibility I accept cannot simply be handed over to a screen.',
          'When a decision matters, I should pause and ask: Do I understand this well enough? What values matter here? Who will be affected? And can I stand behind my choice if the answer turns out to be wrong?'
        ],
        exampleLabel: 'EXAMPLE',
        exampleText: 'AI writes an angry reply to someone you disagree with. Is that really how you want to treat the other person?',
        tryLabel: 'TRY THIS WITH AI',
        tryPrompt: '“Help me consider options and consequences. Challenge my reasoning, but do not make the decision for me.”',
        aphorism: 'Help is valuable. Responsibility remains mine.',
        pageNumber: '07 / 08'
      }
    ],
    summary: {
      kicker: 'TAKE THE QUESTIONS WITH YOU',
      title: 'Five questions. One useful habit.',
      lead: 'Before you trust an important AI answer, ask yourself:',
      items: [
        'What is supported – and what is only claimed?',
        'Where does the information come from?',
        'What is missing – and what argues against it?',
        'Whose interests does this answer serve?',
        'What must I still decide for myself?'
      ],
      closingQuote: 'I do not want us to turn away from artificial intelligence. I want us to use it without surrendering what has always been our responsibility: to question, to judge, and to choose.',
      furtherKicker: 'WANT TO EXPLORE FURTHER?',
      furtherTextBefore: 'In ',
      furtherBoldTitle: 'THINK FOR YOURSELF! – Artificial Intelligence and Our Responsibility for Our Own Thinking',
      furtherTextAfter: ', I explore how AI is changing learning, language, attention, judgment and democracy – and what we can do to keep our thinking alive.',
      ctaTitle: 'FIND THE BOOK ON AMAZON',
      ctaSubtitle: 'amazon.com · Search: THINK FOR YOURSELF! Øivind H. Solheim',
      ctaUrl: 'https://www.amazon.com/s?k=THINK+FOR+YOURSELF+Oivind+H.+Solheim',
      isExternalCta: true,
      pageNumber: '08 / 08'
    }
  }
};

// Generate a pixel-accurate 8-page A4 PDF matching the exact visual design
export function generateBookletPdf(lang: BookletLang) {
  const data = BOOKLET_DATA[lang];
  const doc = new MiniPdf();

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 21;
  const contentWidth = pageWidth - marginX * 2;

  const drawFooter = (pageNum: string, isDarkPage: boolean) => {
    if (isDarkPage) {
      doc.setDrawColor(46, 65, 82);
      doc.setLineWidth(0.3);
      doc.line(marginX, 272, pageWidth - marginX, 272);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(235, 240, 245);
      doc.text(data.footerLeftBold, marginX, 279);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 195, 208);
      doc.text(pageNum, pageWidth - marginX, 279, { align: 'right' });

      doc.setFontSize(7.5);
      doc.setTextColor(168, 184, 198);
      doc.text(data.footerLeftSub, marginX, 284.5);
    } else {
      doc.setDrawColor(218, 215, 205);
      doc.setLineWidth(0.3);
      doc.line(marginX, 272, pageWidth - marginX, 272);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(85, 92, 98);
      doc.text(data.footerLeftBold, marginX, 279);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(105, 112, 118);
      doc.text(pageNum, pageWidth - marginX, 279, { align: 'right' });

      doc.setFontSize(7.5);
      doc.setTextColor(115, 122, 128);
      doc.text(data.footerLeftSub, marginX, 284.5);
    }
  };

  const drawLightPageBackground = () => {
    // Cream background #F4F2EA
    doc.setFillColor(244, 242, 234);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    // Top teal border #127670
    doc.setFillColor(18, 118, 112);
    doc.rect(0, 0, pageWidth, 4.2, 'F');
  };

  // =========================================================================
  // PAGE 1: COVER
  // =========================================================================
  doc.setFillColor(19, 35, 50); // #132332
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative concentric rings on top right
  const cx = 176;
  const cy = 58;
  const radii = [16, 28, 40, 52, 64];
  doc.setDrawColor(42, 60, 76);
  doc.setLineWidth(0.35);
  radii.forEach((r) => {
    doc.circle(cx, cy, r, 'S');
  });

  // Subtle orbital dots on rings
  doc.setFillColor(58, 78, 95);
  const dotCoords = [
    [cx - 28, cy - 8],
    [cx - 38, cy + 12],
    [cx - 22, cy + 33],
    [cx - 52, cy - 4],
    [cx - 41, cy - 32],
    [cx - 44, cy + 27],
    [cx - 61, cy + 18]
  ];
  dotCoords.forEach(([dx, dy]) => {
    doc.circle(dx, dy, 0.9, 'F');
  });

  // Teal accent bar
  doc.setFillColor(15, 126, 121);
  doc.rect(marginX, 28, 24, 1.8, 'F');

  // Kicker
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(195, 208, 220);
  doc.text(data.cover.kicker, marginX, 41);

  // Main Cover Title Lines
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  let titleY = 78;
  data.cover.titleLines.forEach((line) => {
    doc.text(line, marginX, titleY);
    titleY += 15.5;
  });

  // Gold bar under title
  const goldBarY = data.cover.titleLines.length === 5 ? 156 : 142;
  doc.setFillColor(181, 132, 66);
  doc.rect(marginX, goldBarY, 25, 1.4, 'F');

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13.5);
  doc.setTextColor(225, 232, 238);
  doc.text(data.cover.subtitle, marginX, goldBarY + 19);

  // Author block
  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(data.cover.author, marginX, 248);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(175, 190, 205);
  doc.text(data.cover.domain, marginX, 257.5);

  drawFooter(data.cover.pageNumber, true);

  // =========================================================================
  // PAGE 2: INTRO
  // =========================================================================
  doc.addPage();
  drawLightPageBackground();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 118, 112);
  doc.text(data.intro.kicker, marginX, 23);

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(19, 35, 50);
  const introTitleLines = doc.splitTextToSize(data.intro.title, contentWidth);
  doc.text(introTitleLines, marginX, 40);

  let curY = 40 + introTitleLines.length * 11 + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.2);
  doc.setTextColor(35, 43, 51);

  data.intro.paragraphs.forEach((p) => {
    const lines = doc.splitTextToSize(p, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 6.5 + 7;
  });

  // Callout Box
  curY += 4;
  const calloutLines = doc.splitTextToSize(data.intro.callout, contentWidth - 18);
  const calloutBoxHeight = calloutLines.length * 7.5 + 16;
  doc.setFillColor(230, 230, 228);
  doc.roundedRect(marginX, curY, contentWidth, calloutBoxHeight, 2, 2, 'F');
  doc.setFillColor(18, 118, 112);
  doc.rect(marginX, curY, 1.8, calloutBoxHeight, 'F');

  doc.setFont('times', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(19, 35, 50);
  doc.text(calloutLines, marginX + 9, curY + 11);

  curY += calloutBoxHeight + 14;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.8);
  doc.setTextColor(92, 98, 104);
  const footLines = doc.splitTextToSize(data.intro.footnote, contentWidth);
  doc.text(footLines, marginX, curY);

  drawFooter(data.intro.pageNumber, false);

  // =========================================================================
  // PAGES 3 - 7: FIVE QUESTIONS
  // =========================================================================
  data.questions.forEach((q) => {
    doc.addPage();
    drawLightPageBackground();

    // Kicker + Gold circle number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(18, 118, 112);
    doc.text(q.kicker, marginX, 23);

    doc.setFillColor(181, 137, 75);
    doc.circle(pageWidth - marginX - 4, 20, 4.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(q.badgeNumber, pageWidth - marginX - 4, 21.2, { align: 'center' });

    // Question Heading
    doc.setFont('times', 'bold');
    doc.setFontSize(25.5);
    doc.setTextColor(19, 35, 50);
    const qTitleLines = doc.splitTextToSize(q.title, contentWidth);
    doc.text(qTitleLines, marginX, 40);

    let qY = 40 + qTitleLines.length * 10.5 + 4;

    // Subtitle in Teal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(18, 118, 112);
    doc.text(q.subtitle, marginX, qY);

    qY += 13;

    // Body paragraphs
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(35, 43, 51);
    q.paragraphs.forEach((p) => {
      const lines = doc.splitTextToSize(p, contentWidth);
      doc.text(lines, marginX, qY);
      qY += lines.length * 6.4 + 6.5;
    });

    // Box 1: DØME / EXAMPLE
    qY += 3;
    const exLines = doc.splitTextToSize(q.exampleText, contentWidth - 16);
    const exHeight = exLines.length * 6 + 20;
    doc.setFillColor(232, 232, 229);
    doc.roundedRect(marginX, qY, contentWidth, exHeight, 2, 2, 'F');
    doc.setFillColor(18, 118, 112);
    doc.rect(marginX, qY, 1.8, exHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(18, 118, 112);
    doc.text(q.exampleLabel, marginX + 7.5, qY + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.2);
    doc.setTextColor(30, 38, 46);
    doc.text(exLines, marginX + 7.5, qY + 15.5);

    qY += exHeight + 7;

    // Box 2: PRØV DETTE MED KI / TRY THIS WITH AI
    const tryLines = doc.splitTextToSize(q.tryPrompt, contentWidth - 16);
    const tryHeight = tryLines.length * 6 + 20;
    doc.setFillColor(250, 249, 245);
    doc.roundedRect(marginX, qY, contentWidth, tryHeight, 2, 2, 'F');
    doc.setFillColor(181, 137, 75);
    doc.rect(marginX, qY, 1.8, tryHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(181, 137, 75);
    doc.text(q.tryLabel, marginX + 7.5, qY + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.2);
    doc.setTextColor(30, 38, 46);
    doc.text(tryLines, marginX + 7.5, qY + 15.5);

    qY += tryHeight + 13;

    // Bottom Aphorism
    doc.setDrawColor(181, 137, 75);
    doc.setLineWidth(0.5);
    doc.line(marginX, qY - 1.5, marginX + 9, qY - 1.5);

    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(19, 35, 50);
    doc.text(q.aphorism, marginX + 13, qY);

    drawFooter(q.pageNumber, false);
  });

  // =========================================================================
  // PAGE 8: SUMMARY & CALL TO ACTION
  // =========================================================================
  doc.addPage();
  drawLightPageBackground();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 118, 112);
  doc.text(data.summary.kicker, marginX, 23);

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(19, 35, 50);
  doc.text(data.summary.title, marginX, 39);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(35, 43, 51);
  doc.text(data.summary.lead, marginX, 55);

  let sY = 69;
  data.summary.items.forEach((item, idx) => {
    doc.setFillColor(18, 118, 112);
    doc.circle(marginX + 4, sY - 1.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(String(idx + 1), marginX + 4, sY - 0.3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(25, 33, 41);
    doc.text(item, marginX + 12, sY);
    sY += 13;
  });

  // Subtle horizontal divider
  sY += 4;
  doc.setDrawColor(218, 215, 205);
  doc.setLineWidth(0.3);
  doc.line(marginX, sY, pageWidth - marginX, sY);

  sY += 13;
  doc.setFont('times', 'normal');
  doc.setFontSize(13.5);
  doc.setTextColor(25, 33, 41);
  const quoteLines = doc.splitTextToSize(data.summary.closingQuote, contentWidth);
  doc.text(quoteLines, marginX, sY);

  sY += quoteLines.length * 7 + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 118, 112);
  doc.text(data.summary.furtherKicker, marginX, sY);

  sY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.2);
  doc.setTextColor(35, 43, 51);
  const fullFurther = `${data.summary.furtherTextBefore}${data.summary.furtherBoldTitle}${data.summary.furtherTextAfter}`;
  const furtherLines = doc.splitTextToSize(fullFurther, contentWidth);
  doc.text(furtherLines, marginX, sY);

  sY += furtherLines.length * 5.8 + 10;

  // Dark Navy CTA Box
  doc.setFillColor(19, 35, 50);
  doc.roundedRect(marginX, sY, contentWidth, 21, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(data.summary.ctaTitle, pageWidth / 2, sY + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(195, 208, 220);
  doc.text(data.summary.ctaSubtitle, pageWidth / 2, sY + 15.5, { align: 'center' });

  drawFooter(data.summary.pageNumber, false);

  doc.save(data.pdfFilename);
}

// Concentric Circles SVG matching Page 1 top-right motif
function ConcentricCirclesMotif({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="260" cy="140" r="42" stroke="#2B3E4F" strokeWidth="1.2" />
      <circle cx="260" cy="140" r="76" stroke="#2B3E4F" strokeWidth="1.2" />
      <circle cx="260" cy="140" r="110" stroke="#2B3E4F" strokeWidth="1.2" />
      <circle cx="260" cy="140" r="144" stroke="#2B3E4F" strokeWidth="1.2" />
      <circle cx="260" cy="140" r="178" stroke="#2B3E4F" strokeWidth="1.2" />
      {/* Subtle orbital nodes */}
      <circle cx="186" cy="122" r="2.8" fill="#3B5164" />
      <circle cx="155" cy="172" r="2.8" fill="#3B5164" />
      <circle cx="198" cy="231" r="2.8" fill="#3B5164" />
      <circle cx="117" cy="128" r="2.8" fill="#3B5164" />
      <circle cx="146" cy="52" r="2.8" fill="#3B5164" />
      <circle cx="138" cy="215" r="2.8" fill="#3B5164" />
      <circle cx="92" cy="195" r="2.8" fill="#3B5164" />
    </svg>
  );
}

export default function Gratishefte() {
  const { language, setLanguage } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'all' | 'flip'>('flip');
  const [activePage, setActivePage] = useState<number>(1);
  const [flipState, setFlipState] = useState<{
    fromPage: number;
    toPage: number;
    dir: 1 | -1;
    id: number;
  } | null>(null);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [tenkSjolvBook, setTenkSjolvBook] = useState<Book | null>(null);
  const touchStartX = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  const goToPage = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(8, targetPage));
    if (clamped === activePage) return;
    const dir: 1 | -1 = clamped > activePage ? 1 : -1;
    if (flipTimerRef.current) {
      window.clearTimeout(flipTimerRef.current);
    }
    setFlipState({
      fromPage: activePage,
      toPage: clamped,
      dir,
      id: Date.now()
    });
    setActivePage(clamped);
    flipTimerRef.current = window.setTimeout(() => {
      setFlipState(null);
      flipTimerRef.current = null;
    }, 550);
  };

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) {
        window.clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  // Sync URL ?lang=en or ?lang=no if provided
  useEffect(() => {
    const urlLang = searchParams.get('lang');
    if (urlLang === 'en' || urlLang === 'no') {
      if (urlLang !== language) {
        setLanguage(urlLang);
      }
    }
  }, [searchParams]);

  // Look up "Tenk sjølv" book in Firestore if registered
  useEffect(() => {
    let isMounted = true;
    const findBook = async () => {
      try {
        const q = query(collection(db, 'books'));
        const snap = await getCachedDocs(q, 'books_all');
        const books = snap.docs.map(d => ({ id: d.id, ...d.data() } as Book));
        const match = books.find(b => {
          const t = (b.title || '').toLowerCase();
          const tEn = (b.titleEn || '').toLowerCase();
          return t.includes('tenk sjølv') || t.includes('tenk sjolv') || tEn.includes('think for yourself');
        }) || books.find(b => b.isHeroFocus);
        if (isMounted && match) {
          setTenkSjolvBook(match);
        }
      } catch (e) {
        // fallback quietly
      }
    };
    findBook();
    return () => { isMounted = false; };
  }, []);

  const currentLang: BookletLang = language === 'en' ? 'en' : 'no';
  const content = BOOKLET_DATA[currentLang];

  const handleLanguageChange = (newLang: BookletLang) => {
    setLanguage(newLang);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('lang', newLang);
    setSearchParams(nextParams, { replace: true });
  };

  const handleCopyPrompt = (promptText: string, key: string) => {
    // Strip outer guillemets or curly quotes for clean pasting into AI chat
    const clean = promptText.replace(/^[«“"]|[»”"]$/g, '').trim();
    navigator.clipboard.writeText(clean);
    setCopiedPromptIndex(key);
    setTimeout(() => setCopiedPromptIndex(null), 2200);
  };

  const handleShareUrl = () => {
    const shareUrl = `${window.location.origin}/gratishefte${currentLang === 'en' ? '?lang=en' : ''}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  // Resolve book link for Page 8 CTA & Buy Book CTA
  const bookUrl = (() => {
    if (currentLang === 'en') {
      if (tenkSjolvBook?.buyLinkEn) return { href: tenkSjolvBook.buyLinkEn, external: true };
      if (tenkSjolvBook?.buyLink && tenkSjolvBook.buyLink.includes('amazon')) return { href: tenkSjolvBook.buyLink, external: true };
      return { href: content.summary.ctaUrl, external: true };
    }
    if (tenkSjolvBook) {
      const slug = tenkSjolvBook.promoSlug || slugify(tenkSjolvBook.title);
      return { href: `/salg/${slug}`, external: false };
    }
    return { href: '/boker', external: false };
  })();

  const directBuyUrl = (() => {
    if (currentLang === 'en') {
      if (tenkSjolvBook?.buyLinkEn) return { href: tenkSjolvBook.buyLinkEn, external: true };
      if (tenkSjolvBook?.buyLink) return { href: tenkSjolvBook.buyLink, external: true };
      return { href: content.summary.ctaUrl, external: true };
    }
    if (tenkSjolvBook?.buyLink) {
      return { href: tenkSjolvBook.buyLink, external: true };
    }
    return bookUrl;
  })();

  // Keyboard navigation in flip mode
  useEffect(() => {
    if (viewMode !== 'flip') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && activePage < 8) {
        goToPage(activePage + 1);
      } else if (e.key === 'ArrowLeft' && activePage > 1) {
        goToPage(activePage - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode, activePage]);

  // Helper to render standard page footer
  const renderPageFooter = (pageNum: string, dark = false) => (
    <div
      className={`mt-auto pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-sans ${
        dark ? 'border-[#2E4152] text-[#A8B8C6]' : 'border-[#DAD7CD] text-[#656D74]'
      }`}
    >
      <div>
        <div className={`font-bold tracking-wider uppercase ${dark ? 'text-white' : 'text-[#4A525A]'}`}>
          {content.footerLeftBold}
        </div>
        <div className="text-[10.5px] mt-0.5">{content.footerLeftSub}</div>
      </div>
      <div className="font-mono text-xs shrink-0 self-end sm:self-start">{pageNum}</div>
    </div>
  );

  // Render an individual booklet page (1..8)
  const renderPage = (pageIndex: number) => {
    // PAGE 1: COVER
    if (pageIndex === 1) {
      return (
        <article
          key="page-1"
          className="relative bg-[#132332] text-white w-full aspect-[1/1.414] min-h-[640px] sm:min-h-[780px] p-8 sm:p-14 md:p-16 flex flex-col justify-between overflow-hidden shadow-xl border border-[#1E3246] print:shadow-none print:break-after-page"
        >
          <ConcentricCirclesMotif className="absolute -top-6 -right-6 w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] pointer-events-none opacity-95" />

          <div className="relative z-10 pt-2 sm:pt-4">
            <div className="w-16 h-1.5 bg-[#0F7E79] mb-6" />
            <p className="text-xs sm:text-sm font-sans tracking-[0.16em] uppercase text-[#C5D2DE] mb-10 sm:mb-14">
              {content.cover.kicker}
            </p>

            <h2 className="font-serif font-bold text-3xl sm:text-5xl md:text-[52px] leading-[1.16] tracking-wide text-white uppercase space-y-1">
              {content.cover.titleLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h2>

            <div className="w-16 h-1 bg-[#B58442] mt-8 sm:mt-10 mb-7 sm:mb-8" />

            <p className="text-base sm:text-xl font-sans text-[#E4ECF2] font-normal max-w-xl leading-relaxed">
              {content.cover.subtitle}
            </p>
          </div>

          <div className="relative z-10 mt-16">
            <div className="mb-8">
              <div className="font-serif font-bold text-xl sm:text-2xl text-white">
                {content.cover.author}
              </div>
              <div className="font-sans text-xs sm:text-sm text-[#B0C0CE] mt-1.5">
                {content.cover.domain}
              </div>
            </div>

            {renderPageFooter(content.cover.pageNumber, true)}
          </div>
        </article>
      );
    }

    // PAGE 2: INTRO ("FØR DU BYRJAR" / "BEFORE YOU BEGIN")
    if (pageIndex === 2) {
      return (
        <article
          key="page-2"
          className="relative bg-[#F4F2EA] text-[#132332] w-full aspect-[1/1.414] min-h-[640px] sm:min-h-[780px] p-8 sm:p-14 md:p-16 flex flex-col justify-between shadow-xl border border-stone-200/90 border-t-[6px] border-t-[#127670] print:shadow-none print:break-after-page"
        >
          <div>
            <div className="text-xs sm:text-sm font-sans font-bold tracking-[0.08em] uppercase text-[#127670] mb-4">
              {content.intro.kicker}
            </div>

            <h2 className="font-serif font-bold text-2xl sm:text-4xl md:text-[40px] text-[#132332] leading-[1.18] mb-8">
              {content.intro.title}
            </h2>

            <div className="space-y-5 font-sans text-sm sm:text-[16.5px] text-[#232B33] leading-[1.68]">
              {content.intro.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="my-8 bg-[#E6E6E4] border-l-[4px] border-l-[#127670] rounded-r-md p-6 sm:p-7">
              <p className="font-serif text-lg sm:text-[21px] text-[#132332] leading-relaxed">
                {content.intro.callout}
              </p>
            </div>

            <p className="font-sans italic text-xs sm:text-sm text-[#5A626A] leading-relaxed">
              {content.intro.footnote}
            </p>
          </div>

          {renderPageFooter(content.intro.pageNumber, false)}
        </article>
      );
    }

    // PAGES 3 - 7: QUESTIONS 01 - 05
    if (pageIndex >= 3 && pageIndex <= 7) {
      const q = content.questions[pageIndex - 3];
      const copyKey = `${currentLang}-${q.number}`;
      const isCopied = copiedPromptIndex === copyKey;

      return (
        <article
          key={`page-${pageIndex}`}
          className="relative bg-[#F4F2EA] text-[#132332] w-full aspect-[1/1.414] min-h-[640px] sm:min-h-[780px] p-8 sm:p-14 md:p-16 flex flex-col justify-between shadow-xl border border-stone-200/90 border-t-[6px] border-t-[#127670] print:shadow-none print:break-after-page"
        >
          <div>
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-sans font-bold tracking-[0.08em] uppercase text-[#127670]">
                {q.kicker}
              </span>
              <span className="w-8 h-8 rounded-full bg-[#B5894B] text-white font-sans font-bold text-sm flex items-center justify-center shadow-xs">
                {q.badgeNumber}
              </span>
            </div>

            {/* Question Title */}
            <h2 className="font-serif font-bold text-2xl sm:text-4xl md:text-[38px] text-[#132332] leading-[1.18] mb-3">
              {q.title}
            </h2>

            {/* Subtitle */}
            <p className="font-sans text-base sm:text-[18px] text-[#127670] font-medium mb-6">
              {q.subtitle}
            </p>

            {/* Body Paragraphs */}
            <div className="space-y-4 font-sans text-sm sm:text-[16px] text-[#232B33] leading-[1.65] mb-7">
              {q.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* DØME / EXAMPLE BOX */}
            <div className="bg-[#E8E8E5] border-l-[4px] border-l-[#127670] rounded-r-md p-5 sm:p-6 mb-4">
              <div className="text-xs font-sans font-bold uppercase tracking-wider text-[#127670] mb-1.5">
                {q.exampleLabel}
              </div>
              <p className="font-sans text-sm sm:text-[15px] text-[#1E262E] leading-relaxed">
                {q.exampleText}
              </p>
            </div>

            {/* PRØV DETTE MED KI / TRY THIS WITH AI BOX */}
            <div className="bg-[#FAF9F5] border-l-[4px] border-l-[#B5894B] rounded-r-md p-5 sm:p-6 mb-6 relative group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#B5894B]">
                  {q.tryLabel}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(q.tryPrompt, copyKey)}
                  className="print:hidden inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold text-[#132332]/70 hover:text-[#132332] bg-[#F4F2EA] hover:bg-[#E8E6DC] px-2.5 py-1 rounded transition-colors"
                  title={currentLang === 'en' ? 'Copy AI prompt' : 'Kopier spørsmålet'}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#127670]" />
                      <span className="text-[#127670]">
                        {currentLang === 'en' ? 'Copied!' : 'Kopiert!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{currentLang === 'en' ? 'Copy prompt' : 'Kopier tekst'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-sans text-sm sm:text-[15px] text-[#1E262E] leading-relaxed">
                {q.tryPrompt}
              </p>
            </div>

            {/* Bottom Aphorism */}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-8 h-[2px] bg-[#B5894B] shrink-0" />
              <p className="font-serif font-bold text-base sm:text-[18px] text-[#132332]">
                {q.aphorism}
              </p>
            </div>
          </div>

          {renderPageFooter(q.pageNumber, false)}
        </article>
      );
    }

    // PAGE 8: SUMMARY & CTA
    return (
      <article
        key="page-8"
        className="relative bg-[#F4F2EA] text-[#132332] w-full aspect-[1/1.414] min-h-[640px] sm:min-h-[780px] p-8 sm:p-14 md:p-16 flex flex-col justify-between shadow-xl border border-stone-200/90 border-t-[6px] border-t-[#127670] print:shadow-none"
      >
        <div>
          <div className="text-xs sm:text-sm font-sans font-bold tracking-[0.08em] uppercase text-[#127670] mb-3">
            {content.summary.kicker}
          </div>

          <h2 className="font-serif font-bold text-2xl sm:text-4xl md:text-[40px] text-[#132332] leading-[1.18] mb-5">
            {content.summary.title}
          </h2>

          <p className="font-sans text-sm sm:text-[16px] text-[#232B33] mb-6">
            {content.summary.lead}
          </p>

          {/* 5 Numbered Items */}
          <div className="space-y-3.5 mb-8">
            {content.summary.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3.5">
                <span className="w-7 h-7 rounded-full bg-[#127670] text-white font-sans font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-sans text-sm sm:text-[16px] text-[#132332] font-medium">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <hr className="border-[#DAD7CD] my-7" />

          {/* Closing Quote */}
          <p className="font-serif text-base sm:text-[20px] text-[#132332] leading-[1.55] mb-8">
            {content.summary.closingQuote}
          </p>

          {/* VIL DU GÅ VIDARE? / WANT TO EXPLORE FURTHER? */}
          <div className="mb-7">
            <div className="text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-[#127670] mb-2">
              {content.summary.furtherKicker}
            </div>
            <p className="font-sans text-xs sm:text-[14.5px] text-[#232B33] leading-relaxed">
              {content.summary.furtherTextBefore}
              <strong className="font-bold text-[#132332]">{content.summary.furtherBoldTitle}</strong>
              {content.summary.furtherTextAfter}
            </p>
          </div>

          {/* Dark Navy CTA Button */}
          {bookUrl.external ? (
            <a
              href={bookUrl.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#132332] hover:bg-[#1c3347] text-white text-center py-4 px-6 rounded-lg transition-colors shadow-md group"
            >
              <div className="font-sans font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2">
                <span>{content.summary.ctaTitle}</span>
                <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-sans text-xs text-[#C5D2DE] mt-1">
                {content.summary.ctaSubtitle}
              </div>
            </a>
          ) : (
            <Link
              to={bookUrl.href}
              className="block w-full bg-[#132332] hover:bg-[#1c3347] text-white text-center py-4 px-6 rounded-lg transition-colors shadow-md group"
            >
              <div className="font-sans font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2">
                <span>{content.summary.ctaTitle}</span>
                <ArrowRight className="w-4 h-4 opacity-80 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="font-sans text-xs text-[#C5D2DE] mt-1">
                {content.summary.ctaSubtitle}
              </div>
            </Link>
          )}
        </div>

        {renderPageFooter(content.summary.pageNumber, false)}
      </article>
    );
  };

  return (
    <div className="bg-[#FAF8F5] min-h-screen text-[#132332]">
      {/* HERO BANNER — HIDDEN WHEN PRINTING */}
      <section className="print:hidden bg-[#132332] text-white relative overflow-hidden border-b border-[#24384B]">
        <ConcentricCirclesMotif className="absolute -right-16 -top-16 w-[480px] h-[480px] opacity-40 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20 relative z-10">
          {/* Top Bar: Language Toggle & Share */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3 text-xs tracking-[0.18em] uppercase text-[#C5D2DE]">
              <span className="w-3 h-1 bg-[#0F7E79] inline-block" />
              <span>{ content.cover.kicker }</span>
              <span aria-hidden="true">·</span>
              <span>8 {currentLang === 'en' ? 'PAGES' : 'SIDER'}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <div className="inline-flex items-center bg-[#0D1822] p-1 rounded border border-white/15">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('no')}
                  className={`px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase rounded transition-colors ${
                    currentLang === 'no'
                      ? 'bg-[#0F7E79] text-white shadow-xs'
                      : 'text-[#B8C7D4] hover:text-white'
                  }`}
                >
                  Norsk
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase rounded transition-colors ${
                    currentLang === 'en'
                      ? 'bg-[#0F7E79] text-white shadow-xs'
                      : 'text-[#B8C7D4] hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                onClick={handleShareUrl}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold tracking-wider uppercase rounded border border-white/15 inline-flex items-center gap-1.5 transition-colors"
                title={currentLang === 'en' ? 'Copy link to this page' : 'Kopier lenkje til denne sida'}
              >
                {copiedShareLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentLang === 'en' ? 'Link copied' : 'Lenkje kopiert'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{currentLang === 'en' ? 'Share' : 'Del side'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Hero Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="font-serif font-bold text-3xl sm:text-5xl lg:text-[52px] leading-[1.12] text-white">
                {currentLang === 'en'
                  ? 'Five Questions to Ask Before You Trust an Answer from AI'
                  : 'Fem spørsmål du bør stilla før du stolar på eit svar frå KI'}
              </h1>

              <div className="w-16 h-1 bg-[#B58442]" />

              <p className="text-lg sm:text-xl text-[#E4ECF2] font-sans leading-relaxed max-w-2xl">
                {content.cover.subtitle}{' '}
                {currentLang === 'en'
                  ? 'Read the complete 8-page reader’s guide right here on the page, or download it for free as a printable PDF in Norwegian or English.'
                  : 'Les heile det gratis 8-siders heftet direkte her på sida, eller last det ned gratis som PDF på norsk eller engelsk.'}
              </p>

              {/* Primary Download Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => generateBookletPdf(currentLang)}
                  className="px-6 py-4 bg-[#0F7E79] hover:bg-[#12938d] text-white font-sans text-xs sm:text-sm font-bold tracking-wider uppercase rounded transition-all shadow-lg inline-flex items-center gap-2.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {currentLang === 'en'
                      ? 'Download PDF (English)'
                      : 'Last ned gratis PDF (Norsk)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => generateBookletPdf(currentLang === 'no' ? 'en' : 'no')}
                  className="px-5 py-4 bg-white/10 hover:bg-white/15 border border-white/25 text-white font-sans text-xs sm:text-sm font-semibold tracking-wider uppercase rounded transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#B58442]" />
                  <span>
                    {currentLang === 'en'
                      ? 'Last ned norsk PDF'
                      : 'Download English PDF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('all');
                    setTimeout(() => window.print(), 150);
                  }}
                  className="px-4 py-4 text-[#C5D2DE] hover:text-white font-sans text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{currentLang === 'en' ? 'Print' : 'Skriv ut'}</span>
                </button>
              </div>

              {/* Book Callout inside Hero Grid: Liked the questions or want to read more? Buy the book */}
              <div className="mt-4 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.04] p-4 sm:p-5 rounded-md border border-white/10">
                <div className="space-y-1">
                  <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#B58442]">
                    {currentLang === 'en'
                      ? 'BASED ON THE BOOK THINK FOR YOURSELF!'
                      : 'UTARBEIDD FRÅ BOKA TENK SJØLV!'}
                  </div>
                  <p className="text-sm text-[#E4ECF2] font-sans leading-snug">
                    {currentLang === 'en'
                      ? 'Liked the questions or want to read more? Get the full book.'
                      : 'Likte du spørsmåla eller vil du lese meir? Kjøp heile boka.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {directBuyUrl.external ? (
                    <a
                      href={directBuyUrl.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-[#B58442] hover:bg-[#c8934b] text-white font-sans text-xs font-bold tracking-wider uppercase rounded transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{currentLang === 'en' ? 'Buy the book' : 'Kjøp boka'}</span>
                    </a>
                  ) : (
                    <Link
                      to={directBuyUrl.href}
                      className="px-5 py-3 bg-[#B58442] hover:bg-[#c8934b] text-white font-sans text-xs font-bold tracking-wider uppercase rounded transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{currentLang === 'en' ? 'Buy the book' : 'Kjøp boka'}</span>
                    </Link>
                  )}

                  {!bookUrl.external && (
                    <Link
                      to={bookUrl.href}
                      className="px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-sans text-xs font-semibold tracking-wider uppercase rounded transition-all inline-flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{currentLang === 'en' ? 'Read more' : 'Les meir'}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Miniature Interactive Cover Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div
                onClick={() => {
                  const readerEl = document.getElementById('booklet-reader');
                  readerEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="cursor-pointer group relative w-full max-w-[300px] aspect-[1/1.414] bg-[#132332] border border-white/20 rounded shadow-2xl p-6 flex flex-col justify-between overflow-hidden hover:-translate-y-1.5 transition-transform duration-300"
              >
                <ConcentricCirclesMotif className="absolute -top-4 -right-4 w-48 h-48 opacity-90 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-10 h-1 bg-[#0F7E79] mb-3" />
                  <div className="text-[8px] tracking-[0.16em] uppercase text-[#C5D2DE] mb-5">
                    {content.cover.kicker}
                  </div>
                  <div className="font-serif font-bold text-lg leading-tight text-white uppercase space-y-0.5">
                    {content.cover.titleLines.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                  <div className="w-10 h-0.5 bg-[#B58442] my-4" />
                  <div className="text-[10px] text-[#E4ECF2] leading-snug">
                    {content.cover.subtitle}
                  </div>
                </div>
                <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[9px] text-[#B8C7D4]">
                  <span className="font-serif font-bold text-white text-xs">{content.cover.author}</span>
                  <span>01 / 08</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* READER TOOLBAR — HIDDEN WHEN PRINTING */}
      <section
        id="booklet-reader"
        className="print:hidden sticky top-[73px] z-30 bg-[#FAF8F5]/95 backdrop-blur border-b border-stone-200 px-6 py-3.5"
      >
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Selector */}
          <div className="inline-flex items-center bg-stone-200/80 p-1 rounded">
            <button
              type="button"
              onClick={() => setViewMode('flip')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'flip'
                  ? 'bg-white text-[#132332] shadow-xs'
                  : 'text-stone-600 hover:text-[#132332]'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>{currentLang === 'en' ? 'Turn pages (01–08)' : 'Bla i heftet (01–08)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white text-[#132332] shadow-xs'
                  : 'text-stone-600 hover:text-[#132332]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{currentLang === 'en' ? 'All 8 pages (Scroll)' : 'Alle 8 sider (Skroll)'}</span>
            </button>
          </div>

          {/* Page Flip Controls or Quick Jump */}
          {viewMode === 'flip' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => goToPage(activePage - 1)}
                className="p-2 rounded bg-white border border-stone-300 hover:bg-stone-100 disabled:opacity-40 transition-colors cursor-pointer"
                title={currentLang === 'en' ? 'Previous page' : 'Førre side'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-semibold px-3">
                {String(activePage).padStart(2, '0')} / 08
              </span>
              <button
                type="button"
                disabled={activePage >= 8}
                onClick={() => goToPage(activePage + 1)}
                className="p-2 rounded bg-white border border-stone-300 hover:bg-stone-100 disabled:opacity-40 transition-colors cursor-pointer"
                title={currentLang === 'en' ? 'Next page' : 'Neste side'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500">
              <span>{currentLang === 'en' ? 'Jump to question:' : 'Hopp til spørsmål:'}</span>
              {[1, 2, 3, 4, 5].map(qNum => (
                <button
                  key={qNum}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`booklet-page-${qNum + 2}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-6 h-6 rounded-full bg-stone-200 hover:bg-[#127670] hover:text-white text-[#132332] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  {qNum}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BOOKLET PAGES CONTAINER */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto print:p-0 print:max-w-none">
        {viewMode === 'flip' ? (
          <div>
            {/* 3D Page-Turning Stage */}
            <div
              className="relative select-none"
              style={{ perspective: '2200px' }}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const diff = touchStartX.current - e.changedTouches[0].clientX;
                if (diff > 45 && activePage < 8) {
                  goToPage(activePage + 1);
                } else if (diff < -45 && activePage > 1) {
                  goToPage(activePage - 1);
                }
                touchStartX.current = null;
              }}
            >
              {/* Stacked Paper Edges Effect Underneath */}
              {activePage < 8 && (
                <>
                  <div
                    className="pointer-events-none absolute inset-y-2 -right-2.5 w-3 bg-[#E3E0D6] border border-stone-300/80 rounded-r-sm shadow-md hidden sm:block"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-y-1 -right-1.5 w-2 bg-[#ECEAE0] border border-stone-300/90 rounded-r-sm shadow-xs hidden sm:block"
                    aria-hidden="true"
                  />
                </>
              )}

              {/* Left & Right Floating Page-Turn Paddles on Desktop */}
              {activePage > 1 && (
                <button
                  type="button"
                  onClick={() => goToPage(activePage - 1)}
                  className="print:hidden hidden lg:flex absolute -left-14 top-1/2 -translate-y-1/2 z-30 w-10 h-16 items-center justify-center rounded-l-md bg-white/90 hover:bg-[#132332] text-[#132332] hover:text-white border border-stone-200 shadow-md transition-all cursor-pointer group"
                  title={currentLang === 'en' ? 'Turn to previous page' : 'Bla til førre side'}
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}

              {activePage < 8 && (
                <button
                  type="button"
                  onClick={() => goToPage(activePage + 1)}
                  className="print:hidden hidden lg:flex absolute -right-14 top-1/2 -translate-y-1/2 z-30 w-10 h-16 items-center justify-center rounded-r-md bg-white/90 hover:bg-[#132332] text-[#132332] hover:text-white border border-stone-200 shadow-md transition-all cursor-pointer group"
                  title={currentLang === 'en' ? 'Turn to next page' : 'Bla til neste side'}
                >
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Two-Layer Solid 3D Book Leaf Stage */}
              <div className="relative w-full" style={{ transformStyle: 'preserve-3d' }}>
                {/* LAYER 1: Stationary Base Page Underneath (Always 100% solid, never fades out) */}
                <div className="relative w-full z-10">
                  {/* Realistic Booklet Spine Crease & Shading along Left Edge */}
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-black/22 via-black/6 to-transparent z-20"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 left-2 w-px bg-white/15 z-20"
                    aria-hidden="true"
                  />

                  {renderPage(flipState?.dir === -1 ? flipState.fromPage : activePage)}

                  {/* Dynamic shadow cast onto the underneath page while the top leaf turns */}
                  {flipState && (
                    <motion.div
                      key={`shadow-${flipState.id}`}
                      initial={{ opacity: flipState.dir === 1 ? 0.32 : 0 }}
                      animate={{ opacity: flipState.dir === 1 ? 0 : 0.32 }}
                      transition={{ duration: 0.52, ease: 'easeInOut' }}
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-black/10 z-25"
                    />
                  )}

                  {/* Interactive Bottom-Right Page Curl Corner to Turn Forward */}
                  {activePage < 8 && !flipState && (
                    <button
                      type="button"
                      onClick={() => goToPage(activePage + 1)}
                      className="print:hidden group/curl absolute bottom-0 right-0 z-30 w-20 h-20 flex items-end justify-end overflow-hidden focus:outline-none cursor-pointer"
                      title={currentLang === 'en' ? 'Click to turn page' : 'Klikk for å bla om sida'}
                    >
                      <span
                        className="w-11 h-11 group-hover/curl:w-16 group-hover/curl:h-16 transition-all duration-300 bg-gradient-to-tl from-[#D5D0C2] via-[#EAE6DA] to-white shadow-[-4px_-4px_12px_rgba(0,0,0,0.22)] rounded-tl-md flex items-center justify-center border-t border-l border-stone-300/80"
                        style={{
                          clipPath: 'polygon(0 0, 0% 100%, 100% 0)'
                        }}
                      />
                      <span className="sr-only">
                        {currentLang === 'en' ? 'Next page' : 'Neste side'}
                      </span>
                    </button>
                  )}
                </div>

                {/* LAYER 2: Turning Leaf on Top (Hinged at Left Spine, 100% Solid Paper) */}
                {flipState && (
                  <motion.div
                    key={`leaf-${flipState.id}`}
                    initial={{
                      rotateY: flipState.dir === 1 ? 0 : -112
                    }}
                    animate={{
                      rotateY: flipState.dir === 1 ? -112 : 0
                    }}
                    transition={{
                      duration: 0.52,
                      ease: flipState.dir === 1 ? [0.4, 0.0, 0.2, 1] : [0.22, 1, 0.36, 1]
                    }}
                    style={{
                      transformOrigin: 'left center',
                      transformStyle: 'preserve-3d',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                    className="pointer-events-none absolute inset-0 z-30 w-full shadow-[28px_0_55px_rgba(0,0,0,0.35)]"
                  >
                    {/* Spine crease on the turning leaf */}
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-black/25 via-black/8 to-transparent z-20"
                      aria-hidden="true"
                    />
                    {/* Subtle paper-bend highlight across the turning page */}
                    <motion.div
                      initial={{ opacity: flipState.dir === 1 ? 0 : 0.22 }}
                      animate={{ opacity: flipState.dir === 1 ? 0.22 : 0 }}
                      transition={{ duration: 0.52 }}
                      className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/25 via-transparent to-white/10 z-25"
                    />

                    {renderPage(flipState.dir === 1 ? flipState.fromPage : flipState.toPage)}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Bottom Flip Navigation Bar */}
            <div className="print:hidden mt-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded border border-stone-200 shadow-xs">
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => goToPage(activePage - 1)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 rounded text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{currentLang === 'en' ? 'Previous' : 'Førre side'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    className={`w-7 h-7 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      activePage === n
                        ? 'bg-[#132332] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={activePage >= 8}
                onClick={() => goToPage(activePage + 1)}
                className="px-4 py-2 bg-[#132332] hover:bg-[#1e354a] text-white disabled:opacity-40 rounded text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{currentLang === 'en' ? 'Next' : 'Neste side'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10 print:space-y-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(pageNum => (
              <div key={pageNum} id={`booklet-page-${pageNum}`} className="scroll-mt-32">
                {renderPage(pageNum)}
              </div>
            ))}
          </div>
        )}

        {/* BOTTOM BOOK PROMO & DOWNLOAD CARD (HIDDEN ON PRINT) */}
        <div className="print:hidden mt-14 bg-[#132332] text-white rounded-lg p-8 sm:p-10 shadow-xl border border-[#24384B] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="text-xs font-sans font-bold uppercase tracking-widest text-[#B58442]">
              {currentLang === 'en' ? 'WANT TO READ MORE?' : 'LIKTE DU SPØRSMÅLA ELLER VIL DU LESE MEIR?'}
            </div>
            <h3 className="font-serif font-bold text-2xl sm:text-3xl text-white">
              {currentLang === 'en'
                ? 'Liked the questions? Buy the book THINK FOR YOURSELF!'
                : 'Likte du spørsmåla? Kjøp boka TENK SJØLV!'}
            </h3>
            <p className="font-sans text-sm text-[#C5D2DE] leading-relaxed">
              {currentLang === 'en'
                ? 'In the book I explore how artificial intelligence changes learning, language, attention, judgment, and democracy — and how we keep our own thinking alive.'
                : 'I boka utforskar eg korleis kunstig intelligens påverkar læring, språk, merksemd, dømmekraft og demokrati – og kva vi kan gjera for å halda vår eiga tenking levande.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {directBuyUrl.external ? (
              <a
                href={directBuyUrl.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-[#B58442] hover:bg-[#c6924b] text-white text-xs font-bold uppercase tracking-wider rounded inline-flex items-center gap-2 transition-colors shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{currentLang === 'en' ? 'Buy the book' : 'Kjøp boka'}</span>
              </a>
            ) : (
              <Link
                to={directBuyUrl.href}
                className="px-6 py-3.5 bg-[#B58442] hover:bg-[#c6924b] text-white text-xs font-bold uppercase tracking-wider rounded inline-flex items-center gap-2 transition-colors shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{currentLang === 'en' ? 'Buy the book' : 'Kjøp boka'}</span>
              </Link>
            )}
            {!bookUrl.external && (
              <Link
                to={bookUrl.href}
                className="px-5 py-3.5 bg-white/10 hover:bg-white/15 border border-white/25 text-white text-xs font-bold uppercase tracking-wider rounded inline-flex items-center gap-2 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>{currentLang === 'en' ? 'Read more' : 'Les meir om boka'}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => generateBookletPdf(currentLang)}
              className="px-5 py-3.5 bg-[#0F7E79] hover:bg-[#12938d] text-white text-xs font-bold uppercase tracking-wider rounded inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{currentLang === 'en' ? 'Download PDF' : 'Last ned PDF'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
