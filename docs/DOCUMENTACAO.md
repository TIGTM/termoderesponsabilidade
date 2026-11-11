# Documentacao do sistema de termos de responsabilidade

Este sistema interno cadastra colaboradores, controla equipamentos e emite termos de responsabilidade. A aplicacao possui interface web, API ASP.NET Core e banco SQL Server.

## Arquitetura

```text
Navegador -> Nginx -> API ASP.NET Core -> SQL Server
```

No desenvolvimento, a interface usa `http://localhost:5500` e a API usa `http://localhost:5268`. Em producao, o Nginx publica a interface e encaminha `/api` para a API interna.

## Estrutura

- `frontend/`: paginas HTML, CSS, JavaScript e Nginx.
- `TermoTI.API/`: API, controllers, modelos, servicos e Dockerfile.
- `TermoTI.API/Migrations/`: historico do schema do banco.
- `tests/`: testes de autenticacao e do login.
- `compose.yaml`: frontend, API e SQL Server.
- `.env.example`: variaveis necessarias.

## Configuracao local

1. Copie `.env.example` para `.env`.
2. Defina `MSSQL_SA_PASSWORD`.
3. Configure o Microsoft Graph para testar o envio de e-mails.
4. Inicie o banco e a API:

```powershell
docker compose up -d sqlserver
dotnet run --project TermoTI.API --launch-profile http
```

5. Inicie a interface pelo Live Server ou por `frontend/dev_server.py`.
6. Abra `http://localhost:5500/index.html`.

A API aplica migrations pendentes durante a inicializacao. O banco usa o volume `termoti_sql_data`.

## Producao

Configure no `.env`:

```env
MSSQL_SA_PASSWORD=uma-senha-forte
ADMIN_BOOTSTRAP_USER=admin-inicial
ADMIN_BOOTSTRAP_PASSWORD=uma-senha-forte
MICROSOFTGRAPH__TENANTID=id-do-locatario
MICROSOFTGRAPH__CLIENTID=id-da-aplicacao
MICROSOFTGRAPH__CLIENTSECRET=segredo-da-aplicacao
MICROSOFTGRAPH__SENDER=termos-ti@suaempresa.com
```

Valide e inicie:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Depois do primeiro login administrativo, remova as variaveis de bootstrap e recrie a API. O bootstrap so cria um administrador quando a tabela esta vazia.

## Fluxo do administrador

O administrador pode cadastrar colaboradores, importar planilhas, cadastrar equipamentos, consultar termos e acompanhar assinaturas. As rotas administrativas exigem sessao de administrador.

## Fluxo do colaborador

1. Informa nome completo e CPF ou CNPJ.
2. A API localiza o cadastro compativel.
3. No primeiro acesso, cria uma senha de 8 a 128 caracteres.
4. Nos acessos seguintes, informa a senha.
5. Visualiza equipamentos disponiveis.
6. Preenche e assina o termo.

A associacao de nomes ignora acentos, caixa e particulas como `de`, `da` e `dos`, mas nao corrige erros nem escolhe entre homonimos.

## Validacao por e-mail e assinatura

Para assinar, o colaborador informa um e-mail pessoal e recebe um unico codigo de seis digitos, valido por 15 minutos. A confirmacao desse codigo valida o e-mail e autoriza a assinatura do termo.

O codigo e armazenado somente como hash, aceita ate cinco tentativas invalidas e e vinculado ao colaborador, ao termo e ao hash do documento. A area de desenho aparece apos a confirmacao. Se o termo mudar, o codigo e rejeitado e outro deve ser solicitado; a assinatura final consome o codigo.

O envio usa Microsoft Graph com uma caixa institucional. Sem as variaveis do Graph, a assinatura nao e liberada.

## Autenticacao

O sistema usa os cookies HTTP-only `termo_ti_admin` e `termo_ti_colaborador`. Em producao, os cookies exigem HTTPS. As rotas validam o proprietario do termo ou o papel administrativo.

## Banco e migrations

```bash
dotnet ef migrations add NomeDaMigration --project TermoTI.API --startup-project TermoTI.API
dotnet ef database update --project TermoTI.API --startup-project TermoTI.API
```

Em producao, a API executa `Database.MigrateAsync()`. Faca backup antes de atualizar e nao inicie varias APIs durante a aplicacao de migrations.

## Testes

```bash
dotnet build TermoTI.API --configuration Release --no-restore
dotnet run --project tests/TermoTI.AuthChecks --configuration Release --no-restore
node tests/login-colaborador.test.cjs
```

Os testes cobrem CPF/CNPJ, associacao de nomes, hashes, codigos, unicidade e estados do login.

## Manutencao

- Nunca versione `.env`, tokens ou segredos.
- Mantenha HTTPS na borda publica.
- Faca backups e teste a restauracao.
- Confira os logs apos atualizacoes.
- Use `docker compose up -d --build` apos publicar uma versao aprovada.
- Nao remova o volume `termoti_sql_data`.

## Problemas comuns

**404 em `/api/colaborador-auth/identificar`**: reinicie a API.

**501 ao enviar POST na porta 5500**: use `frontend/dev_server.py` ou o Live Server configurado.

**Codigo nao chega**: confira as variaveis do Graph, a permissao `Mail.Send`, o remetente e os logs.

**Migration pendente**: faca backup, verifique outra instancia da API e reinicie o servico.

