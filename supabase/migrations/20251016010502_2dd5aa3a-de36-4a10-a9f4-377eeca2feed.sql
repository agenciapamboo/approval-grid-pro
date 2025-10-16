-- Alter contents.date and contents.deadline to store full local datetime (no timezone conversion)
ALTER TABLE public.contents
  ALTER COLUMN date TYPE timestamp WITHOUT TIME ZONE USING date::timestamp without time zone,
  ALTER COLUMN deadline TYPE timestamp WITHOUT TIME ZONE USING deadline::timestamp without time zone;
