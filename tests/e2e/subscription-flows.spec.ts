import { test, expect } from '@playwright/test';

test.describe('Subscription System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('internal user can access all features without limits', async ({ page }) => {
    // This test requires a test user with skip_subscription_check = true
    // You would need to implement authentication in the test setup
    
    // Login as internal user
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'internal@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/');
    
    // Verify no subscription alerts are shown
    await expect(page.locator('text=Assinatura')).not.toBeVisible();
    await expect(page.locator('text=inadimplente')).not.toBeVisible();
    
    // Navigate to content creation
    await page.click('text=Criar Conteúdo');
    
    // Verify content creation is not blocked
    await expect(page.locator('text=Limite atingido')).not.toBeVisible();
    
    // Verify user can create content
    await page.fill('input[placeholder*="Título"]', 'Test Content for Internal User');
    await page.click('button:has-text("Salvar")');
    
    // Verify success
    await expect(page.locator('text=Conteúdo criado com sucesso')).toBeVisible();
  });

  test('delinquent user with expired grace period is blocked', async ({ page }) => {
    // Login as delinquent user with expired grace period
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'expired-grace@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForLoadState('networkidle');
    
    // Verify subscription alert is shown
    await expect(page.locator('text=inadimplente')).toBeVisible();
    await expect(page.locator('text=bloqueado')).toBeVisible();
    
    // Try to create content
    await page.click('text=Criar Conteúdo');
    
    // Verify creation is blocked
    await expect(page.locator('text=bloqueado')).toBeVisible();
    await expect(page.locator('text=regularize')).toBeVisible();
  });

  test('user in active grace period can still create content', async ({ page }) => {
    // Login as user in grace period
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'grace-period@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Verify grace period warning is shown
    await expect(page.locator('text=período de carência')).toBeVisible();
    
    // Verify user can still create content
    await page.click('text=Criar Conteúdo');
    await page.fill('input[placeholder*="Título"]', 'Test Content During Grace Period');
    await page.click('button:has-text("Salvar")');
    
    // Verify success
    await expect(page.locator('text=Conteúdo criado')).toBeVisible();
  });

  test('user reaching post limit sees rotation dialog', async ({ page }) => {
    // Login as user near post limit
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'limit-test@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Try to create content when at limit
    await page.click('text=Criar Conteúdo');
    await page.fill('input[placeholder*="Título"]', 'Content That Exceeds Limit');
    await page.click('button:has-text("Salvar")');
    
    // Verify rotation dialog appears
    await expect(page.locator('text=Limite de')).toBeVisible();
    await expect(page.locator('text=atingido')).toBeVisible();
    
    // Verify dialog shows archive and upgrade options
    await expect(page.locator('button:has-text("Arquivar")')).toBeVisible();
    await expect(page.locator('button:has-text("Fazer upgrade")')).toBeVisible();
  });

  test('user can view plan limits on dashboard', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Navigate to subscription/account page
    await page.click('text=Minha Conta');
    
    // Verify plan information is displayed
    await expect(page.locator('text=Plano')).toBeVisible();
    await expect(page.locator('text=Posts mensais')).toBeVisible();
    await expect(page.locator('text=Criativos')).toBeVisible();
  });

  test('blocked team member cannot access system', async ({ page }) => {
    // Login as blocked team member
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'blocked-member@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Verify user is redirected or sees block message
    await expect(
      page.locator('text=bloqueado').or(page.locator('text=acesso negado'))
    ).toBeVisible();
    
    // Verify user cannot access main content
    await expect(page.locator('text=Criar Conteúdo')).not.toBeVisible();
  });

  test('agency admin can manage team members', async ({ page }) => {
    // Login as agency admin
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@agency.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Navigate to team management
    await page.click('text=Equipe');
    
    // Verify team members list is visible
    await expect(page.locator('text=Membros da Equipe')).toBeVisible();
    
    // Add new team member
    await page.click('button:has-text("Adicionar Membro")');
    await page.fill('input[placeholder*="E-mail"]', 'newmember@test.com');
    await page.fill('input[placeholder*="Nome"]', 'New Member');
    await page.click('button:has-text("Criar")');
    
    // Verify member was added
    await expect(page.locator('text=newmember@test.com')).toBeVisible();
    
    // Block a team member
    await page.click('button[aria-label*="bloquear"]:first-of-type');
    await expect(page.locator('text=bloqueado')).toBeVisible();
  });

  test('user can archive content to free up storage', async ({ page }) => {
    // Login as user at storage limit
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'storage-limit@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    
    // Try to create content - rotation dialog should appear
    await page.click('text=Criar Conteúdo');
    await page.fill('input[placeholder*="Título"]', 'New Content');
    await page.click('button:has-text("Salvar")');
    
    // Click archive in rotation dialog
    await page.click('button:has-text("Arquivar")');
    
    // Select content to archive
    await page.check('input[type="checkbox"]:first-of-type');
    await page.click('button:has-text("Confirmar Arquivamento")');
    
    // Verify archiving was successful
    await expect(page.locator('text=arquivado com sucesso')).toBeVisible();
    
    // Verify new content can now be created
    await expect(page.locator('text=Limite atingido')).not.toBeVisible();
  });
});
