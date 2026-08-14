-- Branding do escritório: arquivo privado, isolado pelo primeiro segmento do caminho.
ALTER TABLE public.law_firms
  ADD COLUMN IF NOT EXISTS logo_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tenant branding uploads" ON storage.objects;
CREATE POLICY "tenant branding uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  );

DROP POLICY IF EXISTS "tenant branding reads" ON storage.objects;
CREATE POLICY "tenant branding reads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'branding'
    AND public.has_law_firm_access(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "tenant branding updates" ON storage.objects;
CREATE POLICY "tenant branding updates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  ) WITH CHECK (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  );

DROP POLICY IF EXISTS "tenant branding deletes" ON storage.objects;
CREATE POLICY "tenant branding deletes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  );
