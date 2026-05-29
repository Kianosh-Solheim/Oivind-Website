import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../lib/AuthContext';

export default function Header() {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const isComposing = location.pathname.startsWith('/admin') && (location.search.includes('compose=true') || location.search.includes('edit='));
  
  if (isComposing) {
    return null;
  }

  const navLinks = [
    { to: '/', label: t('HOME') },
    { to: '/refleksjonar', label: t('REFLECTIONS') },
    { to: '/dagbok', label: t('DIARY') },
    { to: '/boker', label: t('BOOKS') },
    { to: '/om-meg', label: t('ABOUT') },
    { to: '/kontakt', label: t('CONTACT') },
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="px-6 py-6 md:px-12 flex flex-col xl:flex-row xl:items-end justify-between border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50"
    >
      <div className="flex justify-between items-center xl:mb-0 w-full xl:w-auto">
        <Link to="/">
          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
            <h1 className="text-xl md:text-2xl xl:text-3xl font-sans tracking-widest text-brand-dark font-medium leading-none">
              ØIVIND H. SOLHEIM
            </h1>
            <p className="text-brand-accent text-xs md:text-sm tracking-[0.2em] mt-2 font-medium">
              {t('THE_NORDIC_STORYTELLER')}
            </p>
          </motion.div>
        </Link>
        <button 
          className="xl:hidden text-brand-dark p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.div>
        </button>
      </div>
      
      <AnimatePresence>
        <nav className={`${isOpen ? 'flex flex-col mt-6' : 'hidden'} xl:flex xl:flex-wrap xl:mt-0 items-start xl:items-center gap-y-4 xl:gap-y-3 gap-x-6 text-sm font-semibold tracking-wider text-brand-dark w-full xl:w-auto`}>
          {navLinks.map((link, index) => (
            <motion.div key={link.to} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 + 0.3 }}>
              <Link 
                to={link.to} 
                className={`transition-colors relative group ${location.pathname === link.to ? 'text-brand-accent' : 'hover:text-brand-accent'}`} 
                onClick={() => setIsOpen(false)}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 w-0 h-px bg-brand-accent transition-all duration-300 group-hover:w-full ${location.pathname === link.to ? 'w-full' : ''}`}></span>
              </Link>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="w-full h-px xl:w-px xl:h-4 bg-gray-300 xl:mx-2 my-2 xl:my-0"></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center gap-3">
            <button onClick={() => setLanguage('no')} className={`transition-colors ${language === 'no' ? 'text-brand-accent' : 'hover:text-brand-accent'}`}>NO</button>
            <span className="text-gray-300">/</span>
            <button onClick={() => setLanguage('en')} className={`transition-colors ${language === 'en' ? 'text-brand-accent' : 'hover:text-brand-accent'}`}>EN</button>
          </motion.div>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="ml-4">
            <LoginButton />
          </motion.div>
        </nav>
      </AnimatePresence>
    </motion.header>
  );
}

function LoginButton() {
  const { user, signInWithGoogle, logout } = useAuth();
  const { language } = useLanguage();
  
  if (user) {
    return (
      <button onClick={logout} className="text-xs uppercase tracking-widest font-semibold border border-brand-dark px-4 py-2 hover:bg-brand-dark hover:text-white transition-colors">
        {language === 'en' ? 'LOG OUT' : 'LOGG UT'}
      </button>
    );
  }
  
  return (
    <button onClick={signInWithGoogle} className="text-xs uppercase tracking-widest font-semibold bg-brand-dark text-white px-4 py-2 hover:bg-black transition-colors">
      {language === 'en' ? 'LOG IN' : 'LOGG INN'}
    </button>
  );
}
