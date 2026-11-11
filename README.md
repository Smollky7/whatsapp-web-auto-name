# WhatsApp Web Auto Name

Extensão independente para Chrome que adiciona um identificador configurável ao início de mensagens de texto no WhatsApp Web. O identificador é inserido no rascunho quando o usuário envia por Enter ou pelo botão Enviar; a extensão não inicia envios por conta própria.

## Recursos

- Identificador editável de até 50 caracteres e controle para ativar ou desativar.
- Prévia da mensagem no popup e preferências armazenadas localmente no perfil do navegador.
- Preserva o texto original, incluindo espaços, emojis e quebras de linha.
- Não altera Shift+Enter, mensagens vazias ou envios sem uma caixa de texto detectável.
- Migra uma única vez as preferências salvas pela versão anterior em `storage.sync` para `storage.local` e remove a cópia sincronizada.

## Instalação para desenvolvimento

1. Baixe ou clone este repositório e extraia os arquivos, se necessário.
2. No Chrome, abra `chrome://extensions` e ative **Modo do desenvolvedor**.
3. Selecione **Carregar sem compactação** e escolha a pasta que contém `manifest.json`.
4. Abra `https://web.whatsapp.com/`, atualize a página e configure o identificador pelo ícone da extensão.

Para atualizar uma instalação local após mudanças no código, use **Recarregar** na página de extensões e atualize a aba do WhatsApp Web.

## Uso

1. Abra o popup da extensão.
2. Defina um nome ou identificador; opcionalmente desative a automação.
3. Selecione **Salvar alterações** e confira a prévia.
4. Digite uma mensagem e envie normalmente com Enter ou com o botão Enviar.

Shift+Enter continua inserindo uma quebra de linha sem adicionar o identificador naquele momento. A extensão não faz envios automáticos, não percorre conversas e não acessa o histórico de mensagens.

## Desenvolvimento

Requer Node.js 18 ou superior para executar a suíte, sem dependências externas:

```sh
npm test
```

Os testes de DOM usam objetos simulados. Eles validam regras locais, mas não provam compatibilidade com a interface atual do WhatsApp Web. Consulte [docs/TESTING.md](docs/TESTING.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

## Privacidade e permissões

A extensão declara apenas a permissão `storage` e injeta o content script em `https://web.whatsapp.com/`. Não possui acesso a servidores próprios, não coleta mensagens e não envia dados para terceiros. Consulte [docs/PRIVACY.md](docs/PRIVACY.md).

## Aviso de marca

Este é um projeto independente, não afiliado, endossado ou patrocinado pelo WhatsApp ou pela Meta. WhatsApp é uma marca de seus respectivos titulares. O comportamento do site pode mudar sem aviso e exigir ajustes nesta extensão.
