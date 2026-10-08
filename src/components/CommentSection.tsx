import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: any;
}

interface CommentSectionProps {
  issueId: string;
}

const CommentSection = ({ issueId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const commentsRef = collection(db, 'issues', issueId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [issueId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: 'Login Required',
        description: 'Please login to comment',
        variant: 'destructive',
      });
      return;
    }

    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const commentsRef = collection(db, 'issues', issueId, 'comments');
      await addDoc(commentsRef, {
        text: newComment,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile?.displayName || currentUser.email,
        createdAt: serverTimestamp(),
      });

      setNewComment('');
      toast({
        title: 'Comment Added',
        description: 'Your comment has been posted successfully',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Comments ({comments.length})</h3>
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmitComment} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={!currentUser}
        />
        <Button type="submit" size="sm" disabled={!currentUser || loading || !newComment.trim()}>
          <Send className="h-4 w-4 mr-2" />
          Post Comment
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id} className="p-3">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {comment.userName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm">{comment.text}</p>
              </div>
            </div>
          </Card>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
