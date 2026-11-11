# Relatório de regressão

## 1. Causa raiz e grau de confirmação

O dado real mais recente descreve `DIV[contenteditable] > P`, `anchorNodeType: 1`, `anchorOffset: 1`, `execCommandResult: true`, textos com comprimento 5 e sem prefixo. Isso confirma que o retorno `true` não representou uma inserção observável no início do editor. Não permite distinguir, sozinho, entre mutação descartada pelo framework, mudança em outro ponto/estrutura ou ausência de mutação.

A causa exata ainda não está confirmada: não há Chrome neste ambiente e ainda não há A/B `observe` contra `insert`, nem eventos `beforeinput`/`input` ou snapshots de mutação do navegador. O modo diagnóstico temporário agora coleta essas evidências sem conteúdo das mensagens.

A comparação de commits confirma que `c1c9267` adicionou `TreeWalker`/`compareDocumentPosition`; `2fa6a91` retornou ao Range no primeiro filho. O commit `2fa6a91` também removeu o cancelamento de Enter/clique. Esta alteração adiciona apenas instrumentação: não troca `execCommand`, Range, evento de envio ou popup.

## 2. Comparação antes/depois

- Em `ad7d1b9`, listeners eram anexados aos elementos encontrados por `MutationObserver`. No Enter, a extensão cancelava o evento, lia `storage.sync`, movia o caret para o primeiro filho, executava `insertText`, aguardava e tentava reenviar com um Enter sintético. Cliques eram cancelados e encaminhados ao mesmo fluxo.
- Em `bdf41b5`, os eventos passaram a ser delegados no documento e o envio original deixou de ser cancelado. Preferências são carregadas uma vez de `storage.local`, com migração de dados legados.
- Em `c1c9267`, a escolha do ponto de inserção mudou para `TreeWalker`/`compareDocumentPosition`; além disso, o resultado `false` da inserção passou a cancelar Enter/clique. Os mocks não simulavam exceções ou falha da API DOM e por isso aprovavam o fluxo.
- `manifest.json` manteve `matches` (`https://web.whatsapp.com/`) e a permissão única `storage`. O script `signature-core.js` está listado antes de `content.js`, como exige a inicialização. Não foi encontrada regressão de injeção no manifesto.

## 3. Arquivos modificados

- `content.js`: snapshots técnicos, observação de `beforeinput`/`input`, MutationObserver por 250 ms e modo `observe`/`insert`/`off`.
- `tests/extension.test.js`: estrutura `DIV > P`, retorno true sem mutação, inputs sanitizados e modo observe sem foco/Selection.
- `docs/DIAGNOSTIC_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md` e este relatório.

O popup e seu desenho não foram alterados nesta correção.

## 4. Correção

Nenhum mecanismo de inserção foi alterado nesta etapa. O modo `off` é o padrão; `observe` não chama `focus`, Selection, Range ou `execCommand`; `insert` registra estado antes/depois da estratégia existente. `beforeinput`/`input` são apenas observados e o valor de `event.data` nunca é lido, somente seu comprimento. Um MutationObserver registra mudanças de nós/caracteres e comprimentos antes/depois do comando e após 250 ms, para verificar alterações síncronas ou reconciliação tardia.

## 5. Testes e resultados

- `npm test`: 15 passaram, 0 falharam.
- `node --check`: `content.js`, `popup.js`, `signature-core.js` e `tests/extension.test.js` sem erros de sintaxe.
- Manifesto analisado como JSON: Manifest V3, `storage` como única permissão, origem preservada e scripts em ordem válida.
- Referências a scripts, CSS e ícone conferidas; `git diff --check` sem problemas.

## 6. Limitações

Os testes usam um DOM simulado com `DIV > P > #text`. Um caso faz `execCommand` retornar `true`, mover o caret para offset 1 e não mutar DOM, reproduzindo os fatos relatados, não necessariamente o comportamento interno do WhatsApp. Os testes não reproduzem o motor de edição, reconciliação React/Lexical, eventos confiáveis ou a árvore viva do site.

Não há Chrome/Chromium ou Playwright disponível neste container. Nenhuma conclusão foi tomada sobre mutação revertida, posição inesperada ou ausência de mutação real. O A/B manual é necessário; leituras de `innerText`, Selection e logs podem afetar o timing de `insert`, enquanto `observe` é o controle sem operações de edição. A identidade visual, armazenamento e manifesto permanecem intactos.

## 7. Procedimento de validação no Chrome

1. Abra `chrome://extensions`, recarregue a extensão e atualize a aba do WhatsApp Web.
2. Siga os comandos e a comparação A/B em [docs/DIAGNOSTIC_PLAN.md](DIAGNOSTIC_PLAN.md): o modo padrão é `off`; use primeiro `observe`, depois `insert`, repetindo o mesmo tipo de envio.
3. Teste Enter, botão Enviar, texto com emoji/quebra e legenda de imagem em uma conversa própria. Em `observe`, a assinatura não é aplicada por design; esse modo serve para verificar o envio sem mutação do editor.
4. Compare sucesso do envio e campos técnicos `[Auto Name][diagnostic]`; os logs não devem conter conteúdo da mensagem.
5. Se ocorrer exceção, informe `errorName`, `errorCode` e `operation` registrados. A mensagem/pilha originais podem ser compartilhadas somente depois de remover qualquer conteúdo de conversa ou dado pessoal.
6. Remova `autoNameDiagnosticMode` do armazenamento quando terminar e atualize a aba.

Só depois desses passos em uma instalação local deve-se declarar compatibilidade com a versão testada do WhatsApp Web. Nenhum commit, push ou publicação foi feito para esta correção.
