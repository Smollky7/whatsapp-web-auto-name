# Relatório de auditoria

**Escopo:** arquivos da extensão, Manifest V3, armazenamento, segurança, interface e testes locais. **Compatibilidade com WhatsApp Web real:** não verificada.

## Achados e correções

| Severidade | Achado comprovado | Correção |
| --- | --- | --- |
| Alta | O content script cancelava Enter/clique e tentava reenviar com `KeyboardEvent` sintético, que não representa uma ação confiável do usuário. | Prefixação passiva do rascunho, sem cancelar nem sintetizar o envio. |
| Alta | A prévia usava `innerHTML` com o identificador configurável. | Renderização via `textContent` e elementos HTML estáticos. |
| Média | `storage.sync` propagava preferências entre dispositivos sem necessidade para a função. | Preferências novas em `storage.local`, com migração única das chaves legadas. |
| Média | Listeners dependiam de observador de mutação e seletores fixos em português; cliques tinham caminhos sobrepostos. | Delegação de eventos no documento, identificação de editor semântico e lista pequena de rótulos multilíngues. |
| Média | O envio de legenda poderia ser associado ao rascunho principal quando o editor estivesse em um diálogo. | Priorizar o editor do diálogo e testar que o rascunho principal permaneça intacto. |
| Média | Falhas assíncronas de armazenamento não eram apresentadas e o toggle salvava sem feedback. | Leitura/gravação com callbacks de erro e salvamento explícito conjunto. |
| Média | O popup tinha controles sem foco acessível e feedback não anunciado. | Formulário semântico, foco visível, labels, status `aria-live` e contagem do limite. |
| Média | README incompleto e ausência de testes/documentação operacional. | README, arquitetura, testes, privacidade, limitações, contribuição e suíte `node:test`. |

## Arquivos alterados

`README.md`, `CONTRIBUTING.md`, `manifest.json`, `content.js`, `signature-core.js`, `popup.html`, `popup.css`, `popup.js`, `package.json`, `tests/extension.test.js` e `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/PRIVACY.md`, `docs/KNOWN_LIMITATIONS.md`, `docs/AUDIT_REPORT.md`. `background.js` foi removido por não ter responsabilidade após a mudança para armazenamento local. `LICENSE` e `icon.png` foram revisados e não alterados.

## Testes e validações

- `npm test`: 11 testes passaram, 0 falharam.
- `node --check`: `content.js`, `popup.js`, `signature-core.js` e `tests/extension.test.js` passaram.
- Manifesto: JSON válido, Manifest V3, somente permissão `storage` e sem `host_permissions` extras.
- Referências estáticas a ícone, scripts e folha de estilos: todos os arquivos existem.
- O diff ainda deve passar pela revisão humana antes de publicação. Testes simulados não comprovam funcionamento no site real.

## Riscos e limitações

A integração depende dos editores, rótulos acessíveis e eventos do DOM do WhatsApp Web. A semântica de `contenteditable`, legendas, idiomas não cobertos e teclados IME precisa de validação manual. O envio original permanece sob controle do usuário; se a inserção não ocorrer, a extensão não tenta enviar novamente.

## Recomendação de publicação

**Não publicar como compatível com a versão atual do WhatsApp Web ainda.** Depois das validações estáticas e automatizadas deste relatório, fazer teste manual documentado em navegador, idiomas e fluxos de texto/mídia antes de anunciar compatibilidade. A publicação no GitHub pode prosseguir após preencher os resultados finais e revisar o diff; nenhuma publicação ou alteração de repositório é realizada por esta auditoria.
