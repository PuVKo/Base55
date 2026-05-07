import { apiFetch } from '@/lib/api';

export function fetchSubscriptionStatus() {
  return apiFetch('/api/billing/subscription');
}

export function createSubscriptionCheckout() {
  return apiFetch('/api/billing/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function cancelSubscription() {
  return apiFetch('/api/billing/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
