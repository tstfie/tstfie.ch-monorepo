import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || '366sb9yi',
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: "2024-01-01",
  useCdn: true,
});
