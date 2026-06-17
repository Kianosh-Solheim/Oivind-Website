import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function OmMeg() {
  const { language, t } = useLanguage();
  const [aboutData, setAboutData] = useState<{ bioNo?: string; bioEn?: string; imageUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    getDoc(doc(db, 'settings', 'about')).then(snap => {
      if (snap.exists()) {
        setAboutData(snap.data());
      }
      setLoading(false);
    }).catch((e) => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-brand-light">
        <div className="w-8 h-8 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  const bio = language === 'en' ? aboutData?.bioEn : aboutData?.bioNo;

  return (
    <div className="min-h-screen bg-brand-light pb-32">
      <section className="pt-32 pb-16 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-brand-dark mb-6 tracking-tight">
          {t('ABOUT')}
        </h1>
        <div className="w-24 h-1 bg-brand-accent mx-auto"></div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          <div className="lg:col-span-5 relative">
            <div className="sticky top-32">
              <div className="w-full bg-gray-100 aspect-[3/4] relative overflow-hidden">
                <img 
                  src={aboutData?.imageUrl || '/oivind-h-solheim.png'} 
                  alt="Portrait of Øivind H. Solheim" 
                  className="w-full h-full object-cover filter grayscale contrast-125 hover:grayscale-0 hover:contrast-100 transition-all duration-700"
                />
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <article className="prose prose-lg prose-headings:font-serif prose-headings:text-brand-dark prose-p:font-serif prose-p:text-brand-dark prose-p:leading-relaxed prose-a:text-brand-accent hover:prose-a:text-brand-dark max-w-none">
              {bio ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {bio}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-brand-muted italic">
                  {language === 'en' ? 'Biographical information is currently being updated.' : 'Biografisk informasjon blir for tiden oppdatert.'}
                </p>
              )}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
