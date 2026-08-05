import { Capacitor } from "@capacitor/core";
import { Purchases, PRODUCT_CATEGORY } from "@revenuecat/purchases-capacitor";

// Public SDK keys are safe to ship in client code (unlike the secret key,
// which stays backend-only). REVENUECAT_API_KEY_IOS is a placeholder until
// an iOS app exists in App Store Connect + RevenueCat. These two product
// IDs must exactly match non-subscription products created in both
// App Store Connect / Google Play Console AND RevenueCat, and the same IDs
// are used server-side in backend/server.py.
const REVENUECAT_API_KEY_ANDROID = "goog_JQfXhxyDSUfSxbDeTwPkgjTAVDo";
const REVENUECAT_API_KEY_IOS = "appl_REPLACE_ME";

export const UNLOCK_PRODUCT_ID = "com.nexusapp.mobile.unlock_full";
export const PIN_PRODUCT_ID = "com.nexusapp.mobile.pin_slot";

let configured = false;

export function isNative() {
  return Capacitor.isNativePlatform();
}

// Call once a logged-in user is known — appUserID ties RevenueCat's
// subscriber record to our own user id, so the backend can look it up.
export async function configurePurchases(appUserId) {
  if (!isNative() || configured) return;
  const apiKey = Capacitor.getPlatform() === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  await Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

async function buy(productId) {
  const { products } = await Purchases.getProducts({
    productIdentifiers: [productId],
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });
  const product = products?.[0];
  if (!product) throw new Error("This purchase isn't available right now.");
  const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
  const tx = customerInfo.nonSubscriptionTransactions
    .filter((t) => t.productIdentifier === productId)
    .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0];
  if (!tx) throw new Error("Purchase completed but no transaction was found.");
  return tx.transactionIdentifier;
}

export const purchaseFullUnlock = () => buy(UNLOCK_PRODUCT_ID);
export const purchasePinSlot = () => buy(PIN_PRODUCT_ID);
