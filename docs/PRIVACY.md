# Privacidade

## Dados tratados

A extensão armazena somente `userLabel` (identificador configurado) e `extensionActive` (preferência de ativação), usando `chrome.storage.local` no perfil do Chrome. Na primeira leitura após uma atualização, as chaves ausentes podem ser importadas da versão anterior em `chrome.storage.sync`; a cópia antiga é removida depois da gravação local.

O texto da mensagem é lido apenas no editor ativo para inserir o identificador antes do envio iniciado pelo próprio usuário. O conteúdo não é armazenado, registrado em console, transmitido ou analisado em conversas. A extensão não coleta contatos, histórico, conteúdo de mídia ou métricas.

## Acesso

O manifesto declara somente a permissão `storage`. O content script é limitado a páginas em `https://web.whatsapp.com/`. Não há `host_permissions`, solicitações de rede, servidor remoto, analytics ou bibliotecas de terceiros.

## Remoção

Desative ou remova a extensão em `chrome://extensions`. A remoção da extensão não deve ser interpretada como garantia de apagamento imediato de todos os dados de armazenamento mantidos pelo Chrome. A versão atual usa armazenamento local; a migração tenta remover as chaves antigas de `storage.sync`.

## Contato e divulgação

Relate dúvidas ou possíveis problemas de privacidade pelo rastreador de issues do repositório, sem incluir capturas de tela ou dados de conversas que identifiquem pessoas.
