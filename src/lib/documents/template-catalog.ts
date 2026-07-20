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

  return templates.filter(
    (template) => {
      if (!template.isSystem) return true;
      const systemName = normalizedTemplateName(template.name);
      return !officeNames.some(
        (officeName) => officeName === systemName || officeName.startsWith(systemName) || systemName.startsWith(officeName),
      );
    },
  );
}
