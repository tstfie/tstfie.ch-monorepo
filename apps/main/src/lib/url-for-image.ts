import imageUrlBuilder from "@sanity/image-url";
import { sanityClient } from "./sanity";

const builder = imageUrlBuilder(sanityClient);

export function urlForImage(source: any) {
  return builder.image(source);
}