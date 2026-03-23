import { createTRPCRouter } from '../init';
import { billingRouter } from './billing';
import { generationsRouter } from './generations';
import { voicesRouter } from './voices';
import { assistantRouter } from './assistant';

export const appRouter = createTRPCRouter({
  voices: voicesRouter,
  generations: generationsRouter,
  billing: billingRouter,
  assistant: assistantRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
