import { COLLECTION_CYCLES } from "../config/collectionCycles";

export function resolveCanonicalUrl(work: { type: string; releaseDate: string | number | Date; slug: any; }) {
  if (work.type === "collection") {
    const date = new Date(work.releaseDate);

    const band = COLLECTION_CYCLES.find(
      (b) =>
        date >= new Date(b.from) &&
        date <= new Date(b.to)
    );

    if (!band) {
      throw new Error(
        `No collection year band for ${work.slug}`
      );
    }

    return `/designs/${band.path}/${work.slug}`;
  }

  return `/music/${work.slug}`;
}
