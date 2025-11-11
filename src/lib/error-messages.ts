/**
 * Sistema centralizado de tratamento de erros
 * Mapeia erros técnicos do Supabase/Stripe para mensagens amigáveis em português
 */

// Tipos de erro conhecidos
export const ERROR_MESSAGES: Record<string, string> = {
  // Erros de autenticação - Supabase Auth
  'User already registered': 'Este email já está cadastrado. Faça login ou use "Esqueci minha senha".',
  'already registered': 'Este email já está cadastrado. Faça login ou use "Esqueci minha senha".',
  'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'Invalid login credentials': 'Email ou senha incorretos.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'Invalid email': 'Email inválido.',
  
  // Erros de validação - Database
  'duplicate key value violates unique constraint': 'Este registro já existe no sistema.',
  'profiles_email_key': 'Este email já está cadastrado.',
  'profiles_document_key': 'Este documento (CPF/CNPJ) já está cadastrado.',
  'clients_slug_key': 'Este identificador (slug) já está em uso.',
  'agencies_slug_key': 'Este identificador (slug) já está em uso.',
  'clients_email_key': 'Este email de cliente já está cadastrado.',
  
  // Erros de rede/timeout
  'Failed to fetch': 'Erro de conexão. Verifique sua internet e tente novamente.',
  'NetworkError': 'Erro de conexão. Verifique sua internet e tente novamente.',
  'timeout': 'A requisição demorou muito. Tente novamente.',
  'Network request failed': 'Erro de conexão. Verifique sua internet e tente novamente.',
  
  // Erros do Stripe
  'No such price': 'Plano não encontrado. Entre em contato com o suporte.',
  'No such customer': 'Cliente não encontrado no sistema de pagamentos.',
  'card_declined': 'Cartão recusado. Tente outro cartão ou forma de pagamento.',
  'insufficient_funds': 'Saldo insuficiente. Tente outro cartão.',
  'Price not found': 'Plano não encontrado. Recarregue a página e tente novamente.',
  'Preço não encontrado': 'Plano não encontrado. Recarregue a página e tente novamente.',
  
  // Erros genéricos
  'permission denied': 'Você não tem permissão para realizar esta ação.',
  'row-level security': 'Erro de segurança. Faça login novamente.',
  'new row violates row-level security': 'Você não tem permissão para realizar esta ação.',
  'Authentication error': 'Erro de autenticação. Faça login novamente.',
  'No authorization header': 'Sessão expirada. Faça login novamente.',
  
  // Erros de criação de usuário
  'Erro ao criar conta': 'Erro ao criar usuário. Verifique os dados e tente novamente.',
  'Erro ao criar usuário': 'Erro ao criar usuário. Verifique os dados e tente novamente.',
  'Falha ao criar usuário': 'Erro ao criar usuário. Verifique os dados e tente novamente.',
};

/**
 * Extrai mensagem amigável de erro
 */
export const getErrorMessage = (error: any): string => {
  // Se já é uma string simples
  if (typeof error === 'string') {
    return checkErrorPatterns(error);
  }
  
  // Se é um objeto Error
  const errorMessage = error?.message || error?.error?.message || error?.error || String(error);
  
  // Verificar padrões conhecidos
  return checkErrorPatterns(errorMessage);
};

/**
 * Verifica padrões de erro e retorna mensagem apropriada
 */
const checkErrorPatterns = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  // Verificar erros exatos primeiro
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // Erros de documento (CPF/CNPJ)
  if (lowerMessage.includes('document') && (lowerMessage.includes('duplicate') || lowerMessage.includes('already'))) {
    return 'Este documento (CPF/CNPJ) já está cadastrado.';
  }
  
  // Erros de email duplicado
  if (lowerMessage.includes('email') && (lowerMessage.includes('duplicate') || lowerMessage.includes('already'))) {
    return 'Este email já está cadastrado.';
  }
  
  // Erro genérico de duplicação
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    return 'Este registro já existe no sistema.';
  }
  
  // Erro de criação de usuário
  if ((lowerMessage.includes('user') || lowerMessage.includes('usuário')) && 
      (lowerMessage.includes('create') || lowerMessage.includes('criar'))) {
    return 'Erro ao criar usuário. Verifique os dados e tente novamente.';
  }
  
  // Erros de slug
  if (lowerMessage.includes('slug') && lowerMessage.includes('duplicate')) {
    return 'Este identificador (slug) já está em uso. Escolha outro nome.';
  }
  
  // Se nenhum padrão foi encontrado, retornar mensagem genérica melhorada
  return 'Ocorreu um erro. Por favor, tente novamente. Se o problema persistir, entre em contato com o suporte.';
};

/**
 * Função específica para erros de checkout
 */
export const getCheckoutErrorMessage = (error: any): string => {
  const baseMessage = getErrorMessage(error);
  
  // Adicionar contexto específico de checkout se necessário
  if (baseMessage.includes('não encontrado')) {
    return `${baseMessage} Recarregue a página e tente novamente.`;
  }
  
  if (baseMessage.includes('Plano')) {
    return baseMessage;
  }
  
  return baseMessage;
};
