import { PropostaTable } from "@/components/PropostaTable";

export default function PropostasPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📋 Propostas Cadastradas</h1>
      <PropostaTable />
    </div>
  );
}