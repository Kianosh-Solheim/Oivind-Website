import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { isHtml, calculateReadingTime } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import Comments, { Comment } from '../components/Comments';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  language?: string;
  slug?: string;
  imageUrl?: string;
  imageCaption?: string;
  translationId?: string;
}

import { memo } from 'react';

const ArticleContent = memo(({ content }: { content: string }) => {
  if (isHtml(content)) {
    return (
      <div 
        className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return (
    <div className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg whitespace-pre-wrap">
      {content}
    </div>
  );
});

export default function RefleksjonView() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [translationSlug, setTranslationSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, language, setLanguage } = useLanguage();
  
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeQuote, setActiveQuote] = useState('');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [focusedCommentId, setFocusedCommentId] = useState<string | undefined>(undefined);
  const [quotePositions, setQuotePositions] = useState<{commentId: string, top: number, quote: string}[]>([]);
  const [activeMarginCommentId, setActiveMarginCommentId] = useState<string | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !activeMarginCommentId) {
      if ('highlights' in CSS) {
        (CSS as any).highlights.clear();
      }
      return;
    }

    const comment = comments.find(c => c.id === activeMarginCommentId);
    if (!comment || !comment.quote) return;

    const el = contentRef.current;
    
    // We only search for the first 20 characters of the quote to find a match,
    // as the quote might cross HTML boundaries in the actual text.
    const searchStr = comment.quote.substring(0, 20).trim();
    if (searchStr.length < 5) return;

    const finder = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let node: Node | null = null;
    let matchNode: Text | null = null;
    let matchIdx = -1;
    let matchLength = 0;

    while ((node = finder.nextNode())) {
      if (node.nodeValue?.includes(searchStr)) {
        matchNode = node as Text;
        matchIdx = node.nodeValue.indexOf(searchStr);
        
        matchLength = searchStr.length;
        // Try to match as much as possible up to the whole quote in this text node
        for (let i = searchStr.length; i <= comment.quote.length; i++) {
           if (node.nodeValue.includes(comment.quote.substring(0, i))) {
              matchLength = i;
           } else {
              break;
           }
        }
        break;
      }
    }

    if (!matchNode) return;

    if ('highlights' in CSS) {
      const range = new Range();
      range.setStart(matchNode, matchIdx);
      range.setEnd(matchNode, matchIdx + matchLength);
      const highlight = new (window as any).Highlight(range);
      (CSS as any).highlights.set('comment-highlight', highlight);
      
      return () => {
        (CSS as any).highlights.clear();
      };
    } else {
      // Fallback for older browsers
      const originalText = matchNode.nodeValue || '';
      const beforeStr = originalText.substring(0, matchIdx);
      const highlightStr = originalText.substring(matchIdx, matchIdx + matchLength);
      const afterStr = originalText.substring(matchIdx + matchLength);

      const parent = matchNode.parentNode;
      if (!parent) return;

      const beforeNode = document.createTextNode(beforeStr);
      const markNode = document.createElement('mark');
      markNode.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      markNode.style.borderRadius = '2px';
      markNode.style.color = 'inherit';
      markNode.textContent = highlightStr;
      const afterNode = document.createTextNode(afterStr);

      parent.insertBefore(beforeNode, matchNode);
      parent.insertBefore(markNode, matchNode);
      parent.insertBefore(afterNode, matchNode);
      parent.removeChild(matchNode);

      return () => {
        if (parent.contains(beforeNode) && parent.contains(markNode) && parent.contains(afterNode)) {
            const combinedText = beforeNode.nodeValue + (markNode.textContent || '') + (afterNode.nodeValue || '');
            const newNode = document.createTextNode(combinedText);
            parent.insertBefore(newNode, beforeNode);
            parent.removeChild(beforeNode);
            parent.removeChild(markNode);
            parent.removeChild(afterNode);
        }
      };
    }
  }, [activeMarginCommentId, comments]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.margin-comment-card') && !target.closest('.margin-comment-icon')) {
        setActiveMarginCommentId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      // Wait a moment for selection to be completely finished
      timeoutId = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !contentRef.current?.contains(selection.anchorNode)) {
          setSelectionPosition(prev => {
            if (prev) {
              setSelectedText('');
              return null;
            }
            return prev;
          });
          return;
        }
        
        const text = selection.toString().trim();
        if (text.length > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          setSelectionPosition({
            top: rect.top + window.scrollY - 40,
            left: rect.left + rect.width / 2
          });
          setSelectedText(text);
        }
      }, 200);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleQuoteClick = () => {
    setActiveQuote(selectedText);
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
    
    // Scroll to comments
    setTimeout(() => {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };


  const fetchComments = async (articleId: string) => {
    setCommentsLoading(true);
    try {
      const q = query(
        collection(db, 'comments'),
        where('articleId', '==', articleId)
      );
      const snap = await getDocs(q);
      const fetchedComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      
      fetchedComments.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    try {
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      
      const docRef = await addDoc(collection(db, 'comments'), {
        ...comment,
        createdAt: serverTimestamp()
      });
      
      setComments(prev => [{
        id: docRef.id,
        ...comment,
        createdAt: { toMillis: () => Date.now() }
      } as unknown as Comment, ...prev]);
      
    } catch (error) {
      console.error('Error adding comment', error);
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'comments', commentId));
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!contentRef.current || comments.length === 0) return;
    
    // Process quote positions
    const newPositions: {commentId: string, top: number, quote: string}[] = [];
    
    // We get all text nodes and search for the quotes (a simple approximation)
    const el = contentRef.current;
    
    comments.forEach(comment => {
      if (comment.quote) {
        // To find the text, we can use window.find() or an iterative search.
        // A simpler way: we just find the first text node that contains a good chunk of the quote
        // Since quotes can be large, we might match just the first 15 chars.
        const searchStr = comment.quote.substring(0, 15).trim();
        if (searchStr.length < 3) return;
        
        const finder = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        let foundTop = -1;
        while ((node = finder.nextNode())) {
          if (node.nodeValue?.includes(searchStr)) {
            const range = document.createRange();
            const idx = node.nodeValue.indexOf(searchStr);
            range.setStart(node, idx);
            range.setEnd(node, idx + searchStr.length);
            const rect = range.getBoundingClientRect();
            foundTop = rect.top + window.scrollY;
            break;
          }
        }
        
        if (foundTop > 0) {
          // Adjust relative to container, wait window.scrollY is absolute,
          // we should be relative to contentRef offsetTop but absolute in document is fine
          // Let's use relative to contentRef
          const containerRect = el.getBoundingClientRect();
          newPositions.push({
            commentId: comment.id,
            top: foundTop - (containerRect.top + window.scrollY), 
            quote: comment.quote
          });
        }
      }
    });
    
    setQuotePositions(newPositions);
  }, [comments, article]);
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      try {
        let fetchedArticle: Article | null = null;
        const qSlug = query(collection(db, 'articles'), where('slug', '==', slug), where('published', '==', true));
        const snapSlug = await getDocs(qSlug);
        
        if (!snapSlug.empty) {
          fetchedArticle = { id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() } as Article;
        } else {
          // Fallback to searching by ID
          const qId = query(collection(db, 'articles'), where(documentId(), '==', slug), where('published', '==', true));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            fetchedArticle = { id: snapId.docs[0].id, ...snapId.docs[0].data() } as Article;
          }
        }
        
        setArticle(fetchedArticle);
        
        if (fetchedArticle) {
          fetchComments(fetchedArticle.id);
        }
        
        if (fetchedArticle?.translationId) {
          const qTrans = query(collection(db, 'articles'), where(documentId(), '==', fetchedArticle.translationId));
          const snapTrans = await getDocs(qTrans);
          if (!snapTrans.empty) {
            const transData = snapTrans.docs[0].data() as Article;
            if (transData.published) {
              setTranslationSlug(transData.slug || snapTrans.docs[0].id);
            }
          }
        } else {
          setTranslationSlug(null);
        }
      } catch (error) {
        console.error("Error fetching article", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center text-brand-muted flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          {language === 'en' ? 'Loading reflection...' : 'Laster inn refleksjonen...'}
        </motion.div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-serif text-brand-dark mb-4">{language === 'en' ? 'Reflection not found' : 'Fann ikkje refleksjonen'}</motion.h1>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Link to="/refleksjonar" className="text-brand-accent hover:text-brand-dark transition-colors uppercase tracking-widest text-xs font-semibold">
            {language === 'en' ? 'BACK TO REFLECTIONS' : 'TILBAKE TIL REFLEKSJONAR'}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface min-h-screen">
      <style>{`
        ::highlight(comment-highlight) {
          background-color: rgba(0, 0, 0, 0.1);
          color: inherit;
        }
      `}</style>
      <motion.section 
        className="py-20 md:py-32 px-6 md:px-12 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Link to="/refleksjonar" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> {t('ALL_REFLECTIONS')}
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <span className="text-xs text-brand-muted uppercase tracking-widest font-semibold flex items-center gap-4">
            {calculateReadingTime(article.content)} min read
            {article.language && (
              <span className="bg-brand-sand px-2 py-0.5 text-[10px] text-brand-dark/70 rounded-sm">
                {article.language === 'en' ? 'ENGLISH' : 'NORSK'}
              </span>
            )}
          </span>
          
          {translationSlug && (
            <Link 
              to={`/refleksjonar/${translationSlug}`}
              onClick={() => setLanguage((article.language || 'no') === 'en' ? 'no' : 'en')}
              className="inline-flex items-center text-brand-accent hover:text-brand-dark text-xs font-semibold tracking-widest uppercase transition-colors"
            >
              {article.language === 'en' ? 'Les på norsk' : 'Read in English'} &rarr;
            </Link>
          )}
        </div>
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-dark leading-tight mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {article.title}
        </motion.h1>
        
        {article.imageUrl && (
          <motion.figure 
            className="mb-12"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="w-full h-[40vh] min-h-[300px] overflow-hidden bg-brand-sand">
              <img loading="lazy" src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
            {article.imageCaption && (
              <figcaption 
                className="text-center text-sm text-brand-muted mt-3 italic"
                dangerouslySetInnerHTML={{ __html: article.imageCaption }}
              />
            )}
          </motion.figure>
        )}
        
        {/* Margin Comments Container */}
        <div className="relative">
          <motion.div 
            className="bg-white p-8 md:p-12 lg:p-16 border border-brand-sand shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            ref={contentRef}
          >
            <ArticleContent content={article.content} />
          </motion.div>
          
          {/* Margin Annotations Layer */}
          {quotePositions.map((pos) => {
            const isHoveredOrActive = activeMarginCommentId === pos.commentId;
            const comment = comments.find(c => c.id === pos.commentId);
            
            if (!comment) return null;

            return (
            <div 
              key={pos.commentId}
              className="absolute flex items-center justify-center cursor-pointer transition-all right-2 lg:-right-12"
              style={{
                top: `${pos.top}px`,
                width: '32px',
                height: '32px',
                zIndex: isHoveredOrActive ? 50 : 40
              }}
            >
              <div 
                className={`margin-comment-icon transition-colors p-2 rounded-full shadow-sm border border-gray-200 ${isHoveredOrActive ? 'bg-brand-accent text-white scale-110' : 'bg-brand-sand hover:bg-brand-accent hover:text-white hover:scale-110 text-brand-dark'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMarginCommentId(isHoveredOrActive ? null : pos.commentId);
                }}
              >
                <MessageSquarePlus className="w-4 h-4 pointer-events-none" />
              </div>
              
              <AnimatePresence>
                {isHoveredOrActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="margin-comment-card absolute top-10 right-0 lg:left-10 lg:right-auto w-64 bg-white p-4 shadow-xl border border-gray-200 rounded text-left cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt={comment.userName} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-sand text-brand-dark flex items-center justify-center text-[10px] font-semibold">
                          {comment.userName.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-brand-dark truncate">{comment.userName}</span>
                    </div>
                    <p className="text-sm text-brand-dark/90 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    
                    <button 
                      className="mt-4 text-[10px] uppercase tracking-widest text-brand-muted hover:text-brand-accent transition-colors font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedCommentId(pos.commentId);
                        setActiveMarginCommentId(null);
                        const el = document.getElementById(`comment-${pos.commentId}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      {language === 'en' ? 'View in comment section' : 'Vis i kommentarfelt'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            );
          })}
        </div>
        
        <AnimatePresence>
          {selectionPosition && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ 
                position: 'absolute', 
                top: selectionPosition.top, 
                left: selectionPosition.left,
                transform: 'translateX(-50%)',
                zIndex: 50
              }}
              className="bg-brand-dark text-white rounded shadow-lg flex items-center shadow-2xl"
            >
              <button 
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents selection from being cleared
                  handleQuoteClick(); // Replaces onClick
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleQuoteClick();
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-black transition-colors rounded"
              >
                <MessageSquarePlus className="w-4 h-4" />
                {language === 'en' ? 'Comment' : 'Kommenter'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div id="comments-section">
          <Comments 
            articleId={article.id} 
            initialQuote={activeQuote} 
            comments={comments} 
            loading={commentsLoading} 
            onAddComment={handleAddComment} 
            onDeleteComment={handleDeleteComment}
            focusedCommentId={focusedCommentId}
          />
        </div>
      </motion.section>
    </div>
  );
}
