'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { TaskComment } from '@/types/database';
import { format, parseISO } from 'date-fns';

// Demo comments
const demoComments: TaskComment[] = [
  {
    id: 'c1',
    author: 'AI Assistant',
    content: 'This task has been auto-generated based on your assessment. Completing it will improve your Storytelling score.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    author: 'Alex Chen',
    content: 'Working on this now. Should have it done by end of week.',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

interface TaskCommentsProps {
  comments?: TaskComment[];
  className?: string;
}

export function TaskComments({ comments: propComments, className }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>(propComments ?? demoComments);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const comment: TaskComment = {
      id: `c-${Date.now()}`,
      author: 'You',
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);
    setNewComment('');
  };

  const isAI = (author: string) => author.toLowerCase().includes('ai') || author.toLowerCase().includes('assistant');

  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="text-sm font-semibold text-foreground">Comments</h4>

      {/* Comments list */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {comments.map((comment) => {
            const ai = isAI(comment.author);
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex gap-3 p-3 rounded-lg',
                  ai ? 'bg-electric-blue/5 border border-electric-blue/10' : 'bg-obsidian-800/40'
                )}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className={cn(
                    'text-[10px] font-bold',
                    ai ? 'bg-electric-blue/20 text-electric-blue' : 'bg-obsidian-600 text-obsidian-300'
                  )}>
                    {ai ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{comment.author}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(comment.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add comment */}
      <div className="flex gap-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder="Add a comment..."
          className="flex-1 text-sm px-3 py-2 rounded-lg bg-obsidian-800/50 border border-obsidian-700/50 text-foreground placeholder:text-obsidian-500 focus:outline-none focus:border-electric-blue/50 transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="px-3 py-2 rounded-lg bg-electric-blue text-white hover:bg-electric-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
