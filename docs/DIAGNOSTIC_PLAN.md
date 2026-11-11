# Plano temporário de diagnóstico

## Hipóteses antes da instrumentação

Dados recebidos do Chrome: editor `DIV[contenteditable]`, primeiro filho `P`, foco e anchor dentro do editor, `anchorNodeType: 1`, `anchorOffset: 1`, `execCommandResult: true`, comprimentos de `innerText`/`textContent` iguais a 5 e nenhum deles começa com o prefixo.

1. **Mutação descartada pelo editor controlado (hipótese principal):** `execCommand` pode produzir uma mutação síncrona no `P`, mas o framework pode reconciliar/remover essa mutação logo depois. Uma trilha de `MutationObserver` deve mostrar inserção seguida de remoção; `beforeinput`/`input` podem revelar se o comando notificou o editor.
2. **Nenhuma mutação efetiva apesar do retorno `true`:** comparar forma do DOM e comprimentos antes/depois deve mostrar ausência de alteração. `execCommandResult` é somente um retorno da API, não prova de inserção.
3. **Inserção em posição/estrutura inesperada ou diferença de representação:** os caminhos/tipos dos nós do Range, comprimentos das folhas antes/depois e flags `innerTextStartsWithPrefix`/`textContentStartsWithPrefix` devem mostrar se ocorreu mutação fora do começo ou se as representações divergiram.
4. **Interferência independente do texto inserido:** comparar `observe` (não chama `focus`, Selection, Range ou `execCommand`) com `insert` usando o mesmo tipo de envio identifica se a falha coincide com a manipulação do editor. Não se alterará o mecanismo até o usuário devolver esse resultado.

O dado informado não identifica qual das três hipóteses de DOM ocorreu. Também não demonstra por si só que o envio falha por causa do cursor; o resultado A/B do modo `observe` é necessário.

A mensagem de console do usuário comprova apenas que a checagem de prefixo falhou. A pilha completa da exceção não foi fornecida; portanto, nenhuma operação (`execCommand`, Range, seleção ou leitura de texto) é declarada como causa confirmada antes do A/B no Chrome.

## Como testar

A instrumentação é temporária e não altera o popup. Por padrão, diagnóstico fica desligado (`off`). Use a página do service worker da extensão em `chrome://extensions` > **Inspecionar visualizações** > **service worker** para ativar os modos.

Comece pelo controle sem alteração do editor:

```js
chrome.storage.local.set({ autoNameDiagnosticMode: 'observe' })
```

Atualize a aba do WhatsApp Web. Com `observe`, a extensão registra estado do evento/editor, mas não chama `focus`, Selection, Range ou `execCommand`. Envie uma mensagem de teste para uma conversa própria e registre se o envio normal ocorreu.

Depois altere para a inserção atual, sem mudar seu mecanismo:

```js
chrome.storage.local.set({ autoNameDiagnosticMode: 'insert' })
```

Atualize novamente e repita o mesmo tipo de envio, incluindo emoji, quebra de linha e, separadamente, legenda de imagem. Compare o sucesso do envio e as linhas `[Auto Name][diagnostic]` no console da aba. Em `insert`, procure `before-exec`, `after-insert`, `dom-mutations`, `beforeinput`/`input` e `after-delay`.

As linhas de diagnóstico contêm apenas tipo/estado do evento, forma e contagens dos nós, comprimentos de texto, estados/caminhos da seleção, `inputType`, comprimento de `InputEvent.data` (nunca o valor), retorno de `execCommand` e nome/código da exceção. Não registram texto, identificador, conteúdo ou destinatário. `beforeinput`/`input` são observadores passivos. Antes de encerrar o teste, remova a chave temporária:

```js
chrome.storage.local.remove('autoNameDiagnosticMode')
```

Envie de volta as linhas de diagnóstico completas e informe, para cada modo, se Enter, botão e legenda foram enviados. Não inclua texto de conversas nem dados pessoais.
