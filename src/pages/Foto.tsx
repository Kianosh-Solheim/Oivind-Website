import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Foto() {
  const images = [
    {
      src: "https://images.unsplash.com/photo-1439853949703-ff2200f56f34?q=80&w=2000&auto=format&fit=crop",
      alt: "Nature landscape with mist",
      className: "col-span-1 md:col-span-2 row-span-2",
    },
    {
      src: "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=1000&auto=format&fit=crop",
      alt: "Close up of moss",
      className: "col-span-1 row-span-1",
    },
    {
      src: "https://images.unsplash.com/photo-1542401886-65d6c61db217?q=80&w=1000&auto=format&fit=crop",
      alt: "Mountain valley",
      className: "col-span-1 row-span-1",
    },
    {
      src: "https://images.unsplash.com/photo-1470071372847-512030d944e5?q=80&w=1000&auto=format&fit=crop",
      alt: "Pine forest",
      className: "col-span-1 md:col-span-2 row-span-1",
    },
    {
      src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1000&auto=format&fit=crop",
      alt: "Hiker looking at mountains",
      className: "col-span-1 md:col-span-2 row-span-2",
    },
    {
      src: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?q=80&w=1000&auto=format&fit=crop",
      alt: "Dark forest path",
      className: "col-span-1 row-span-1",
    },
    {
      src: "https://images.unsplash.com/photo-1505322022379-7c3353ee6291?q=80&w=1000&auto=format&fit=crop",
      alt: "Starry night sky over trees",
      className: "col-span-1 row-span-1",
    },
  ];

  return (
    <div className="bg-brand-surface min-h-screen">
      {/* PAGE HEADER */}
      <section className="py-20 md:py-32 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> TILBAKE TIL HEIM
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          Foto & Natur
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          Naturen er ikkje ein stad vi besøkjer. Det er heimen vår.<br className="hidden md:block" /> 
          Gjennom linsa prøver eg å fange dei stille augneblinkane, lyset som forandrar alt, og detaljane vi ofte hastar forbi.
        </p>
      </section>

      {/* GALLERY GRID */}
      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[250px] md:auto-rows-[300px]">
          {images.map((image, index) => (
            <div key={index} className={`overflow-hidden group cursor-pointer relative bg-brand-sand ${image.className}`}>
              <img 
                loading="lazy"
                src={image.src} 
                alt={image.alt} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
            </div>
          ))}
        </div>
      </section>
      
      {/* QUOTE SECTION */}
      <section className="py-24 px-6 md:px-12 text-center bg-brand-light flex flex-col items-center justify-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-2xl md:text-3xl font-serif italic text-brand-dark leading-snug">
            "Å sjå er meir enn å bruke auga. Det handlar om å vere til stades."
          </p>
        </div>
      </section>
    </div>
  );
}
