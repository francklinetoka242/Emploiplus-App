DROP POLICY IF EXISTS "Staff manage jobs" ON public.job_offers;
CREATE POLICY "Authenticated users manage jobs" ON public.job_offers
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Staff manage posts" ON public.blog_posts;
CREATE POLICY "Authenticated users manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
