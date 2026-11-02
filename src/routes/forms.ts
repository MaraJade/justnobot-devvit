import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/shared-types/tid.js';
import { handleNuke, handleNukePost } from '../core/nuke';
import { addSubscriber, removeSubscriber } from '../core/redisStorage';

type NukeFormValues = {
  remove?: boolean;
  lock?: boolean;
  skipDistinguished?: boolean;
  targetId?: string;
};

type SubscribeFormValues = {
  poster: string;
};

type UnsubscribeFormValues = {
  poster: string;
};

export const forms = new Hono();

const normalizeValues = (values: NukeFormValues) => ({
  remove: Boolean(values.remove),
  lock: Boolean(values.lock),
  skipDistinguished: Boolean(values.skipDistinguished),
});

const getTargetId = (values: NukeFormValues) => {
  if (typeof values.targetId === 'string' && values.targetId.trim()) {
    return values.targetId.trim();
  }

  return context.postId;
};

forms.post('/mop-comment-submit', async (c) => {
  const values = await c.req.json<NukeFormValues>();
  console.log('[Forms] Mop comment submit values:', values);
  const normalized = normalizeValues(values);

  if (!normalized.lock && !normalized.remove) {
    return c.json<UiResponse>(
      {
        showToast: 'You must select either lock or remove.',
      },
      200
    );
  }

  const targetId = getTargetId(values);
  if (!isT1(targetId)) {
    console.error('[Forms] targetId is not a T1:', targetId);
    return c.json<UiResponse>(
      {
        showToast: 'Mop failed! Please try again later.',
      },
      200
    );
  }

  const result = await handleNuke({
    ...normalized,
    commentId: targetId,
    subredditId: context.subredditId,
  });

  console.log('[Forms] Mop comment result: ' + (result.success ? 'success' : 'fail') + ' - ' + result.message);

  return c.json<UiResponse>(
    {
      showToast: `${result.success ? 'Success' : 'Failed'} : ${result.message}`,
    },
    200
  );
});

forms.post('/mop-post-submit', async (c) => {
  const values = await c.req.json<NukeFormValues>();
  console.log('[Forms] Mop post submit values:', values);
  const normalized = normalizeValues(values);

  if (!normalized.lock && !normalized.remove) {
    return c.json<UiResponse>(
      {
        showToast: 'You must select either lock or remove.',
      },
      200
    );
  }

  const targetId = getTargetId(values);
  if (!isT3(targetId)) {
    console.error('[Forms] targetId is not a T3:', targetId);
    return c.json<UiResponse>(
      {
        showToast: 'Mop failed! Please try again later.',
      },
      200
    );
  }

  const result = await handleNukePost({
    ...normalized,
    postId: targetId,
    subredditId: context.subredditId,
  });

  console.log('[Forms] Mop post result: ' + (result.success ? 'success' : 'fail') + ' - ' + result.message);

  return c.json<UiResponse>(
    {
      showToast: `${result.success ? 'Success' : 'Failed'} : ${result.message}`,
    },
    200
  );
});

// Subscribe form handler
// Replaces app-to-migrate/justnobot.py addSubscriber function (lines 158-218)
forms.post('/subscribe', async (c) => {
  const values = await c.req.json<SubscribeFormValues>();
  const poster = values.poster;
  const subreddit = context.subredditName || '';
  const subscriber = context.userId || '';

  console.log('[Forms] Subscribe request: subscriber=' + subscriber + ' poster=' + poster + ' subreddit=' + subreddit);

  if (!subscriber || !poster || !subreddit) {
    return c.json<UiResponse>(
      {
        showToast: 'Failed to subscribe. Missing required information.',
      },
      200
    );
  }

  try {
    const success = await addSubscriber(subscriber, poster, subreddit);
    
    if (success) {
      return c.json<UiResponse>(
        {
          showToast: `Successfully subscribed to ${poster}! You will be notified when they post.`,
        },
        200
      );
    } else {
      return c.json<UiResponse>(
        {
          showToast: 'Failed to subscribe. Please try again.',
        },
        200
      );
    }
  } catch (error) {
    console.error('[Forms] Subscribe error:', error);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to subscribe. Please try again.',
      },
      200
    );
  }
});

// Unsubscribe form handler
// Replaces app-to-migrate/justnobot.py removeSubscription function (lines 223-269)
forms.post('/unsubscribe', async (c) => {
  const values = await c.req.json<UnsubscribeFormValues>();
  const poster = values.poster;
  const subreddit = context.subredditName || '';
  const subscriber = context.userId || '';

  console.log('[Forms] Unsubscribe request: subscriber=' + subscriber + ' poster=' + poster + ' subreddit=' + subreddit);

  if (!subscriber || !poster || !subreddit) {
    return c.json<UiResponse>(
      {
        showToast: 'Failed to unsubscribe. Missing required information.',
      },
      200
    );
  }

  try {
    const success = await removeSubscriber(subscriber, poster, subreddit);
    
    if (success) {
      return c.json<UiResponse>(
        {
          showToast: `Successfully unsubscribed from ${poster}. You will no longer be notified when they post.`,
        },
        200
      );
    } else {
      return c.json<UiResponse>(
        {
          showToast: 'Failed to unsubscribe. Please try again.',
        },
        200
      );
    }
  } catch (error) {
    console.error('[Forms] Unsubscribe error:', error);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to unsubscribe. Please try again.',
      },
      200
    );
  }
});
