export type CatalogTemplate = {
  id: string;
  name: string;
  isSystem: boolean;
};

export function normalizedTemplateName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s*-\s*(copia|copia do sistema)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Office templates override an equivalent system starter, so copying a model never duplicates the catalog. */
export function withoutDuplicateSystemTemplates<T extends CatalogTemplate>(templates: T[]): T[] {
  const officeNames = templates
    .filter((template) => !template.isSystem)
    .map((template) => normalizedTemplateName(template.name));

  const seen = new Set<string>();

  return templates.filter((template) => {
    const normalizedName = normalizedTemplateName(template.name);

    // Skip exact duplicate entries (e.g. same template inserted twice in DB)
    if (seen.has(normalizedName)) return false;
    seen.add(normalizedName);

    // Office templates always pass through
    if (!template.isSystem) return true;

    // System template is hidden if an equivalent office template exists
    return !officeNames.some(
      (officeName) => officeName === normalizedName || normalizedName.startsWith(officeName),
    );
  });
}
