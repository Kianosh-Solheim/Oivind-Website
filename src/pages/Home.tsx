import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import heroImg from '../assets/bilde_framside.jpeg';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { t, language } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
  };

  return (
    <>
      <section className="relative h-[80vh] min-h-[600px] w-full bg-brand-dark flex flex-col justify-center px-6 md:px-12 lg:px-24 object-cover overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.7 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            src={heroImg}
            alt="Lake mirroring sky" 
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
        </div>
        
        <motion.div 
          className="relative z-10 max-w-2xl text-white"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={itemVariants} className="text-5xl md:text-7xl font-serif leading-tight">
            {language === 'en' ? (
              <>Stories.<br />Reflections.<br />Human presence.</>
            ) : (
              <>Historier.<br />Refleksjoner.<br />Menneskeleg nærvær.</>
            )}
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-8 text-xl md:text-2xl font-serif italic font-light text-gray-200">
            {language === 'en' ? 'About the life we live. And the future we choose to create.' : 'Om livet vi lever. Og framtida vi vel å skapa.'}
          </motion.p>
          <motion.div variants={itemVariants} className="mt-12">
            <Link to="/refleksjonar" className="border border-white hover:bg-white hover:text-brand-dark transition-all duration-300 text-white font-sans text-xs tracking-[0.15em] uppercase py-4 px-8 inline-block">
              {language === 'en' ? 'READ MY LATEST REFLECTIONS' : 'LES MINE SISTE REFLEKSJONAR'}
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-24 px-6 md:px-12 lg:px-24 mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center overflow-hidden">
        <motion.div 
          className="max-w-xl"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="text-xs font-sans tracking-[0.3em] font-semibold text-brand-muted uppercase">{language === 'en' ? 'Welcome' : 'Velkommen'}</span>
          <h2 className="text-4xl md:text-5xl mt-6 font-serif text-brand-dark leading-tight">
            {language === 'en' ? 'I write to understand.' : 'Eg skriv for å forstå.'}
          </h2>
          <div className="w-16 h-px bg-brand-accent mt-8 mb-8"></div>
          <p className="text-base md:text-lg text-brand-dark/80 leading-relaxed font-sans mb-10">
            {language === 'en' ? 
              'To put into words what worries me, inspires me, and what needs to be said out loud. My texts spring from nature, from people, from the times we live in – and from the hope that we can create a better tomorrow.' : 
              'For å sette ord på det som uroar meg, inspirerer meg, og det som må seiast høgt. Mine tekstar spring ut frå naturen, frå menneske, frå tidene vi lever i – og frå håpet om at vi kan skape ein betre morgondag.'
            }
          </p>
          <Link to="/om-meg" className="inline-flex items-center text-brand-accent hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase">
            {t('READ_MORE')} <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </motion.div>
        <motion.div 
          className="w-full relative group"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <div className="absolute inset-0 border border-brand-accent/20 translate-x-4 translate-y-4 -z-10 transition-transform duration-500 group-hover:translate-x-6 group-hover:translate-y-6"></div>
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" 
            alt="Person sitting on a rock overlooking mountains" 
            className="w-full aspect-[4/3] lg:aspect-[16/10] object-cover"
          />
        </motion.div>
      </section>

      <section className="py-24 px-6 md:px-12 text-center bg-brand-sand flex flex-col items-center justify-center relative overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto relative"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.span 
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            whileInView={{ scale: 1, opacity: 0.5, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="text-8xl text-brand-accent/30 font-serif leading-none absolute -top-12 -left-12 hidden md:block"
          >
            “
          </motion.span>
          <p className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-brand-dark leading-snug">
            {language === 'en' ? 
              'Technology can amplify us. But only humanity can save us.' : 
              'Teknologien kan forsterka oss. Men berre menneskelegheit kan redde oss.'
            }
          </p>
          <p className="text-3xl md:text-5xl font-signature text-brand-dark mt-8 text-right flex justify-end items-center gap-4">
            Øivind H. Solheim
          </p>
        </motion.div>
      </section>

      <section className="pt-24 pb-32 px-6 md:px-12 lg:px-16 mx-auto bg-brand-light font-sans">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1800px] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80" alt="Bøker" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('BOOKS')}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {t('HOME_SUBTITLE')}
              </p>
              <Link to="/boker" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {t('SEE_BOOKS')} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1455390582262-044cdead27d8?w=800&q=80" alt="Refleksjoner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('REFLECTIONS')}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Thoughts on AI, democracy, aging, truth, and humanity.' : 'Tankar om KI, demokrati, aldring, sanning og det menneskelege.'}
              </p>
              <Link to="/refleksjonar" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'READ REFLECTIONS' : 'LES REFLEKSJONAR'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80" alt="Musikk" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('MUSIC')}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Songs, lyrics, and tones springing from life and time.' : 'Songar, tekster og tonar som spring ut frå livet og tida.'}
              </p>
              <Link to="/musikk" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'LISTEN TO MUSIC' : 'LYTT TIL MUSIKKEN'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1439853949703-ff2200f56f34?w=800&q=80" alt="Foto & Natur" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('PHOTO')} & NATUR</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Pictures from hikes, quiet moments, and nature.' : 'Bilete frå turar, stille augneblink og møte med naturen.'}
              </p>
              <Link to="/foto" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'SEE PHOTOS' : 'SJÅ BILETA'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100 hover:shadow-xl transition-shadow duration-500 rounded-sm overflow-hidden">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&q=80" alt="Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out grayscale opacity-90" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm tracking-widest font-semibold text-brand-dark mb-4">{t('VIDEO')} & {language === 'en' ? 'READINGS' : 'OPPLESING'}</h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed mb-10 flex-grow">
                {language === 'en' ? 'Thoughts from screen to voice. Readings, videos, and posts.' : 'Tankar frå skjerm til stemme. Opplesingar, videoar og innlegg.'}
              </p>
              <Link to="/video" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                {language === 'en' ? 'WATCH VIDEOS' : 'SJÅ VIDEOAR'} <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
