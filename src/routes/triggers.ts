import { Hono } from 'hono';
import type { OnAppInstallRequest, OnPostSubmitRequest, TriggerResponse } from '@devvit/web/shared';
import { hasCommentedOnPost } from '../core/redisStorage';
import { shouldSkipPost, postBotComment } from '../core/postCommentLogic';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('[App Install] Installed to subreddit: r/' + input.subreddit?.name);

  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});

triggers.post('/on-post-submit', async (c) => {
  const input = await c.req.json<OnPostSubmitRequest>();
  const post = input.post;
  const author = input.author;
  const subreddit = input.subreddit?.name || '';
  
  if (!post || !subreddit) {
    return c.json<TriggerResponse>({ status: 'ignored' }, 200);
  }

  console.log('[Post Submit] Post ID: ' + post.id + ' in r/' + subreddit);

  try {
    // Check if post already has bot comment
    const hasCommented = await hasCommentedOnPost(post.id);
    
    // Check if post should be skipped
    if (shouldSkipPost(post, hasCommented, author)) {
      console.log('[Post Submit] Skipping post: ' + post.id);
      return c.json<TriggerResponse>({ status: 'ignored' }, 200);
    }

    // Post bot comment with author name
    await postBotComment(post, subreddit, author?.name);
    console.log('[Post Submit] Bot comment posted on: ' + post.id);

    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('[Post Submit] Error processing post: ' + post.id, error);
    return c.json<TriggerResponse>({ status: 'error' }, 500);
  }
});
