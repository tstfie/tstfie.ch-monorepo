// ./sanity.config.ts 
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";


export default defineConfig({
  projectId: '366sb9yi',
  dataset: 'production',
  plugins: [structureTool()],
});