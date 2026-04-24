# App Store Checklist

## Before TestFlight

- Confirm bundle ID and app name match the Pixel Courier App Store record.
- Replace any remaining starter copy before submission.
- Configure the RevenueCat Apple API key in `.env.local`.
- Confirm App Store Connect product ID matches `VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID`.
- Run `npm run release:guard`.
- Run `npm run ios:prepare`.
- Run `npm run ios:verify` if Xcode command line tools are available.

## App Review Notes

Generate a starter packet:

```sh
npm run review:packet
```

Use the generated notes as the base for App Review. Add real tester credentials only if your final game introduces login.

## Screenshots

Generate a screenshot checklist:

```sh
npm run capture:screenshots
```

Required scenes for this MVP:

- main menu with unlock button;
- free gameplay;
- paywall;
- restored or already unlocked state;
- premium gameplay.
