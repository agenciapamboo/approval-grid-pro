import { MarkdownDoc } from "@/components/docs/MarkdownDoc";
import { migrationGuideContent } from "@/content/docs/migration-guide";

export default function MigrationGuide() {
  return (
    <MarkdownDoc
      title="Instruções de Migração"
      content={migrationGuideContent}
      breadcrumb={[
        { label: "Admin", href: "/admin/backups" },
        { label: "Documentação", href: "/admin/backups?tab=documentacao" },
        { label: "Migration Guide" },
      ]}
    />
  );
}
