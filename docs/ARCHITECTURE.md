# Arquitetura

## Componentes

- `manifest.json`: define Manifest V3, popup, content scripts e a permissão `storage`.
- `signature-core.js`: funções determinísticas de normalização, composição da assinatura e leitura/migração de preferências. É carregado antes dos demais scripts e também pode ser importado pelos testes Node.
- `content.js`: observa eventos delegados de teclado/clique no documento, identifica um editor de texto candidato e insere o prefixo no rascunho antes do comportamento nativo de envio.
- `popup.html`, `popup.css` e `popup.js`: interface de preferências e prévia. Os valores do usuário são exibidos como texto e salvos juntos.
- `tests/extension.test.js`: testes unitários e simulações isoladas dos fluxos do content script e popup.

## Fluxo de envio

1. O content script carrega as preferências. Se encontrar dados legados, importa apenas as chaves ausentes de `storage.sync` para `storage.local` e remove a cópia sincronizada após a gravação local.
2. Um Enter simples fora de composição ou um clique em um controle de envio reconhecido consulta o editor associado.
3. Se a extensão estiver pronta e ativa, o núcleo calcula a mensagem prefixada. Mensagens vazias e mensagens que já começam com a assinatura atual não são modificadas.
4. O texto é inserido no início do editor via `execCommand('insertText')`. O evento original não é cancelado e nenhum evento de envio sintético é emitido.

Shift+Enter, teclas modificadoras e composição IME não disparam a prefixação. Editores sem texto, como envio de áudio, são deixados intactos.

## Limites de integração

A extensão depende do DOM renderizado pelo WhatsApp Web. O editor no rodapé é identificado semanticamente por `contenteditable`; editores de legenda podem ser encontrados por alguns rótulos conhecidos. O botão de envio é reconhecido por rótulos acessíveis em português, inglês, espanhol, francês, alemão e italiano. Esses sinais podem mudar. Não há API pública do WhatsApp Web para esse fluxo.
