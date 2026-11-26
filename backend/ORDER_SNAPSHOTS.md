# Order snapshots

New Stripe and PayPal checkouts freeze product ID, seller ID, name, image filename, quantity, unit price, discount and the selected address before sending a payment request. Amounts and address ownership come from the backend. Successful payment confirmation creates the order from that stored snapshot.

Order items retain their original product and seller IDs even if the live product is deleted. Deleting a personal address or product detaches its nullable order association, preserving the snapshot. Product image uploads use unique filenames; old files are intentionally retained because orders and pending payments can reference them. Do not run file cleanup without checking these references.

## Applying the change

The existing Hibernate `ddl-auto=update` configuration adds snapshot columns and the `stripe_checkouts` table on backend startup. The application runner fills only orders whose `snapshotBackfilled` is null, in a transaction. It copies current product name/image/address and preserves the recorded order-item price, quantity and discount. Such orders have `snapshotBackfilled=true`; My Orders labels their details as historical backfills. Later startups do not overwrite snapshots. Back up the database before deploying schema changes to a shared environment.

Already-started legacy payments are backfilled when confirmed, using their original selected IDs/quantities and payment amount where available. PayPal also retains its recorded unit prices. Old Stripe metadata did not retain unit prices or names/addresses; those are necessarily reconstructed from remaining data and marked backfilled. If the required legacy records are missing, confirmation reports an explicit support error rather than inventing historical information.

New snapshots need no historical-data guesswork. Returning from payment or changing the checkout address/cart invalidates the cached Stripe client secret. An approved pending PayPal payment remains recoverable and is confirmed against its original snapshot.

## Verification

Run `./mvnw.cmd -Dtest=OrderSnapshotPersistenceTest,StripeSnapshotTest,SelectedOrderTest,PayPalServiceTest,BuyerOrdersTest,SellerOrderPaginationTest test`.
The persistence tests use an isolated H2 database in PostgreSQL mode, not the configured development database. Gateway requests are mocked. Real gateway sandbox settlement and the live PostgreSQL upgrade must be checked separately.

## Stock allocation during local payment confirmation

Both Stripe and PayPal allocate stock in `OrderSnapshotService.complete` using a conditional database update (`stock = stock - quantity` only where `stock >= quantity`). Products are processed in ID order. If any update affects zero rows, earlier deductions are restored inside the same transaction, the entire order is saved as `Paid, needs attention`, and its cart is kept. Order/payment/items/stock/cart writes commit together; a persistence failure rolls all of them back. No schema change or additional local service is needed.

The confirmation page and My Orders show paid stock shortages with the order number and support instructions. There is no automatic refund or stock-allocation workflow for attention orders; changing their status alone does not allocate inventory. Local Stripe confirmation still requires returning to the page after payment.

`ConditionalStockTest` uses two simultaneous transactions competing for the last unit, and checks the resulting order statuses, inventory, carts and payment records. It also covers restoring earlier deductions on a later shortage and stock rollback on order-write failure. The database is isolated H2 in PostgreSQL mode; real gateway settlement and the development PostgreSQL database are not exercised.
