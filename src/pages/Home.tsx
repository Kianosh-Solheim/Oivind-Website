import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImg from '../assets/bilde_framside.jpeg';

export default function Home() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="relative h-[80vh] min-h-[600px] w-full bg-brand-dark flex flex-col justify-center px-6 md:px-12 lg:px-24 object-cover overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg}
            alt="Lake mirroring sky" 
            className="w-full h-full object-cover object-center opacity-70"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-2xl text-white">
          <h2 className="text-5xl md:text-7xl font-serif leading-tight">
            Historier.<br />
            Refleksjoner.<br />
            Menneskeleg nærvær.
          </h2>
          <p className="mt-8 text-xl md:text-2xl font-serif italic font-light text-gray-200">
            Om livet vi lever. Og framtida vi vel å skapa.
          </p>
          <div className="mt-12">
            <button className="border border-white hover:bg-white hover:text-brand-dark transition-all duration-300 text-white font-sans text-xs tracking-[0.15em] uppercase py-4 px-8">
              LES MINE SISTE REFLEKSJONAR
            </button>
          </div>
        </div>
      </section>

      {/* WELCOME SECTION */}
      <section className="py-24 px-6 md:px-12 lg:px-24 mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="max-w-xl">
          <span className="text-xs font-sans tracking-[0.3em] font-semibold text-brand-muted uppercase">Velkommen</span>
          <h2 className="text-4xl md:text-5xl mt-6 font-serif text-brand-dark leading-tight">
            Eg skriv for å forstå.
          </h2>
          <div className="w-16 h-px bg-brand-accent mt-8 mb-8"></div>
          <p className="text-base md:text-lg text-brand-dark/80 leading-relaxed font-sans mb-10">
            For å sette ord på det som uroar meg, inspirerer meg, og det som må seiast høgt. 
            Mine tekstar spring ut frå naturen, frå menneske, frå tidene vi lever i – og frå 
            håpet om at vi kan skape ein betre morgondag.
          </p>
          <a href="#" className="inline-flex items-center text-brand-accent hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase">
            LES MEIR <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
        <div className="w-full">
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" 
            alt="Person sitting on a rock overlooking mountains" 
            className="w-full aspect-[4/3] lg:aspect-[16/10] object-cover"
          />
        </div>
      </section>

      {/* QUOTE SECTION */}
      <section className="py-24 px-6 md:px-12 text-center bg-brand-sand flex flex-col items-center justify-center relative">
        <div className="max-w-4xl mx-auto relative">
          <span className="text-8xl text-brand-accent/30 font-serif leading-none absolute -top-12 -left-12 opacity-50 hidden md:block">“</span>
          <p className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-brand-dark leading-snug">
            Teknologien kan forsterka oss. Men berre menneskelegheit kan redde oss.
          </p>
          <p className="text-3xl md:text-5xl font-signature text-brand-dark mt-8 text-right flex justify-end items-center gap-4">
            Øivind H. Solheim
          </p>
        </div>
      </section>

      {/* CARDS SECTION */}
      <section className="pt-24 pb-32 px-6 md:px-12 lg:px-16 mx-auto bg-brand-light">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1800px] mx-auto">
          {/* Card 1 */}
          <div className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80" alt="Bøker" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm font-sans tracking-widest font-semibold text-brand-dark mb-4">BØKER</h3>
              <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-10 flex-grow">
                Forteljingar om framtid, menneske og val som former oss.
              </p>
              <Link to="/boker" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                SJÅ BØKER <ArrowRight className="ml-2 w-3 h-3" />
              </Link>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1455390582262-044cdead27d8?w=800&q=80" alt="Refleksjoner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm font-sans tracking-widest font-semibold text-brand-dark mb-4">REFLEKSJONAR</h3>
              <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-10 flex-grow">
                Tankar om KI, demokrati, aldring, sanning og det menneskelege.
              </p>
              <Link to="/refleksjonar" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                LES REFLEKSJONAR <ArrowRight className="ml-2 w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80" alt="Musikk" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm font-sans tracking-widest font-semibold text-brand-dark mb-4">MUSIKK</h3>
              <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-10 flex-grow">
                Songar, tekster og tonar som spring ut frå livet og tida.
              </p>
              <Link to="/musikk" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                LYTT TIL MUSIKKEN <ArrowRight className="ml-2 w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1439853949703-ff2200f56f34?w=800&q=80" alt="Foto & Natur" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm font-sans tracking-widest font-semibold text-brand-dark mb-4">FOTO & NATUR</h3>
              <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-10 flex-grow">
                Bilete frå turar, stille augneblink og møte med naturen.
              </p>
              <Link to="/foto" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                SJÅ BILETA <ArrowRight className="ml-2 w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-brand-surface group cursor-pointer flex flex-col h-full border border-gray-100">
            <div className="h-56 xl:h-48 w-full overflow-hidden">
              <img loading="lazy" src="https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&q=80" alt="Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out grayscale opacity-90" />
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="text-sm font-sans tracking-widest font-semibold text-brand-dark mb-4">VIDEO & OPPLESING</h3>
              <p className="text-sm text-brand-dark/70 font-sans leading-relaxed mb-10 flex-grow">
                Tankar frå skjerm til stemme. Opplesingar, videoar og innlegg.
              </p>
              <Link to="/video" className="inline-flex items-center text-brand-accent text-xs font-semibold tracking-widest uppercase mt-auto hover:text-brand-dark transition-colors">
                SJÅ VIDEOAR <ArrowRight className="ml-2 w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
