import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { language, t } = useLanguage();
  const [aboutData, setAboutData] = useState<{ shortBioNo?: string; shortBioEn?: string; imageUrl?: string }>({});

  useEffect(() => {
    const docRef = doc(db, 'settings', 'about');
    getDoc(docRef).then(snap => {
      if (snap.exists()) {
        setAboutData(snap.data());
      }
    }).catch(async () => {
      try {
        const cachedSnap = await getDocFromCache(docRef);
        if (cachedSnap.exists()) {
          setAboutData(cachedSnap.data());
        }
      } catch (e) {
        // quiet fallback
      }
    });
  }, []);

  return (
    <section className="bg-brand-dark text-white py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Portrait */}
        <div className="lg:col-span-3">
          <div className="w-full max-w-[280px] mx-auto lg:mx-0">
            {aboutData.imageUrl ? (
              <img 
                src={aboutData.imageUrl} 
                alt="Portrait of Øivind H. Solheim" 
                className="w-full h-auto object-cover filter grayscale contrast-125"
              />
            ) : (
              <img 
                src="/oivind-h-solheim.png" 
                alt="Portrait of Øivind H. Solheim" 
                className="w-full h-auto object-cover filter grayscale contrast-125"
              />
            )}
          </div>
        </div>

        {/* Text bio */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          <h3 className="text-xs font-sans tracking-[0.2em] font-semibold uppercase text-brand-accent mb-6">{t('ABOUT')}</h3>
          <div className="space-y-4 font-sans text-gray-300 font-light leading-relaxed mb-10 text-base flex-grow">
            {language === 'en' ? (
              aboutData.shortBioEn && aboutData.shortBioEn.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            ) : (
              aboutData.shortBioNo && aboutData.shortBioNo.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            )}
          </div>
          <Link to="/om-meg" className="inline-flex items-center text-brand-accent hover:text-white transition-colors font-sans text-xs font-semibold tracking-widest uppercase mt-auto">
            {language === 'en' ? 'READ FULL STORY' : 'LES HEILE HISTORIA'} <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        {/* Quote Block */}
        <div className="lg:col-span-5 h-full pt-8 lg:pt-0">
          <div className="border border-white/20 p-8 md:p-12 lg:p-16 relative h-full flex flex-col justify-center">
            <span className="text-7xl text-brand-accent font-serif leading-none absolute -top-8 left-8 bg-brand-dark px-2">“</span>
            <p className="font-serif italic text-xl md:text-2xl text-gray-200 leading-relaxed mb-8 relative z-10 pt-4">
              Vi treng ikkje fleire perfekte menneske.<br/>
              Vi treng fleire modige menneske.<br/>
              Menneske som tør å tenke sjølve,<br/>
              seie frå og stå opp for det som er rett.
            </p>
            <div className="text-brand-accent font-serif italic text-lg text-right w-full">
              – Øivind H. Solheim
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
