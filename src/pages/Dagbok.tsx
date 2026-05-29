import { useLanguage } from '../context/LanguageContext';

export default function Dagbok() {
  const { language } = useLanguage();

  return (
    <div className="bg-brand-surface min-h-screen py-32 text-center text-brand-muted flex items-center justify-center">
      <div className="max-w-2xl px-6">
        <h1 className="text-4xl md:text-5xl font-serif text-brand-dark mb-6">
          {language === 'en' ? 'Diary' : 'Dagbok'}
        </h1>
        <p className="text-lg md:text-xl font-sans leading-relaxed">
          {language === 'en' ? 'Coming soon. A place for daily thoughts and reflections.' : 'Kjem snart. Ein plass for daglege tankar og refleksjonar.'}
        </p>
      </div>
    </div>
  );
}
