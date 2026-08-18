ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts (is_featured DESC, sort_order ASC, publish_at DESC);
