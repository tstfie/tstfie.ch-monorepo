import { createClient } from "@sanity/client";
import fs from "fs";
import { resolveCanonicalUrl } from "../lib/resolveCanonicalUrl";

const client = createClient({
  projectId: '366sb9yi',
    dataset: 'production',
    useCdn: true,
    apiVersion: '2025-01-28',
});

// Fetch all works that are published and have a slug
const works = await client.fetch(`
  *[_type == "work" && defined(slug.current)]{
    "slug": slug.current,
    type,
    releaseDate,
    aliases
  }
`);

// Sort descending by releaseDate
const sortedWorks = works
  .filter((w: { releaseDate: any; }) => w.releaseDate)
  .sort((a: { releaseDate: string | number | Date; }, b: { releaseDate: string | number | Date; }) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

// Pick the latest
const latest = sortedWorks[0];
if (!latest) throw new Error("No works found to assign /latest alias");

const redirects: any[] = [];

// Add all normal aliases
for (const work of works) {
  const canonical = resolveCanonicalUrl(work);
  if (work.aliases?.length) {
    for (const alias of work.aliases) {
      redirects.push({
        source: alias,
        destination: canonical,
        permanent: true,
      });
    }
  }
}

// Add the /latest redirect
redirects.push({
  source: "/latest",
  destination: resolveCanonicalUrl(latest),
  permanent: true,
});

// Write vercel.json
const vercelConfig = { redirects };
fs.writeFileSync("vercel.json", JSON.stringify(vercelConfig, null, 2));

console.log("Redirects generated including /latest →", resolveCanonicalUrl(latest));
