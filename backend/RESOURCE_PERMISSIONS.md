# Resource permissions and order lifecycle

## Agreed local MVP policy

| Resource/action | Buyer | Seller | Admin |
| --- | --- | --- | --- |
| Public products/categories | Read | Read | Read |
| Product creation | Denied | Creates own product | Creates own product |
| Product edit/delete/image upload | Denied | Own products only | Any product |
| Personal addresses | Own only | Own only | Own only |
| Cart removal by cart ID | Own cart only | Own cart only | Own cart only |
| All-cart listing | Denied | Denied | Allowed |
| My Orders | Own purchases only | Own purchases only | Own purchases only |
| Seller order list | Denied | Own snapshot items and item subtotal only | Own seller items via seller route |
| Full order list/status update | Denied | Denied | Allowed via admin routes |
| Seller directory | Denied | Denied | Reduced user details, no password/address/cart |

Security route rules check the actor's role. Product mutation services additionally check resource ownership before writes/uploads. Creation ignores a client-supplied product ID and derives the owner from the authenticated account. Foreign personal resources return 404, the same as missing resources.

The cart deletion HTTP endpoint checks ownership once at the entry point. Its shared service also supports authorized internal cleanup when a product is deleted from other users' carts, so a personal-cart ownership check must not be added blindly to that internal operation. Removing an item updates both JPA collections as well as deleting the row.

The seller order response filters lines by their historical `snapshotSellerId`. It omits buyer email, address, payment details and the whole-order amount. `itemsSubtotal` is the seller's item-price × quantity subtotal, excluding order tax; it is not a seller payout calculation. Admin and buyer views retain their appropriate full order data.

## Status rules

`Accepted → Processing → Shipped → Delivered`

Only administrators can advance the whole order, including a mixed-seller order. Requests cannot skip steps or move backward. Repeating the current valid status has no effect. `Paid, needs attention` has no manual transition into fulfillment. Cancellation, refund and resolving attention orders are separate future work.

New orders use `Accepted`. Historical `Accepted !` and `Order Accepted !` are read as `Accepted` without bulk-rewriting existing records; subsequent valid updates persist the canonical status. Other historical statuses remain visible and are not silently converted. This change needs no schema migration.

## Verification and interview preparation

`ResourcePolicyTest` uses isolated H2 plus the actual Spring Security filter chain and MockMvc. It covers cross-owner product edit/delete/image denial, forged creation IDs, owner/admin success, buyer/seller role denial, seller response filtering, personal address/cart isolation, directory response fields, valid/invalid status transitions, and legacy status compatibility. Browser checks use mocked API responses to verify seller read-only columns, admin next-step selection, successful dialog closure and disabled attention-order updates.

Useful follow-up questions:
- Why is a seller role insufficient authorization to update an arbitrary product ID?
- Why must a backend filter seller data even if frontend columns are hidden?
- Why is whole-order fulfillment admin-only when one order can contain several sellers?
- Why is a paid stock shortage different from an unpaid or cancelled order?
- Why do internal product cleanup and user-driven cart deletion need different authorization entry points?

Actual JWT login, live payment settlement and the development PostgreSQL database are outside these checks.
