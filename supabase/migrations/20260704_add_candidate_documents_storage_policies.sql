-- Allow authenticated users to manage candidate documents in the candidate documents bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Authenticated users can read candidate documents'
      AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Authenticated users can read candidate documents"
      ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'candidat-doc');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Authenticated users can upload candidate documents'
      AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Authenticated users can upload candidate documents"
      ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'candidat-doc');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Authenticated users can update candidate documents'
      AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Authenticated users can update candidate documents"
      ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'candidat-doc')
      WITH CHECK (bucket_id = 'candidat-doc');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Authenticated users can delete candidate documents'
      AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Authenticated users can delete candidate documents"
      ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'candidat-doc');
  END IF;
END $$;
