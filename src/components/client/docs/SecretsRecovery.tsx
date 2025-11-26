import { MarkdownDoc } from "@/components/docs/MarkdownDoc";
import { secretsRecoveryContent } from "@/content/docs/secrets-recovery";

export default function SecretsRecovery() {
  return (
    <MarkdownDoc
      title="Guia de Recuperação de Secrets"
      content={secretsRecoveryContent}
      breadcrumb={[
        { label: "Admin", href: "/admin/backups" },
        { label: "Documentação", href: "/admin/backups?tab=documentacao" },
        { label: "Secrets Recovery" },
      ]}
    />
  );
}
