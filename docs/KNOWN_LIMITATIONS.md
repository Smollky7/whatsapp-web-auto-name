# Limitações conhecidas

- O DOM e os rótulos do WhatsApp Web não são uma API estável. Seletores, acessibilidade e eventos podem mudar, e a extensão pode deixar de funcionar ou exigir adaptação.
- Não foi realizado teste de compatibilidade com o WhatsApp Web real nesta auditoria. Os testes automatizados usam simulações locais.
- O tratamento limita-se a texto em editores detectáveis. Mensagens de áudio e outros envios sem editor de texto não recebem identificador. O comportamento de legendas de mídia depende da estrutura que o site renderizar e deve ser validado manualmente.
- Os rótulos de botões são reconhecidos para um conjunto limitado de idiomas; outros idiomas, experimentos de interface e controles sem rótulo podem não ser detectados.
- Inserção em `contenteditable` via `execCommand('insertText')` depende do comportamento do navegador/site. Se o comando não for suportado, a extensão não força o envio.
- A duplicação é evitada quando o rascunho já começa com a assinatura configurada atualmente. Se o usuário alterar o identificador com uma mensagem antiga ainda no rascunho, a assinatura anterior não pode ser identificada de forma inequívoca.
- As quebras de linha preservadas pelo núcleo são submetidas às regras de edição e formatação do próprio WhatsApp Web; a simulação não garante a representação visual final no site.
- O armazenamento local não sincroniza as preferências entre dispositivos.
