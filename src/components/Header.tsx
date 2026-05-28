import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const isEnglish = location.pathname.startsWith('/English');
  const [isOpen, setIsOpen] = useState(false);

  const isComposing = location.pathname.startsWith('/admin') && (location.search.includes('compose=true') || location.search.includes('edit='));
  
  if (isComposing) {
    return null;
  }

  return (
    <header className="px-6 py-6 md:px-12 flex flex-col xl:flex-row xl:items-end justify-between border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
      <div className="flex justify-between items-center xl:mb-0 w-full xl:w-auto">
        <Link to={isEnglish ? "/English" : "/"}>
          <h1 className="text-xl md:text-2xl xl:text-3xl font-sans tracking-widest text-brand-dark font-medium leading-none">
            ØIVIND H. SOLHEIM
          </h1>
          <p className="text-brand-accent text-xs md:text-sm tracking-[0.2em] mt-2 font-medium">
            THE NORDIC STORYTELLER
          </p>
        </Link>
        <button 
          className="xl:hidden text-brand-dark p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      
      <nav className={`${isOpen ? 'flex flex-col mt-6' : 'hidden'} xl:flex xl:flex-wrap xl:mt-0 items-start xl:items-center gap-y-4 xl:gap-y-3 gap-x-6 text-sm font-semibold tracking-wider text-brand-dark w-full xl:w-auto`}>
        {isEnglish ? (
          <>
            <Link to="/English" className="text-brand-accent hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>HOME</Link>
            <div className="w-full h-px xl:w-px xl:h-4 bg-gray-300 xl:mx-2 hidden xl:block"></div>
            <div className="flex items-center gap-3 mt-2 xl:mt-0">
              <Link to="/" className="hover:text-brand-accent transition-colors">NO</Link>
              <span className="text-gray-300">/</span>
              <Link to="/English" className="text-brand-accent hover:text-brand-accent transition-colors">EN</Link>
            </div>
          </>
        ) : (
          <>
            <Link to="/" className="text-brand-accent hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>HEIM</Link>
            <Link to="/boker" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>BØKER</Link>
            <Link to="/refleksjonar" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>REFLEKSJONAR</Link>
            <Link to="/musikk" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>MUSIKK</Link>
            <Link to="/foto" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>FOTO</Link>
            <Link to="/video" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>VIDEO</Link>
            <Link to="/om-meg" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>OM MEG</Link>
            <Link to="/kontakt" className="hover:text-brand-accent transition-colors" onClick={() => setIsOpen(false)}>KONTAKT</Link>
            <div className="w-full h-px xl:w-px xl:h-4 bg-gray-300 xl:mx-2 my-2 xl:my-0"></div>
            <div className="flex items-center gap-3">
              <Link to="/" className="text-brand-accent hover:text-brand-accent transition-colors">NO</Link>
              <span className="text-gray-300">/</span>
              <Link to="/English" className="hover:text-brand-accent transition-colors">EN</Link>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}
