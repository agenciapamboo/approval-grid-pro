import { MarkdownDoc } from "@/components/docs/MarkdownDoc";
import { backupGuideContent } from "@/content/docs/backup-guide";

export default function BackupGuide() {
  return (
    <MarkdownDoc
      title="Documentação de Backup"
      content={backupGuideContent}
      breadcrumb={[
        { label: "Admin", href: "/admin/backups" },
        { label: "Documentação", href: "/admin/backups?tab=documentacao" },
        { label: "Backup Guide" },
      ]}
    />
  );
}
