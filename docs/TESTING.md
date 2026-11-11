# Testes

## Suíte automatizada

Requisito: Node.js 18 ou superior. Execute `npm test`; a suíte usa `node:test` e não requer dependências externas.

Os testes cobrem:

- normalização do identificador, limite de caracteres e prefixação idempotente para a assinatura atual;
- preservação do conteúdo Unicode, espaços e quebras de linha na função pura;
- migração de preferências antigas de `storage.sync` para `storage.local`;
- prefixação simulada em Enter simples e clique, usando Range no primeiro filho como em `ad7d1b9`; `execCommand` pode retornar `false` sem mutação;
- exceção simulada em `createRange()`, confirmando que a mensagem continua enviável e que o erro é registrado;
- associação de legenda a um `contenteditable` sem rótulo, somente dentro do diálogo de envio;
- ausência de prefixação em Shift+Enter, composição IME e envio sem editor;
- espera por configuração assíncrona e fluxo de carregar/salvar/prever no popup.
- modo diagnóstico `observe`: registra apenas metadados e não chama foco, Selection, Range ou `execCommand`.

## Validação manual recomendada

Em uma instalação de desenvolvimento, valide em uma conta de teste e sem destinatários reais:

1. Carregue a extensão descompactada e atualize a aba do WhatsApp Web.
2. Salve um identificador com acentos e emoji; confirme que a prévia mostra texto literal.
3. Teste Enter, Shift+Enter e botão Enviar em uma conversa própria de teste.
4. Teste o controle de ativação, reabra o popup e confirme persistência.
5. Teste envio de mídia com e sem legenda e envio de áudio; confirme exatamente o que a interface alterou.
6. Repita em idiomas disponíveis e após atualizações da interface do site.

Para o A/B temporário `observe`/`insert` no Chrome, siga [docs/DIAGNOSTIC_PLAN.md](DIAGNOSTIC_PLAN.md). Esses passos requerem execução real no navegador. Nenhuma compatibilidade com a versão atual do WhatsApp Web é afirmada com base apenas na suíte simulada.
