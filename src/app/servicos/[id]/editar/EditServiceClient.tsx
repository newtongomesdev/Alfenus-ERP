"use client";

/**
 * Edit Service Client
 * Client component for editing a service
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceForm } from "@/components/service-catalog/ServiceForm";
import { updateServiceAction } from "@/lib/service-catalog/actions";
import type { ServiceDetail, ServiceFormInput } from "@/lib/service-catalog/types";

interface EditServiceClientProps {
  service: ServiceDetail;
  lawFirmId: string;
}

export function EditServiceClient({ service }: EditServiceClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Convert null to undefined for ServiceFormInput compatibility
  const formInitialData = {
    id: service.id,
    name: service.name,
    slug: service.slug,
    practice_area: service.practice_area,
    category: service.category,
    short_description: service.short_description ?? undefined,
    public_description: service.public_description ?? undefined,
    internal_description: service.internal_description ?? undefined,
    scope_included: service.scope_included ?? undefined,
    scope_excluded: service.scope_excluded ?? undefined,
    estimated_duration: service.estimated_duration ?? undefined,
    duration_unit: service.duration_unit,
    estimated_hours: service.estimated_hours ?? undefined,
    reference_value_cents: service.reference_value_cents ?? undefined,
    min_value_cents: service.min_value_cents ?? undefined,
    max_value_cents: service.max_value_cents ?? undefined,
    currency: service.currency,
    charging_model: service.charging_model,
    default_upfront_cents: service.default_upfront_cents ?? undefined,
    default_installments: service.default_installments ?? undefined,
    success_fee_percentage: service.success_fee_percentage ?? undefined,
    included_expenses: service.included_expenses ?? undefined,
    excluded_expenses: service.excluded_expenses ?? undefined,
    required_documents: service.required_documents ?? undefined,
    suggested_steps: service.suggested_steps ?? undefined,
    estimated_deadline: service.estimated_deadline ?? undefined,
    deadline_unit: service.deadline_unit,
    status: service.status,
  };

  const handleSubmit = async (data: ServiceFormInput) => {
    setIsLoading(true);
    try {
      const result = await updateServiceAction(service.id, data);
      if (result.ok) {
        router.push('/servicos');
      } else {
        console.error("Erro ao atualizar serviço:", result.error);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <ServiceForm
        initialData={formInitialData}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/servicos')}
        isLoading={isLoading}
      />
    </div>
  );
}