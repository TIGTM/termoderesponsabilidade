# Sistema de Termos de Responsabilidade

Sistema web para gerenciamento de equipamentos e termos de responsabilidade, com interface web, API ASP.NET Core 10 e banco de dados SQL Server 2022.

Consulte a [documentação completa do sistema](docs/DOCUMENTACAO.md) para instalação, configuração, fluxos, segurança, testes e manutenção.

## Requisitos

- Servidor Linux com Docker Engine e Docker Compose
- Acesso ao repositório Git
- HTTPS configurado para acesso público em produção

## Estrutura

- `frontend/`: interface web servida pelo Nginx
- `TermoTI.API/`: API ASP.NET Core 10
- `compose.yaml`: configuração dos serviços Docker
- `.env.example`: modelo das variáveis de ambiente

## Configuração inicial

1. Copie `.env.example` para `.env`.
2. Defina uma senha forte e exclusiva em `MSSQL_SA_PASSWORD`.
3. Não envie o arquivo `.env` ao Git.
4. Valide a configuração:

   ```bash
   docker compose config --quiet
   ```

5. Inicie os serviços:

   ```bash
   docker compose up -d --build
   ```

6. Confira os containers:

   ```bash
   docker compose ps
   ```

A interface é publicada na porta 80. Configure HTTPS antes de disponibilizar o sistema publicamente.

## Banco de dados e migrations

### Desenvolvimento com Live Server

Abra a pasta raiz `TermoTI` no VS Code para carregar `.vscode/settings.json`.
Inicie a API com `dotnet run --project TermoTI.API --launch-profile http` e abra
`frontend/index.html` com Live Server. A porta 5500 encaminha `/api` para
`http://localhost:5268/api`, preservando as URLs relativas e os cookies.
Após alterar as configurações do Live Server, pare e inicie novamente a extensão.
Após alterar os controllers, reinicie a API para carregar as rotas e migrations novas.
Um 404 em `/api/colaborador-auth/identificar` diretamente na porta 5268 indica
que a API em execução ainda não contém essa rota; reiniciar apenas o frontend não resolve.

As migrations do Entity Framework Core estão versionadas em `TermoTI.API/Migrations/`.

Durante a inicialização, a API executa `Database.MigrateAsync()` para aplicar as migrations pendentes ao banco configurado na connection string `DefaultConnection`.

O SQL Server utiliza um volume Docker persistente para preservar os dados entre reinicializações dos containers.

Antes de atualizar uma instalação existente, faça backup do banco e confira as migrations que serão aplicadas. Evite iniciar várias instâncias da API simultaneamente durante esse processo.

## Primeiro administrador

A API pode criar o primeiro administrador durante a inicialização quando as duas variáveis abaixo estão configuradas e a tabela `UsuariosAdmin` está vazia:

- `ADMIN_BOOTSTRAP_USER`: nome do administrador inicial.
- `ADMIN_BOOTSTRAP_PASSWORD`: senha forte e exclusiva.

### Procedimento

1. Configure as duas variáveis temporariamente no ambiente seguro do servidor.
2. Inicie a aplicação. A API aplicará as migrations pendentes antes de verificar a tabela de administradores.
3. Teste o login com as credenciais iniciais.
4. Remova as variáveis temporárias do ambiente de implantação.
5. Recrie o container da API e confirme que o login continua funcionando.

A rotina não cria outro administrador se já existir algum registro em `UsuariosAdmin`.

As senhas são verificadas usando `PasswordHasher<UsuarioAdmin>`. Senhas antigas no formato SHA-256 são atualizadas para o formato novo após um login válido.

Não crie uma rota pública para cadastrar o primeiro administrador.

## Segurança e produção

- Nunca versione `.env` ou credenciais reais.
- Não exponha a porta do SQL Server diretamente à internet.
- Utilize HTTPS em produção.
- Configure corretamente o proxy reverso e os cabeçalhos encaminhados.
- Revise a autenticação e a autorização dos endpoints antes da publicação.
- Faça backups regulares do banco.
- Não remova o volume `termoti_sql_data` ao atualizar a aplicação: isso pode apagar os dados.
- Após criar o primeiro administrador, remova as credenciais temporárias de bootstrap.

## Atualização

Faça backup do banco antes de atualizar uma instalação existente.

Depois de obter a versão aprovada do repositório:

```bash
git pull
docker compose up -d --build
docker compose ps
```

## Acesso individual dos colaboradores

Na página inicial, **Colaborador** abre `login.html?perfil=colaborador`. O usuário informa nome completo e CPF válido; no primeiro acesso cria uma senha de 8 a 128 caracteres, nos seguintes utiliza a própria senha. Após autenticação, `colaborador.html` carrega os dados da sessão e os equipamentos, sem seleção de nomes.

A migration `AddContaColaborador` cria uma conta por CPF e por colaborador, com senha protegida por PasswordHasher. É aplicada pela API na próxima inicialização. O cadastro administrativo de pessoas continua separado da criação da senha pelo próprio colaborador. A configuração antiga `TermoTI:ColaboradorSenha` não é mais utilizada.

A associação ignora acentos, caixa e partículas (de, da, dos), exige o mesmo primeiro nome e os sobrenomes cadastrados na mesma ordem e permite nomes intermediários. Exemplo: João Silva corresponde a João Carlos da Silva. Não corrige erros de digitação nem escolhe entre homônimos. Quando há ambiguidade, divergência de CPF ou cadastro já associado, o usuário recebe orientação para procurar o TI.

## Validação por e-mail e assinatura

Antes de assinar, o colaborador informa um e-mail pessoal e valida sua posse com um código de seis dígitos, válido por quinze minutos. Para cada assinatura é gerado um novo código, de uso único, vinculado ao colaborador, ao termo e ao conteúdo do documento. A área para desenhar a assinatura só é exibida após a confirmação desse código; a assinatura final o consome. O código é armazenado somente como hash, expira após cinco tentativas inválidas e não pode ser reutilizado.

O envio usa o Microsoft Graph com uma caixa de correio institucional. Registre uma aplicação no Microsoft Entra ID, conceda e aprove a permissão de aplicativo **Microsoft Graph / Mail.Send**, restrinja a aplicação à caixa indicada quando a política da organização permitir, e preencha no ambiente da API:

```env
MICROSOFTGRAPH__TENANTID=<id-do-locatario>
MICROSOFTGRAPH__CLIENTID=<id-da-aplicacao>
MICROSOFTGRAPH__CLIENTSECRET=<segredo-da-aplicacao>
MICROSOFTGRAPH__SENDER=termos-ti@suaempresa.com
```

No Docker Compose, copie esses valores para `.env`; o serviço `api` já os recebe. A migration `AddEmailAuthorization` é aplicada na inicialização da API. Sem essa configuração, o sistema informa que o envio ainda não foi configurado e não libera a assinatura.

Nome e CPF por si só ainda não comprovam a identidade antes do primeiro cadastro. Recuperação de senha ainda não é oferecida.

Validação local: `dotnet run --project tests/TermoTI.AuthChecks --configuration Release` verifica CPF, nomes, hash, restrições únicas e rejeições de entrada da API sem acessar o banco. `node tests/login-colaborador.test.cjs` verifica os estados do login com respostas simuladas. Esses testes não substituem a validação integrada com SQL Server.
