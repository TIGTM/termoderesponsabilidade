using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;
using TermoTI.API.Services;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/colaborador-auth")]
public class ColaboradorAuthController(TermoTIDbContext context) : ControllerBase
{
    private const string Scheme = "ColaboradorCookie";
    private readonly PasswordHasher<ContaColaborador> hasher = new();

    private static bool IdentificacaoValida(IdentificacaoColaboradorDto dto) =>
        dto.NomeCompleto.Length <= 200 &&
        IdentidadeColaborador.PartesNome(dto.NomeCompleto).Length >= 2 &&
        IdentidadeColaborador.CpfValido(IdentidadeColaborador.Cpf(dto.CPF));

    [AllowAnonymous]
    [HttpPost("identificar")]
    public async Task<IActionResult> Identificar(IdentificacaoColaboradorDto dto)
    {
        if (!IdentificacaoValida(dto))
            return BadRequest(new { mensagem = "Informe seu nome completo e um CPF válido." });
        var cpf = IdentidadeColaborador.Cpf(dto.CPF);
        return Ok(new { cadastrado = await context.ContasColaboradores.AnyAsync(c => c.CPF == cpf) });
    }

    [AllowAnonymous]
    [HttpPost("cadastrar")]
    public async Task<IActionResult> Cadastrar(LoginColaboradorDto dto)
    {
        if (!IdentificacaoValida(dto))
            return BadRequest(new { mensagem = "Informe seu nome completo e um CPF válido." });
        if (string.IsNullOrWhiteSpace(dto.Senha) || dto.Senha.Length < 8 || dto.Senha.Length > 128)
            return BadRequest(new { mensagem = "Crie uma senha de 8 a 128 caracteres." });
        var cpf = IdentidadeColaborador.Cpf(dto.CPF);
        if (await context.ContasColaboradores.AnyAsync(c => c.CPF == cpf))
            return Conflict(new { mensagem = "CPF já cadastrado. Volte e entre com sua senha." });

        var colaboradores = await context.Colaboradores.ToListAsync();
        var porCpf = colaboradores.Where(c => IdentidadeColaborador.Cpf(c.CPF) == cpf).ToList();
        var candidatos = (porCpf.Count > 0 ? porCpf : colaboradores)
            .Where(c => IdentidadeColaborador.NomeCompativel(
                string.IsNullOrWhiteSpace(c.NomeCompleto) ? c.Nome : c.NomeCompleto, dto.NomeCompleto))
            .ToList();
        if (candidatos.Count != 1)
            return Conflict(new { mensagem = "Não foi possível identificar um único cadastro com esse nome. Confira seu nome completo ou procure o TI para revisar a lista." });
        var colaborador = candidatos[0];
        if ((!string.IsNullOrWhiteSpace(colaborador.CPF) && IdentidadeColaborador.Cpf(colaborador.CPF) != cpf) ||
            await context.ContasColaboradores.AnyAsync(c => c.ColaboradorId == colaborador.Id))
            return Conflict(new { mensagem = "Este colaborador já possui identificação cadastrada. Confira os dados ou procure o TI." });

        var conta = new ContaColaborador { ColaboradorId = colaborador.Id, CPF = cpf };
        conta.SenhaHash = hasher.HashPassword(conta, dto.Senha);
        context.ContasColaboradores.Add(conta);
        colaborador.NomeCompleto = dto.NomeCompleto.Trim();
        colaborador.CPF = cpf;
        try { await context.SaveChangesAsync(); }
        catch (DbUpdateException)
        {
            return Conflict(new { mensagem = "Não foi possível concluir o cadastro. Volte e tente entrar com seu CPF." });
        }
        await Entrar(conta);
        return Ok(new { mensagem = "Cadastro realizado." });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginColaboradorDto dto)
    {
        if (!IdentificacaoValida(dto) || string.IsNullOrEmpty(dto.Senha) || dto.Senha.Length > 128)
            return BadRequest(new { mensagem = "Informe nome completo, CPF válido e senha." });
        var cpf = IdentidadeColaborador.Cpf(dto.CPF);
        var conta = await context.ContasColaboradores.SingleOrDefaultAsync(c => c.CPF == cpf);
        if (conta == null || hasher.VerifyHashedPassword(conta, conta.SenhaHash, dto.Senha) == PasswordVerificationResult.Failed)
            return Unauthorized(new { mensagem = "CPF ou senha incorretos." });
        var colaborador = await context.Colaboradores.FindAsync(conta.ColaboradorId);
        if (colaborador == null || !IdentidadeColaborador.NomeCompativel(colaborador.NomeCompleto, dto.NomeCompleto))
            return Unauthorized(new { mensagem = "Confira o nome completo informado." });
        await Entrar(conta);
        return Ok(new { mensagem = "Login realizado." });
    }

    private Task Entrar(ContaColaborador conta) => HttpContext.SignInAsync(Scheme,
        new ClaimsPrincipal(new ClaimsIdentity(new[] {
            new Claim(ClaimTypes.NameIdentifier, conta.ColaboradorId.ToString()),
            new Claim(ClaimTypes.Role, "Colaborador")
        }, Scheme)), new AuthenticationProperties {
            IsPersistent = false, AllowRefresh = true, ExpiresUtc = DateTimeOffset.UtcNow.AddHours(4)
        });

    [Authorize(AuthenticationSchemes = Scheme)]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var colaborador = await context.Colaboradores.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id);
        if (colaborador == null || !await context.ContasColaboradores.AnyAsync(c => c.ColaboradorId == id)) return Unauthorized();
        return Ok(new { colaboradorId = id, colaborador });
    }

    [Authorize(AuthenticationSchemes = Scheme)]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(Scheme);
        return Ok(new { mensagem = "Sessão encerrada." });
    }
}

public class IdentificacaoColaboradorDto
{
    public string NomeCompleto { get; set; } = string.Empty;
    public string CPF { get; set; } = string.Empty;
}

public class LoginColaboradorDto : IdentificacaoColaboradorDto
{
    public string Senha { get; set; } = string.Empty;
}
