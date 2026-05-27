import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="px-6 py-8 md:px-12 flex flex-col xl:flex-row xl:items-end justify-between border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
      <div className="mb-6 xl:mb-0">
        <Link to="/">
          <h1 className="text-2xl md:text-3xl font-sans tracking-widest text-brand-dark font-medium leading-none">
            ØIVIND H. SOLHEIM
          </h1>
          <p className="text-brand-accent text-sm md:text-md tracking-[0.2em] mt-2 font-medium">
            THE NORDIC STORYTELLER
          </p>
        </Link>
      </div>
      
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs md:text-sm font-semibold tracking-wider text-brand-dark">
        <Link to="/" className="text-brand-accent hover:text-brand-accent transition-colors">HEIM</Link>
        <Link to="/romanar" className="hover:text-brand-accent transition-colors">ROMANAR</Link>
        <Link to="/refleksjonar" className="hover:text-brand-accent transition-colors">REFLEKSJONAR</Link>
        <Link to="/musikk" className="hover:text-brand-accent transition-colors">MUSIKK</Link>
        <Link to="/foto" className="hover:text-brand-accent transition-colors">FOTO</Link>
        <Link to="/video" className="hover:text-brand-accent transition-colors">VIDEO</Link>
        <Link to="/om-meg" className="hover:text-brand-accent transition-colors">OM MEG</Link>
        <Link to="/kontakt" className="hover:text-brand-accent transition-colors">KONTAKT</Link>
        <div className="w-px h-4 bg-gray-300 mx-2 hidden xl:block"></div>
        <div className="flex items-center gap-3">
          <Link to="/" className="hover:text-brand-accent transition-colors">NO</Link>
          <span className="text-gray-300">/</span>
          <Link to="/English" className="hover:text-brand-accent transition-colors">EN</Link>
        </div>
      </nav>
    </header>
  );
}
