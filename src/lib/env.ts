import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  server: {
    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_ID: z.string().optional(),
    POLAR_METER_VOICE_CREATION: z.string().optional(),
    POLAR_METER_TTS_GENERATION: z.string().optional(),
    POLAR_METER_TTS_PROPERTY: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().min(1),
    R2_ENDPOINT: z.string().url(),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    CHATTERBOX_API_URL: z.url(),
    CHATTERBOX_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CHATTERBOX_API_URL: z.string().url(),
    NEXT_PUBLIC_CHATTERBOX_API_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CHATTERBOX_API_URL: process.env.NEXT_PUBLIC_CHATTERBOX_API_URL,
    NEXT_PUBLIC_CHATTERBOX_API_KEY: process.env.NEXT_PUBLIC_CHATTERBOX_API_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
