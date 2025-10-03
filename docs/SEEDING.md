# Seeding Guide

## Install tools
```bash
npm i -D ts-node typescript
```

## Run the seed
```bash
npx ts-node prisma/seed.ts
```

This will create sample vendors, customers, products, pricebooks, inventory lots, a quote, an order+invoice, a payment with balance, and a replenishment rule.
