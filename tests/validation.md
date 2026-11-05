# Validação do acesso por CPF

- Build Release: aprovado, sem erros.
- Verificações C#: 25 aprovadas (CPF, associação de nomes, hash, índices únicos e entradas inválidas da API).
- JavaScript: sintaxe validada; testes de estados do login aprovados com API simulada.
- EF Core: nenhuma alteração de modelo pendente após AddContaColaborador.
- Banco: a migração foi gerada, mas não aplicada ao SQL Server desta sessão. Cadastro concorrente e fluxo HTTP com cookies ainda precisam de teste integrado.
- Navegador: inspeção visual indisponível porque o host de acesso ao navegador não respondeu. Responsividade e aparência não foram confirmadas por captura.
- Auditoria estática do skill: resultado em frontend-audit.json. Ela não reconhece listeners externos por ID como ações dos botões; os botões novos possuem listeners em login-colaborador.js e colaborador.js. Os selects e a validação nativa administrativa apontados já existiam. Não foi feita uma refatoração das telas fora do escopo.
- Lint de DESIGN.md não executado: npx não está disponível no PATH.
- Restore dos testes informou avisos NU1902/NU1903 em System.Security.Cryptography.Pkcs 9.0.11, dependência transitiva da aplicação existente. Atualização de dependências não faz parte desta mudança.
