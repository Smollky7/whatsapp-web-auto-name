# Relatório de regressão

## 1. Causa raiz e grau de confirmação

O pedido menciona uma exceção no console, mas não inclui a mensagem completa nem a pilha. Portanto, **a exceção exata não pode ser identificada nem atribuída com certeza**. Em `c1c9267`, os novos pontos que podem lançar exceções são `createTreeWalker`, `firstBreak.compareDocumentPosition`, acesso a `Node`/`NodeFilter` e operações de `Range`. O código não os protegia com `try/catch`.

A causa comprovada do bloqueio é independente da identidade dessa exceção: se `addPrefix()` retornava `false`, os listeners de captura chamavam `preventDefault()` e `stopPropagation()` no Enter/clique. Assim, qualquer falha de inserção bloqueava a ação original. Os testes antigos não cobriam esse contrato.

Também houve mudança na seleção: `ad7d1b9` ancorava o Range em `element.firstChild || element`; `c1c9267` introduziu `TreeWalker` e comparação de posição entre `<br>` e texto. Não há evidência suficiente para afirmar qual dessas operações gerou o erro observado no navegador.

## 2. Comparação antes/depois

- Em `ad7d1b9`, listeners eram anexados aos elementos encontrados por `MutationObserver`. No Enter, a extensão cancelava o evento, lia `storage.sync`, movia o caret para o primeiro filho, executava `insertText`, aguardava e tentava reenviar com um Enter sintético. Cliques eram cancelados e encaminhados ao mesmo fluxo.
- Em `bdf41b5`, os eventos passaram a ser delegados no documento e o envio original deixou de ser cancelado. Preferências são carregadas uma vez de `storage.local`, com migração de dados legados.
- Em `c1c9267`, a escolha do ponto de inserção mudou para `TreeWalker`/`compareDocumentPosition`; além disso, o resultado `false` da inserção passou a cancelar Enter/clique. Os mocks não simulavam exceções ou falha da API DOM e por isso aprovavam o fluxo.
- `manifest.json` manteve `matches` (`https://web.whatsapp.com/`) e a permissão única `storage`. O script `signature-core.js` está listado antes de `content.js`, como exige a inicialização. Não foi encontrada regressão de injeção no manifesto.

## 3. Arquivos modificados

- `content.js`: Range no primeiro filho, handlers fail-open, captura de exceções e busca de legenda sem rótulo limitada ao diálogo.
- `tests/extension.test.js`: regressões para exceção de Range, rejeição de `execCommand()`, ausência de cancelamento do evento e legenda sem rótulo conhecido.
- `docs/ARCHITECTURE.md` e `docs/TESTING.md`: arquitetura e limites de simulação atualizados.
- `docs/REGRESSION_FIX.md`: este relatório.

O popup e seu desenho não foram alterados nesta correção.

## 4. Correção

O caret voltou a ser colocado em `input.firstChild || input`, como em `ad7d1b9`; foram removidos `TreeWalker` e `compareDocumentPosition`. Depois de `execCommand('insertText')`, o content script confere se o texto começa com o prefixo. Se não começar, restaura a seleção e registra um aviso genérico. Exceções em seleção, editor ou execução são capturadas pelo listener e registradas com o objeto de erro/stack. **Nenhum caminho chama `preventDefault()` ou `stopPropagation()`**: o envio original continua mesmo sem assinatura, conforme solicitado.

Para legendas, o evento deve partir de um botão dentro de `[role="dialog"]`; a busca tenta os rótulos conhecidos e depois qualquer `[contenteditable="true"]` dentro daquele diálogo. Não há busca genérica de legenda pela página inteira. O evento de envio original continua sendo a única ação de envio; a extensão não sintetiza Enter nem clica para enviar.

## 5. Testes e resultados

- `npm test`: 13 passaram, 0 falharam.
- `node --check`: `content.js`, `popup.js`, `signature-core.js` e `tests/extension.test.js` sem erros de sintaxe.
- Manifesto analisado como JSON: Manifest V3, `storage` como única permissão, origem preservada e scripts em ordem válida.
- Referências a scripts, CSS e ícone conferidas; `git diff --check` sem problemas.

## 6. Limitações

Os testes usam um DOM simulado. O stub de `execCommand` pode retornar `false`, e `createRange()` pode lançar uma `DOMException`; os testes confirmam que Enter/clique não são cancelados. O teste ainda não reproduz o motor de edição, o estado interno do React/Lexical, eventos confiáveis, IME ou a árvore DOM efetiva do WhatsApp. A pilha reproduzida no teste é artificial e **não é a exceção reportada pelo usuário**.

Não há Chrome/Chromium ou Playwright disponível neste container; portanto, os fluxos reportados como falhos não puderam ser repetidos no navegador real e a correção não pode ser declarada funcional em produção. A inserção ainda depende de `execCommand('insertText')` atualizar a árvore do editor real. Se a configuração não estiver pronta, a inserção falhar ou ocorrer exceção, o envio original segue sem prefixo e o rascunho não é bloqueado pela extensão. O modo A/B em `docs/DIAGNOSTIC_PLAN.md` foi preparado para distinguir os casos; suas leituras de `innerText`, seleção e logs podem afetar o timing no modo `insert`. A mensagem/stack exatas do erro original ainda não foram fornecidas.

## 7. Procedimento de validação no Chrome

1. Abra `chrome://extensions`, recarregue a extensão e atualize a aba do WhatsApp Web.
2. Siga os comandos e a comparação A/B em [docs/DIAGNOSTIC_PLAN.md](DIAGNOSTIC_PLAN.md): primeiro `observe`, depois `insert`, repetindo o mesmo tipo de envio.
3. Teste Enter, botão Enviar, texto com emoji/quebra e legenda de imagem em uma conversa própria. Em `observe`, a assinatura não é aplicada por design; esse modo serve para verificar o envio sem mutação do editor.
4. Compare sucesso do envio e campos técnicos `[Auto Name][diagnostic]`; os logs não devem conter conteúdo da mensagem.
5. Se ocorrer exceção, informe `errorName`, `errorCode` e `operation` registrados. A mensagem/pilha originais podem ser compartilhadas somente depois de remover qualquer conteúdo de conversa ou dado pessoal.
6. Remova `autoNameDiagnosticMode` do armazenamento quando terminar e atualize a aba.

Só depois desses passos em uma instalação local deve-se declarar compatibilidade com a versão testada do WhatsApp Web. Nenhum commit, push ou publicação foi feito para esta correção.
