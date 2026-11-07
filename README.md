# Bueno Luthier — Sistema de gestão da oficina (v2.2)

Sistema web local com **clientes, ordens de serviço, registro do instrumento dentro da O.S., fotos do recebimento, serviços e valores, impressão em duas vias e banco de dados SQLite**. O monograma dourado da oficina está incorporado à interface e à impressão.

## O que mudou na v2.2

- **Não existe mais a tela separada de cadastro de instrumentos.** Ao abrir a O.S., selecione um cliente existente e informe **tipo, marca, modelo, número de série, cor, estado de conservação e observações** do instrumento. O registro é criado automaticamente e vinculado à ordem.
- No mesmo formulário é possível **anexar até 6 fotografias** do estado de recebimento do instrumento (JPG, PNG ou WebP, **até 2 MB cada**).
- As fotos aparecem na consulta da O.S. e podem ser abertas em tamanho maior; **até 2 imagens** aparecem em miniatura em cada via impressa, com a indicação da quantidade total de fotos armazenadas.
- **As fotos são gravadas dentro do SQLite**, em uma nova tabela `fotos_os`, e são incluídas na exportação e restauração do backup JSON.
- Ordens criadas em versões anteriores continuam compatíveis; os registros de instrumentos existentes permanecem no banco como histórico. Se uma O.S. antiga for editada, os campos de instrumento estarão preenchidos.
- A versão 2.1 já havia removido o campo de desconto. **Total da O.S. = soma de quantidade × valor unitário dos serviços.** O valor recebido não pode exceder o total.

## 1. Requisitos

- **Node.js 24 LTS** (recomendado), disponível em https://nodejs.org/. Também funciona em Node.js 22.13+ (pode aparecer um aviso sobre SQLite experimental).
- VS Code e Chrome ou Edge.
- **Não precisa instalar dependências, SQLite separadamente ou executar `npm install`.** O backend usa SQLite integrado ao Node.js.

## 2. Iniciar no VS Code

1. Extraia o ZIP e abra a pasta **Bueno_Luthier_Projeto** (onde fica `package.json`) no VS Code.
2. Abra **Terminal > Novo Terminal**.
3. Execute:

```powershell
node -v
npm start
```

4. Acesse **http://localhost:3000** no Chrome ou Edge.
5. Cadastre um cliente, abra uma O.S., informe os dados do instrumento, selecione as fotos, os serviços e salve.
6. Vá até **Ordens de serviço**, abra a O.S. e teste a impressão **Imprimir 2 vias**.

Para interromper o servidor, use **Ctrl+C**. No Windows, também pode usar `iniciar-windows.bat`.

## 3. Atualizar uma versão anterior **sem perder cadastros**

**IMPORTANTE: preserve o banco de dados que já está no seu computador.**

1. No VS Code, interrompa o servidor com **Ctrl+C**.
2. Copie a pasta antiga `data/` para um lugar seguro. Ela contém `bueno-luthier.sqlite` e pode conter arquivos temporários SQLite (`-wal`, `-shm`). Não copie o banco enquanto o servidor estiver aberto.
3. Extraia o ZIP v2.2 e copie os arquivos novos (`public`, `server`, `testes`, `package.json`, `README.md`) para seu projeto existente, **sem substituir ou apagar `data/`**.
4. Execute `npm start`. A tabela de fotos será criada automaticamente sem apagar os registros anteriores.
5. Atualize o navegador com **Ctrl+F5**.

Se for uma instalação nova, use a pasta toda do ZIP normalmente. O banco é criado automaticamente na primeira execução.

## 4. Fluxo de atendimento

1. **Clientes:** cadastra nome e telefone/WhatsApp.
2. **Nova ordem de serviço:** seleciona o cliente, informa instrumento, estado/avarias e **anexa fotos do recebimento**.
3. Registra solicitação, diagnóstico, acessórios recebidos, serviços, quantidades, valores, pagamento e garantia.
4. **Salvar ordem:** o sistema cria o registro do instrumento junto da O.S. e armazena fotos no SQLite.
5. **Consultar O.S.:** veja fotos e dados do instrumento. Para editar a ordem, use o botão **Editar**.
6. **Imprimir 2 vias:** uma para a oficina, outra para o cliente, com logotipo, dados e espaço para assinaturas.

Fotos são opcionais, porém recomendamos sempre registrar eventuais avarias preexistentes. As fotos não são enviadas para serviços externos; ficam no banco SQLite local.

## 5. Banco de dados e backup

O banco será criado em:

```text
data/bueno-luthier.sqlite
```

Tabelas: `clientes`, `instrumentos` (interno, usado pela O.S.), `ordens_servico`, `servicos_os`, `fotos_os`, `configuracoes`, `metadata`.

Os dados persistem mesmo se você fechar o navegador. Em **Configurações > Exportar backup**, o sistema gera um **JSON com cadastros e imagens**. Esse arquivo pode ficar grande e contém fotos e dados pessoais; armazene-o em local seguro.

Em **Configurações > Importar backup**, o sistema restaura o JSON e suas fotos; **isso substitui todos os registros atuais**. Os backups anteriores, sem fotos, também são aceitos.

Ao atualizar o programa, **não sobrescreva a pasta `data/`** com a do ZIP.

## 6. API local

- `GET /api/health` — status do servidor.
- `GET /api/state` — dados e referências das fotos (sem binários).
- `PUT /api/state` — gravação transacional dos registros, com proteção de revisão entre abas.
- `POST /api/photos` — recebe uma foto por vez, com nome, MIME e bytes em base64, até 2 MB.
- `GET /api/photos/:id` — abre a imagem já salva.
- `GET /api/backup` — exporta os dados e as imagens em base64.
- `POST /api/restore` — restaura JSON completo com as imagens.

O banco é atualizado de forma atômica. Fotos selecionadas e enviadas ao servidor, mas não associadas a uma ordem salva, podem permanecer temporariamente até a limpeza automática, feita após 48 horas.

## 7. Testar o backend

```powershell
npm test
```

Testes automatizados verificam gravação, persistência após reiniciar, validações, conflitos de edição, referências e armazenamento de fotos, backup e restauração.

## 8. Atenção à segurança

**Este é um sistema local, sem login e sem acesso remoto seguro.** Por padrão escuta apenas em `127.0.0.1`. Não exponha a porta 3000 à internet. Caso a oficina precise usar celulares ou múltiplos computadores ao mesmo tempo, será necessário adicionar autenticação, HTTPS e definir rotina de backups.

O arquivo SQLite e os backups possuem dados pessoais de clientes e fotos dos instrumentos. Proteja esses arquivos e faça cópias de segurança regularmente.
