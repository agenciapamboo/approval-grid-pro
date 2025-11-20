-- RLS Policies para lovable_plan_config
-- Super admins podem gerenciar tudo
CREATE POLICY "Super admins can manage lovable plan config"
  ON lovable_plan_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Todos autenticados podem VER o plano ativo (leitura apenas)
CREATE POLICY "Authenticated users can view active plan config"
  ON lovable_plan_config FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies para revenue_taxes
-- Super admins podem gerenciar tudo
CREATE POLICY "Super admins can manage revenue taxes"
  ON revenue_taxes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Todos autenticados podem VER as taxas (leitura apenas)
CREATE POLICY "Authenticated users can view revenue taxes"
  ON revenue_taxes FOR SELECT
  TO authenticated
  USING (true);