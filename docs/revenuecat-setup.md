# RevenueCat Setup

## App Store Connect

1. Create the iOS app with bundle ID `com.eightbitgo.starter` or replace it in `capacitor.config.ts` and `src/8bitgo/config/appConfig.ts`.
2. Create a non-consumable IAP product.
3. Use product ID `com.eightbitgo.starter.full_unlock` unless you replace `VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID`.
4. Add review metadata and screenshot for the IAP product.

## RevenueCat

1. Create a RevenueCat project and iOS app.
2. Add the App Store shared secret / StoreKit setup required by your RevenueCat account.
3. Import or create the product ID from App Store Connect.
4. Create entitlement `8bitgo_starter_full`.
5. Create offering `launch`.
6. Add a lifetime/non-consumable package for the full unlock product.
7. Copy the Apple public API key into `.env.local` as `VITE_REVENUECAT_APPLE_API_KEY`.

## Local Env

```sh
cp .env.example .env.local
```

Replace:

```sh
VITE_REVENUECAT_APPLE_API_KEY=appl_xxx
VITE_8BITGO_ENTITLEMENT_ID=8bitgo_starter_full
VITE_8BITGO_OFFERING_ID=launch
VITE_8BITGO_PACKAGE_ID=\$rc_lifetime
VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID=com.eightbitgo.starter.full_unlock
```

## Release Guard

Run strict validation before TestFlight:

```sh
npm run release:guard
```

Strict mode fails on placeholder or missing Apple API key, missing product ID, or weak product ID shape.
