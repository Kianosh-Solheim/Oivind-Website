import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  quote?: string;
  createdAt: any;
}

interface CommentsProps {
  articleId: string;
  initialQuote?: string;
  comments: Comment[];
  loading: boolean;
  onAddComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<void>;
  focusedCommentId?: string;
}

export default function Comments({ articleId, initialQuote = '', comments, loading, onAddComment, focusedCommentId }: CommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [activeQuote, setActiveQuote] = useState(initialQuote);
  const [submitting, setSubmitting] = useState(false);
  
  const { user, signInWithGoogle } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    setActiveQuote(initialQuote);
  }, [initialQuote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const commentData = {
        articleId,
        userId: user.uid,
        userName: user.displayName || 'Anonym',
        userAvatar: user.photoURL || '',
        content: newComment.trim(),
        quote: activeQuote || null,
      };
      
      await onAddComment(commentData);
      
      setNewComment('');
      setActiveQuote('');
    } catch (error) {
      console.error("Error adding comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.toMillis ? timestamp.toMillis() : timestamp);
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'no-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="mt-16 pt-16 border-t border-gray-200">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="w-5 h-5 text-brand-dark" />
        <h3 className="text-xl font-serif text-brand-dark">
          {language === 'en' ? 'Reflections & Comments' : 'Refleksjonar og kommentarar'}
        </h3>
        <span className="bg-brand-sand text-brand-dark text-xs font-semibold px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </div>

      <div className="mb-12 bg-white p-6 border border-brand-sand shadow-sm">
        {user ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs">
                  {(user.displayName || 'A').charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-brand-dark">{user.displayName}</span>
            </div>
            
            <AnimatePresence>
              {activeQuote && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-brand-sand/30 p-4 border-l-2 border-brand-accent text-brand-dark/80 font-serif italic text-sm relative"
                >
                  <Quote className="w-4 h-4 text-brand-accent/50 absolute top-4 left-2 -translate-x-full" />
                  "{activeQuote}"
                  <button 
                    type="button" 
                    onClick={() => setActiveQuote('')}
                    className="absolute top-2 right-2 text-xs text-brand-muted hover:text-brand-dark uppercase tracking-widest font-semibold"
                  >
                    {language === 'en' ? 'Clear' : 'Fjern'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={language === 'en' ? (activeQuote ? 'Comment on this passage...' : 'Leave a comment...') : (activeQuote ? 'Kommenter denne passasjen...' : 'Legg igjen ein kommentar...')}
              className="w-full p-4 text-sm border border-gray-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white outline-none transition-colors resize-y min-h-[100px] font-sans"
              required
            />
            
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="bg-brand-dark text-white uppercase tracking-widest font-semibold text-xs px-6 py-3 hover:bg-black transition-colors disabled:opacity-50"
              >
                {submitting ? (language === 'en' ? 'Publishing...' : 'Publiserer...') : (language === 'en' ? 'Publish comment' : 'Publiser kommentar')}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <p className="text-brand-dark/70 mb-4 text-sm">
              {language === 'en' ? 'Please log in to participate in the conversation.' : 'Vennligst logg inn for å delta i samtalen.'}
            </p>
            <button 
              onClick={signInWithGoogle}
              className="bg-brand-dark text-white uppercase tracking-widest font-semibold text-xs px-6 py-3 hover:bg-black transition-colors"
            >
              {language === 'en' ? 'Log in with Google' : 'Logg inn med Google'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-4 text-brand-muted text-sm tracking-widest uppercase">
            {language === 'en' ? 'Loading...' : 'Laster inn...'}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-brand-muted font-serif italic text-lg">
            {language === 'en' ? 'Be the first to share your thoughts.' : 'Bli den første til å dele dine tankar.'}
          </div>
        ) : (
          comments.map((comment) => (
            <motion.div 
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white p-6 border transition-all ${focusedCommentId === comment.id ? 'border-brand-accent shadow-md' : 'border-gray-100'}`}
              id={`comment-${comment.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {comment.userAvatar ? (
                    <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-sand text-brand-dark flex items-center justify-center text-xs font-semibold">
                      {comment.userName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-brand-dark">{comment.userName}</div>
                    <div className="text-[10px] text-brand-muted uppercase tracking-widest leading-none mt-0.5">
                      {formatDate(comment.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
              
              {comment.quote && (
                <div className="mb-4 bg-brand-sand/50 p-4 border-l-2 border-brand-accent text-brand-dark/70 font-serif italic text-sm">
                  "{comment.quote}"
                </div>
              )}
              
              <div className="text-brand-dark/90 leading-relaxed text-sm font-sans whitespace-pre-wrap">
                {comment.content}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
