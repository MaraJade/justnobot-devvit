/**
 * Post comment posting logic for JustNoBot
 * Replaces app-to-migrate/justnobot.py post comment functionality
 */

import { reddit } from '@devvit/web/server';
import { 
  markPostAsCommented,
  getUserPostCount,
  incrementUserPostCount
} from './redisStorage';
import { 
  generateFullComment, 
  type CommentContext 
} from './commentTemplates';

/**
 * Check if post should be skipped (archived, locked, already commented)
 */
export function shouldSkipPost(post: { isArchived?: boolean }, hasCommented: boolean, author?: { name?: string } | null): boolean {
  // Skip archived posts
  if (post.isArchived) {
    return true;
  }
  
  // Skip if already commented
  if (hasCommented) {
    return true;
  }
  
  // Skip if author is deleted
  if (!author || !author.name) {
    return true;
  }
  
  return false;
}

/**
 * Get user's post history in subreddit
 * Simplified version that just counts posts for first-time detection
 */
export async function getUserHistoryContext(author: string, subreddit: string): Promise<{
  isFirstTimePoster: boolean;
  userHistory: string;
}> {
  const postCount = await getUserPostCount(author, subreddit);
  
  if (postCount <= 1) {
    return {
      isFirstTimePoster: true,
      userHistory: ''
    };
  }
  
  // For now, just return basic info without detailed history
  // Full history retrieval would require additional Reddit API calls
  return {
    isFirstTimePoster: false,
    userHistory: `User has ${postCount} posts in this subreddit.`
  };
}

/**
 * Generate and post comment on a post
 */
export async function postBotComment(post: { id: string; title?: string; permalink?: string }, subreddit: string, authorName?: string): Promise<void> {
  const author = authorName || '[deleted]';
  
  // Get user history context
  const { isFirstTimePoster, userHistory } = await getUserHistoryContext(author, subreddit);
  
  // Generate comment context
  const context: CommentContext = {
    subreddit,
    author,
    postTitle: post.title || '',
    postPermalink: post.permalink || '',
    isFirstTimePoster,
    userHistory
  };
  
  // Generate welcome message for first-time posters
  const welcome = isFirstTimePoster
    ? `Welcome to /r/${subreddit}!

I'm JustNoBot. I help people follow your posts!`
    : `Other posts from /u/${author}:

${userHistory}`;
  
  // Generate comment text
  const commentText = generateFullComment(context, welcome);
  
  // Post the comment
  await reddit.submitComment({
    id: post.id,
    text: commentText
  });
  
  // Mark post as commented
  await markPostAsCommented(post.id);
  
  // Increment user's post count
  await incrementUserPostCount(author, subreddit);
}
