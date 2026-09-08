import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Success() {
  const { language } = useLanguage();

  return (
    <div className="bg-brand-surface min-h-[80vh] pt-32 pb-20 px-6 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full bg-white p-12 border border-brand-sand shadow-sm text-center">
        <div className="flex flex-col items-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
          <h1 className="text-2xl font-serif text-brand-dark mb-4">
            {language === 'en' ? 'Thank you for your order!' : 'Takk for bestillinga!'}
          </h1>
          <p className="text-brand-dark/80 font-sans mb-8">
            {language === 'en' ? 'Your payment was successful and your order has been registered.' : 'Betalinga var vellukka og ordren er no registrert!'}
          </p>
          <Link to="/boker" className="bg-brand-dark text-white px-8 py-3 text-xs font-semibold tracking-widest uppercase hover:bg-black transition-colors">
            {language === 'en' ? 'Back to books' : 'Tilbake til bøker'}
          </Link>
        </div>
      </div>
    </div>
  );
}
