# Local payment confirmation idempotency

## Behavior

One verified gateway payment produces one local order. Repeated or simultaneous confirmations return that order, including its current status, without deducting stock, removing cart items, or recreating its snapshots again. This applies to paid stock-shortage orders as well: restocking followed by a retry does not silently fulfill an existing `Paid, needs attention` order.

Stripe still confirms through the browser return page and the existing authenticated `POST /api/order/users/payments/online` API. The backend retrieves the PaymentIntent and checks succeeded status and buyer metadata. It then obtains a database write lock on the authenticated buyer row before querying the payment and creating an order. The payment lookup is scoped by gateway (`Stripe`) plus payment ID; returning an existing order also verifies its buyer. New orders retain the existing checkout ownership/currency/amount checks.

The lock covers payment lookup, order/payment/items/stock/cart writes and checkout linkage in one transaction. Two requests may verify the payment concurrently, but only one can enter this buyer's database confirmation section. The second waits for commit and then finds the saved payment. If the first transaction fails, its writes roll back and another request can try again.

Why lock the buyer row? It always exists, even for older Stripe payments with no `stripe_checkouts` record. This avoids introducing a new lock table or a legacy-only retry mechanism. The tradeoff is that different Stripe payments belonging to the same buyer also serialize briefly. Stripe verification runs before acquiring the lock. At this project's local scale this is deliberate; payment-row locking would allow more concurrency if legacy payments are retired or a payment record is guaranteed before confirmation.

PayPal retains its existing checkout-row write lock, stored-order fast return and stable `PayPal-Request-Id` capture header. Its concurrency test verifies that simultaneous requests capture once and return one order.

The database also enforces `uk_payment_gateway_id`, a unique constraint on `(pg_name, pg_payment_id)`. Different gateways can have the same textual payment ID. This constraint is the final protection against duplicate payment records; the locking flow makes normal repeated requests return the existing result instead of reporting a uniqueness error.

This is idempotent confirmation of the **same payment**. Two distinct successful payments are different purchases. Local Stripe confirmation still requires returning to the page after paying.

## Applying the database constraint

Restarting the backend with the current `spring.jpa.hibernate.ddl-auto=update` configuration attempts to add the unique constraint. This task did not restart or modify the development database. Before applying it to a database containing historical payments, inspect duplicates:

```sql
SELECT pg_name, pg_payment_id, COUNT(*)
FROM payments
WHERE pg_name IS NOT NULL AND pg_payment_id IS NOT NULL
GROUP BY pg_name, pg_payment_id
HAVING COUNT(*) > 1;
```

If rows are returned, inspect their associated orders before changing data. Do not automatically delete historical paid orders. Verify that the constraint was created; Hibernate schema-update messages alone are not proof:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'payments'::regclass
  AND conname = 'uk_payment_gateway_id';
```

## Verification

```powershell
.\mvnw.cmd '-Dtest=PaymentIdempotencyTest,SelectedOrderTest,PayPalServiceTest' test
```

`PaymentIdempotencyTest` runs real Spring transactions on isolated H2 in PostgreSQL mode. It covers concurrent and later Stripe confirmations, concurrent legacy confirmations without a checkout row, retries of shortage orders after restocking, rollback after interrupted order writes followed by successful retry, account/payment mismatch rejection, database uniqueness with gateway separation, and simultaneous PayPal capture with one gateway capture request. Gateways are mocked. Real Stripe/PayPal settlement, browser refresh against a live backend, and PostgreSQL locking/schema updates remain separate checks.

References: [Spring Data JPA locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html), [PostgreSQL row-level locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS).
