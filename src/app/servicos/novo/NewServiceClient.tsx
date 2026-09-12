"use client";

/**
 * New Service Client
 * Client component for the new service page
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceForm } from "@/components/service-catalog/ServiceForm";
import { createServiceAction } from "@/lib/service-catalog/actions";
import type { ServiceFormInput } from "@/lib/service-catalog/types";

export function NewServiceClient() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (data: ServiceFormInput) => {
    setIsLoading(true);
    try {
      const result = await createServiceAction(data);
      if (result.ok) {
        router.push('/servicos');
      } else {
        console.error("Erro ao criar serviço:", result.error);
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
        onSubmit={handleSubmit}
        onCancel={() => router.push('/servicos')}
        isLoading={isLoading}
      />
    </div>
  );
}