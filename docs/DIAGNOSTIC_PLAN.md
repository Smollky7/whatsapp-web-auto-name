# Plano temporário de diagnóstico

## Hipóteses antes da instrumentação

1. **Interferência de edição controlada:** `focus()`, alteração da Selection/Range ou `execCommand('insertText')` durante a fase de captura de `keydown` pode mudar o DOM/seleção antes que o editor controlado do WhatsApp processe o envio. Se for isso, o modo de observação (sem tocar no editor) deve enviar normalmente e o modo de inserção deve reproduzir o problema.
2. **Divergência entre texto e árvore DOM:** `execCommand` pode retornar `false`, lançar uma exceção ou alterar nós/representação de quebras sem que `innerText.startsWith(prefix)` seja verdadeiro. Os comprimentos de `innerText`/`textContent`, estado do Range, retorno/erro do comando e alteração observada devem distinguir esses casos.
3. **Seleção como causa independente:** mesmo sem mudança de texto, foco/Range podem interferir no envio. O modo de inserção registra os estados antes e depois; o modo de observação fornece o controle sem foco, Range ou `execCommand` da extensão.
4. **Problema fora da mutação:** se o envio também falhar no modo de observação, a falha não é explicada pela inserção da assinatura; o alvo/evento do botão ou outra integração do WhatsApp precisa ser investigada separadamente.

A mensagem de console do usuário comprova apenas que a checagem de prefixo falhou. A pilha completa da exceção não foi fornecida; portanto, nenhuma operação (`execCommand`, Range, seleção ou leitura de texto) é declarada como causa confirmada antes do A/B no Chrome.

## Como testar

A instrumentação é temporária e não altera o popup. Por padrão, o content script mantém o modo normal (`insert`). Para cada modo, use a página do service worker da extensão em `chrome://extensions` > **Inspecionar visualizações** > **service worker** e execute no console:

```js
chrome.storage.local.set({ autoNameDiagnosticMode: 'observe' })
```

Atualize a aba do WhatsApp Web. Com `observe`, a extensão registra estado do evento/editor, mas não chama `focus`, Selection, Range ou `execCommand`. Envie uma mensagem de teste para uma conversa própria e registre se o envio normal ocorreu.

Depois altere para o modo original de inserção:

```js
chrome.storage.local.set({ autoNameDiagnosticMode: 'insert' })
```

Atualize novamente e repita o mesmo tipo de envio, incluindo emoji, quebra de linha e, separadamente, legenda de imagem. Compare o sucesso do envio e as linhas `[Auto Name][diagnostic]` no console da aba.

As linhas de diagnóstico contêm apenas tipo/estado do evento, estrutura do editor, comprimentos, estados do foco/seleção, retorno booleano de `execCommand` e nome/código da exceção. Não registram texto, identificador, conteúdo, tamanho em bytes da mensagem ou destinatário. Antes de encerrar o teste, remova a chave temporária:

```js
chrome.storage.local.remove('autoNameDiagnosticMode')
```

Envie de volta as linhas de diagnóstico completas e informe, para cada modo, se Enter, botão e legenda foram enviados. Não inclua texto de conversas nem dados pessoais.
