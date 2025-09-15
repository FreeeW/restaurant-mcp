# Implementação: Busca de Funcionários por Nome

## Problema Resolvido
Quando o usuário pergunta "quanto preciso pagar para o joão?", o sistema agora pode:
1. Identificar que "joão" é um nome (não um código)
2. Buscar funcionários com esse nome
3. Se houver múltiplos resultados (João Cardoso e João Oliveira), perguntar qual
4. Usar o código correto para calcular o pagamento

## Arquivos Modificados

### 1. `/src/db.ts`
- ✅ Adicionada função `searchEmployeesByName()` que chama a RPC no banco

### 2. `/src/index.ts`
- ✅ Importada a nova função
- ✅ Adicionada tool schema `search_employees_by_name`
- ✅ Adicionado handler completo com tratamento de erros e sugestões
- ✅ Atualizada descrição de `get_employee_pay` para indicar que precisa de código

### 3. `/supabase/migrations/20250915_search_employees_by_name.sql`
- ✅ RPC completa com busca fuzzy
- ✅ Suporte a busca sem acentos
- ✅ Score de relevância
- ✅ Sugestões baseadas em similaridade
- ✅ Índices para performance

## Como Aplicar as Mudanças

### 1. Aplicar a Migration no Banco de Dados

```bash
# Opção A: Via Supabase CLI
cd /Users/guilhermedegrazia/Desktop/restaurant-mcp
supabase db push

# Opção B: Via SQL Editor no Dashboard Supabase
# Copie e execute o conteúdo do arquivo:
# /supabase/migrations/20250915_search_employees_by_name.sql
```

### 2. Reinstalar/Rebuild o Servidor MCP

```bash
cd /Users/guilhermedegrazia/Desktop/restaurant-mcp
npm run build
```

### 3. Reiniciar o Claude Desktop

Para que o Claude reconheça a nova ferramenta, você precisa:
1. Fechar completamente o Claude Desktop
2. Abrir novamente
3. A nova ferramenta estará disponível

## Como Funciona

### Fluxo Esperado:

**Usuário**: "quanto preciso pagar para o joão?"

**Claude** (internamente):
1. Detecta que "joão" é um nome, não um código
2. Chama `search_employees_by_name("joão")`
3. Recebe 2 resultados: João Cardoso (GAR1) e João Oliveira (GAR5)

**Claude** responde: "Encontrei 2 funcionários com o nome João:
- João Cardoso (GAR1)
- João Oliveira (GAR5)

Qual João você está procurando?"

**Usuário**: "Cardoso"

**Claude**:
1. Usa o código GAR1
2. Chama `get_employee_pay(emp_code="GAR1", ...)`
3. Retorna as informações de pagamento

### Casos Especiais Tratados:

1. **Nome único**: Retorna direto o funcionário
2. **Nome parcial**: "jo" encontra todos com "Jo" no nome
3. **Sem acentos**: "joao" encontra "João"
4. **Por código**: Ainda funciona buscar por "GAR1"
5. **Nome inexistente**: Sugere nomes similares
6. **Múltiplos resultados**: Lista todos para o usuário escolher

## Testes Recomendados

Após aplicar as mudanças, teste com:

```
"quanto pagar para joão"
"horas da maria" 
"pagamento do pedro"
"quanto trabalhou o silva"
"lista de funcionários com nome ana"
```

## Características da Implementação

### ✅ Vantagens:
- Não quebra nada existente
- Busca inteligente com score de relevância
- Sugestões quando não encontra
- Indica se funcionário trabalhou recentemente
- Performance otimizada com índices

### 🔧 Detalhes Técnicos:
- Usa `unaccent` para ignorar acentos
- Usa `pg_trgm` para similaridade
- Score de relevância (match exato > começa com > contém)
- Retorna até 3 sugestões se não encontrar

## Próximos Passos (Opcionais)

Se quiser melhorar ainda mais:

1. **Cache de funcionários**: Guardar lista em memória
2. **Apelidos**: Mapear apelidos comuns (Zé = José)
3. **Fuzzy matching**: Tolerar erros de digitação
4. **Histórico**: Lembrar última escolha do usuário

## Status

✅ Implementação completa e pronta para deploy
⏳ Aguardando aplicação da migration no banco
⏳ Aguardando restart do servidor MCP
