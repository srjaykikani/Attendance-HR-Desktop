// renderer/components/CommentBox.tsx
import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface CommentBoxProps {
  userId: string;
  initialComment: string;
}

export default function CommentBox({ userId, initialComment }: CommentBoxProps) {
  const [comment, setComment] = useState(initialComment);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await window.electron.ipcRenderer.invoke('update-user-comment', {
        userId,
        comment,
      });

      if (response.success) {
        setSuccess(true);
      } else {
        if (response.status === 403) {
          throw new Error('You do not have permission to update this comment. Please contact your administrator.');
        } else {
          throw new Error(response.error || 'Failed to update comment');
        }
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating the comment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <Textarea
        value={comment}
        onChange={handleCommentChange}
        placeholder="Add a comment..."
        className="w-full h-32 mb-2"
      />
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Comment'}
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {success && <p className="text-green-500 mt-2">Comment updated successfully</p>}
    </div>
  );
}