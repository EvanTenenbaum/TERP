# Sales Features

**Module:** Sales & CRM  
**Last Updated:** 2025-12-31

---

## Overview

The Sales module provides comprehensive tools for managing orders, quotes, customer relationships, and sales analytics. This guide covers order management, the multi-order credit system, quick customer creation, and customer preference tracking.

---

## Orders

### Creating an Order

1. Navigate to **Sales → Orders**
2. Click **"+ New Order"**
3. Fill in order details:

| Field      | Description                   | Required |
| ---------- | ----------------------------- | -------- |
| Customer   | Select existing or create new | Yes      |
| Order Type | Order or Quote                | Yes      |
| Items      | Products and quantities       | Yes      |
| Pricing    | Unit prices, discounts        | Yes      |
| Notes      | Special instructions          | No       |

4. Click **"Save as Draft"** or **"Confirm Order"**

### Order Statuses

| Status    | Description              | Next Action      |
| --------- | ------------------------ | ---------------- |
| DRAFT     | Not yet submitted        | Edit or Confirm  |
| QUOTE     | Price quote for customer | Convert to Order |
| CONFIRMED | Ready for fulfillment    | Pick & Pack      |
| PICKING   | Being prepared           | Pack items       |
| PACKED    | Ready for dispatch       | Ship             |
| SHIPPED   | In transit               | Deliver          |
| DELIVERED | Completed                | Close            |
| CANCELLED | Cancelled                | Archive          |

### Converting Quote to Order

1. Open the quote
2. Click **"Convert to Order"**
3. Review and confirm
4. Order is created with CONFIRMED status

---

## Multi-Order & Referral Credit System (WS-004)

Track and apply credits across multiple orders.

### Credit Types

| Type                   | Description                                |
| ---------------------- | ------------------------------------------ |
| **Referral Credit**    | Earned when referred customer places order |
| **Volume Credit**      | Earned from large orders                   |
| **Promotional Credit** | Special promotions                         |
| **Adjustment Credit**  | Manual adjustments                         |

### Viewing Credits

1. Go to **Client Profile → Credits tab**
2. See:
   - Available balance
   - Credit history
   - Pending credits

### Applying Credits to Order

1. Create or edit an order
2. In the payment section, click **"Apply Credit"**
3. Enter amount to apply (up to available balance)
4. Credit reduces order total

### Referral Program

When a referred customer places their first order:

1. System identifies the referrer
2. Referral credit is calculated (configurable %)
3. Credit is added to referrer's account
4. Both parties are notified

---

## Quick Customer Creation (WS-011)

Create new customers without leaving the order flow.

### Inline Creation

1. In the order form, click **"+ New Customer"**
2. Enter minimum required info:
   - Name
   - Email or Phone
3. Click **"Create & Select"**
4. Customer is created and selected for the order

### Full Creation

For complete customer setup:

1. Navigate to **Clients → + New Client**
2. Fill in all details:
   - Contact information
   - Billing address
   - Shipping address
   - Credit terms
   - Preferences
3. Click **"Save"**

---

## Customer Preferences & Purchase History (WS-012)

Track what customers like and have bought.

### Viewing Preferences

1. Open **Client Profile**
2. Go to **Preferences tab**
3. See:
   - Favorite strains/products
   - Preferred quantities
   - Delivery preferences
   - Communication preferences

### Purchase History

The system automatically tracks:

| Metric              | Description          |
| ------------------- | -------------------- |
| **Total Orders**    | Lifetime order count |
| **Total Spent**     | Lifetime revenue     |
| **Average Order**   | Average order value  |
| **Top Products**    | Most purchased items |
| **Order Frequency** | How often they order |
| **Last Order**      | Most recent purchase |

### Strain Preferences

Based on purchase history, the system shows:

```
Top Strain Families:
1. OG Kush - 45 purchases (32%)
2. Blue Dream - 28 purchases (20%)
3. Gelato - 21 purchases (15%)
```

Use this for:

- Personalized recommendations
- Targeted promotions
- Inventory planning

---

## Customer Wishlist (WS-015)

Track products customers want but aren't currently available.

### Adding to Wishlist

1. Open **Client Profile → Wishlist tab**
2. Click **"+ Add Item"**
3. Enter:
   - Product/Strain name
   - Desired quantity
   - Notes
4. Save

### Wishlist Notifications

When a wishlisted item becomes available:

1. System checks incoming inventory
2. Matches against wishlists
3. Notifies sales team
4. Optionally notifies customer

### Managing Wishlists

- **Fulfill** - Convert to order when available
- **Remove** - Customer no longer interested
- **Update** - Change quantity or notes

---

## Sales Sheets

Generate product catalogs for customers.

### Creating a Sales Sheet

1. Navigate to **Sales → Sales Sheets**
2. Click **"+ New Sales Sheet"**
3. Select products to include
4. Choose pricing tier (if applicable)
5. Generate PDF or shareable link

### Customization

- Include/exclude pricing
- Add customer-specific notes
- Apply customer's discount tier
- Include product images

---

## Quotes

### Creating a Quote

1. Navigate to **Sales → Quotes**
2. Click **"+ New Quote"**
3. Select customer
4. Add products and quantities
5. Set expiration date
6. Save and send

### Quote Lifecycle

```
DRAFT → SENT → VIEWED → ACCEPTED → ORDER
                  ↓
              REJECTED/EXPIRED
```

### Tracking Quote Status

- **Sent** - Quote delivered to customer
- **Viewed** - Customer opened the quote
- **Accepted** - Customer approved (converts to order)
- **Rejected** - Customer declined
- **Expired** - Past expiration date

---

## Leaderboard

Track sales performance across the team.

### Metrics Tracked

| Metric              | Description        |
| ------------------- | ------------------ |
| YTD Revenue         | Year-to-date sales |
| Order Count         | Number of orders   |
| Average Order Value | Revenue per order  |
| New Customers       | Customers acquired |
| Conversion Rate     | Quotes to orders   |

### Viewing Leaderboard

1. Navigate to **Analytics → Leaderboard**
2. Filter by:
   - Time period
   - Client type (Customer/Supplier)
   - Metric category
3. See rankings and trends

---

## Tips & Best Practices

1. **Use Quick Create** for new customers during order entry

2. **Check Preferences** before making recommendations

3. **Review Wishlist** when new inventory arrives

4. **Convert Quotes Promptly** before expiration

5. **Apply Credits** to build customer loyalty

6. **Track History** to identify upsell opportunities

---

## Troubleshooting

### "Customer not found"

Use global search or create a new customer inline.

### "Cannot apply credit - insufficient balance"

Check customer's available credit balance.

### "Quote expired"

Create a new quote or extend expiration date.

### "Order cannot be confirmed"

Check for missing required fields or inventory issues.

---

_For technical issues, contact your system administrator._
