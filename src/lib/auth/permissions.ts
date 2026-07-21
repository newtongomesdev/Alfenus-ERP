export const roles = [
  "proprietario",
  "administrador",
  "advogado",
  "assistente",
  "financeiro",
  "colaborador",
  "visualizador",
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "clientes.visualizar",
  "clientes.criar",
  "clientes.editar",
  "clientes.arquivar",
  "leads.pipeline",
  "leads.editar",
  "leads.criar",
  "leads.visualizar",
  "processos.visualizar",
  "processos.criar",
  "processos.editar",
  "financeiro.visualizar",
  "financeiro.editar",
  "contratos.gerenciar",
  "pagamentos.registrar",
  "prazos.visualizar",
  "prazos.criar",
  "prazos.editar",
  "prazos.concluir",
  "risco.visualizar",
  "risco.criar",
  "risco.editar",
  "tarefas.gerenciar",
  "despesas.editar",
  "agenda.editar",
  "equipe.gerenciar",
  "relatorios.visualizar",
  "configuracoes.administrar",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<Role, Permission[]> = {
  proprietario: [...permissions],
  administrador: [...permissions],
  advogado: [
    "clientes.visualizar",
    "clientes.criar",
    "clientes.editar",
    "leads.pipeline",
    "leads.editar",
    "leads.visualizar",
    "processos.visualizar",
    "processos.criar",
    "processos.editar",
    "prazos.visualizar",
    "prazos.criar",
    "prazos.editar",
    "prazos.concluir",
    "risco.visualizar",
    "risco.criar",
    "risco.editar",
    "tarefas.gerenciar",
    "despesas.editar",
    "agenda.editar",
  ],
  assistente: [
    "clientes.visualizar",
    "clientes.criar",
    "leads.pipeline",
    "leads.visualizar",
    "processos.visualizar",
    "prazos.visualizar",
    "prazos.criar",
    "prazos.editar",
    "prazos.concluir",
    "risco.visualizar",
    "tarefas.gerenciar",
    "agenda.editar",
  ],
  financeiro: [
    "clientes.visualizar",
    "financeiro.visualizar",
    "financeiro.editar",
    "contratos.gerenciar",
    "pagamentos.registrar",
    "despesas.editar",
    "relatorios.visualizar",
  ],
  colaborador: ["clientes.visualizar", "leads.visualizar", "processos.visualizar", "prazos.visualizar", "tarefas.gerenciar", "agenda.editar"],
  visualizador: ["clientes.visualizar", "leads.visualizar", "processos.visualizar", "prazos.visualizar", "relatorios.visualizar"],
};

export function can(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
