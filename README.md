**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

## YooKassa test subscription (400 RUB / month)

1. Fill billing env vars in `server/.env`:

```env
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=http://localhost:5174/settings
YOOKASSA_WEBHOOK_SECRET=your-shared-secret
YOOKASSA_WEBHOOK_ALLOWED_IPS=
```

2. Set webhook URL in YooKassa dashboard to:
   - `https://<your-domain>/api/billing/yookassa/webhook?secret=your-shared-secret`
   - Events: `payment.succeeded`, `payment.canceled`
3. Start app (`npm run dev`) and open `Настройки -> Профиль`.
4. Click `Оформить подписку` and complete payment in YooKassa test mode.
5. Verify webhook result:
   - status becomes `Активна`,
   - `Следующее списание` is populated,
   - `Отключить автопродление` button is visible.
6. Click `Отключить автопродление` and verify that auto-renew is disabled in UI.

Notes:
- Subscription is activated only from webhook (`payment.succeeded`).
- Recurring cycle is processed by server scheduler (see `BILLING_CRON_INTERVAL_MS`, default 60s).
