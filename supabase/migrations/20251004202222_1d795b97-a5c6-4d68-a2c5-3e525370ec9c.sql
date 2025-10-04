-- Allow agency admins to update their own agency
DROP POLICY IF EXISTS "Agency admins can update their agency" ON public.agencies;

CREATE POLICY "Agency admins can update their agency"
ON public.agencies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'agency_admin'
      AND p.agency_id = agencies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'agency_admin'
      AND p.agency_id = agencies.id
  )
);

-- Create function to auto-calculate plan_renewal_date based on plan_type and last_payment_date
CREATE OR REPLACE FUNCTION public.set_agency_renewal_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Base date: prefer last_payment_date, fallback to existing plan_renewal_date, then created_at, then now()
  IF NEW.last_payment_date IS NOT NULL THEN
    NEW.plan_renewal_date := CASE
      WHEN NEW.plan_type = 'monthly' THEN NEW.last_payment_date + INTERVAL '1 month'
      WHEN NEW.plan_type = 'annual' THEN NEW.last_payment_date + INTERVAL '1 year'
      ELSE NULL
    END;
  ELSE
    -- if no last payment, use current plan_renewal_date as base or created_at
    IF NEW.plan_type = 'monthly' THEN
      NEW.plan_renewal_date := COALESCE(NEW.plan_renewal_date, NEW.created_at, now()) + INTERVAL '1 month';
    ELSIF NEW.plan_type = 'annual' THEN
      NEW.plan_renewal_date := COALESCE(NEW.plan_renewal_date, NEW.created_at, now()) + INTERVAL '1 year';
    ELSE
      NEW.plan_renewal_date := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for insert/update
DROP TRIGGER IF EXISTS trg_set_agency_renewal_date ON public.agencies;
CREATE TRIGGER trg_set_agency_renewal_date
BEFORE INSERT OR UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.set_agency_renewal_date();