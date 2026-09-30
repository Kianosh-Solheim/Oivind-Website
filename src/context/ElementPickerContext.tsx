import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ElementLocation } from '../types';
import { MapPin, Check, X, ArrowRight, ExternalLink, Sparkles, Navigation } from 'lucide-react';

interface ElementPickerContextType {
  isPicking: boolean;
  pickedElements: ElementLocation[];
  activeHighlight: ElementLocation | null;
  startPicking: (existing?: ElementLocation[]) => void;
  finishPicking: () => ElementLocation[];
  cancelPicking: () => void;
  removeElement: (id: string) => void;
  showLocationOnSite: (loc: ElementLocation) => void;
  clearHighlight: () => void;
}

const ElementPickerContext = createContext<ElementPickerContextType | undefined>(undefined);

function getElementClassName(el: Element | null): string {
  if (!el) return '';
  if (typeof el.className === 'string') {
    return el.className;
  }
  if (typeof (el.className as any)?.baseVal === 'string') {
    return (el.className as any).baseVal;
  }
  return '';
}

// Helper to generate a meaningful CSS selector and friendly name
function inspectElement(el: HTMLElement | SVGElement | Element): { selector: string; tag: string; textSnippet: string; elementName: string } {
  const tag = (el.tagName || 'ELEMENT').toUpperCase();
  
  // Clean snippet
  const rawText = (('innerText' in el ? (el as HTMLElement).innerText : '') || el.textContent || '').replace(/\s+/g, ' ').trim();
  const textSnippet = rawText.slice(0, 70);

  const classStr = getElementClassName(el);
  const firstClass = classStr ? (classStr.split(/\s+/).filter(c => c && !c.includes(':') && !c.startsWith('element-picker'))[0] || '') : '';

  // Friendly name
  let elementName = tag.toLowerCase();
  if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4') {
    elementName = `Overskrift (${tag}): ${textSnippet.slice(0, 30)}${textSnippet.length > 30 ? '...' : ''}`;
  } else if (tag === 'BUTTON' || el.getAttribute('role') === 'button') {
    elementName = `Knapp: ${textSnippet.slice(0, 25)}`;
  } else if (tag === 'IMG') {
    elementName = `Bilete: ${el.getAttribute('alt') || 'Bileteelement'}`;
  } else if (tag === 'P') {
    elementName = `Tekstavsnitt: ${textSnippet.slice(0, 30)}...`;
  } else if (tag === 'A') {
    elementName = `Lenkje: ${textSnippet.slice(0, 25)}`;
  } else if (tag === 'SECTION' || tag === 'ARTICLE') {
    elementName = `Seksjon: ${el.id || firstClass || tag.toLowerCase()}`;
  } else {
    elementName = `${tag} (${textSnippet ? textSnippet.slice(0, 25) : firstClass || 'element'})`;
  }

  // Generate selector
  let selector = '';
  if (el.id) {
    selector = `#${el.id}`;
  } else {
    const parts: string[] = [];
    let curr: Element | null = el;
    let depth = 0;
    while (curr && curr !== document.body && depth < 4) {
      let part = (curr.tagName || 'div').toLowerCase();
      if (curr.id) {
        parts.unshift(`#${curr.id}`);
        break;
      }
      const currClassStr = getElementClassName(curr);
      if (currClassStr) {
        const primaryClass = currClassStr.split(/\s+/).filter(c => c && !c.includes(':') && !c.startsWith('element-picker'))[0];
        if (primaryClass) {
          part += `.${primaryClass}`;
        }
      }
      parts.unshift(part);
      curr = curr.parentElement;
      depth++;
    }
    selector = parts.join(' > ');
  }

  return { selector, tag, textSnippet, elementName };
}

export function ElementPickerProvider({ children }: { children: React.ReactNode }) {
  const [isPicking, setIsPicking] = useState(false);
  const [pickedElements, setPickedElements] = useState<ElementLocation[]>([]);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ tag: string; name: string } | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<ElementLocation | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Load from sessionStorage if currently picking
  useEffect(() => {
    const saved = sessionStorage.getItem('picker_active_elements');
    const pickingFlag = sessionStorage.getItem('picker_mode_active');
    if (pickingFlag === 'true') {
      setIsPicking(true);
      if (saved) {
        try {
          setPickedElements(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const savePickedToStorage = (elements: ElementLocation[]) => {
    setPickedElements(elements);
    sessionStorage.setItem('picker_active_elements', JSON.stringify(elements));
  };

  const startPicking = useCallback((existing: ElementLocation[] = []) => {
    setIsPicking(true);
    setPickedElements(existing);
    sessionStorage.setItem('picker_mode_active', 'true');
    sessionStorage.setItem('picker_active_elements', JSON.stringify(existing));
    
    // If we're on admin page, offer navigating to main site or pick right here
    if (location.pathname.startsWith('/admin')) {
      navigate('/');
    }
  }, [location.pathname, navigate]);

  const finishPicking = useCallback(() => {
    setIsPicking(false);
    sessionStorage.removeItem('picker_mode_active');
    sessionStorage.removeItem('picker_active_elements');
    setHoveredRect(null);
    setHoveredInfo(null);
    navigate('/admin?tab=requests');
    return pickedElements;
  }, [navigate, pickedElements]);

  const cancelPicking = useCallback(() => {
    setIsPicking(false);
    sessionStorage.removeItem('picker_mode_active');
    sessionStorage.removeItem('picker_active_elements');
    setHoveredRect(null);
    setHoveredInfo(null);
    navigate('/admin?tab=requests');
  }, [navigate]);

  const removeElement = useCallback((id: string) => {
    setPickedElements(prev => {
      const updated = prev.filter(el => el.id !== id);
      sessionStorage.setItem('picker_active_elements', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHighlight = useCallback(() => {
    setActiveHighlight(null);
  }, []);

  const showLocationOnSite = useCallback((loc: ElementLocation) => {
    setActiveHighlight(loc);
    navigate(loc.pagePath);
    
    // Wait for page to render then scroll and pulse
    setTimeout(() => {
      let targetEl: HTMLElement | null = null;
      if (loc.selector) {
        try {
          targetEl = document.querySelector(loc.selector) as HTMLElement;
        } catch (e) {
          // fallback
        }
      }
      if (!targetEl && loc.textSnippet) {
        // search by text
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && node.nodeValue.includes(loc.textSnippet.slice(0, 20))) {
            targetEl = node.parentElement;
            break;
          }
        }
      }
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 400);
  }, [navigate]);

  // Handle pointermove and click when picking
  useEffect(() => {
    if (!isPicking) return;

    const handlePointerMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target) return;

      // Ignore picker UI itself
      if (target.closest('.element-picker-ignore')) {
        setHoveredRect(null);
        setHoveredInfo(null);
        hoveredElementRef.current = null;
        return;
      }

      hoveredElementRef.current = target;
      const rect = target.getBoundingClientRect();
      setHoveredRect(rect);
      const info = inspectElement(target);
      setHoveredInfo({ tag: info.tag, name: info.elementName });
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the picker control toolbar
      if (target.closest('.element-picker-ignore')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const { selector, tag, textSnippet, elementName } = inspectElement(target);
      const rect = target.getBoundingClientRect();
      const pageTitle = document.title || 'Side';

      const newLoc: ElementLocation = {
        id: 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        pagePath: location.pathname + location.search,
        pageTitle,
        selector,
        tag,
        textSnippet,
        elementName,
        position: {
          top: Math.round(rect.top + window.scrollY),
          left: Math.round(rect.left + window.scrollX),
        }
      };

      setPickedElements(prev => {
        // Check if already selected (same selector on same path)
        const exists = prev.some(p => p.pagePath === newLoc.pagePath && (p.selector === newLoc.selector || (p.textSnippet && p.textSnippet === newLoc.textSnippet)));
        let updated: ElementLocation[];
        if (exists) {
          updated = prev.filter(p => !(p.pagePath === newLoc.pagePath && (p.selector === newLoc.selector || (p.textSnippet && p.textSnippet === newLoc.textSnippet))));
        } else {
          updated = [...prev, newLoc];
        }
        sessionStorage.setItem('picker_active_elements', JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isPicking, location.pathname, location.search]);

  return (
    <ElementPickerContext.Provider
      value={{
        isPicking,
        pickedElements,
        activeHighlight,
        startPicking,
        finishPicking,
        cancelPicking,
        removeElement,
        showLocationOnSite,
        clearHighlight,
      }}
    >
      {children}

      {/* HIGHLIGHT BOX OVER HOVERED ELEMENT IN PICKING MODE */}
      {isPicking && hoveredRect && (
        <div
          className="fixed pointer-events-none z-[99998] transition-all duration-75 border-2 border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          style={{
            top: hoveredRect.top,
            left: hoveredRect.left,
            width: hoveredRect.width,
            height: hoveredRect.height,
          }}
        >
          {hoveredInfo && (
            <div className="absolute -top-7 left-0 bg-stone-900 text-amber-300 font-mono text-[11px] px-2 py-0.5 rounded shadow whitespace-nowrap max-w-sm overflow-hidden text-ellipsis flex items-center gap-1.5 border border-amber-500/50">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{hoveredInfo.name}</span>
            </div>
          )}
        </div>
      )}

      {/* PINS ON CURRENTLY PICKED ELEMENTS ON THIS PAGE */}
      {isPicking && pickedElements
        .filter(el => el.pagePath === (location.pathname + location.search))
        .map((el, idx) => {
          let top = el.position?.top ? el.position.top - window.scrollY : null;
          let left = el.position?.left ? el.position.left - window.scrollX : null;

          // Try querying current dom element
          if (el.selector) {
            try {
              const domEl = document.querySelector(el.selector);
              if (domEl) {
                const r = domEl.getBoundingClientRect();
                top = r.top;
                left = r.left;
              }
            } catch (err) {}
          }

          if (top === null || left === null) return null;

          return (
            <div
              key={el.id}
              className="fixed pointer-events-none z-[99999] flex items-center gap-1.5 bg-amber-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-white animate-bounce"
              style={{
                top: Math.max(10, top - 14),
                left: Math.max(10, left - 10),
              }}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Lokasjon #{idx + 1}</span>
            </div>
          );
        })}

      {/* FLOATING TOP INSPECTOR TOOLBAR WHEN PICKING MODE IS ACTIVE */}
      {isPicking && (
        <div className="element-picker-ignore fixed top-0 inset-x-0 z-[100000] bg-stone-900 text-white shadow-2xl border-b-2 border-amber-500 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wide text-amber-300">
                  Finn lokasjon på nettsida
                </span>
                <span className="text-[11px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  {pickedElements.length} element {pickedElements.length === 1 ? 'valt' : 'valde'}
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Hald musa over og trykk på elementet eller elementa du ynskjer å be om endring på.
              </p>
            </div>
          </div>

          {/* QUICK NAVIGATOR WHILE PICKING */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-1.5 bg-stone-800 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-300">
              <Navigation className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline text-stone-400">Gå til side:</span>
              <select
                value={location.pathname}
                onChange={(e) => navigate(e.target.value)}
                className="bg-transparent text-amber-300 font-medium outline-none cursor-pointer text-xs"
              >
                <option value="/" className="bg-stone-900 text-white">Forsida</option>
                <option value="/boker" className="bg-stone-900 text-white">Bøker & Utgjevingar</option>
                <option value="/refleksjonar" className="bg-stone-900 text-white">Refleksjonar</option>
                <option value="/om-meg" className="bg-stone-900 text-white">Om meg</option>
                <option value="/foto" className="bg-stone-900 text-white">Foto & Natur</option>
              </select>
            </div>

            <button
              onClick={cancelPicking}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold uppercase tracking-wider rounded transition-colors"
            >
              Avbryt
            </button>

            <button
              onClick={finishPicking}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Fullfør val ({pickedElements.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* HIGHLIGHT OVERLAY WHEN VIEWING A REQUEST'S LOCATION */}
      {activeHighlight && (
        <div className="element-picker-ignore fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] bg-stone-950 text-white px-5 py-3.5 rounded-lg shadow-2xl border-2 border-amber-500 flex items-center gap-4 max-w-lg w-[92vw] animate-in fade-in slide-in-from-bottom duration-300">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          </div>
          <div className="flex-grow min-w-0">
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 block font-semibold">
              Merka lokasjon på sida
            </span>
            <p className="text-xs font-serif font-semibold text-stone-100 truncate">
              {activeHighlight.elementName || activeHighlight.tag}
            </p>
            {activeHighlight.textSnippet && (
              <p className="text-[11px] text-stone-400 italic truncate">
                «{activeHighlight.textSnippet}»
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                clearHighlight();
                navigate('/admin?tab=requests');
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1"
            >
              <span>Tilbake</span>
            </button>
            <button
              onClick={clearHighlight}
              className="p-1.5 text-stone-400 hover:text-white rounded"
              title="Lukk"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </ElementPickerContext.Provider>
  );
}

export function useElementPicker() {
  const context = useContext(ElementPickerContext);
  if (!context) {
    throw new Error('useElementPicker must be used within an ElementPickerProvider');
  }
  return context;
}
