import type { Document, DocumentCategory } from "../types";

export type DocGroup = {
  key: string;
  original_name: string;
  category: DocumentCategory;
  versions: Document[];
};

export function buildGroups(documents: Document[]): Record<DocumentCategory, DocGroup[]> {
  const map: Record<string, DocGroup> = {};
  for (const doc of documents) {
    const key = `${doc.category}||${doc.original_name}`;
    if (!map[key]) map[key] = { key, original_name: doc.original_name, category: doc.category, versions: [] };
    map[key].versions.push(doc);
  }
  for (const g of Object.values(map)) g.versions.sort((a, b) => a.version - b.version);
  const result: Partial<Record<DocumentCategory, DocGroup[]>> = {};
  for (const g of Object.values(map)) (result[g.category] ??= []).push(g);
  for (const cat of Object.keys(result) as DocumentCategory[])
    result[cat]!.sort((a, b) => a.original_name.localeCompare(b.original_name));
  return result as Record<DocumentCategory, DocGroup[]>;
}
