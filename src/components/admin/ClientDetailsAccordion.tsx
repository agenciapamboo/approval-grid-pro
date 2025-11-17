import { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ClientDetailsAccordionProps {
  overviewContent: ReactNode;
  cadastralContent: ReactNode;
  approversContent: ReactNode;
  requestsContent: ReactNode;
  logsContent: ReactNode;
}

export function ClientDetailsAccordion({
  overviewContent,
  cadastralContent,
  approversContent,
  requestsContent,
  logsContent,
}: ClientDetailsAccordionProps) {
  return (
    <Accordion type="single" collapsible className="md:hidden space-y-2">
      <AccordionItem value="overview" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <span className="font-semibold">Visão Geral</span>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          {overviewContent}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cadastral" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <span className="font-semibold">Dados Cadastrais</span>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          {cadastralContent}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="approvers" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <span className="font-semibold">Aprovadores</span>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          {approversContent}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="requests" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <span className="font-semibold">Histórico de Solicitações</span>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          {requestsContent}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="logs" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <span className="font-semibold">Histórico de Aprovações</span>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          {logsContent}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
