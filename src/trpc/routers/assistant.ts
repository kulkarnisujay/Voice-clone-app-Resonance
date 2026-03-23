import { z } from "zod";
import { createTRPCRouter, baseProcedure } from "../init";
import { env } from "@/lib/env";

export const assistantRouter = createTRPCRouter({
  translate: baseProcedure
    .input(
      z.object({
        text: z.string().min(1),
        targetLang: z.string().min(2).max(10),
      })
    )
    .mutation(async ({ input }) => {
      const response = await fetch(`${env.CHATTERBOX_API_URL}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.CHATTERBOX_API_KEY,
        },
        body: JSON.stringify({
          text: input.text,
          target_lang: input.targetLang.split("-")[0],
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed with status: ${response.status}`);
      }

      return await response.json();
    }),
});
