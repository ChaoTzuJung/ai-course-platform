import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default. Clerk (v1) integrates via rootAuthLoader in
  // app/root.tsx — no router middleware flag is required.
  ssr: true,
} satisfies Config;
