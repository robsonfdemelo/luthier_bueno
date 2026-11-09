# Bueno Luthier — Versão 2.4 (interface simplificada)

Sistema de clientes, ordens de serviço, cadastro do instrumento durante a O.S., fotos na entrada, pagamentos, impressão das duas vias, backup com fotos e SQLite. O sistema inclui **autenticação por senha** para publicação controlada na internet.


## Alterações desta versão (v2.4)

- Na abertura e edição da O.S., removidos **Número de série**, **Cor/acabamento**, **Condição/avarias** e **Observações adicionais do instrumento**. Permanecem tipo, marca, modelo, fotos e campos do atendimento, serviços e orçamento.
- Removidas as informações de versão e SQLite do rodapé; o sistema mantém os recursos e o banco de dados normalmente.
- A impressão e a consulta da O.S. também deixaram de mostrar os dados removidos. Informações já cadastradas **continuam preservadas no banco**, inclusive quando uma ordem antiga é editada.
- O registro de fotografias e a exportação de backup permanecem funcionando.

### Atualizar o Bueno Luthier já publicado no GitHub / Railway

1. **Antes de atualizar, exporte um backup** em Configurações do sistema atual e mantenha o arquivo em local seguro. Não envie o backup ao GitHub.
2. No VS Code, abra **seu repositório Git que já está conectado ao GitHub** (a pasta contendo `.git`).
3. A atualização funcional está em `public/app.js`. Substitua esse arquivo pelo novo. Você também pode copiar `package.json`, `README.md` e `testes/interface.test.js` para atualizar a identificação e os testes. Se preferir, copie o conteúdo do ZIP, **sem substituir sua pasta `data/` e sem apagar `.git/`**.
4. Execute `npm test` e `npm start` para validar localmente.
5. Faça o commit e envie para o GitHub:

```powershell
git add public/app.js package.json README.md testes/interface.test.js
git commit -m "refactor: simplificar cadastro de instrumentos na OS"
git push origin main
```

6. A Railway, se ligada ao GitHub com deploy automático, publicará a nova interface. Confirme o status em Deployments e recarregue com **Ctrl+F5**.
7. **Não é necessário alterar as variáveis, o domínio, o volume `/data` nem o banco SQLite.**

## Como rodar no VS Code

Requisito: Node.js 24 LTS (ou 22.13+). Nenhuma dependência npm precisa ser instalada.

```powershell
npm start
```

Acesse http://localhost:3000. Sem APP_PASSWORD configurada, o modo local funciona sem login, como nas versões anteriores. Para testar a tela de login no PowerShell:

```powershell
$env:APP_PASSWORD="minha-senha-local-de-teste"
npm start
```

Ao finalizar, feche o terminal. A versão 2.4 mantém compatibilidade com a pasta `data/` anterior. **Antes de substituir código, pare o servidor e guarde um backup da pasta data** (inclusive arquivos WAL e SHM, se houver).

## Publicar o código no GitHub (repositório PRIVADO)

1. Crie em https://github.com/new o repositório `bueno-luthier` e marque **Private**. Não inicialize com README, porque o projeto já possui um.
2. Na pasta do projeto, execute (troque SEU_USUARIO):

```powershell
git init
git add .
git status
git commit -m "feat: Bueno Luthier v2.4 com formulario simplificado"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bueno-luthier.git
git push -u origin main
```

> Antes do push, confira em `git status` que nenhum `.sqlite`, `.env` ou arquivo com dados de clientes está sendo versionado. A `.gitignore` já protege esses arquivos.

## Hospedar na Railway (https://railway.com)

1. New Project → Deploy from GitHub Repo → selecione `bueno-luthier`.
2. No serviço, abra **Variables** e adicione:

| Chave | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `APP_PASSWORD` | uma senha forte e exclusiva, com 12+ caracteres |
| `DB_FILE` | `/data/bueno-luthier.sqlite` |

A Railway fornece a variável `PORT` automaticamente; não precisa defini-la. O Node precisa ser **24** (configurado em `.node-version`; verifique os logs de build).

3. **Crie um volume persistente vinculado ao serviço** em `/data`, antes do primeiro atendimento real. Sem volume persistente, o SQLite e as fotos podem se perder no redeploy/restart.
4. Configure o start command como `npm start` (se o detector da Railway não o escolher).
5. Em Settings → Networking → **Generate Domain** para criar o endereço HTTPS `.up.railway.app`.
6. Abra o link em janela anônima: deve aparecer a tela de login. Entre com a senha configurada.
7. Cadastre um cliente **fictício** e crie uma O.S. de teste com foto. Reinicie/atualize o deploy e confirme que tudo continua salvo. Exporte um backup via Configurações e guarde-o fora da Railway.
8. **Para migrar dados locais já cadastrados:** no sistema antigo, use Configurações → Exportar backup; no novo endereço online, entre com senha e use Configurações → Importar backup. **A importação substitui todos os registros do destino**, por isso faça esse procedimento antes do uso real e mantenha uma cópia do arquivo.

**IMPORTANTE:** não use Render Free com SQLite local: o sistema de arquivos é temporário. A Railway pode gerar custos conforme uso/armazenamento. Verifique o plano e defina alertas de consumo.

## Cuidados de segurança

- A autenticação é por **uma senha compartilhada**. Para vários funcionários, será preciso evoluir para contas individuais e trilha de auditoria.
- A senha existe **somente como variável do ambiente** no servidor; não é enviada ao GitHub. A sessão é armazenada na memória do servidor e expira em 7 dias; após reinício será necessário fazer login novamente.
- O cookie é `HttpOnly`, `SameSite=Strict` e `Secure` em produção. Use sempre HTTPS, não exponha porta HTTP diretamente.
- A API, as fotos e a exportação de backup ficam bloqueadas sem login; apenas a tela de entrada e o status do servidor são públicos.
- **Uma senha não substitui backups, LGPD e controles de acesso adequados.** Faça backup do SQLite/exportações regularmente e mantenha imagens de clientes sob acesso restrito.
- Para uso público de longo prazo, recomendo proteção adicional (2FA, bloqueio por IP opcional, monitoramento, recuperação de conta e backup automático verificado).

## API e testes

```powershell
npm test
```

`GET /api/health` — verificação pública; `POST /api/login` — entrar; `POST /api/logout` — sair. As rotas `/api/state`, `/api/photos` e `/api/backup` exigem login quando `APP_PASSWORD` está configurada.

## Atualizações

A cada melhoria: `git add .`, `git commit -m "descrição"`, `git push`. Com o repositório conectado, a Railway pode executar deploy automático. Os registros persistem no **volume** `/data`, e não no GitHub. **Nunca coloque o arquivo de banco de dados no repositório.**
