import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar, isPolarConfigured } from "@/lib/polar";
import { env } from "@/lib/env";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

export const generationsRouter = createTRPCRouter({
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const generation = await prisma.generation.findUnique({
        where: { id: input.id, orgId: ctx.orgId },
        omit: {
          orgId: true,
          r2ObjectKey: true,
        },
      });

      if (!generation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...generation,
        audioUrl: `/api/audio/${generation.id}`,
      };
    }),
  
  getAll: orgProcedure.query(async ({ ctx }) => {
    const generations = await prisma.generation.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      omit: {
        orgId: true,
        r2ObjectKey: true,
      },
    });

    return generations;
  }),

  create: orgProcedure
    .input(
      z.object({
        text: z.string().min(1).max(TEXT_MAX_LENGTH),
        voiceId: z.string().min(1),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for active subscription before generation (skipped if Polar is not configured)
      if (isPolarConfigured) {
        try {
          const customerState = await polar.customers.getStateExternal({
            externalId: ctx.orgId,
          });
          const hasActiveSubscription =
            (customerState.activeSubscriptions ?? []).length > 0;
          if (!hasActiveSubscription) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "SUBSCRIPTION_REQUIRED",
            });
          }
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          // Customer doesn't exist in Polar yet -> no subscription
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "SUBSCRIPTION_REQUIRED",
          });
        }
      }

      const voice = await prisma.voice.findUnique({
        where: {
          id: input.voiceId,
          OR: [
            { variant: "SYSTEM" },
            { variant: "CUSTOM", orgId: ctx.orgId, }
          ],
        },
        select: {
          id: true,
          name: true,
          r2ObjectKey: true,
          language: true,
        },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      if (!voice.r2ObjectKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Voice audio not available",
        });
      }

      console.log("[DEBUG] [1] API Entry: Generating TTS for text:", input.text.slice(0, 20) + "...");
      console.log("[DEBUG] [2] Target Voice ID:", input.voiceId);

      const { data, error } = await chatterbox.POST("/generate", {
        body: {
          prompt: input.text,
          voice_key: `${voice.language}_${voice.r2ObjectKey}`,
          temperature: input.temperature,
          top_p: input.topP,
          top_k: input.topK,
          repetition_penalty: input.repetitionPenalty,
          norm_loudness: true,
        },
        parseAs: "arrayBuffer",
      });

      console.log("[DEBUG] [3] External TTS Engine Called.");

      Sentry.logger.info("Generation started", {
        orgId: ctx.orgId,
        voiceId: input.voiceId,
        textLength: input.text.length,
      });

      if (error) {
        console.error("[DEBUG] [FAIL] TTS Engine returned an error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate audio",
        });
      }

      if (!data) {
        console.error("[DEBUG] [FAIL] TTS Engine returned empty data");
        Sentry.logger.error("Empty audio response data", { orgId: ctx.orgId });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid audio response",
        });
      }

      console.log("[DEBUG] [4] Received audio data from TTS Engine. Parsing Buffer...");

      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else if ((data as any) instanceof Blob) {
        buffer = Buffer.from(await (data as any).arrayBuffer());
      } else {
        buffer = Buffer.from(data as any);
      }
      
      console.log(`[DEBUG] [5] Buffer generated successfully. Size: ${(buffer.length / 1024).toFixed(2)} KB`);

      let generationId: string | null = null;
      let r2ObjectKey: string | null = null;

      try {
        const generation = await prisma.generation.create({
          data: {
            orgId: ctx.orgId,
            text: input.text,
            voiceName: voice.name,
            voiceId: voice.id,
            temperature: input.temperature,
            topP: input.topP,
            topK: input.topK,
            repetitionPenalty: input.repetitionPenalty,
          },
          select: {
            id: true,
          },
        });

        generationId = generation.id;
        r2ObjectKey = `generations/orgs/${ctx.orgId}/${generation.id}`;

        console.log("[DEBUG] [6] Database record created. Generation ID:", generationId);
        console.log(`[DEBUG] [7] Starting Supabase Storage upload. Key: ${r2ObjectKey}, Content-Type: audio/mpeg`);

        await uploadAudio({ buffer, key: r2ObjectKey, contentType: "audio/mpeg" });

        console.log("[DEBUG] [8] Supabase Storage upload SUCCESS!");

        await prisma.generation.update({
          where: {
            id: generation.id,
          },
          data: {
            r2ObjectKey,
          },
        });

        Sentry.logger.info("Audio generated", {
          orgId: ctx.orgId,
          generationId: generation.id,
        });
      } catch {
        if (generationId) {
          await prisma.generation
            .delete({
              where: {
                id: generationId,
              },
            })
            .catch(() => {});
        }

        Sentry.logger.error("Generation failed", {
          orgId: ctx.orgId,
          voiceId: input.voiceId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      if (!generationId || !r2ObjectKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      // Ingest usage event to Polar (fire-and-forget, don't block response) - only if Polar is configured
      if (isPolarConfigured && env.POLAR_METER_TTS_GENERATION && env.POLAR_METER_TTS_PROPERTY) {
        polar.events
          .ingest({
            events: [
              {
                name: env.POLAR_METER_TTS_GENERATION,
                externalCustomerId: ctx.orgId,
                metadata: { [env.POLAR_METER_TTS_PROPERTY]: input.text.length },
                timestamp: new Date(),
              },
            ],
          })
          .catch(() => {
            // Silently fail - don't break the user experience for metering errors
          });
      }

      return {
        id: generationId,
      };
    }),
});
