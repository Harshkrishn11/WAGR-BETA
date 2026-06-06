import { createThirdwebClient } from "thirdweb";

/**
 * Singleton Thirdweb client — import this everywhere you need contract access.
 * Client ID is public (safe to expose in frontend).
 */
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});
