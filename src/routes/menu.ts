import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import type { FormField } from '@devvit/shared-types/shared/form.js';
import { reddit } from '@devvit/web/server';

export const menu = new Hono();

const buildNukeFields = (targetId: string): FormField[] => [
  {
    name: 'targetId',
    label: 'Target ID',
    type: 'string',
    helpText: 'Auto-filled from the selected item.',
    required: true,
    defaultValue: targetId,
  },
  {
    name: 'remove',
    label: 'Remove comments',
    type: 'boolean',
    defaultValue: true,
  },
  {
    name: 'lock',
    label: 'Lock comments',
    type: 'boolean',
    defaultValue: false,
  },
  {
    name: 'skipDistinguished',
    label: 'Skip distinguished comments',
    type: 'boolean',
    defaultValue: false,
  },
];

const buildNukeForm = (title: string, targetId: string) => ({
  fields: buildNukeFields(targetId),
  title,
  acceptLabel: 'Mop',
  cancelLabel: 'Cancel',
});

menu.post('/mop-comment', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  console.log('request', request.targetId);
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'mopComment',
        form: buildNukeForm('Mop Comments', request.targetId),
      },
    },
    200
  );
});

menu.post('/mop-post', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'mopPost',
        form: buildNukeForm('Mop Post Comments', request.targetId),
      },
    },
    200
  );
});

// Subscribe menu handler
// Replaces app-to-migrate/justnobot.py message subscription handling (lines 422-478)
menu.post('/subscribe', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const postId = request.targetId as `t3_${string}`;
  
  // Get post author from Reddit API
  const post = await reddit.getPostById(postId);
  const poster = post.authorName;
  
  console.log('Subscribe menu request for post:', postId, 'author:', poster);
  
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'subscribe',
        form: {
          fields: [
            {
              name: 'poster',
              label: 'Author username',
              type: 'string',
              defaultValue: poster,
              required: true,
              helpText: 'You will be notified when this user posts in this subreddit.',
            },
          ],
          title: `Subscribe to ${poster}`,
          acceptLabel: 'Subscribe',
          cancelLabel: 'Cancel',
        },
      },
    },
    200
  );
});

// Unsubscribe menu handler
// Replaces app-to-migrate/justnobot.py message unsubscribe handling (lines 461-478)
menu.post('/unsubscribe', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const postId = request.targetId as `t3_${string}`;
  
  // Get post author from Reddit API
  const post = await reddit.getPostById(postId);
  const poster = post.authorName;
  
  console.log('Unsubscribe menu request for post:', postId, 'author:', poster);
  
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'unsubscribe',
        form: {
          fields: [
            {
              name: 'poster',
              label: 'Author username',
              type: 'string',
              defaultValue: poster,
              required: true,
              helpText: 'You will no longer be notified when this user posts in this subreddit.',
            },
          ],
          title: `Unsubscribe from ${poster}`,
          acceptLabel: 'Unsubscribe',
          cancelLabel: 'Cancel',
        },
      },
    },
    200
  );
});
