-- Adicionar DELETE policy para o bucket de documentos
-- Permite que membros do tenant deletem seus próprios documentos
CREATE POLICY "Tenant document deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT law_firm_id::text
      FROM public.law_firm_members
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );
