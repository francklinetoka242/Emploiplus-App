-- Create candidate notifications system
-- This migration ensures the notifications table is optimized for candidate notifications

-- Ensure notification types include all candidate-relevant types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('candidature', 'admin', 'evenement', 'offre', 'contact', 'job', 'blog');
  END IF;
END $$;

-- Add trigger to create notifications on job application status changes
CREATE OR REPLACE FUNCTION public.notify_on_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  candidate_user_id UUID;
  job_title TEXT;
BEGIN
  -- Get the candidate's user_id
  SELECT c.user_id INTO candidate_user_id
  FROM public.candidates c
  WHERE c.id = NEW.candidate_id;

  -- Get the job offer title
  SELECT jo.title INTO job_title
  FROM public.job_offers jo
  WHERE jo.id = NEW.job_offer_id;

  -- Create notification based on status
  IF NEW.status = 'shortlisted' THEN
    INSERT INTO public.notifications (user_id, type, title, content, status, is_read)
    VALUES (
      candidate_user_id,
      'candidature'::public.notification_type,
      'Votre candidature a été présélectionnée',
      'Félicitations! Votre candidature pour le poste "' || COALESCE(job_title, 'Inconnu') || '" a été présélectionnée.',
      'active'::public.notification_status,
      false
    );
  ELSIF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, content, status, is_read)
    VALUES (
      candidate_user_id,
      'candidature'::public.notification_type,
      'Votre candidature a été acceptée',
      'Excellent! Votre candidature pour le poste "' || COALESCE(job_title, 'Inconnu') || '" a été acceptée.',
      'active'::public.notification_status,
      false
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, content, status, is_read)
    VALUES (
      candidate_user_id,
      'candidature'::public.notification_type,
      'Mise à jour sur votre candidature',
      'Nous avons examiné votre candidature pour le poste "' || COALESCE(job_title, 'Inconnu') || '". Malheureusement, nous avons décidé de continuer avec d''autres candidats.',
      'active'::public.notification_status,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS trigger_notify_on_application_status_change ON public.job_applications;

-- Create trigger for application status changes
CREATE TRIGGER trigger_notify_on_application_status_change
AFTER UPDATE OF status ON public.job_applications
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_on_application_status_change();

-- Automatic notification triggers for job offers have been disabled
-- Notifications are now created manually from the admin panel only

-- Create indexes for better performance on notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_status_created_at 
  ON public.notifications(user_id, status, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read_created_at 
  ON public.notifications(user_id, is_read, created_at DESC)
  WHERE status = 'active';
