// ── Types ──────────────────────────────────────────────────────────────────────

export type OnboardingStepKey =
  | 'office_data'
  | 'branding'
  | 'practice_areas'
  | 'professional_oab'
  | 'team_setup'
  | 'invite_users'
  | 'roles_permissions'
  | 'financial_config'
  | 'process_types'
  | 'deadline_types'
  | 'payment_methods'
  | 'data_import'
  | 'first_client'
  | 'first_process'
  | 'first_contract'
  | 'first_deadline'
  | 'client_portal'
  | 'security_config';

export type OnboardingStepGroup = 'setup' | 'team' | 'financial' | 'usage';

export type OnboardingProfile = 'individual' | 'small' | 'team' | 'department';

// ── Steps ──────────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  required: boolean;
  group: OnboardingStepGroup;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: 'office_data', label: 'Dados do escritório', required: true, group: 'setup' },
  { key: 'branding', label: 'Identidade visual', required: false, group: 'setup' },
  { key: 'practice_areas', label: 'Áreas de atuação', required: true, group: 'setup' },
  { key: 'professional_oab', label: 'Dados profissionais e OAB', required: true, group: 'setup' },
  { key: 'team_setup', label: 'Configuração da equipe', required: false, group: 'team' },
  { key: 'invite_users', label: 'Convite de usuários', required: false, group: 'team' },
  { key: 'roles_permissions', label: 'Papéis e permissões', required: false, group: 'team' },
  { key: 'financial_config', label: 'Configuração financeira', required: false, group: 'financial' },
  { key: 'process_types', label: 'Tipos de processo', required: true, group: 'setup' },
  { key: 'deadline_types', label: 'Tipos de prazo', required: false, group: 'setup' },
  { key: 'payment_methods', label: 'Formas de pagamento', required: false, group: 'financial' },
  { key: 'data_import', label: 'Importação de dados', required: false, group: 'setup' },
  { key: 'first_client', label: 'Primeiro cliente', required: false, group: 'usage' },
  { key: 'first_process', label: 'Primeiro processo', required: false, group: 'usage' },
  { key: 'first_contract', label: 'Primeiro contrato', required: false, group: 'usage' },
  { key: 'first_deadline', label: 'Primeiro prazo', required: false, group: 'usage' },
  { key: 'client_portal', label: 'Portal do cliente', required: false, group: 'setup' },
  { key: 'security_config', label: 'Configurações de segurança', required: false, group: 'setup' },
];

// ── Required steps ─────────────────────────────────────────────────────────────

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export const REQUIRED_STEPS: OnboardingStepKey[] = ONBOARDING_STEPS.filter(
  (step) => step.required,
).map((step) => step.key);

// ── Group labels ───────────────────────────────────────────────────────────────

export const GROUP_LABELS: Record<OnboardingStepGroup, string> = {
  setup: 'Configuração inicial',
  team: 'Equipe',
  financial: 'Financeiro',
  usage: 'Primeiros passos',
};

// ── Profile labels & descriptions ──────────────────────────────────────────────

export const PROFILE_LABELS: Record<OnboardingProfile, string> = {
  individual: 'Advogado(a) autônomo(a)',
  small: 'Pequeno escritório',
  team: 'Equipe de advocacia',
  department: 'Departamento jurídico',
};

export const PROFILE_DESCRIPTIONS: Record<OnboardingProfile, string> = {
  individual:
    'Para profissionais que exercem a advocacia de forma independente, sem equipe fixa.',
  small:
    'Para escritórios com até 5 profissionais que buscam organização e produtividade.',
  team:
    'Para escritórios com equipe de advogados e administrativos que precisam de colaboração.',
  department:
    'Para departamentos jurídicos de empresas que gerenciam processos internos e externos.',
};

// ── Profile recommended steps ──────────────────────────────────────────────────

export const PROFILE_RECOMMENDED_STEPS: Record<OnboardingProfile, OnboardingStepKey[]> =
  {
    individual: [
      'office_data',
      'practice_areas',
      'professional_oab',
      'process_types',
      'first_client',
      'first_process',
      'first_deadline',
    ],
    small: [
      'office_data',
      'branding',
      'practice_areas',
      'professional_oab',
      'team_setup',
      'invite_users',
      'financial_config',
      'process_types',
      'deadline_types',
      'payment_methods',
      'first_client',
      'first_process',
      'first_deadline',
    ],
    team: [
      'office_data',
      'branding',
      'practice_areas',
      'professional_oab',
      'team_setup',
      'invite_users',
      'roles_permissions',
      'financial_config',
      'process_types',
      'deadline_types',
      'payment_methods',
      'data_import',
      'first_client',
      'first_process',
      'first_contract',
      'first_deadline',
      'client_portal',
      'security_config',
    ],
    department: [
      'office_data',
      'branding',
      'practice_areas',
      'professional_oab',
      'team_setup',
      'invite_users',
      'roles_permissions',
      'financial_config',
      'process_types',
      'deadline_types',
      'payment_methods',
      'data_import',
      'first_client',
      'first_process',
      'first_contract',
      'first_deadline',
      'client_portal',
      'security_config',
    ],
  };

// ── Invitation statuses ────────────────────────────────────────────────────────

export const INVITATION_STATUSES = [
  'pendente',
  'visualizado',
  'aceito',
  'expirado',
  'cancelado',
  'recusado',
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pendente: 'Pendente',
  visualizado: 'Visualizado',
  aceito: 'Aceito',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
  recusado: 'Recusado',
};

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  visualizado: 'bg-blue-100 text-blue-800',
  aceito: 'bg-green-100 text-green-800',
  expirado: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800',
  recusado: 'bg-red-100 text-red-800',
};
