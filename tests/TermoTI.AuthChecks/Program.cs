using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Controllers;
using TermoTI.API.Data;
using TermoTI.API.Models;
using TermoTI.API.Services;

var checks = 0;
void Check(bool condition, string description)
{
    if (!condition) throw new Exception(description);
    checks++;
}
Check(IdentidadeColaborador.Cpf("529.982.247-25") == "52998224725", "CPF normalization");
Check(IdentidadeColaborador.CpfValido("52998224725"), "Valid CPF");
foreach (var cpf in new[] { "", "11111111111", "52998224724", "123", "00000000000" })
    Check(!IdentidadeColaborador.CpfValido(cpf), "Reject invalid CPF");
Check(IdentidadeColaborador.NomeCompativel("João Silva", "João Carlos da Silva"), "Middle names and accents");
Check(IdentidadeColaborador.NomeCompativel("JOAO SILVA", "João Carlos Silva Santos"), "Imported short name");
Check(IdentidadeColaborador.NomeCompativel("Maria Souza", "  MARIA   de Souza  "), "Whitespace and particles");
foreach (var nome in new[] { "Joana Silva", "João Silveira", "Silva João", "João", "" })
    Check(!IdentidadeColaborador.NomeCompativel("João Silva", nome), "Reject unsafe match");
var homonimos = new[] { "João Silva", "Joao da Silva" };
Check(homonimos.Count(n => IdentidadeColaborador.NomeCompativel(n, "João Carlos Silva")) == 2, "Do not resolve ambiguity by first match");
var conta = new ContaColaborador();
var hasher = new PasswordHasher<ContaColaborador>();
conta.SenhaHash = hasher.HashPassword(conta, "senha-de-teste");
Check(conta.SenhaHash != "senha-de-teste", "Never store plaintext");
Check(hasher.VerifyHashedPassword(conta, conta.SenhaHash, "senha-de-teste") != PasswordVerificationResult.Failed, "Correct password");
Check(hasher.VerifyHashedPassword(conta, conta.SenhaHash, "errada") == PasswordVerificationResult.Failed, "Incorrect password");
Check(!System.Text.Json.JsonSerializer.Serialize(conta).Contains("SenhaHash"), "Do not serialize hash");
using var db = new TermoTIDbContext(new DbContextOptionsBuilder<TermoTIDbContext>()
    .UseSqlServer("Server=localhost;Database=unused;Integrated Security=true;TrustServerCertificate=true").Options);
var model = db.Model.FindEntityType(typeof(ContaColaborador))!;
Check(model.GetIndexes().Any(i => i.IsUnique && i.Properties.Single().Name == "CPF"), "Unique CPF index");
Check(model.GetIndexes().Any(i => i.IsUnique && i.Properties.Single().Name == "ColaboradorId"), "Unique employee index");
var controller = new ColaboradorAuthController(db);
Check(await controller.Identificar(new() { NomeCompleto = "João Silva", CPF = "11111111111" }) is BadRequestObjectResult, "API rejects invalid CPF before querying");
Check(await controller.Cadastrar(new() { NomeCompleto = "João Silva", CPF = "52998224725", Senha = "123" }) is BadRequestObjectResult, "API rejects short password");
Check(await controller.Login(new() { NomeCompleto = "João Silva", CPF = "52998224725", Senha = "" }) is BadRequestObjectResult, "No default password fallback");
Console.WriteLine($"Passed {checks} authentication checks.");
