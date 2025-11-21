-- Função trigger para auto-transição de planos para revisão
CREATE OR REPLACE FUNCTION auto_transition_to_review()
RETURNS TRIGGER AS $$
DECLARE
  v_content RECORD;
  v_has_media BOOLEAN;
  v_has_caption BOOLEAN;
BEGIN
  -- Buscar informações do conteúdo
  SELECT is_content_plan, status INTO v_content
  FROM contents
  WHERE id = NEW.content_id;
  
  -- Só processa se for plano de conteúdo (is_content_plan = true)
  IF v_content.is_content_plan != TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se tem mídia
  SELECT EXISTS(
    SELECT 1 FROM content_media WHERE content_id = NEW.content_id
  ) INTO v_has_media;
  
  -- Verificar se tem legenda
  SELECT EXISTS(
    SELECT 1 FROM content_texts 
    WHERE content_id = NEW.content_id 
    AND caption IS NOT NULL 
    AND caption != ''
  ) INTO v_has_caption;
  
  -- Se tem AMBOS (mídia + legenda), fazer transição
  IF v_has_media AND v_has_caption THEN
    UPDATE contents
    SET 
      is_content_plan = false,
      status = 'in_review',
      updated_at = NOW()
    WHERE id = NEW.content_id;
    
    -- Log de atividade
    INSERT INTO activity_log (entity, entity_id, action, metadata)
    VALUES (
      'content',
      NEW.content_id,
      'auto_transition_to_review',
      jsonb_build_object(
        'previous_status', v_content.status,
        'trigger_source', TG_TABLE_NAME,
        'reason', 'Mídia e legenda adicionados'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger em content_media
CREATE TRIGGER content_media_auto_review
AFTER INSERT ON content_media
FOR EACH ROW
EXECUTE FUNCTION auto_transition_to_review();

-- Aplicar trigger em content_texts
CREATE TRIGGER content_texts_auto_review
AFTER INSERT ON content_texts
FOR EACH ROW
EXECUTE FUNCTION auto_transition_to_review();