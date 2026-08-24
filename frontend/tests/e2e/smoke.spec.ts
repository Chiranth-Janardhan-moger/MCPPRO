import { expect, test } from '@playwright/test';

test.describe('public pages', () => {
  test('landing page renders', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('signin page renders the auth form', async ({ page }) => {
    const res = await page.goto('/signin');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('form')).toBeVisible();
  });

  test('register page renders', async ({ page }) => {
    const res = await page.goto('/register');
    expect(res?.status()).toBeLessThan(400);
  });
});

test.describe('route protection', () => {
  test('unauthenticated /chat redirects to /signin', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('unauthenticated /dashboard redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin/);
  });
});

test.describe('API surface', () => {
  test('GET /api/models returns catalog with metadata', async ({ request }) => {
    const res = await request.get('/api/models');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.models)).toBe(true);
    expect(body.models.length).toBeGreaterThan(0);
    for (const key of ['defaultModel', 'providers']) {
      expect(body).toHaveProperty(key);
    }
    const m = body.models[0];
    for (const key of ['id', 'label', 'provider', 'capabilities']) {
      expect(m).toHaveProperty(key);
    }
  });

  test('POST /api/mcppro-agent/run rejects unauthenticated requests', async ({
    request,
  }) => {
    const res = await request.post('/api/mcppro-agent/run', {
      data: { url: 'https://example.com/a.pdf', questions: ['q?'] },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/chat rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { messages: [{ role: 'user', content: 'hi' }] },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/rag/status rejects unauthenticated requests', async ({
    request,
  }) => {
    const res = await request.get('/api/rag/status');
    expect(res.status()).toBe(401);
  });
});
