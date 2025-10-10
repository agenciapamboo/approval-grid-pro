-- Adicionar 'story' e 'feed' ao enum content_type
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'story';
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'feed';